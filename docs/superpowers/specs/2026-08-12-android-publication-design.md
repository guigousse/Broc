# Portage Android — sous-projet D : publication Play Store

## 1. Objectif

Déposer un premier AAB signé de BROC sur une piste de **test fermé** du Play Store,
et y faire entrer 12 testeurs. Deux verrous sautent alors :

- le produit d'achat du sous-projet C ne peut être créé dans Play Console qu'après le
  dépôt d'un premier binaire ;
- le compte développeur étant un compte **personnel créé après le 13 novembre 2023**,
  Google exige 12 testeurs inscrits en continu pendant 14 jours avant d'autoriser la
  production. Ces 14 jours sont un délai d'attente : ils doivent courir pendant qu'on
  développe B et C, pas après.

C'est pour cela que D passe avant B et C, contrairement à l'ordre alphabétique du
découpage initial.

## 2. Place dans le découpage global

| | Sous-projet | État |
|---|---|---|
| A | Socle jouable | **fait** — `docs/android/2026-08-12-recette-emulateur.md` |
| B | Pubs AdMob Android | à venir |
| C | Achat « énergie infinie » | à venir, dépend de D |
| **D** | **Publication Play Store** | **cette spec** |
| E | Recette sur appareil | quand un téléphone Android sera disponible |

## 3. Périmètre de D

**Dans le périmètre**

- générer la clé d'upload et la câbler dans Gradle ;
- un workflow GitHub Actions qui rend un AAB **signé** en artefact ;
- créer l'app dans Play Console avec une fiche **minimale** ;
- ouvrir la piste de test fermé et son groupe de testeurs ;
- déposer le premier AAB et lancer le test ;
- écrire le mode d'emploi des testeurs et la recette Play Console.

**Hors périmètre** — AdMob (B), Play Billing (C), passage en production, fiche léchée en
quatre langues, captures Android définitives (des provisoires suffisent à un test fermé),
et l'automatisation du dépôt par l'API Play (voir § 13).

## 4. État des lieux (constaté le 2026-08-12)

| Point | Constat |
|---|---|
| `applicationId` | `com.guigousse.broc`, suffixe `.debug` en debug |
| `compileSdk` / `targetSdk` | 36 / 36 — au-delà du minimum exigé par Google |
| `minSdk` | 24 (Android 7.0) |
| `buildTypes.release` | `isMinifyEnabled = true` + ProGuard, déjà en place |
| Signature release | **absente** — c'est l'objet de cette spec |
| `versionCode` / `versionName` | `1002000` / `1.2.0`, lus dans `tauri.properties` (fichier autogénéré) |
| CI existante | `.github/workflows/ios-testflight.yml` : build `macos-15`, dépôt TestFlight, secret `.p8` |
| Fiche magasin | `docs/appstore/FICHE_APP_STORE.md`, 4 langues, réutilisable |
| APK debug | 311 Mo, dont 152 Mo de `libapp_lib.so` non strippé — sans rapport avec la taille en release |

## 5. Le chemin critique : 12 testeurs pendant 14 jours

Règle vérifiée le 2026-08-12 auprès de la documentation Play Console : **12 testeurs**
(seuil abaissé de 20 à 12 le 11 décembre 2024) **inscrits en continu pendant 14 jours**
sur une piste de **test fermé**. Le test *interne* ne déclenche pas ce compteur.

Trois conséquences qui gouvernent le plan :

1. la piste à ouvrir est **fermée**, pas interne ;
2. les testeurs doivent réellement **accepter l'invitation et installer** le jeu ; une
   désinscription en cours de route remet le compteur à zéro ;
3. tout ce qui retarde le premier dépôt retarde la sortie d'autant.

**Recrutement.** Guillaume passe par un service payant de testeurs. Le risque a été
signalé — Google refuse des accès production pour test artificiel — et la décision lui
appartient. La spec le traite donc, en atténuant : les adresses fournies par le
prestataire sont hébergées dans un **groupe Google** (un remplacement se fait alors dans
le groupe, pas dans la console, où la propagation est lente), et **au moins deux testeurs
réels** (Guillaume et un proche) y sont mêlés, pour de vrais retours et un profil moins
uniforme. Prévoir deux ou trois adresses de réserve : sur quatorze jours, il faut
s'attendre à devoir en remplacer.

## 6. Signature

Play App Signing est obligatoire pour toute nouvelle application : **Google détient la
clé de signature finale**, le développeur ne détient qu'une **clé d'upload**. La perdre
n'est donc pas fatal — Google sait la réinitialiser — mais elle doit être sauvegardée.

- Clé générée sur le Mac par `keytool` : RSA 2048, validité 10 000 jours (Google exige au
  moins 25 ans), alias `broc-upload`.
- Le `.jks` et ses deux mots de passe sont conservés par Guillaume hors du dépôt, et ne
  sont **jamais** commités.
- Quatre secrets du dépôt : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Même modèle que le `.p8` Apple du
  pipeline iOS.
- `src-tauri/gen/android/app/build.gradle.kts` reçoit un `signingConfigs.release`
  alimenté par l'environnement, appliqué à `buildTypes.release`. Quand les variables sont
  absentes (build locale ordinaire), la configuration n'est pas appliquée et Gradle rend
  un AAB non signé, comme aujourd'hui — une build de développement ne doit pas exiger la
  clé.

C'est le troisième fichier généré édité à la main, après `AndroidManifest.xml` et
`MainActivity.kt` : il reçoit le même en-tête d'avertissement.

## 7. Le workflow CI

`.github/workflows/android-play.yml`, jumeau de `ios-testflight.yml` mais sur
`ubuntu-latest` — gratuit en minutes, et surtout à l'abri du disque du Mac : un AAB de
release compile **les quatre ABI**, soit 12 à 16 Gi d'artefacts Rust, quand la machine de
Guillaume a 5 Gi libres.

Étapes : checkout, garde-fou sur les quatre secrets (une chaîne vide n'est pas une valeur
absente pour GitHub — mieux vaut échouer en quelques secondes qu'après une heure de
build), libération d'espace disque du runner, JDK 17, SDK Android + NDK, Node 20,
`rustup target add` × 4 (`aarch64`, `armv7`, `i686`, `x86_64`), `npm ci`, régénération des
fichiers Android non versionnés (`tauri android init` puis restauration des fichiers
suivis, voir § 7.1), `tauri android build --aab`, puis publication de l'AAB **en artefact
téléchargeable**. Pas d'étape `npm run build` séparée : `beforeBuildCommand` dans
`tauri.conf.json` s'en charge déjà pendant `tauri android build`, un export manuel en
amont ferait doublon (5 à 10 minutes perdues).

**Déclenchement** : `workflow_dispatch` (le mode voulu, déposer sur Play se décide,
contrairement à une build TestFlight) **plus, temporairement, un déclencheur `push`**
restreint à `feat/android-socle` et aux chemins qui comptent. Motif : GitHub n'affiche
« Run workflow » que pour un workflow présent sur la branche par défaut ; tant que cette
branche n'est pas fusionnée sur `main`, `push` est le seul moyen de la lancer. À retirer
après la fusion.

### 7.1 Les six familles de fichiers Gradle non versionnés

`src-tauri/gen/android/` est sous git, mais les `.gitignore` livrés par Tauri excluent
`tauri.settings.gradle`, `app/tauri.build.gradle.kts`, `app/tauri.properties`,
`app/proguard-tauri.pro`, `app/proguard-wry.pro`, `app/src/main/java/.../generated/*.kt`
et `app/src/main/assets/tauri.conf.json`. Or `settings.gradle` fait
`apply from: 'tauri.settings.gradle'` : sur un checkout propre, Gradle échoue
immédiatement. Ces fichiers sont écrits par `tauri-build` pendant `cargo build`, lui-même
lancé **par** Gradle — œuf et poule — et contiennent des chemins absolus, donc les
commiter n'est pas une option.

Le workflow les régénère avec `npx tauri android init`, puis restaure par
`git checkout -- src-tauri/gen/android` les fichiers **suivis** (dont
`build.gradle.kts`, `AndroidManifest.xml`, `MainActivity.kt`, édités à la main) sans
toucher aux fichiers générés qui viennent d'apparaître.

**`versionCode`.** Play exige qu'il augmente strictement à chaque dépôt, et il y en aura
plusieurs pendant les 14 jours. Le workflow le surcharge par une variable
d'environnement valant `1002000 + numéro de run`, `build.gradle.kts` retombant sur
`tauri.properties` quand elle est absente. `versionName` reste `1.2.0` : les six fichiers
de version ne bougent pas pour une simple build de test.

## 8. Play Console — la part manuelle

Ces étapes se font dans l'interface, par Guillaume, guidé par la recette écrite (§ 10) :

1. créer l'application, `com.guigousse.broc`, jeu, gratuit ;
2. adhérer à **Play App Signing** ;
3. **fiche minimale** : nom, description courte (80 car.) et longue, reprises de
   `FICHE_APP_STORE.md` (FR et EN suffisent pour un test fermé) ; icône 512×512 ;
   image de couverture 1024×500 ; au moins deux captures téléphone, provisoires,
   rééchantillonnées depuis celles de l'App Store ; URL de politique de confidentialité
   déjà en ligne depuis le lancement iOS ;
4. questionnaire de **classification de contenu** et public cible ;
5. **Data safety** : déclarer **l'état réel d'aujourd'hui**, à savoir aucune collecte —
   sur Android, pubs et achat sont explicitement indisponibles (sous-projet A). Cette
   déclaration **devra être rectifiée quand B atterrira** : AdMob collecte l'identifiant
   publicitaire. Une déclaration fausse est un motif de suspension ;
6. déclaration « contient des publicités » : **non** aujourd'hui, à rectifier avec B ;
7. créer la piste **test fermé**, y rattacher le groupe Google des testeurs ;
8. déposer l'AAB produit par la CI, publier la version, relever le lien d'inscription.

## 9. Vérification

Rien n'est unitairement testable ici : ce sont de la configuration et un pipeline. La
preuve se fait donc sur le binaire lui-même, et elle est réelle.

**Étape 0, sur l'AAB lui-même, avant tout le reste.** `bundletool build-apks --ks=…`
**signe lui-même** les APK qu'il produit à l'étape 1 ci-dessous : `apksigner verify` à
l'étape 3 affichera donc toujours le bon certificat, **même si l'AAB d'entrée n'était pas
signé**. Ça ne prouve rien sur l'AAB déposé par la CI — seulement sur ce que `bundletool`
vient de refaire. La vraie vérification porte donc sur l'AAB brut :

```bash
jarsigner -verify -certs -verbose app-universal-release.aab | head -20
```

Attendu : `jar verified` et `CN=Guillaume Fenard`. Si `jar is unsigned`, l'AAB n'est pas
signé — Play le refuserait au dépôt (« The Android App Bundle was not signed ») ; c'est
la CI (les quatre secrets) qu'il faut reprendre, pas les étapes suivantes.

**Alignement 16 Ko.** Depuis le 1er novembre 2025, Play exige la compatibilité 16 Ko pour
toute nouvelle application ciblant Android 15+ (ici `targetSdk = 36`). Un `.so` aligné 4
Ko ne se charge pas sur un appareil 16 Ko : l'app ne démarre pas, alors que l'émulateur
`broc-pixel6` (4 Ko) la lance normalement et valide la recette à tort. Mesurer
l'artefact **arm64 de release réel**, pas un `.so` x86_64 de debug :

```bash
llvm-readelf -lW base/lib/arm64-v8a/libapp_lib.so | grep LOAD   # attendu : 0x4000
```

Puis le reste de la chaîne :

```bash
# 1. dérouler l'AAB en APK, signé avec la clé d'upload
bundletool build-apks --mode=universal --bundle=broc.aab --output=broc.apks \
  --ks="$KEYSTORE" --ks-key-alias=broc-upload
# 2. installer sur l'émulateur déjà démarré
bundletool install-apks --apks=broc.apks
# 3. confirme que bundletool a bien signé avec cette clé (ne dit rien de l'AAB d'entrée,
#    voir « Étape 0 » ci-dessus — c'est un contrôle de cohérence, pas la preuve)
unzip -p broc.apks universal.apk > universal.apk && apksigner verify --print-certs universal.apk
```

Puis lancement sur l'émulateur `broc-pixel6` : le jeu démarre, le menu s'affiche, une
partie se lance. **Un AAB jamais installé n'est pas un AAB vérifié** — c'est justement en
release que `minifyEnabled` et ProGuard entrent en jeu. Le point à risque n'est **pas**
le pont JavaScript `BrocInsets` : les méthodes `@JavascriptInterface` sont protégées par
défaut par AGP 8.11 (`-keepclassmembers class * { @android.webkit.JavascriptInterface
<methods>; }`, déjà dans `proguard-android-optimize.txt`). Le point à risque réel est le
pont **Tauri/wry** (`RustWebView`, `WryActivity`, `Ipc`, `TauriActivity`), appelé par nom
depuis Rust et protégé uniquement par les fichiers `proguard-tauri.pro`/
`proguard-wry.pro` générés par `tauri android init` — d'où l'étape de bootstrap qui les
régénère en CI avant la build (§ 7).

Les 2031 tests unitaires doivent rester verts : cette spec ne touche pas au front.

## 10. Livrable écrit

`docs/android/2026-08-12-publication-play.md` :

- la recette Play Console pas à pas, dans l'ordre où l'interface la demande ;
- le **message type** aux testeurs : accepter l'invitation, installer depuis le lien,
  **ne pas désinstaller pendant 14 jours**, et à qui remonter les bugs ;
- la date de démarrage du test et la date d'éligibilité visée ;
- la liste de ce qu'il faudra reprendre à l'arrivée de B (Data safety, déclaration de
  publicité, permission `AD_ID`) et de C (produit d'achat).

## 11. D est fini quand

1. `keytool` a produit la clé d'upload, sauvegardée par Guillaume, et les quatre secrets
   existent dans le dépôt ;
2. le workflow rend un AAB signé, téléchargeable en artefact ;
3. cet AAB s'installe et se lance sur l'émulateur, et `apksigner` confirme la clé ;
4. l'application existe dans Play Console, fiche minimale complète, classification et
   Data safety remplies ;
5. la piste de test fermé est publiée et son lien d'inscription est connu ;
6. les 12 testeurs sont inscrits, et la date d'éligibilité (J+14) est écrite noir sur
   blanc dans le compte rendu.

## 12. Risques laissés ouverts, sciemment

- **Le test payant.** Google peut refuser l'accès production s'il juge le test
  artificiel. Décision de Guillaume, prise en connaissance de cause ; atténuée par
  l'ajout de testeurs réels.
- **La release n'a jamais tourné.** Tout ce qui a été validé jusqu'ici l'a été en debug,
  sans minification. Le § 9 existe précisément pour que R8 ne se découvre pas au moment
  du dépôt en production.
- **La déclaration Data safety devra changer deux fois** (B puis C). Le § 10 en garde la
  trace pour qu'on ne l'oublie pas.
- **Aucune recette sur appareil réel** (sous-projet E). Les testeurs du test fermé en
  tiendront lieu partiellement — c'est d'ailleurs leur seul intérêt technique.
- **L'alignement 16 Ko n'est vérifié que sur l'AAB de la CI, pas encore mesuré à ce jour.**
  Play l'exige depuis le 1er novembre 2025 pour toute nouvelle app ciblant Android 15+
  (`targetSdk = 36` ici) ; un `.so` mal aligné ne se charge pas sur un appareil 16 Ko alors
  que l'émulateur `broc-pixel6` (4 Ko) le lancerait sans broncher et validerait la recette
  à tort. Le NDK r27 aligne à 16 Ko par défaut, donc le risque est faible, mais le § 9
  ajoute une mesure `llvm-readelf` sur le `.so` arm64 réel avant tout dépôt. Si elle
  échoue, la correction (NDK r28+, ou `-Wl,-z,max-page-size=16384`) est un sujet à part,
  pas à traiter dans l'urgence d'un dépôt.

## 13. Décisions écartées

- **Dépôt automatique par l'API Play** (compte de service + `gradle-play-publisher`),
  comme le pipeline iOS le fait pour TestFlight. Écarté **pour ce lot seulement** : la
  première fiche doit de toute façon être créée à la main, l'API exige que l'app existe,
  et l'appairage des droits du compte de service retarderait le premier dépôt, donc les
  14 jours. À reprendre quand la mécanique sera rodée.
- **Build locale sur le Mac.** 12 à 16 Gi d'artefacts Rust pour 5 Gi libres. La session
  du 2026-08-12 a perdu trois builds sur un disque plein ; on ne recommence pas.
- **Signature en local d'un AAB non signé produit par la CI.** Plus sûr sur le papier
  (la clé ne quitte pas le Mac), mais ajoute une étape manuelle à chaque dépôt, et le
  dépôt sera fréquent pendant les 14 jours. Le modèle « secret dans le dépôt » est déjà
  celui du `.p8` Apple.
- **Laisser Google générer aussi la clé d'upload.** Plus simple au départ, mais on perd
  la distinction upload / signature, et donc la réinitialisation propre en cas de fuite.
- **Publier d'emblée une fiche complète en quatre langues.** Un test fermé n'exige pas
  cette qualité, et chaque jour passé à la fignoler est un jour ajouté aux 14.
