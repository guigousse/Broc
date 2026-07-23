# AdMob rewarded ads iOS — Design

**Date** : 2026-07-23 · **Statut** : validé par Guillaume · **Cible** : version 1.0 App Store (le lancement est décalé de 3-6 jours pour l'embarquer).

## Contexte et objectif

Les trois points de pub récompensée (boîte mystère, recharge d'énergie, accélération d'atelier) reposent sur `StubAdProvider` : « Regarder une pub » affiche « Pub en cours… » 800 ms puis accorde le gain sans pub — inacceptable en review Apple. Décision : intégrer de vraies rewarded ads Google AdMob dans la 1.0, posture standard **UMP (consentement RGPD) + ATT**, pubs personnalisées si consentement, non personnalisées sinon.

État côté compte : app enregistrée dans AdMob le 2026-07-23 :
- App ID AdMob : `ca-app-pub-6928338731034491~1504112334` (→ `GADApplicationIdentifier`)
- Bloc rewarded : `ca-app-pub-6928338731034491/5859004325` (→ vrais IDs, branchés seulement à l'étape 4)

Reste côté console (action Guillaume) : message de consentement UMP+ATT, liaison App Store Connect ↔ AdMob (possible après publication), `app-ads.txt`, App Privacy.

Contrainte structurante : **aucun build iOS local possible** (Mac 2018/macOS 14). Toute itération native passe par GitHub Actions + TestFlight → front-loader le risque d'intégration SDK.

## Approche retenue

Plugin Tauri Swift **maison, vendoré**, sur le modèle exact de `src-tauri/vendor/tauri-plugin-notification` (précédent établi dans le projet). Alternatives écartées : plugin communautaire `tauri-plugin-google-admob` (Android-only, 3 commits, 0 release) ; pubs web dans la WebView (interdites par Google et Apple).

Références : guide jangwook.net (janv. 2026) « Tauri iOS AdMob Rewarded Ads » ; piège connu tauri-apps/tauri#13332 (« GoogleMobileAds module not found »).

## Architecture

`src-tauri/vendor/tauri-plugin-admob` :

- **Swift** `ios/Sources/AdmobPlugin.swift` — init SDK, parcours consentement, chargement/présentation rewarded. `ios/Package.swift` déclare la dépendance SPM `swift-package-manager-google-mobile-ads` (le SDK UMP en est une dépendance).
- **Rust** `src/mobile.rs`, `src/lib.rs`, `build.rs` — pont des commandes ; détection iOS dans `build.rs` via `std::env::var("TARGET").contains("ios")` (PAS `#[cfg(target_os)]`). Enregistré dans `src-tauri/src/lib.rs` **iOS uniquement** ; desktop = plugin absent, zéro impact dev local.
- **Permissions** : commandes déclarées dans `permissions/default.toml` du plugin + `capabilities/default.json` de l'app.
- **TypeScript** `src/lib/ads/adMobProvider.ts` — `AdMobAdProvider implements AdProvider`. `getAdProvider()` (`src/lib/ads/adProvider.ts`, point de swap unique) choisit AdMob si Tauri iOS, sinon `StubAdProvider` (dev web/simulateur). **Aucun changement dans les 3 écrans consommateurs ni dans les libellés i18n** (ils redeviennent véridiques).

Commandes exposées (périmètre minimal, YAGNI) :
- `initialize()` — consentement + init SDK + préchargement d'une rewarded.
- `showRewardedAd()` → `{ rewarded: boolean }`.

## Parcours consentement (premier lancement iOS)

1. `UMPConsentInformation.requestConsentInfoUpdate` → si requis (zone RGPD), présentation du formulaire UMP (message configuré dans la console AdMob, message ATT joint).
2. Prompt ATT natif (`ATTrackingManager`), déclenché via le flux UMP.
3. Init `GADMobileAds` → préchargement rewarded en arrière-plan.

Lancements suivants : consentement stocké, pas de re-prompt. Refus total → pubs non personnalisées (revenus moindres, fonctionnelles). Le jeu reste jouable à l'identique sans consentement (les pubs sont des bonus opt-in).

## Gestion des erreurs

L'UI existante affiche déjà `erreurPub` — aucun nouvel état UI.

- Pub non chargée au tap → chargement à la demande, timeout 8 s → échec = `{ rewarded: false }` + erreur ; le joueur ne perd rien.
- Fermeture anticipée → `{ rewarded: false }` (le callback récompense Google n'arrive qu'au visionnage complet).
- Après chaque présentation : préchargement automatique de la suivante.
- Pièges natifs traités d'entrée : root view controller via `UIApplication.shared.connectedScenes` ; pattern `pendingInvoke` pour l'async ; types préfixés `GAD*` (SDK Obj-C) ; SDK linké sur **l'app ET le plugin** (cause du « module not found »).

## Configuration & IDs

- `Info.plist` (gen/apple, committé) : `GADApplicationIdentifier` ; liste `SKAdNetworkItems` officielle Google complète (~50 entrées) ; `NSUserTrackingUsageDescription` **localisée FR/EN/ES/EL** via `InfoPlist.strings` (Apple rejette les descriptions ATT vagues).
- Blocs d'annonces : **IDs de test officiels Google jusqu'à la validation device incluse**, bascule vers les vrais IDs par **constante de config committée** juste avant la soumission (étape 4). Nota : les builds TestFlight sont des builds release — une sélection debug/release ne suffirait pas ; c'est la constante qui fait foi. Jamais de vrais IDs pendant le dev/la validation — risque de ban AdMob (impressions/clics du développeur).

## Séquencement (risque CI front-loadé)

1. **Spike de build** : plugin squelette + dépendance SDK seulement → push → CI verte + IPA sur TestFlight, AVANT toute logique.
2. Logique Swift complète + provider TS + Info.plist.
3. Validation device (Guillaume, pubs de test via TestFlight).
4. Bascule vrais IDs + mise à jour `/privacy` et `/mentions-legales` → soumission.

En parallèle (Guillaume, console AdMob / App Store Connect) : enregistrer l'app iOS (App ID `ca-app-pub-…`), créer le bloc rewarded, configurer le message UMP+ATT, lier App Store Connect ↔ AdMob, publier `app-ads.txt` sur le domaine Vercel, remplir App Privacy (fini « Data Not Collected » : identifiants + données pub, tracking si ATT).

Estimation : 3-6 jours dont 1-2 incompressibles (allers-retours TestFlight, propagation des nouveaux blocs AdMob).

## Tests

- TS : tests unitaires du choix de provider (`getAdProvider` selon plateforme) et du contrat `AdMobAdProvider` (mapping succès/échec/timeout vers `AdResult`), invoke Tauri mocké.
- Natif : non testable unitairement dans ce repo — validation par le spike CI puis sur device (checklist : formulaire UMP, prompt ATT, pub de test complète → gain, fermeture anticipée → pas de gain, hors-ligne → erreur propre, retour d'arrière-plan pendant une pub).
- Filets existants inchangés : 1236 tests, eslint, build export.
