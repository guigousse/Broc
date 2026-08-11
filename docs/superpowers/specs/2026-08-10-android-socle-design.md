# Portage Android — sous-projet A : le socle jouable

Date : 2026-08-10
Branche cible : `feat/android-socle`, issue de `feat/tuto-brocante-scriptee`

## 1. Objectif

Faire tourner BROC de bout en bout sur un émulateur Android, avec un affichage
plein écran correct et un bouton retour matériel qui se comporte comme il faut.
Publicités et achat intégré sont **visiblement indisponibles** sur Android, et
non pas gratuits.

Le livrable qui compte autant que le code : un compte rendu écrit des surprises
Android rencontrées, qui alimentera les sous-projets suivants.

## 2. Place dans le découpage global

L'objectif de Guillaume est la parité complète avec iOS et une publication sur
le Play Store. C'est trop gros pour une seule spec ; le chantier est découpé en
cinq sous-projets, chacun avec son cycle spec → plan → implémentation.

| | Sous-projet | Contenu |
|---|---|---|
| **A** | **Socle jouable** | **cette spec** |
| B | Pubs AdMob Android | plugin Kotlin (SDK AdMob + consentement UMP), app AdMob Android, 3 blocs rewarded |
| C | Achat « énergie infinie » | plugin Kotlin Google Play Billing, produit Play Console |
| D | Publication Play Store | keystore, Play App Signing, AAB, fiche 4 langues, Data safety, pistes de test |
| E | Recette sur appareil | quand un téléphone Android sera disponible |

Deux contraintes d'ordre connues :

- le produit d'achat de **C** ne peut être créé dans Play Console qu'après le
  dépôt d'un premier AAB sur une piste — **D commence donc avant que C ne soit
  testable** ;
- si le compte Play Console est un compte **personnel créé après novembre
  2023**, Google exige un test fermé de **12 testeurs pendant 14 jours
  consécutifs** avant d'autoriser la production. À vérifier dès maintenant :
  c'est le chemin critique de la date de sortie, et ça se lance en parallèle du
  développement, pas après.

## 3. Périmètre de A

**Dans le périmètre**

- libérer l'espace disque nécessaire ;
- installer la toolchain Android ;
- générer le projet Android (`tauri android init`) ;
- remplacer la détection de plateforme par User-Agent iPhone par une notion de
  plateforme à trois états ;
- introduire des providers « indisponible » pour les pubs et l'achat sur
  Android ;
- traiter le bouton retour matériel ;
- traiter le plein écran / les encoches ;
- verrouiller l'orientation portrait ;
- outiller et mener une recette sur émulateur.

**Hors périmètre** — AdMob Android (B), Play Billing (C), keystore / fiche /
publication (D), recette sur appareil réel (E). Aucun code natif Kotlin n'est
écrit en A.

## 4. État des lieux (constaté le 2026-08-10)

- `src-tauri/gen/` ne contient que `apple/` : aucun projet Android généré.
- Aucune toolchain Android sur la machine : pas de JDK (`java` introuvable),
  pas d'Android Studio, pas de SDK/NDK, et `rustup` n'a que les cibles Apple.
- Mac **Intel (x86_64)**.
- Disque : 233 Gi, 205 Gi utilisés, **8,6 Gi libres (96 %)**.
- Les deux plugins vendorés **compilent déjà pour Android** : `lib.rs` gate sur
  `#[cfg(target_os = "ios")]` / `#[cfg(not(target_os = "ios"))]`, donc Android
  tombe sur `desktop.rs`, qui renvoie `Error::UnsupportedPlatform`. **Aucun
  travail Rust n'est nécessaire pour que le crate build.**
- `tauri-plugin-notification` vendoré possède bien un dossier `android/`.
- `tauri.conf.json` contient déjà `bundle.android.debugApplicationIdSuffix`.
- `layout.tsx` pose déjà `viewportFit: "cover"` et `themeColor: "#1A3326"` ;
  `globals.css` lit déjà `env(safe-area-inset-*)`.
- `@tauri-apps/api` est en `^2.11.1`, donc `onBackButtonPress` (arrivé en 2.9)
  est disponible.
- `feat/tuto-brocante-scriptee` est **100 commits devant `main`** et porte 15
  fichiers non commités.

### Le risque central de A

Sur Android, les façades actuelles retombent silencieusement sur les stubs de
développement :

```
adMobDisponible()    → false → StubAdProvider  → { rewarded: true } gratuit
tauriIosDisponible() → false → StubIapProvider → acheter() renvoie "achete"
```

Le jeu offrirait donc **les récompenses de publicité et l'énergie infinie
gratuitement**, en silence. Sans conséquence sur émulateur, inacceptable si un
AAB partait par erreur. C'est ce que la section 8 corrige.

## 5. Étape 0 — Libérer de l'espace

La toolchain demande 12 à 15 Gi (Android Studio ~2,5, SDK ~5, NDK ~5, image
d'émulateur ~2), et les cibles Rust Android vont gonfler `src-tauri/target`,
déjà à 6,8 Gi. Les 8,6 Gi libres ne suffisent pas.

Gisements repérés :

| Cible | Gain | Coût |
|---|---|---|
| Simulateurs iOS (`~/Library/Developer/CoreSimulator/Devices`) | 15 Gi au total | se recréent en quelques secondes |
| `src-tauri/target` | jusqu'à 6,8 Gi | `cargo clean` → recompilation complète à la prochaine build iOS |
| `~/Library/Developer/Xcode/DerivedData` | 1,1 Gi | se régénère seul |

**Décision :** supprimer cinq simulateurs iOS, en conservant `iPhone 16 Pro`
(défaut de `scripts/ios-sim.sh`) et `Broc 6.5` (simulateur sur mesure des
captures App Store) — soit ~8,5 Gi libérés, pour un total d'environ 17 Gi.
`cargo clean` reste en réserve si l'installation demande davantage.

UUID retenus pour suppression :

```
9C6F881C-02AF-447D-92AD-A43BB90E117B  iPad Pro 13-inch (M4)  iOS-18-3  2908 Mo
A0853334-42BE-4B11-8096-2D92335BC497  iPhone 16 Pro Max      iOS-18-3  2123 Mo
E165B5FA-B52A-4D70-AD2F-4021683BBB66  iPhone 15              iOS-17-5  1837 Mo
CBE94A9F-D94F-46D0-86F0-178C4BAADC12  iPad Pro 11-inch (M4)  iOS-18-3  1483 Mo
B3F369E0-3A44-4F74-8C9F-8823F557800A  iPad Air 13-inch (M2)  iOS-18-3   166 Mo
```

Le garde-fou de sécurité de Claude Code bloque `simctl delete` : la commande est
lancée par Guillaume lui-même.

## 6. Étape 1 — Base git

1. Committer les 15 fichiers en cours sur `feat/tuto-brocante-scriptee`, en
   commits cohérents : d'un côté le travail AdMob par emplacement
   (`EMPLACEMENTS_PUB`, plugin, bridge Swift, `emplacementsAppeles.test.ts`), de
   l'autre le polish tuto et `dialogueActif`.
2. Tests verts avant commit : `npx vitest run --maxWorkers=4` (le drapeau est
   obligatoire sur ce Mac Intel, sans lui ~41 faux échecs par famine de
   workers).
3. Créer `feat/android-socle` depuis cette branche.

Android hérite ainsi du tutoriel et des emplacements publicitaires, dont B aura
besoin.

## 7. Étape 2 — Toolchain et projet Android

Le Mac étant Intel, l'émulateur tournera en image **x86_64** : le développement
quotidien n'a besoin que de la cible Rust `x86_64-linux-android`. Les quatre
cibles ne seront requises qu'à l'AAB de release, en phase D.

1. `brew install --cask android-studio` (Homebrew présent en 6.0.13).
2. SDK Manager : SDK Platform (dernière API stable), Platform-Tools, **NDK**,
   Build-Tools, Command-line Tools.
3. Dans `~/.zshrc` : `JAVA_HOME` vers le JDK embarqué d'Android Studio (aucun
   Java sur la machine), `ANDROID_HOME="$HOME/Library/Android/sdk"`,
   `NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"`.
4. `rustup target add x86_64-linux-android`.
5. Créer un AVD x86_64 avec **image Google Play** — indispensable, B et C
   exigeront les Google Play Services.
6. `npm run tauri android init` → génère `src-tauri/gen/android/`.

Le contenu généré est commité tel quel, sans retouche. Toute édition manuelle
ultérieure devra porter le même avertissement que `main.mm` et
`AdmobBridge.swift` : fichier généré mais édité à la main, à ne pas régénérer
sans reporter le correctif.

## 8. Étape 3 — Plateforme et providers

C'est le cœur du travail de A, et il est entièrement testable sans émulateur.

### 8.1 Une plateforme à trois états

`src/lib/plateforme.ts` expose :

```ts
export type PlateformeNative = "ios" | "android";
export function plateformeNative(): PlateformeNative | null;
```

- `null` hors runtime Tauri (web, dev desktop, tests) — c'est le confort de
  développement actuel, il ne change pas ;
- la détection iOS existante est conservée à l'identique, y compris la ruse
  iPadOS 13+ (User-Agent « Macintosh » distingué d'un vrai Mac par
  `maxTouchPoints > 1`) ;
- Android est détecté par `/Android/` dans l'User-Agent.

`tauriIosDisponible()` devient un mince appel à `plateformeNative() === "ios"`,
pour ne rien casser de ses appelants (`IapBootstrap.tsx:19`,
`iapProvider.ts:42`). La duplication actuelle avec `adMobDisponible()`
(`adMobProvider.ts:8`) disparaît : cette fonction délègue elle aussi.

### 8.2 Trois comportements au lieu de deux

| Plateforme | Pubs | Achat |
|---|---|---|
| `"ios"` | `AdMobAdProvider` (inchangé) | `TauriIapProvider` (inchangé) |
| `"android"` | `IndisponibleAdProvider` | `IndisponibleIapProvider` |
| `null` | `StubAdProvider` (inchangé) | `StubIapProvider` (inchangé) |

Les providers « indisponible » rejettent avec une erreur typée. Ils ne doivent
jamais être appelés : ils sont le filet, pas le mécanisme.

Le mécanisme, ce sont deux prédicats que l'UI consulte :

```ts
export function pubDisponible(): boolean;    // src/lib/ads/adProvider.ts
export function achatDisponible(): boolean;  // src/lib/iap/iapProvider.ts
```

Tous deux sont vrais si `plateformeNative() !== "android"`.

### 8.3 Points d'appel à traiter

Publicités :

- `src/components/mobile/EnergieRecharge.tsx:281` — le bouton « regarder une
  pub pour +1 ⚡ » n'est pas rendu si `pubDisponible()` est faux ; la modale
  reste fonctionnelle grâce à la recharge par le temps ;
- `src/app/(qg)/atelier/page.tsx:104` — le bouton qui termine une restauration
  immédiatement n'est pas rendu ; la restauration se poursuit normalement ;
- `src/components/mobile/AdMobBootstrap.tsx:15` — déjà gaté par
  `adMobDisponible()` puis par `instanceof AdMobAdProvider` : correct par
  construction, rien à faire ;
- `src/components/mobile/BoiteMystereOverlay.tsx:125` — **cas structurel, voir
  ci-dessous**.

Achat :

- `src/components/mobile/IapBootstrap.tsx:19` — déjà gaté par
  `tauriIosDisponible()`, donc correct par construction ;
- `src/components/mobile/EnergieRecharge.tsx:213` (prix) et `:302` (achat) —
  l'offre « énergie infinie » n'est pas rendue si `achatDisponible()` est faux ;
- `src/components/mobile/ReglagesModal.tsx:375` — l'entrée « restaurer mes
  achats » n'est pas rendue.

### 8.4 La boîte mystère — décision

La boîte mystère **est** la publicité : masquer son bouton laisserait dans le
deck de chinage une carte impossible à ouvrir, donc une frustration.

**Décision :** sur Android, le vendeur mystère n'apparaît pas du tout. Le point
d'appel de `tenterApparition()` est `src/app/chiner/[brocanteId]/ClientPage.tsx:247` ;
on le gate sur `pubDisponible()`. `src/lib/boiteMystere.ts` n'est pas modifié —
il reste une bibliothèque pure, et ses tests existants restent valides.

Cette décision est temporaire : elle disparaît à la livraison de B.

### 8.5 Tests

Le motif est déjà en place dans `adMobProvider.test.ts` : on falsifie
`window.__TAURI_INTERNALS__` et `navigator.userAgent`. Couverture attendue :

- `plateformeNative()` — iOS, iPadOS 13+, Android, hors Tauri ;
- `getAdProvider()` / `getIapProvider()` — le bon provider pour chacun des
  trois cas ;
- `pubDisponible()` / `achatDisponible()` — faux sur Android, vrai ailleurs ;
- les providers « indisponible » rejettent ;
- une garde contre la régression du risque central : sur Android, aucune façade
  ne renvoie de récompense ni d'achat réussi.

Développement en TDD, test d'abord.

## 9. Étape 4 — Adaptations Android

### 9.1 Bouton retour matériel

Non traité, il ferme l'application depuis n'importe quel écran. `onBackButtonPress`
de `@tauri-apps/api` le rend traitable en JavaScript, sans Kotlin.

**Comportement retenu — pile de fermeture :** le retour ferme d'abord l'overlay
ou la sheet la plus haute ; à défaut il remonte d'un niveau de navigation ; sur
l'écran racine il demande confirmation avant de quitter.

Implémentation : un composant unique monté au même endroit que le reste du
chrome global, et **gaté sur `estRoutePartie()`** — la règle maison, puisque la
sauvegarde reste chargée hors partie.

### 9.2 Plein écran, encoches, orientation

`viewportFit: "cover"`, `themeColor` et les variables `--safe-*` sont déjà en
place et devraient suffire. **Mais rien ne garantit que la WebView Android
renseigne `env(safe-area-inset-*)`** : cela dépend du mode edge-to-edge de
l'activité et de la version de WebView. C'est une inconnue à lever sur
émulateur, pas sur le papier.

Repli si les insets sortent à 0 : alimenter les variables CSS depuis le natif.
Aucun code n'est écrit par anticipation.

Le jeu est en portrait : le manifeste Android doit le verrouiller
(`screenOrientation="portrait"`), sinon la rotation casse la mise en page.

Le correctif viewport de `main.mm` **n'est pas porté** : il contourne un bug
propre à WKWebView. Android aura les siens, différents, et on les traitera
quand on les verra.

## 10. Étape 5 — Boucle de validation

`next dev` est inutilisable en webview mobile (piège connu du projet) : on sert
`out/`, comme sur iOS. On ajoute **`scripts/android-sim.sh`, jumeau de
`scripts/ios-sim.sh`** :

```
npm run build → tauri android build --debug → adb install -r → adb shell am start
```

Captures : `adb exec-out screencap -p`. Logs : `adb logcat`.

### Recette émulateur

1. **Lancement** — démarrage, transition iris, pas de flash blanc
2. **Plein écran** — le contenu touche les bords, pas de bande claire, barre
   système à `--forest-800` *(le point à risque)*
3. **Bouton retour** — depuis chaque niveau : sheet, modale, session de chine,
   écran racine
4. **Orientation** — portrait verrouillé
5. **Parcours complet** — tutoriel, chine, vente, atelier, carnet
6. **Audio** — jazz du menu et sons de chine (les politiques d'autoplay
   diffèrent de WebKit)
7. **Notifications** — la permission runtime `POST_NOTIFICATIONS` (Android 13+)
   est un ajout par rapport à iOS
8. **Pubs et achat** — vérifier qu'ils sont **absents**, pas gratuits ; vérifier
   qu'aucun vendeur mystère n'apparaît en chine
9. **Les 4 langues** — grec en priorité, point faible connu
10. **Poids et performances** — `out/` fait 140 Mo ; mesurer la taille de l'APK

## 11. A est fini quand

- le jeu se lance sur émulateur et se joue de bout en bout ;
- le bouton retour matériel se comporte comme décrit en 9.1 ;
- l'affichage est plein écran, en portrait ;
- publicités, achat et vendeur mystère sont absents sur Android ;
- `npx vitest run --maxWorkers=4` est vert ;
- `npx eslint src` est propre (`npm run lint` est cassé depuis Next 16) ;
- un compte rendu écrit des surprises Android est produit.

## 12. Risques laissés ouverts, sciemment

- **Safe-areas dans la WebView Android** — inconnue réelle, repli natif prévu ;
- **Performances sur mobile bas de gamme** — l'émulateur x86_64 sur ce Mac
  Intel flatte et ne dira rien de fiable ;
- **Poids de l'APK** — mesuré en A, traité en D si nécessaire ;
- **Test fermé 12 testeurs / 14 jours** de Google Play — à vérifier dès
  maintenant sur le compte, c'est le chemin critique de la date de sortie.

## 13. Décisions écartées

- **Une seule spec pour A à D** — trop de décisions invérifiables tant que le
  socle ne compile pas ; la moitié serait à réécrire.
- **Le plus court chemin** (générer le projet et lancer, sans toucher au front)
  — laisse les stubs actifs : rien de montrable, aucune capture utilisable, et
  la dette revient intacte en B et C.
- **Écrire les squelettes Kotlin dès A** pour prouver le pont Rust↔Kotlin —
  tentant, car c'est l'inconnue la plus risquée du projet global, mais ça
  retarde la seule question à laquelle A doit répondre : ce jeu tient-il debout
  sur Android ? Le pont a une documentation officielle claire et un plugin de
  référence dans `vendor/tauri-plugin-notification`. Risque connu, payé en B.
- **Brancher depuis `main`** — propre, mais on testerait un jeu qui n'est plus
  celui que Guillaume fait tourner, avec un rebase à payer plus tard.
