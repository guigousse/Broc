# Portage Android — sous-projet B : pubs AdMob récompensées + options de confidentialité

Date : 2026-09-05. Branche : `feat/android-admob`, créée depuis `feat/android-socle`.
Précédents : spec iOS `2026-07-23-admob-rewarded-ios-design.md` (le contrat que ce
document porte sur Android), spec socle `2026-08-10-android-socle-design.md` (le
découpage A→E et les providers « indisponible » que B remplace).

## 1. Contexte et objectif

La 1.5.0 Android (versionCode 1005005) a passé le test fermé ; Guillaume a obtenu
l'accès production le 2026-09-05 et promeut cet AAB tel quel, **sans monétisation**.
Sur Android, les trois écrans à pub récompensée (machine à énergie, boîte mystère,
restauration à l'Atelier) ne proposent aujourd'hui rien : `pubDisponible()` est
faux et le provider est `IndisponibleAdProvider`.

B rend les pubs récompensées disponibles sur Android avec **le même contrat** que sur
iOS, où elles ont été recettées et rapportent (eCPM réel 14 €). B ajoute aussi, sur
Android seulement, le point d'entrée « options de confidentialité » qu'exige la
politique de consentement UE de Google. Firebase Android (F) et l'achat Play Billing
(C) sont des sous-projets séparés ; B leur laisse des points d'ancrage, rien de plus.

**Décisions prises par Guillaume le 2026-09-05 :**
- production tout de suite avec la 1.5.0 actuelle, monétisation dans une mise à jour
  ultérieure ;
- ordre B → C → F, puis conformité (pages légales, Data safety), puis qualité
  (bouton Retour, report 1.6.0) ;
- bouton « options de confidentialité » **Android uniquement dans B** ; iOS garde la
  formulation « réinstaller » et sera traité dans un lot séparé.

## 2. Périmètre

**Dans B**
- module Android du plugin vendoré `tauri-plugin-admob` (Gradle + Kotlin) ;
- côté Rust du plugin : enregistrement Android, deux commandes nouvelles ;
- manifeste de l'app : App ID AdMob Android, permission AD_ID ;
- couche TypeScript : `adMobDisponible` / `pubDisponible` vrais sur Android,
  suppression de `IndisponibleAdProvider`, deux fonctions d'options de confidentialité ;
- Réglages : section « Confidentialité » rendue sur Android quand UMP l'exige ;
- libellés en 4 langues ;
- tests vitest, `cargo check` en cible Android, recette émulateur.

**Hors B**
- pont iOS (aucune ligne Swift ne change) ;
- pages de confidentialité (app et site) — sous-projet conformité ;
- Data safety, déclaration « contient des pubs » dans Play Console — au moment de la
  sortie monétisée ;
- Firebase Android, Play Billing, bouton Retour, report de la 1.6.0.

## 3. Architecture

### 3.1 Ce qui change par rapport à iOS

Sur iOS, `swift build` (swift-rs) ne résout pas les xcframeworks SPM : le plugin ne
pouvait pas importer le SDK et passait par un pont dans le target de l'app, joint par
`NSClassFromString`. **Android n'a pas cette contrainte.** Le module Gradle du plugin
déclare lui-même ses dépendances et une classe Kotlin importe le SDK directement. Il
n'y a donc pas de `AdmobBridge.kt` dans `gen/android` : tout le code natif vit dans le
plugin vendoré, comme pour le plugin notification.

### 3.2 Fichiers

```
src-tauri/vendor/tauri-plugin-admob/
  build.rs                    + .android_path("android"), + 2 commandes
  src/lib.rs                  cfg ios → any(ios, android) ; 2 commandes de plus
  src/mobile.rs               + register_android_plugin ; 2 méthodes de plus
  src/desktop.rs              2 méthodes de plus (UnsupportedPlatform)
  src/commands.rs             + privacy_options_required, + show_privacy_options
  permissions/default.toml    + allow-privacy-options-required, + allow-show-privacy-options
  android/
    build.gradle.kts          modèle : tauri-plugin-notification/android, + deps Google
    settings.gradle           idem modèle
    proguard-rules.pro        vide (le SDK livre ses consumer rules)
    src/main/AndroidManifest.xml   <manifest package="com.guigousse.broc.admob"/>
    src/main/java/AdmobPlugin.kt   la classe @TauriPlugin
src-tauri/gen/android/app/src/main/AndroidManifest.xml
                              + meta-data APPLICATION_ID, + uses-permission AD_ID
src/lib/ads/adMobProvider.ts  adMobDisponible() sur toute plateforme native ;
                              + optionsConfidentialiteRequises(), + montrerOptionsConfidentialite()
src/lib/ads/adProvider.ts     pubDisponible() vrai partout ; IndisponibleAdProvider supprimé
src/lib/ads/adProvider.android.test.ts   réécrit (attentes inversées)
src/lib/ads/emplacementsAppeles.test.ts  + garde sur la table Kotlin AD_UNITS
src/components/mobile/ReglagesModal.tsx  + SectionConfidentialite
src/lib/i18n/ui/{fr,en,es,el}.ts        + reglages.confidentialite, optionsConfidentialite
```

Le plugin iOS reste à `register_ios_plugin` ; les deux nouvelles commandes n'y sont
**pas** implémentées : `AdmobPlugin.swift` n'est pas touché, l'appel depuis iOS
n'existe pas côté TS (la section Réglages est gatée sur `plateformeNative() ===
"android"`).

### 3.3 Enregistrement Tauri

- `PLUGIN_IDENTIFIER = "com.guigousse.broc.admob"`, classe `AdmobPlugin`, comme le
  couple `app.tauri.notification` / `NotificationPlugin` du modèle.
- Les noms Kotlin sont ceux passés à `run_mobile_plugin` : `initialize`,
  `showRewardedAd`, `privacyOptionsRequired`, `showPrivacyOptions`.
- `tauri android init` régénère `tauri.settings.gradle` et `tauri.build.gradle.kts`,
  qui incluent automatiquement le module `android/` de chaque plugin déclarant
  `android_path`. Rien à écrire dans `gen/android` pour le câblage ; la CI fait déjà
  `npx tauri android init` puis `git checkout -- src-tauri/gen/android`.

### 3.4 Dépendances natives (versions vérifiées le 2026-09-05)

```kotlin
implementation("com.google.android.gms:play-services-ads:25.4.0")   // 2026-06-17
implementation("com.google.android.ump:user-messaging-platform:4.0.0") // 2025-10-31
implementation(project(":tauri-android"))
```

Contraintes à vérifier au premier build (Task 1) : GMA ≥ 24.1 exige **Kotlin ≥ 2.1.0**
et minSdk ≥ 23 (le nôtre est 24). Si le `build.gradle.kts` racine généré par le CLI
Tauri porte un plugin Kotlin plus ancien, la version se surcharge dans le module du
plugin ; c'est le risque CI de ce sous-projet, il est traité en premier.

## 4. Comportement du plugin Kotlin

Copie du pont Swift `AdmobBridge.swift`, invariants compris. Le texte ci-dessous est
le contrat ; le plan renverra vers les lignes Swift correspondantes.

### 4.1 État

```kotlin
private val rewardedAds = HashMap<String, RewardedAd>()  // une pub préchargée par bloc
private var unitEnCours: String? = null                  // bloc de la pub affichée
private var finEnAttente: ((Boolean, String?) -> Unit)? = null
private var recompenseGagnee = false
private var sdkPret = false
```

Tout l'état est touché **sur le fil principal** uniquement : les callbacks du SDK y
arrivent, et les commandes Tauri, qui arrivent sur un fil secondaire, sont
systématiquement reportées par `activity.runOnUiThread { }`.

### 4.2 Table des blocs

```kotlin
// Bloc rewarded de TEST Google, tant que les 3 blocs Android n'existent pas
// dans la console AdMob (§10, étape 2). À remplacer par les vrais blocs
// ca-app-pub-6928338731034491/… dès qu'ils sont créés.
private const val AD_UNIT_TEST = "ca-app-pub-3940256099942544/5224354917"
private const val AD_UNIT_ENERGIE = AD_UNIT_TEST
private val AD_UNITS: Map<String, String> = mapOf(
  "energie" to AD_UNIT_ENERGIE,
  "boite-mystere" to AD_UNIT_TEST,
  "restauration" to AD_UNIT_TEST,
)
private const val AD_UNIT_DEFAUT = AD_UNIT_ENERGIE
```

Les clés sont les valeurs de `EMPLACEMENTS_PUB`. Un emplacement inconnu ou vide
retombe sur `AD_UNIT_DEFAUT` : le joueur garde sa récompense, seule la ventilation
est perdue. **Tant que les blocs Android n'existent pas** dans la console AdMob, la
table porte le bloc rewarded de test Google `ca-app-pub-3940256099942544/5224354917`
(trois fois, avec un commentaire ; le test « aucun bloc partagé » est alors marqué
`skip` avec la raison, et redevient actif au branchement des vrais blocs). L'App ID
de test est `ca-app-pub-3940256099942544~3347511713`.

L'émulateur Android est **automatiquement un appareil de test** pour le SDK GMA : une
fois les vrais blocs branchés, les recetter sur émulateur ne génère pas de trafic
invalide. C'est une différence avec iOS, où le bloc de test a dû rester jusqu'à la
validation device.

### 4.3 `initialize`

1. `runOnUiThread`.
2. Parcours de consentement (4.5).
3. `MobileAds.initialize(activity) { sdkPret = true ; prechargerPub(AD_UNIT_DEFAUT) ; invoke.resolve() }`.

Seul le bloc par défaut est préchargé au boot (raison : match rate, cf. Swift). Les
autres blocs se chargent à la demande puis restent préchargés après leur première
utilisation. Idempotence : la couche TS mémorise déjà la promesse d'init ; le plugin
ne se protège pas d'un double appel au-delà de `sdkPret` (déjà prêt → resolve
immédiat sans rejouer l'UMP).

### 4.4 `showRewardedAd({ emplacement })`

```
runOnUiThread {
  si !sdkPret            → reject("SDK non initialisé")
  si finEnAttente != null → reject("Pub déjà en cours")
  unit = unit(pour: emplacement)
  finEnAttente = { rewarded, erreur -> erreur?.let(reject) ?: resolve({rewarded}) }
  unitEnCours = unit
  pub = rewardedAds.remove(unit)
  si pub != null → presenter(pub)
  sinon RewardedAd.load(activity, unit, AdRequest.Builder().build(), callback) :
       onAdLoaded → presenter ; onAdFailedToLoad → libérer réservation, fin(false, message)
}
```

`presenter(pub)` : `recompenseGagnee = false`, `setFullScreenContentCallback`, puis
`pub.show(activity) { recompenseGagnee = true }` (le listener `OnUserEarnedReward`
n'est appelé qu'au visionnage complet).

Callback plein écran :
- `onAdDismissedFullScreenContent` → `finEnAttente?.invoke(recompenseGagnee, null)` ;
  libérer ; `rechargerBlocServi()`. **La réponse part à la fermeture, pas au gain** :
  le jeu ne reprend la main qu'une fois la pub disparue.
- `onAdFailedToShowFullScreenContent(err)` → `fin(false, err.message)` ; libérer ;
  `rechargerBlocServi()`.

Toute sortie d'échec libère la réservation (`finEnAttente = null ; unitEnCours = null`).

### 4.5 Parcours de consentement UMP

```
params = ConsentRequestParameters.Builder()
           .setTagForUnderAgeOfConsent(false)
           [debug : .setConsentDebugSettings(DEBUG_GEOGRAPHY_EEA)]
           .build()
consentInformation.requestConsentInfoUpdate(activity, params,
  onSuccess = { UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { _ -> suite() } },
  onFailure = { suite() })   // hors-ligne : on continue, les pubs échoueront proprement
```

`suite()` est l'initialisation du SDK (4.3). Pas d'équivalent ATT sur Android.

Le réglage de géographie de debug n'est posé **que si l'app est débogable**
(`applicationInfo.flags and FLAG_DEBUGGABLE != 0`) : c'est le seul moyen de faire
apparaître le formulaire sur un émulateur situé hors UE, et il ne doit jamais
atteindre une build release. UMP écrit ses choix dans les `SharedPreferences` par
défaut sous les clés normalisées `IABTCF_*` (même contrat TCF que `NSUserDefaults`
sur iOS) : c'est là que F viendra lire le verdict de mesure. B n'y touche pas.

### 4.6 `privacyOptionsRequired` et `showPrivacyOptions`

- `privacyOptionsRequired` → `resolve({ requis: consentInformation.privacyOptionsRequirementStatus == REQUIRED })`.
  Lisible à tout moment après `requestConsentInfoUpdate` ; avant, le statut vaut
  `UNKNOWN` et la réponse est `false` (le bouton n'apparaît pas encore, il apparaîtra
  à la prochaine ouverture des Réglages).
- `showPrivacyOptions` → `runOnUiThread { UserMessagingPlatform.showPrivacyOptionsForm(activity) { erreur -> erreur?.let { reject(it.message) } ?: resolve() } }`.

Après fermeture du formulaire, le SDK GMA relit lui-même la chaîne TCF pour les
requêtes suivantes ; aucune pub préchargée n'est purgée (comportement Google
standard : la personnalisation change à la prochaine requête).

## 5. Couche TypeScript

- `adMobDisponible()` : `plateformeNative() !== null` (le plugin existe désormais sur
  les deux plateformes natives).
- `pubDisponible()` : `true`. La fonction **reste** : c'est la garde que l'UI
  consulte, et elle redeviendra utile si une plateforme sans régie apparaît (desktop).
- `getAdProvider()` : AdMob si `adMobDisponible()`, sinon stub. `IndisponibleAdProvider`
  et sa branche disparaissent.
- `AdMobAdProvider` gagne deux fonctions **de module** (pas de méthodes, pour ne pas
  élargir l'interface `AdProvider` qui ne concerne que les pubs) :
  - `optionsConfidentialiteRequises(): Promise<boolean>` — `invoke("plugin:admob|privacy_options_required")`,
    `false` sur toute erreur ;
  - `montrerOptionsConfidentialite(): Promise<void>` — `invoke("plugin:admob|show_privacy_options")`.
- `AdMobBootstrap` ne change pas : il appelle `initialiser()` dès que `adMobDisponible()`.
- Les trois écrans appelants et `EMPLACEMENTS_PUB` ne changent pas.

## 6. Réglages — section « Confidentialité »

Nouvelle fonction `SectionConfidentialite` dans `ReglagesModal.tsx`, rendue après la
section Notifications et avant Achats, à la condition
`plateformeNative() === "android"`. À l'ouverture de la modale, un `useEffect` appelle
`optionsConfidentialiteRequises()` ; la section n'est rendue que si la réponse est
vraie. Un bouton, style `segBtn` comme « Restaurer les achats », libellé
`d.reglages.optionsConfidentialite`, appelle `montrerOptionsConfidentialite()` ; en
erreur, `toast(d.sheets.erreurPub, { type: "erreur" })` (le toast rouge existant des
pubs — pas de libellé nouveau pour un cas qui ne devrait pas arriver).

Libellés (clé → FR / EN / ES / EL) :
- `reglages.confidentialite` → « Confidentialité » / "Privacy" / « Privacidad » / « Απόρρητο »
- `reglages.optionsConfidentialite` → « Options de confidentialité (publicités) » /
  "Privacy options (ads)" / « Opciones de privacidad (anuncios) » /
  « Επιλογές απορρήτου (διαφημίσεις) »

Le type `LocaleTraduite` étant évolutif, les quatre fichiers doivent être complétés
ensemble (le test `libelles.test.ts` le vérifie).

## 7. Manifeste et permissions

Dans `gen/android/app/src/main/AndroidManifest.xml` (fichier suivi et déjà édité à la
main, restauré par la CI après `init`) :

```xml
<uses-permission android:name="com.google.android.gms.permission.AD_ID" />
...
<application ...>
  <meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713" />  <!-- test → vrai App ID Android -->
```

Sans le `meta-data`, le SDK **plante l'app au lancement** (comportement documenté).
La permission AD_ID est ajoutée de toute façon par le manifeste du SDK ; la déclarer
explicitement rend la Data safety lisible depuis le dépôt.

Capabilities Tauri : `admob:default` couvre déjà le plugin ; le `default.toml` du
plugin ajoute les deux nouvelles permissions à son ensemble `default`.

## 8. Gestion des erreurs

Même contrat que sur iOS, vu du jeu :
- échec technique (SDK non prêt, no-fill, hors-ligne, présentation refusée) → **rejet**
  → l'écran appelant affiche le toast `erreurPub` existant ;
- pub fermée avant la récompense → `{ rewarded: false }` **sans exception** ;
- pub déjà en cours → rejet immédiat (« Pub déjà en cours ») plutôt qu'écraser la
  completion en attente ;
- UMP hors-ligne → on continue sans bloquer, l'init aboutit, les pubs échoueront
  proprement ;
- `privacyOptionsRequired` en erreur → `false` côté TS, la section n'apparaît pas.

Aucune récompense n'est jamais accordée sans `onUserEarnedReward`.

## 9. Tests

**Vitest (TDD)**
- `adProvider.android.test.ts` réécrit : `pubDisponible()` vrai sur Android ;
  `getAdProvider()` renvoie `AdMobAdProvider` sous Tauri Android ET iOS ; stub hors
  Tauri ; `IndisponibleAdProvider` n'est plus exporté.
- `adMobProvider.test.ts` : `optionsConfidentialiteRequises` → `invoke` du bon nom,
  `false` en erreur ; `montrerOptionsConfidentialite` → `invoke` du bon nom, propage
  l'erreur.
- `emplacementsAppeles.test.ts` : la garde « un bloc distinct par emplacement »
  s'applique aussi à la table `AD_UNITS` de `AdmobPlugin.kt` (même regex adaptée à la
  syntaxe `"clé" to "valeur"`), avec `skip` motivé tant que les blocs de test Google
  sont en place.
- `ReglagesModal` : section Confidentialité absente hors Android ; présente sur
  Android quand `optionsConfidentialiteRequises` répond vrai ; absente si faux ; le
  bouton appelle `montrerOptionsConfidentialite`.
- `libelles.test.ts` (existant) : les quatre langues ont les deux clés.

**Rust** : `cargo check --target x86_64-linux-android` sur `tauri-plugin-admob` avec
l'environnement NDK documenté dans `android-publication-play.md` (variables `CC_…`,
`AR_…`, `CARGO_TARGET_…_LINKER`).

**Build locale** : `npx tauri android build --debug --target x86_64` (une seule ABI,
`CARGO_PROFILE_DEV_DEBUG=0`, 13 Gi libres au 2026-09-05). Le premier build valide la
compilation Kotlin et la résolution Gradle des SDK Google — c'est la **Task 1** du
plan, avant toute logique (même séquencement « risque CI front-loadé » que la spec iOS).

**Recette émulateur** (AVD `broc-pixel6`, image `google_apis` — les services Google y
sont, c'est le prérequis du SDK), pilotée par CDP comme les recettes précédentes :
1. premier lancement : formulaire UMP (géographie UE forcée en debug), accepter ;
2. machine à énergie → « regarder une pub » → pub de test Google → fermeture → +1 ⚡ ;
3. boîte mystère → pub → ouverture ; Atelier → pub → restauration terminée ;
4. fermer la pub avant la fin → pas de récompense, pas de toast d'erreur ;
5. mode avion → pub → toast `erreurPub`, l'app ne plante pas ;
6. Réglages → section Confidentialité visible → bouton → le formulaire se rouvre →
   tout refuser → les pubs continuent (non personnalisées) ;
7. `adb shell dumpsys package com.guigousse.broc.debug | grep AD_ID` → permission
   présente ;
8. `adb logcat -s Ads` : aucun `APPLICATION_ID` manquant, aucun format de bloc refusé.

**CI** : la fusion dans `feat/android-socle` déclenche la build AAB (déclencheur
`push`). Vérifier dans les logs que Gradle résout `play-services-ads:25.4.0`, puis
que l'AAB s'installe et lance sur l'émulateur (le R8 release est le seul endroit où
une règle ProGuard manquante se verrait). L'AAB va sur la piste **interne ou fermée**,
pas en production : Guillaume décide.

## 10. Hors code — tâches console (Guillaume)

À lancer **dès maintenant**, elles ne dépendent de rien :
1. **AdMob** → Applications → Ajouter → Android → « Publiée sur Google Play » →
   package `com.guigousse.broc`. Relever l'**App ID** `ca-app-pub-6928338731034491~…`.
2. Créer **3 blocs** de format **« Récompensé »** (⚠ pas « Interstitiel avec
   récompense », le format n'est pas modifiable après création — panne du 2026-08-18)
   nommés comme sur iOS : Recharge d'énergie, Boîte mystère, Restauration. Relever les
   trois IDs `ca-app-pub-6928338731034491/…`.
3. **Confidentialité et messages** : vérifier que le message RGPD (et le message
   d'options de confidentialité) est **publié pour la nouvelle app Android** — les
   messages UMP sont rattachés par app.
4. `app-ads.txt` : déjà servi par le site ; Play lit l'URL du site développeur de la
   fiche, s'assurer qu'elle pointe sur `project-5yn6d.vercel.app` (ou le domaine
   final).

Au moment de la **sortie monétisée** (sous-projet conformité, pas B) :
5. Play Console → Contenu de l'application → Annonces → « Oui, contient des pubs ».
6. Data safety → collecte « Identifiants de l'appareil ou autres » (identifiant
   publicitaire), partagé avec Google, finalité Publicité ; permission AD_ID déclarée.
7. Pages de confidentialité 4 langues : mention d'Android, de Google Play, et du
   bouton d'options à la place de « réinstaller ».

Dès que les IDs de l'étape 1-2 existent : une seule tâche du plan les branche (table
`AD_UNITS` + `meta-data` du manifeste) et réactive le test « aucun bloc partagé ».

## 11. Risques et arbitrages

- **Kotlin ≥ 2.1 / AGP** exigés par GMA 25 : c'est la raison de la Task 1 « build vide
  qui compile ». Repli si le CLI Tauri génère un Kotlin trop ancien : surcharger la
  version dans `build.gradle.kts` du plugin, ou épingler GMA 24.x (Kotlin 2.1 aussi) —
  à trancher sur le message d'erreur réel, pas à l'avance.
- **Taille** : +3 à 5 Mo de téléchargement ; marge large sous les 200 Mo.
- **Pas d'appareil réel** : la recette est émulateur + CDP. Le trafic de test ne
  remonte pas dans les revenus AdMob ; la première vraie mesure viendra des joueurs.
- **Le push sur `feat/android-socle` consomme un versionCode** : ne fusionner qu'une
  fois la recette émulateur passée.
- **Firebase Android n'existe pas encore** : sur Android, personne ne lit le verdict
  UMP en B. C'est voulu ; F s'y branchera par les clés `IABTCF_*`.
