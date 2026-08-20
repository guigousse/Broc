import Foundation
import UIKit
import WebKit
import GoogleMobileAds
import UserMessagingPlatform
import AppTrackingTransparency

// Pont AdMob côté app : SEUL endroit autorisé à importer le SDK Google
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. AdmobPlugin.swift). Joint au runtime par
// le plugin via NSClassFromString("BrocAdmobBridge").
// API SDK v12 (noms Swift : MobileAds/RewardedAd/Request,
// ConsentInformation/ConsentForm — PAS les anciens GAD*/UMP*).
// Blocs rewarded de PRODUCTION, UN PAR EMPLACEMENT du jeu. Les clés sont les
// valeurs de EMPLACEMENTS_PUB (src/lib/ads/adProvider.ts) : c'est ce qui rend
// les revenus et le taux de complétion lisibles écran par écran dans la
// console AdMob. Un emplacement laissé vide retombe sur AD_UNIT_DEFAUT — le
// joueur garde sa récompense, seule la ventilation est perdue.
// Pour tout débogage, remettre le bloc de test officiel Google
// "ca-app-pub-3940256099942544/1712485313" : cliquer ses propres vraies pubs
// = ban AdMob (validation device faite le 2026-07-24 avec ce bloc de test).
private let AD_UNIT_ENERGIE = "ca-app-pub-6928338731034491/5859004325"
private let AD_UNITS: [String: String] = [
  "energie": AD_UNIT_ENERGIE,
  "boite-mystere": "ca-app-pub-6928338731034491/8064744693",
  "restauration": "ca-app-pub-6928338731034491/4038801989",
]

// Bloc servi quand l'emplacement est inconnu ou pas encore créé côté AdMob.
private let AD_UNIT_DEFAUT = AD_UNIT_ENERGIE

@objc(BrocAdmobBridge) public class BrocAdmobBridge: NSObject {
  @objc public static let shared = BrocAdmobBridge()

  // Invariant : les callbacks du SDK GMA (load/present/delegate) arrivent
  // tous sur le main thread — l'état ci-dessous (finEnAttente, rewardedAds)
  // n'est donc touché que depuis ce thread, sans synchronisation additionnelle.
  //
  // Une pub préchargée par bloc, indexée par ad unit ID : les emplacements ne
  // se volent plus leur précharge (avant, une pub chargée pour l'énergie
  // pouvait être présentée pour la boîte mystère).
  private var rewardedAds: [String: RewardedAd] = [:]
  /// Bloc de la pub en cours d'affichage — sert à le recharger à la fermeture.
  private var unitEnCours: String?
  private var finEnAttente: ((Bool, String?) -> Void)?
  private var recompenseGagnee = false
  private var sdkPret = false

  /// Bloc AdMob d'un emplacement, avec repli sur le bloc par défaut.
  private func unit(pour emplacement: String) -> String {
    guard let unit = AD_UNITS[emplacement], !unit.isEmpty else { return AD_UNIT_DEFAUT }
    return unit
  }

  // MARK: - Entrées du pont (sélecteurs appelés par le plugin vendoré)

  @objc public func initialiser(_ fin: @escaping () -> Void) {
    DispatchQueue.main.async {
      self.viewportPleinEcran()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
        self.viewportPleinEcran()
      }
      self.parcoursConsentement {
        MobileAds.shared.start()
        self.sdkPret = true
        // Seul le bloc par défaut est préchargé au boot : précharger les trois
        // ferait trois requêtes par session pour au plus une impression, ce
        // que le match rate AdMob paie cher. Les autres blocs se chargent à la
        // demande, puis restent préchargés après leur première utilisation.
        self.prechargerPub(AD_UNIT_DEFAUT)
        fin()
      }
    }
  }

  // Rend le viewport web plein écran (896 pt) au lieu de 818 : par défaut le
  // WKWebView Tauri (contentInsetAdjustmentBehavior=.automatic) retranche les
  // safe areas du layout viewport → 100dvh=818, le contenu n'atteint pas les
  // bords → bande claire.
  //
  // FILET DE SÉCURITÉ UNIQUEMENT depuis le 2026-07-25 : `.never` est désormais
  // posé dès le lancement du processus, avant le premier paint (voir main.mm).
  // Cette méthode-ci n'est appelée qu'au boot d'AdMob, donc APRÈS l'hydratation
  // React — d'où la garde `dejaCorrige` : forcer un reflow à ce moment-là
  // produirait exactement le saut d'écran qu'on cherche à supprimer. On ne
  // reflowe donc que si le viewport était encore fautif (main.mm neutralisé,
  // webview recréée…). La réinjection de --safe-* reste inconditionnelle : elle
  // est idempotente et couvre le cas où `.never` remettrait env() à 0.
  private func viewportPleinEcran() {
    guard let root = rootViewController()?.view else { return }
    let insets = root.safeAreaInsets
    for wv in webviews(dans: root) {
      let dejaCorrige = wv.scrollView.contentInsetAdjustmentBehavior == .never
      if !dejaCorrige {
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        // La page déjà chargée ne recalcule pas seule : reflow forcé (toggle
        // de frame) puis événement `resize` pour recaler TOUT le layout (y
        // compris les éléments fixes comme le panorama et les ResizeObserver).
        let f = wv.frame
        wv.frame = f.insetBy(dx: 0, dy: 1)
        wv.frame = f
      }
      let js = String(
        format:
          "(function(){var s=document.documentElement.style;"
          + "s.setProperty('--safe-top','%.0fpx');s.setProperty('--safe-bottom','%.0fpx');"
          + "%@})();",
        insets.top, insets.bottom,
        dejaCorrige ? "" : "window.dispatchEvent(new Event('resize'));")
      wv.evaluateJavaScript(js, completionHandler: nil)
    }
  }

  private func webviews(dans vue: UIView) -> [WKWebView] {
    var out: [WKWebView] = []
    if let wv = vue as? WKWebView { out.append(wv) }
    for sub in vue.subviews { out.append(contentsOf: webviews(dans: sub)) }
    return out
  }

  @objc public func montrerRewarded(
    _ emplacement: String, fin: @escaping (Bool, String?) -> Void
  ) {
    DispatchQueue.main.async {
      guard self.sdkPret else {
        fin(false, "SDK non initialisé")
        return
      }
      guard self.finEnAttente == nil else {
        // Une pub est déjà en cours (affichée OU en chargement) : refus
        // immédiat plutôt qu'écraser la completion en attente (elle ne
        // serait jamais rappelée).
        fin(false, "Pub déjà en cours")
        return
      }
      let unit = self.unit(pour: emplacement)
      // Réservation SYNCHRONE : ferme la fenêtre de course pendant le
      // chargement réseau du chemin sans pub préchargée. Toute sortie
      // d'échec doit libérer la réservation.
      self.finEnAttente = fin
      self.unitEnCours = unit
      if let pub = self.rewardedAds.removeValue(forKey: unit) {
        self.presenter(pub: pub)
      } else {
        // Pas de pub préchargée pour ce bloc (premier usage de l'emplacement,
        // hors-ligne au boot, no-fill…) : tentative à la demande — le SDK
        // gère son propre timeout réseau.
        RewardedAd.load(with: unit, request: Request()) { pub, erreur in
          guard let pub else {
            self.finEnAttente = nil
            self.unitEnCours = nil
            fin(false, erreur?.localizedDescription ?? "Aucune pub disponible")
            return
          }
          self.presenter(pub: pub)
        }
      }
    }
  }

  // MARK: - Consentement (UMP puis ATT)

  private func parcoursConsentement(fin: @escaping () -> Void) {
    let params = RequestParameters()
    params.isTaggedForUnderAgeOfConsent = false
    ConsentInformation.shared.requestConsentInfoUpdate(with: params) { erreur in
      guard erreur == nil else {
        // Hors-ligne : on continue sans bloquer, les pubs échoueront proprement.
        // Aucun verdict publié → la mesure d'audience reste éteinte (fail-closed),
        // le prochain lancement réessaiera.
        fin()
        return
      }
      ConsentForm.loadAndPresentIfRequired(from: self.rootViewController()) { _ in
        // Verdict publié pour les autres consommateurs (mesure d'audience).
        // `canRequestAds` est vrai aussi quand l'UMP juge le formulaire non
        // requis (hors UE).
        ConsentementBroc.shared.resoudre(
          canRequestAds: ConsentInformation.shared.canRequestAds)
        // ATT après le formulaire UMP : l'ordre évite deux popups d'affilée
        // sans contexte. Idempotent (iOS ne re-prompt jamais une fois décidé).
        if #available(iOS 14, *) {
          ATTrackingManager.requestTrackingAuthorization { _ in
            DispatchQueue.main.async { fin() }
          }
        } else {
          fin()
        }
      }
    }
  }

  // MARK: - Cycle de vie des pubs

  private func prechargerPub(_ unit: String) {
    RewardedAd.load(with: unit, request: Request()) { [weak self] pub, _ in
      self?.rewardedAds[unit] = pub
      pub?.fullScreenContentDelegate = self
    }
  }

  // Précondition : `finEnAttente` a été réservée par `montrerRewarded`.
  private func presenter(pub: RewardedAd) {
    guard let racine = rootViewController() else {
      finEnAttente?(false, "Pas de view controller racine")
      finEnAttente = nil
      unitEnCours = nil
      return
    }
    recompenseGagnee = false
    pub.fullScreenContentDelegate = self
    pub.present(from: racine) { [weak self] in
      // Callback Google déclenché UNIQUEMENT au visionnage complet.
      self?.recompenseGagnee = true
    }
  }

  private func rootViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    return scene?.windows.first(where: \.isKeyWindow)?.rootViewController
  }
}

// MARK: - FullScreenContentDelegate

extension BrocAdmobBridge: FullScreenContentDelegate {
  // La réponse part à la FERMETURE (pas au gain) : le jeu ne doit reprendre
  // la main qu'une fois la pub disparue de l'écran.
  public func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
    finEnAttente?(recompenseGagnee, nil)
    finEnAttente = nil
    // On ne recharge que le bloc qui vient de servir : l'emplacement suivant
    // chargera le sien à la demande.
    rechargerBlocServi()
  }

  public func ad(
    _ ad: FullScreenPresentingAd,
    didFailToPresentFullScreenContentWithError error: Error
  ) {
    finEnAttente?(false, error.localizedDescription)
    finEnAttente = nil
    rechargerBlocServi()
  }

  private func rechargerBlocServi() {
    let unit = unitEnCours ?? AD_UNIT_DEFAUT
    unitEnCours = nil
    prechargerPub(unit)
  }
}
