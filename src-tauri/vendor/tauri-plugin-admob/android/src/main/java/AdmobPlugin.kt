package com.guigousse.broc.admob

import android.app.Activity
import android.content.pm.ApplicationInfo
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentDebugSettings
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

// Blocs rewarded, UN PAR EMPLACEMENT du jeu. Les clés sont les valeurs de
// EMPLACEMENTS_PUB (src/lib/ads/adProvider.ts) : c'est ce qui rend les revenus
// et le taux de complétion lisibles écran par écran dans la console AdMob.
// Un emplacement inconnu ou vide retombe sur AD_UNIT_DEFAUT — le joueur garde
// sa récompense, seule la ventilation est perdue.
//
// Bloc rewarded de TEST Google tant que les 3 blocs Android n'existent pas dans
// la console AdMob (spec §10, étape 2). À remplacer par les vrais blocs
// ca-app-pub-6928338731034491/… dès qu'ils sont créés (Task 8 du plan B).
// L'émulateur est automatiquement un appareil de test GMA : les vrais blocs
// pourront y être recettés sans générer de trafic invalide.
private const val AD_UNIT_TEST = "ca-app-pub-3940256099942544/5224354917"
private const val AD_UNIT_ENERGIE = AD_UNIT_TEST
private val AD_UNITS: Map<String, String> = mapOf(
  "energie" to AD_UNIT_ENERGIE,
  "boite-mystere" to AD_UNIT_TEST,
  "restauration" to AD_UNIT_TEST,
)

// Bloc servi quand l'emplacement est inconnu ou pas encore créé côté AdMob.
private const val AD_UNIT_DEFAUT = AD_UNIT_ENERGIE

/** Arguments de `showRewardedAd` — `emplacement` est l'écran appelant. */
@InvokeArg
class ArgsRewarded {
  var emplacement: String = ""
}

/**
 * Pubs récompensées AdMob sur Android. Pendant Kotlin de AdmobBridge.swift
 * (gen/apple/Sources/app), même contrat, mêmes invariants — sans pont
 * intermédiaire : Gradle résout le SDK Google, la classe l'importe directement.
 *
 * Invariant de threading : tout l'état ci-dessous n'est touché QUE sur le fil
 * principal. Les callbacks du SDK GMA y arrivent ; les commandes Tauri arrivent
 * sur un fil secondaire et sont systématiquement reportées par runOnUiThread.
 */
@TauriPlugin
class AdmobPlugin(private val activity: Activity) : Plugin(activity) {
  /** Une pub préchargée par bloc, indexée par ad unit ID : les emplacements ne
   *  se volent pas leur précharge. */
  private val rewardedAds = HashMap<String, RewardedAd>()
  /** Bloc de la pub en cours d'affichage — sert à le recharger à la fermeture. */
  private var unitEnCours: String? = null
  private var finEnAttente: ((Boolean, String?) -> Unit)? = null
  private var recompenseGagnee = false
  private var sdkPret = false

  private val consentInformation: ConsentInformation by lazy {
    UserMessagingPlatform.getConsentInformation(activity)
  }

  /** Bloc AdMob d'un emplacement, avec repli sur le bloc par défaut. */
  private fun unit(pour: String): String {
    val u = AD_UNITS[pour]
    return if (u.isNullOrEmpty()) AD_UNIT_DEFAUT else u
  }

  // MARK: - Commandes Tauri

  @Command
  fun initialize(invoke: Invoke) {
    activity.runOnUiThread {
      if (sdkPret) {
        // Déjà prêt (la couche TS mémorise sa promesse d'init, mais un second
        // appel reste possible après un échec réseau) : pas de second UMP.
        invoke.resolve()
        return@runOnUiThread
      }
      parcoursConsentement {
        MobileAds.initialize(activity) {
          sdkPret = true
          // Seul le bloc par défaut est préchargé au boot : précharger les trois
          // ferait trois requêtes par session pour au plus une impression, ce
          // que le match rate AdMob paie cher. Les autres blocs se chargent à la
          // demande, puis restent préchargés après leur première utilisation.
          prechargerPub(AD_UNIT_DEFAUT)
          invoke.resolve()
        }
      }
    }
  }

  @Command
  fun showRewardedAd(invoke: Invoke) {
    // Argument absent/illisible : repli sur le bloc par défaut plutôt que de
    // priver le joueur de sa récompense.
    val emplacement = try {
      invoke.parseArgs(ArgsRewarded::class.java).emplacement
    } catch (_: Exception) {
      ""
    }
    activity.runOnUiThread {
      if (!sdkPret) {
        invoke.reject("SDK non initialisé")
        return@runOnUiThread
      }
      if (finEnAttente != null) {
        // Une pub est déjà en cours (affichée OU en chargement) : refus
        // immédiat plutôt qu'écraser la completion en attente (elle ne serait
        // jamais rappelée).
        invoke.reject("Pub déjà en cours")
        return@runOnUiThread
      }
      val unit = unit(emplacement)
      // Réservation SYNCHRONE : ferme la fenêtre de course pendant le
      // chargement réseau du chemin sans pub préchargée. Toute sortie d'échec
      // doit libérer la réservation.
      finEnAttente = { rewarded, erreur ->
        if (erreur != null) invoke.reject(erreur)
        else invoke.resolve(JSObject().put("rewarded", rewarded))
      }
      unitEnCours = unit
      val prechargee = rewardedAds.remove(unit)
      if (prechargee != null) {
        presenter(prechargee)
      } else {
        // Pas de pub préchargée pour ce bloc (premier usage de l'emplacement,
        // hors-ligne au boot, no-fill…) : tentative à la demande — le SDK gère
        // son propre timeout réseau.
        RewardedAd.load(
          activity, unit, AdRequest.Builder().build(),
          object : RewardedAdLoadCallback() {
            override fun onAdLoaded(pub: RewardedAd) = presenter(pub)

            override fun onAdFailedToLoad(erreur: LoadAdError) {
              val fin = finEnAttente
              liberer()
              fin?.invoke(false, erreur.message.ifEmpty { "Aucune pub disponible" })
            }
          }
        )
      }
    }
  }

  /** Vrai quand UMP exige un point d'entrée « options de confidentialité »
   *  (joueur en UE). Avant `requestConsentInfoUpdate`, le statut vaut UNKNOWN
   *  → faux : le bouton apparaîtra à la prochaine ouverture des Réglages. */
  @Command
  fun privacyOptionsRequired(invoke: Invoke) {
    activity.runOnUiThread {
      val requis = consentInformation.privacyOptionsRequirementStatus ==
        ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
      invoke.resolve(JSObject().put("requis", requis))
    }
  }

  /** Rouvre le formulaire de consentement. Le SDK GMA relit lui-même la chaîne
   *  TCF pour les requêtes suivantes ; les pubs déjà préchargées sont servies
   *  telles quelles (comportement Google standard). */
  @Command
  fun showPrivacyOptions(invoke: Invoke) {
    activity.runOnUiThread {
      UserMessagingPlatform.showPrivacyOptionsForm(activity) { erreur ->
        if (erreur != null) invoke.reject(erreur.message ?: "Formulaire indisponible")
        else invoke.resolve()
      }
    }
  }

  // MARK: - Consentement (UMP)

  private fun parcoursConsentement(suite: () -> Unit) {
    val params = ConsentRequestParameters.Builder()
      .setTagForUnderAgeOfConsent(false)
    if (estDebogable()) {
      // Seul moyen de faire apparaître le formulaire sur un émulateur situé
      // hors UE. Ne doit JAMAIS atteindre une build release : la garde est le
      // drapeau debuggable de l'app, pas une constante à ne pas oublier.
      params.setConsentDebugSettings(
        ConsentDebugSettings.Builder(activity)
          .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
          .build()
      )
    }
    consentInformation.requestConsentInfoUpdate(
      activity,
      params.build(),
      {
        // Le formulaire n'est montré que si UMP le juge requis (UE) et pas
        // encore répondu. UMP écrit ses choix dans les SharedPreferences par
        // défaut sous les clés IABTCF_* : c'est là que la mesure d'audience
        // (sous-projet F) viendra lire son verdict.
        UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { _ -> suite() }
      },
      {
        // Hors-ligne : on continue sans bloquer, les pubs échoueront proprement.
        suite()
      }
    )
  }

  private fun estDebogable(): Boolean =
    (activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  // MARK: - Cycle de vie des pubs

  private fun prechargerPub(unit: String) {
    RewardedAd.load(
      activity, unit, AdRequest.Builder().build(),
      object : RewardedAdLoadCallback() {
        override fun onAdLoaded(pub: RewardedAd) {
          rewardedAds[unit] = pub
        }

        override fun onAdFailedToLoad(erreur: LoadAdError) {
          rewardedAds.remove(unit)
        }
      }
    )
  }

  // Précondition : `finEnAttente` a été réservée par `showRewardedAd`.
  private fun presenter(pub: RewardedAd) {
    recompenseGagnee = false
    pub.fullScreenContentCallback = object : FullScreenContentCallback() {
      // La réponse part à la FERMETURE (pas au gain) : le jeu ne doit reprendre
      // la main qu'une fois la pub disparue de l'écran.
      override fun onAdDismissedFullScreenContent() {
        val fin = finEnAttente
        val gagnee = recompenseGagnee
        // On ne recharge que le bloc qui vient de servir : l'emplacement
        // suivant chargera le sien à la demande.
        val unit = unitEnCours ?: AD_UNIT_DEFAUT
        liberer()
        fin?.invoke(gagnee, null)
        prechargerPub(unit)
      }

      override fun onAdFailedToShowFullScreenContent(erreur: AdError) {
        val fin = finEnAttente
        val unit = unitEnCours ?: AD_UNIT_DEFAUT
        liberer()
        fin?.invoke(false, erreur.message)
        prechargerPub(unit)
      }
    }
    // Le listener n'est appelé QUE si la pub est visionnée jusqu'au bout.
    pub.show(activity) { recompenseGagnee = true }
  }

  private fun liberer() {
    finEnAttente = null
    unitEnCours = null
  }
}
