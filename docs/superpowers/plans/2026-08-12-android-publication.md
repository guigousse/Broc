# Publication Play Store (sous-projet D) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déposer un premier AAB signé de BROC sur une piste de test fermé du Play Store et y inscrire 12 testeurs, pour démarrer les 14 jours exigés et débloquer la création du produit d'achat du sous-projet C.

**Architecture:** Rien de tout cela ne se compile sur le Mac : un AAB de release exige les quatre ABI, soit 12 à 16 Gi d'artefacts Rust pour 5 Gi libres. La build vit donc dans GitHub Actions, sur `ubuntu-latest`, et rend l'AAB **signé** en artefact téléchargeable. Le dépôt dans Play Console reste manuel pour ce lot. Deux fichiers seulement changent côté code — le `build.gradle.kts` généré (signature + `versionCode` surchargeable) et un nouveau workflow — le reste est de la procédure écrite et des actions dans Play Console, que seul Guillaume peut faire.

**Tech Stack:** Gradle / AGP (Kotlin DSL), GitHub Actions (`ubuntu-latest`), Tauri v2.11 CLI (`tauri android build --aab`), NDK 27.3.13750724, `keytool`, `bundletool`, `apksigner`.

**Spec de référence :** `docs/superpowers/specs/2026-08-12-android-publication-design.md`

## Global Constraints

- **Branche de travail :** `feat/android-socle` (le sous-projet A n'est pas encore fusionné ; D s'appuie dessus). **Elle devra être poussée** pour que la CI existe côté GitHub — c'est une étape explicite de la Task 3, à faire valider par Guillaume.
- **Le keystore ne doit JAMAIS être commité**, ni son mot de passe apparaître dans un fichier suivi, un message de commit ou un log de CI.
- **Les fichiers de `src-tauri/gen/android/` sont générés mais édités à la main** : tout fichier modifié reçoit en tête le commentaire d'avertissement, à l'identique de `AndroidManifest.xml` et `MainActivity.kt`.
- **Une build locale ordinaire ne doit pas exiger la clé** : sans les variables d'environnement, la configuration de signature n'est pas appliquée et Gradle rend un AAB non signé, comme aujourd'hui.
- **Tests :** toujours `npx vitest run --maxWorkers=4`. Sans ce drapeau, ~41 faux échecs par famine de workers sur ce Mac Intel. Ce lot ne touche pas au front : les 2031 tests doivent rester verts, tels quels.
- **Lint :** `npx eslint src`. `npm run lint` est cassé depuis Next 16 — ne pas l'utiliser.
- **Toolchain locale** (aucun Android Studio) :
  ```bash
  export JAVA_HOME=/usr/local/opt/openjdk@17
  export ANDROID_HOME=/usr/local/share/android-commandlinetools
  export NDK_HOME="$ANDROID_HOME/ndk/27.3.13750724"
  export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
  ```
- **Disque :** vérifier `df -h /System/Volumes/Data` avant toute build. Sous 10 Gi libres, ne pas lancer de build Android locale — trois builds ont été tuées par `No space left on device` le 2026-08-12.
- **Commits en français**, fréquents, avec le trailer :
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```

## File Structure

**Créés**

| Fichier | Responsabilité |
|---|---|
| `.github/workflows/android-play.yml` | Build des 4 ABI et signature de l'AAB, sur `ubuntu-latest`, déclenchée à la main |
| `docs/android/2026-08-12-publication-play.md` | Recette Play Console, message type aux testeurs, dates du test fermé |

**Modifiés**

| Fichier | Modification |
|---|---|
| `src-tauri/gen/android/app/build.gradle.kts` | `signingConfigs.release` alimenté par l'environnement ; `versionCode` surchargeable |
| `.gitignore` | Refus explicite des keystores |

**Hors dépôt** — le keystore `broc-upload.jks` et ses mots de passe, conservés par Guillaume ; les quatre secrets du dépôt GitHub ; tout ce qui se passe dans Play Console.

---

### Task 1 : Clé d'upload et signature dans Gradle

**Files:**
- Modify: `src-tauri/gen/android/app/build.gradle.kts`
- Modify: `.gitignore`
- Hors dépôt : `~/broc-upload.jks` (créé par Guillaume)

**Interfaces:**
- Consumes: rien
- Produces: un `buildTypes.release` signé dès que `ANDROID_KEYSTORE_PATH` est défini — consommé par la Task 3 (CI) et la Task 4 (vérification)

- [ ] **Step 1 : Fermer la porte avant d'ouvrir la clé**

Ajouter à la fin de `.gitignore` :

```gitignore

# Clés de signature Android — ne doivent JAMAIS être commitées.
*.jks
*.keystore
keystore.properties
```

Vérifier tout de suite que la règle mord :

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
touch /tmp/essai.jks && cp /tmp/essai.jks ./essai.jks
git status --porcelain essai.jks   # doit ne RIEN afficher
git check-ignore -v essai.jks      # doit citer la règle *.jks
rm essai.jks
```

Attendu : `git status` muet, `git check-ignore` cite `.gitignore:*.jks`. **Si le fichier apparaît, s'arrêter** — inutile d'aller plus loin tant que le filet n'est pas en place.

- [ ] **Step 2 : Commit du filet**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore(android): les keystores ne peuvent plus être commités

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3 : Guillaume génère la clé d'upload**

**C'est à Guillaume de lancer cette commande** : elle choisit un mot de passe qui ne doit
transiter ni par un agent, ni par l'historique du shell d'un agent. Lui donner le texte
tel quel :

```bash
keytool -genkeypair -v \
  -keystore ~/broc-upload.jks \
  -alias broc-upload \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -dname "CN=Guillaume Fenard, O=Guigousse, C=FR"
```

`keytool` demandera deux fois un mot de passe (dépôt puis clé — **prendre le même**, la
CI n'en gère qu'une paire). Consignes à lui transmettre :

- conserver le `.jks` **et** le mot de passe dans son gestionnaire de mots de passe ;
- ne pas déplacer le fichier dans le dépôt ;
- 10 000 jours ≈ 27 ans : Google exige une validité d'au moins 25 ans.

- [ ] **Step 4 : Vérifier la clé produite**

```bash
export JAVA_HOME=/usr/local/opt/openjdk@17; export PATH="$JAVA_HOME/bin:$PATH"
keytool -list -v -keystore ~/broc-upload.jks -alias broc-upload | head -20
```

Attendu : l'alias `broc-upload`, `Signature algorithm name: SHA384withRSA` (ou SHA256),
une taille de clé de 2048 bits et une date d'expiration vers 2053. **Si l'alias diffère,
s'arrêter** : le nom `broc-upload` est câblé dans la CI et dans la Task 4.

- [ ] **Step 5 : Câbler la signature dans Gradle**

Dans `src-tauri/gen/android/app/build.gradle.kts`, ajouter en tête du fichier, avant
`import java.util.Properties` :

```kotlin
// ⚠ Fichier généré par `tauri android init` mais ÉDITÉ À LA MAIN : configuration de
//   signature de release et versionCode surchargeable (sous-projet D). Ne pas régénérer
//   sans reporter ces réglages — même situation que AndroidManifest.xml et
//   MainActivity.kt ici, et que main.mm / AdmobBridge.swift côté iOS.
```

Puis, juste après le bloc `val tauriProperties = ...`, ajouter :

```kotlin
// Chemin du keystore d'upload. Absent en développement : la build reste alors non
// signée, comme avant — développer ne doit pas exiger la clé de publication.
val cheminKeystore: String? = System.getenv("ANDROID_KEYSTORE_PATH")
```

Dans le bloc `android { ... }`, **avant** `buildTypes`, insérer :

```kotlin
    signingConfigs {
        create("release") {
            if (cheminKeystore != null) {
                storeFile = file(cheminKeystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "broc-upload"
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
```

Enfin, dans `buildTypes { getByName("release") { ... } }`, ajouter en **première** ligne
du bloc :

```kotlin
            if (cheminKeystore != null) {
                signingConfig = signingConfigs.getByName("release")
            }
```

- [ ] **Step 6 : Vérifier que Gradle voit la configuration**

`signingReport` liste les configurations de signature sans compiler une ligne de Rust —
c'est la vérification la moins chère qui prouve réellement quelque chose.

D'abord **sans** la clé, pour prouver qu'une build de développement reste possible :

```bash
cd "/Users/guillaume/dev/Projet Broc V2/src-tauri/gen/android"
export JAVA_HOME=/usr/local/opt/openjdk@17
export ANDROID_HOME=/usr/local/share/android-commandlinetools
./gradlew -q :app:signingReport | grep -A 4 "Variant: release"
```

Attendu : la variante `release` existe et sa `Config: none` (ou un keystore de debug) —
aucune erreur, aucun mot de passe réclamé.

Puis **avec** la clé (demander le mot de passe à Guillaume, ou le lui faire lancer) :

```bash
ANDROID_KEYSTORE_PATH="$HOME/broc-upload.jks" \
ANDROID_KEYSTORE_PASSWORD="<mot de passe>" \
ANDROID_KEY_ALIAS=broc-upload \
ANDROID_KEY_PASSWORD="<mot de passe>" \
./gradlew -q :app:signingReport | grep -A 6 "Variant: release"
```

Attendu : la variante `release` affiche maintenant l'empreinte SHA-256 de la clé
`broc-upload`. **Si Gradle réclame un mot de passe interactivement, la configuration est
mal câblée** — relire le Step 5 avant d'aller plus loin.

- [ ] **Step 7 : Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src-tauri/gen/android/app/build.gradle.kts
git commit -m "$(cat <<'EOF'
feat(android): signature de release pilotée par l'environnement

La configuration ne s'applique que si ANDROID_KEYSTORE_PATH est défini : une
build de développement reste possible sans la clé de publication.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : `versionCode` surchargeable

**Files:**
- Modify: `src-tauri/gen/android/app/build.gradle.kts`

**Interfaces:**
- Consumes: le fichier modifié en Task 1
- Produces: la variable d'environnement `ANDROID_VERSION_CODE`, consommée par la CI (Task 3)

**Pourquoi :** Play refuse un dépôt dont le `versionCode` n'est pas strictement supérieur
au précédent, et il y aura plusieurs dépôts pendant les 14 jours. Aujourd'hui la valeur
vient de `tauri.properties`, fichier autogénéré à partir de `version` dans
`tauri.conf.json` : la bouger obligerait à toucher les six fichiers de version à chaque
build de test.

- [ ] **Step 1 : Constater la valeur actuelle**

```bash
cat "/Users/guillaume/dev/Projet Broc V2/src-tauri/gen/android/app/tauri.properties"
```

Attendu : `tauri.android.versionName=1.2.0` et `tauri.android.versionCode=1002000`.

- [ ] **Step 2 : Rendre la valeur surchargeable**

Dans `src-tauri/gen/android/app/build.gradle.kts`, remplacer la ligne :

```kotlin
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
```

par :

```kotlin
        // Play exige un versionCode strictement croissant à chaque dépôt. La CI le
        // surcharge (base + numéro de run) pour qu'un dépôt de test n'oblige pas à
        // toucher les six fichiers de version. En local, tauri.properties fait foi.
        versionCode = (System.getenv("ANDROID_VERSION_CODE")
            ?: tauriProperties.getProperty("tauri.android.versionCode", "1")).toInt()
```

- [ ] **Step 3 : Vérifier sur un vrai binaire**

La build debug x86_64 est déjà compilée : elle se reconstruit en incrémental. C'est la
seule vérification qui prouve que la valeur atteint réellement le manifeste.

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
df -h /System/Volumes/Data | tail -1     # ne pas lancer sous 10 Gi libres
export JAVA_HOME=/usr/local/opt/openjdk@17
export ANDROID_HOME=/usr/local/share/android-commandlinetools
export NDK_HOME="$ANDROID_HOME/ndk/27.3.13750724"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
export CARGO_PROFILE_DEV_DEBUG=0
ANDROID_VERSION_CODE=1002042 npm run tauri android build -- --debug --target x86_64
apkanalyzer manifest print \
  src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk \
  | grep -E "versionCode|versionName"
```

Attendu : `android:versionCode="1002042"` et `android:versionName="1.2.0"`.

- [ ] **Step 4 : Vérifier que le défaut tient toujours**

```bash
npm run tauri android build -- --debug --target x86_64
apkanalyzer manifest print \
  src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk \
  | grep versionCode
```

Attendu : retour à `android:versionCode="1002000"`. **Si la valeur reste à 1002042**,
c'est que Gradle a servi un cache : relancer avec `--` puis vérifier de nouveau.

- [ ] **Step 5 : Commit**

```bash
git add src-tauri/gen/android/app/build.gradle.kts
git commit -m "$(cat <<'EOF'
feat(android): versionCode surchargeable par l'environnement

Play exige un versionCode strictement croissant à chaque dépôt ; la CI le
fabrique, sans toucher aux six fichiers de version du projet.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : Le workflow CI

**Files:**
- Create: `.github/workflows/android-play.yml`

**Interfaces:**
- Consumes: la signature (Task 1) et `ANDROID_VERSION_CODE` (Task 2)
- Produces: un artefact `broc-aab` contenant l'AAB signé — consommé par la Task 4

- [ ] **Step 1 : Lire le pipeline iOS existant**

```bash
cat "/Users/guillaume/dev/Projet Broc V2/.github/workflows/ios-testflight.yml"
```

En reprendre les conventions : commentaires en français, identifiants non secrets en
clair dans `env` (pour éviter les fautes de frappe), secrets réservés à ce qui est
réellement secret.

- [ ] **Step 2 : Guillaume crée les quatre secrets**

Dans **Settings → Secrets and variables → Actions** du dépôt `guigousse/Broc` :

| Secret | Contenu |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | sortie de `base64 -i ~/broc-upload.jks \| pbcopy` |
| `ANDROID_KEYSTORE_PASSWORD` | le mot de passe choisi au Step 3 de la Task 1 |
| `ANDROID_KEY_ALIAS` | `broc-upload` |
| `ANDROID_KEY_PASSWORD` | le même mot de passe |

- [ ] **Step 3 : Écrire le workflow**

Créer `.github/workflows/android-play.yml` :

> Le contenu ci-dessous est celui du workflow **au moment de sa conception initiale**. Il
> a depuis reçu des correctifs de revue (déclencheur `push` temporaire, bootstrap des
> fichiers Android générés, garde sur les secrets, libération d'espace disque, retrait
> de l'export front redondant, `$RUNNER_TEMP` au lieu de `${{ runner.temp }}`) : le
> fichier réel `.github/workflows/android-play.yml` fait foi, pas cette copie figée.

```yaml
name: Android → AAB signé

# Build des 4 ABI et signature de l'AAB de release, pour dépôt manuel dans Play Console.
#
# Déclenchement voulu : MANUEL (`workflow_dispatch`) — déposer sur Play se décide,
# contrairement à une build TestFlight. Et surtout, cette build ne peut pas tourner sur
# le Mac de Guillaume — les 4 ABI représentent 12 à 16 Gi d'artefacts Rust pour 5 Gi
# libres.
on:
  workflow_dispatch:
  # Temporaire : `workflow_dispatch` n'apparaît dans l'onglet Actions que si le
  # fichier existe sur la branche par défaut. Tant que feat/android-socle n'est pas
  # fusionnée, ce déclencheur est le seul moyen de lancer la build. À RETIRER après
  # la fusion sur main.
  push:
    branches: [feat/android-socle]
    paths:
      - '.github/workflows/android-play.yml'
      - 'src-tauri/**'
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    # Identifiants NON secrets, en clair pour éviter les fautes de frappe.
    env:
      NDK_VERSION: 27.3.13750724

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # GitHub injecte une CHAÎNE VIDE pour un secret absent, pas rien : un `?:` côté
      # Gradle (ANDROID_KEY_ALIAS) ne retombe donc jamais sur son défaut ici. Sans cette
      # garde, l'échec surviendrait après une heure de compilation. On ne montre JAMAIS
      # le contenu des secrets, seulement leur présence (`-z`).
      - name: Garde-fou — secrets de signature non vides
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          manquants=""
          for nom in ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD; do
            valeur="${!nom}"
            if [ -z "$valeur" ]; then
              manquants="$manquants $nom"
            fi
          done
          if [ -n "$manquants" ]; then
            echo "::error::Secret(s) absent(s) ou vide(s) :$manquants"
            exit 1
          fi
          echo "Les quatre secrets de signature sont présents."

      # C'est le mur du disque qui a chassé cette build du Mac (5 Gi libres pour 12 à
      # 16 Gi d'artefacts Rust) : sur ubuntu-latest, quatre cibles Rust en release plus
      # le NDK/SDK/Gradle/R8 approchent aussi les 20-25 Gi disponibles par défaut.
      - name: Libérer de l'espace disque du runner
        run: |
          sudo rm -rf /usr/share/dotnet /opt/hostedtoolcache/CodeQL
          df -h /

      - name: JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: SDK Android
        uses: android-actions/setup-android@v3

      - name: NDK et plateformes
        run: |
          sdkmanager --install "ndk;$NDK_VERSION" "platforms;android-36" "build-tools;36.0.0"
          echo "NDK_HOME=$ANDROID_HOME/ndk/$NDK_VERSION" >> "$GITHUB_ENV"

      - name: Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Rust et les quatre cibles Android
        run: |
          rustup update stable
          rustup target add aarch64-linux-android armv7-linux-androideabi \
                            i686-linux-android x86_64-linux-android

      - name: Dépendances
        run: npm ci

      # Six familles de fichiers dont Gradle a besoin (tauri.settings.gradle,
      # tauri.build.gradle.kts, tauri.properties, proguard-{tauri,wry}.pro, les
      # sources Kotlin générées, assets/tauri.conf.json) sont écrites par
      # `tauri android init` et volontairement non versionnées : elles contiennent
      # des chemins absolus. On les régénère ici.
      #
      # `git checkout` juste après n'est PAS cosmétique : `init` réécrit aussi les
      # trois fichiers que ce projet édite à la main (AndroidManifest.xml pour le
      # portrait, MainActivity.kt pour le pont BrocInsets, build.gradle.kts pour la
      # signature). On restaure donc les fichiers SUIVIS, en gardant les générés.
      - name: Régénérer les fichiers Android non versionnés
        run: |
          npx tauri android init
          git checkout -- src-tauri/gen/android
          echo "--- fichiers suivis modifiés après restauration (doit être vide) :"
          git status --porcelain src-tauri/gen/android

      # Le keystore ne vit que le temps du job, hors de l'espace de travail pour qu'il ne
      # puisse pas se retrouver dans un artefact.
      - name: Reconstituer le keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/broc-upload.jks"

      # Les expressions GitHub ne savent PAS faire d'arithmétique (les opérateurs
      # documentés s'arrêtent aux comparaisons et aux booléens) : le calcul se fait donc
      # dans le shell. 1002000 = 1.2.0 selon la convention de Tauri ; le numéro de run
      # garantit la stricte croissance exigée par Play.
      - name: Calculer le versionCode
        run: echo "ANDROID_VERSION_CODE=$((1002000 + GITHUB_RUN_NUMBER))" >> "$GITHUB_ENV"

      - name: AAB signé
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          export ANDROID_KEYSTORE_PATH="$RUNNER_TEMP/broc-upload.jks"
          echo "versionCode = $ANDROID_VERSION_CODE"
          npm run tauri android build -- --aab

      - name: Où est l'AAB
        run: find src-tauri/gen/android -name "*.aab" -exec ls -lh {} \;

      - name: Publier l'artefact
        uses: actions/upload-artifact@v4
        with:
          name: broc-aab
          path: src-tauri/gen/android/app/build/outputs/bundle/universalRelease/*.aab
          if-no-files-found: error
```

- [ ] **Step 4 : Vérifier la syntaxe avant de pousser**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/android-play.yml')); print('YAML valide')"
```

Si `yaml` n'est pas installé : `python3 -m pip install --user pyyaml`, ou à défaut
comparer visuellement l'indentation avec `ios-testflight.yml`.

- [ ] **Step 5 : Commit**

```bash
git add .github/workflows/android-play.yml
git commit -m "$(cat <<'EOF'
ci(android): build des 4 ABI et AAB signé, déclenchée à la main

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6 : Pousser la branche — DEMANDER À GUILLAUME D'ABORD**

La CI n'existe pour GitHub que si la branche y est. `feat/android-socle` n'a jamais été
poussée et porte tout le sous-projet A : **ne pas pousser sans son accord explicite**.

**Le déclencheur `push` du workflow (voir le YAML ci-dessus) va aussi se déclencher tout
seul** dès que ce push touche `src-tauri/**`, `src/**`, `package.json`,
`package-lock.json` ou le workflow lui-même — ce qui sera le cas ici, puisque toute la
branche part d'un coup. C'est voulu (raison : `workflow_dispatch` seul n'apparaît dans
l'onglet Actions que si le fichier existe déjà sur la branche par défaut `main`, donc
sans ce filet Guillaume ne verrait pas « Run workflow » après avoir poussé). Prévenir
Guillaume que la première build partira automatiquement, pas seulement sur clic.

```bash
git push -u origin feat/android-socle
```

- [ ] **Step 7 : Guillaume déclenche la première build**

Le push du Step 6 déclenche déjà une première exécution automatique (déclencheur `push`
temporaire). Sinon, à la main : onglet **Actions → Android → AAB signé → Run workflow**,
en choisissant la branche `feat/android-socle`.

**Attendu, en toute honnêteté : la première exécution a de bonnes chances d'échouer.**
Les points fragiles connus, dans l'ordre de probabilité :

1. le chemin de sortie de l'AAB (`universalRelease` peut s'appeler autrement selon le
   découpage d'ABI retenu par Tauri) — l'étape « Où est l'AAB » est là pour le révéler ;
2. `build-tools;36.0.0` peut ne pas exister encore : replier sur `35.0.0` ;
3. le pont **Tauri/wry** (`RustWebView`, `WryActivity`, `Ipc`, `TauriActivity`) pourrait
   perdre des symboles sous R8 si le step « Régénérer les fichiers Android non
   versionnés » n'a pas produit `proguard-tauri.pro`/`proguard-wry.pro` comme attendu —
   voir Task 4, « Pourquoi », pour le détail de ce risque (ce n'est **pas** `BrocInsets`,
   déjà protégé par défaut par AGP 8.11).

Lire le journal, corriger, recommitter, relancer. Ne pas passer à la Task 4 tant que
l'artefact `broc-aab` n'est pas téléchargeable.

---

### Task 4 : Vérifier l'AAB pour de vrai

**Files:**
- Aucun fichier du dépôt — cette tâche produit une preuve, pas du code

**Interfaces:**
- Consumes: l'artefact `broc-aab` (Task 3)
- Produces: la certitude que le binaire déposé s'installe, se lance, et porte la bonne clé

**Pourquoi :** c'est en release que `minifyEnabled` et ProGuard entrent en jeu. Le point de
vigilance réel n'est **pas** le pont `BrocInsets` (`MainActivity.kt`) : AGP 8.11 embarque
déjà dans `proguard-android-optimize.txt` la règle
`-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }`, qui le
protège sans qu'on ait rien à écrire. Le vrai risque est le pont **Tauri/wry**
(`RustWebView.loadUrlMainThread`/`evalScript`, `WryActivity.setWebView`, `Ipc`,
`TauriActivity.getPluginManager`), appelé par **nom** depuis Rust et protégé uniquement
par les fichiers `proguard-tauri.pro`/`proguard-wry.pro` générés — des fichiers
volontairement non versionnés (voir Task 3, le step qui les régénère). Sans eux, R8 peut
renommer ou supprimer ces méthodes, et le code Rust ne les retrouve plus au runtime. La
règle de secours pour `BrocInsets` (Step 8 ci-dessous) reste écrite par prudence, mais
c'est un filet peu probable, pas le risque principal.

- [ ] **Step 1 : Outillage**

```bash
brew install bundletool
bundletool version
```

- [ ] **Step 2 : Récupérer l'artefact**

Guillaume le télécharge depuis la page du run (Actions → le run → Artifacts →
`broc-aab`), puis :

```bash
cd ~/Downloads && unzip -o broc-aab.zip && ls -lh *.aab
```

- [ ] **Step 3 : Vérifier que l'AAB LUI-MÊME est signé**

**Ne pas sauter cette étape au profit du Step 6** : `bundletool build-apks --ks=…` signe
lui-même les APK qu'il produit, donc `apksigner verify` au Step 6 affichera toujours le
bon certificat — même si l'AAB déposé en entrée n'était pas signé. Ce n'est pas ce
Step 6 qui ferme le risque « la CI a oublié la clé », c'est celui-ci.

```bash
export JAVA_HOME=/usr/local/opt/openjdk@17; export PATH="$JAVA_HOME/bin:$PATH"
jarsigner -verify -certs -verbose "$HOME/Downloads/app-universal-release.aab" | head -20
```

Attendu : `jar verified` et un certificat `CN=Guillaume Fenard`. **Si `jar is unsigned`,
l'AAB n'est pas signé** — Play le refuserait avec « The Android App Bundle was not
signed » ; reprendre la Task 1 et vérifier les quatre secrets du dépôt.

- [ ] **Step 4 : Vérifier l'alignement des pages 16 Ko**

Depuis le 1er novembre 2025, Play exige la compatibilité **16 Ko** pour toute nouvelle
application ciblant Android 15+ (`targetSdk = 36` ici). Un `.so` aligné à 4 Ko ne se
charge pas sur un appareil en 16 Ko — l'app ne démarre pas — alors que l'émulateur
`broc-pixel6` (4 Ko) la lancera parfaitement et validera la recette à tort. Une mesure
faite en local sur un `.so` x86_64 de debug n'est PAS concluante pour arm64 : mesurer
l'artefact réel.

**Ne pas modifier les drapeaux de compilation** pour « corriger » l'alignement — Tauri
définit lui-même les `CARGO_TARGET_*_RUSTFLAGS`, et une surcharge maladroite casserait
l'édition de liens.

```bash
unzip -o "$HOME/Downloads/app-universal-release.aab" -d /tmp/aab
"$ANDROID_HOME/ndk/27.3.13750724/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-readelf" \
  -lW /tmp/aab/base/lib/arm64-v8a/libapp_lib.so | grep LOAD
```

Attendu : un alignement `0x4000` (16 Ko) — le NDK r27 aligne normalement à 16 Ko par
défaut. **Si c'est `0x1000` (4 Ko), ne pas déposer** : il faudra passer au NDK r28+ ou
ajouter `-Wl,-z,max-page-size=16384` à l'édition de liens des cibles Android — sujet à
traiter avant la production, pas un blocage de ce lot de test fermé si les délais
pressent, mais à consigner dans les risques (§ 12 de la spec).

- [ ] **Step 5 : Dérouler l'AAB en APK installable**

```bash
export JAVA_HOME=/usr/local/opt/openjdk@17; export PATH="$JAVA_HOME/bin:$PATH"
# Attention : le tilde ne s'étend PAS derrière un `=`, d'où "$HOME" partout.
bundletool build-apks --mode=universal \
  --bundle="$HOME/Downloads/app-universal-release.aab" \
  --output="$HOME/Downloads/broc.apks" \
  --ks="$HOME/broc-upload.jks" --ks-key-alias=broc-upload
```

`bundletool` demandera le mot de passe du keystore.

- [ ] **Step 6 : Vérifier la signature de l'APK dérivé**

```bash
cd ~/Downloads && unzip -o -p broc.apks universal.apk > universal.apk
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --print-certs universal.apk
```

**Cette commande ne prouve que la signature faite par `bundletool` lui-même** (Step 5) —
elle ne dit rien de l'AAB d'entrée, c'est le Step 3 qui a fermé ce risque-là. Elle reste
utile pour confirmer que l'alias `broc-upload` a bien été utilisé (et pas un autre
keystore local) et que l'APK dérivé s'installera sans conflit de signature.

Attendu : le certificat porte `CN=Guillaume Fenard`. **Si l'émetteur est
`CN=Android Debug`, c'est le keystore passé à `--ks` au Step 5 qui est le mauvais** —
vérifier `~/broc-upload.jks`.

- [ ] **Step 7 : Installer et lancer sur l'émulateur**

```bash
$ANDROID_HOME/emulator/emulator -avd broc-pixel6 -no-snapshot -no-boot-anim &
# attendre le démarrage
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 5; done
adb install -r ~/Downloads/universal.apk
adb shell am start -n "com.guigousse.broc/com.guigousse.broc.MainActivity"
```

Noter l'**absence du suffixe `.debug`** : c'est une build de release, son identifiant est
`com.guigousse.broc`.

- [ ] **Step 8 : Recette minimale sur la release**

Trente secondes de jeu suffisent, mais elles sont indispensables :

```bash
sleep 20 && adb exec-out screencap -p > /tmp/broc-release.png
```

Vérifier sur la capture : le menu s'affiche, **le header ne passe pas sous la barre
d'état** (le pont `BrocInsets` a donc survécu à R8 — filet peu probable mais bienvenu :
AGP 8.11 le protège déjà par défaut, voir le « Pourquoi » ci-dessus), et une partie se
lance. Puis :

```bash
adb logcat -d | grep -iE "AndroidRuntime|FATAL|BrocInsets|Ipc|WryActivity" | tail -20
```

Attendu : aucune trace fatale. **Si le header est de nouveau collé en haut**, R8 a
supprimé le pont : ajouter dans `src-tauri/gen/android/app/proguard-rules.pro` :

```proguard
-keepclassmembers class com.guigousse.broc.MainActivity$PontInsets {
    @android.webkit.JavascriptInterface <methods>;
}
```

puis reprendre à la Task 3, Step 7. **Si en revanche l'écran reste blanc ou logcat
signale `Ipc`/`WryActivity`/`RustWebView` en fatal**, c'est le pont Tauri/wry qui a été
amputé — vérifier d'abord que le Step « Régénérer les fichiers Android non versionnés »
du workflow (Task 3) a bien produit `proguard-tauri.pro` et `proguard-wry.pro` avant de
chercher plus loin.

- [ ] **Step 9 : Consigner la mesure**

Relever la taille de l'AAB et celle de l'APK universel — c'est le premier chiffre
réaliste de la taille du jeu sur Android, à comparer aux 311 Mo de la build debug. Il
servira à la Task 5.

**Comparer au seuil, pas seulement relever la taille.** Play limite le **téléchargement
compressé** à 200 Mo ; `out/` (l'export du front embarqué dans l'APK) fait déjà 144 Mo
d'assets à lui seul. Si la taille de téléchargement compressé annoncée par Play (visible
dans Play Console après le dépôt, onglet « App bundle explorer ») dépasse ~160-170 Mo,
l'alerter explicitement dans le compte rendu (Task 5) : il resterait peu de marge avant
le refus au dépôt.

---

### Task 5 : Play Console, testeurs, et le compte rendu

**Files:**
- Create: `docs/android/2026-08-12-publication-play.md`

**Interfaces:**
- Consumes: l'AAB vérifié (Task 4)
- Produces: le lien d'inscription au test fermé et la date d'éligibilité — le livrable réel de D

**Pourquoi cette tâche est écrite avant d'être faite :** tout s'y passe dans l'interface
de Google, sur le compte de Guillaume. L'agent ne peut pas agir ; il rédige la recette,
Guillaume l'exécute, et l'agent consigne les résultats.

- [ ] **Step 1 : Écrire la recette**

Créer `docs/android/2026-08-12-publication-play.md`, dans l'ordre où Play Console demande
les choses :

1. **Créer l'application** — Play n'a qu'**un seul** champ « nom de l'application »
   (30 caractères, réutilisé tel quel comme titre de la fiche magasin au point 3) : y
   mettre directement le nom définitif `Broc : Jeu de Brocante`, pas `BROC` seul, pour
   ne pas avoir à le corriger ensuite. Langue par défaut français, type *Jeu*, gratuit,
   `com.guigousse.broc`.
2. **Play App Signing** — adhérer, laisser Google générer la clé de signature, déclarer
   le certificat d'upload (il est déduit du premier AAB déposé).
3. **Fiche minimale** — reprendre `docs/appstore/FICHE_APP_STORE.md` : description
   courte (80 caractères), description longue. **FR et EN seulement** pour ce lot.
4. **Éléments graphiques** — icône 512×512 ; **image de couverture (feature graphic)
   1024×500, PRÉREQUIS BLOQUANT** : Play l'exige pour publier la fiche, donc pour publier
   la piste fermée, donc pour démarrer les 14 jours — à produire avant cet écran, pas
   « hors périmètre » ; au moins deux captures téléphone (rééchantillonner celles de
   l'App Store, `docs/appstore/`).
5. **Politique de confidentialité** — l'URL déjà en ligne depuis le lancement iOS.
6. **Classification de contenu** — questionnaire, et public cible.
7. **Data safety** — **déclarer l'état d'aujourd'hui : aucune collecte.** Sur Android,
   pubs et achat sont explicitement indisponibles (sous-projet A). Écrire noir sur blanc
   dans le document que cette déclaration **devra être refaite à l'arrivée de B**
   (AdMob collecte l'identifiant publicitaire) : une déclaration fausse est un motif de
   suspension.
8. **Publicités** — déclarer « ne contient pas de publicités », à rectifier avec B.
9. **Piste de test fermé** — la créer (et non une piste interne : l'interne ne déclenche
   pas le compteur des 14 jours), y rattacher le groupe Google des testeurs.
10. **Déposer l'AAB**, publier la version, relever le **lien d'inscription**.

- [ ] **Step 2 : Écrire le message type aux testeurs**

Dans le même document, un bloc prêt à copier :

> Salut ! Je sors un jeu de brocante sur Android et j'ai besoin de testeurs.
>
> 1. Accepte l'invitation ici : `<lien d'inscription>`
> 2. Installe BROC depuis le Play Store (le lien te redirige)
> 3. **Reste inscrit 14 jours, sans quitter le programme de test.** Google compte les
>    testeurs inscrits en continu sur cette période ; le mieux est de garder le jeu
>    installé tout du long, donc évite de le désinstaller.
>
> Joue quand tu veux, même cinq minutes. Si tu vois un bug, écris-moi.

Ajouter la consigne d'exploitation : héberger les adresses dans un **groupe Google** (un
remplacement se fait alors dans le groupe, pas dans la console), y mêler **au moins deux
testeurs réels** en plus de ceux du prestataire, et garder deux ou trois adresses de
réserve — sur quatorze jours, il faut s'attendre à en remplacer.

- [ ] **Step 3 : Commit de la recette**

```bash
git add docs/android/2026-08-12-publication-play.md
git commit -m "$(cat <<'EOF'
docs(android): recette Play Console et mode d'emploi des testeurs

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4 : Guillaume exécute la recette**

Dérouler les dix points. Noter au passage tout écart entre ce que dit la recette et ce
que montre l'interface — Play Console change souvent, et le document doit rester juste.

- [ ] **Step 5 : Consigner les résultats et les dates**

Compléter le document avec :

- la date du dépôt et le `versionCode` réellement déposé ;
- la taille de l'AAB (relevée en Task 4, Step 7) ;
- le lien d'inscription ;
- le nombre de testeurs inscrits, et **la date d'éligibilité = jour du douzième
  inscrit + 14 jours**, écrite en toutes lettres ;
- la liste de ce qu'il faudra reprendre pour B (Data safety, déclaration de publicité,
  permission `AD_ID`) et pour C (produit d'achat, créable seulement maintenant).

- [ ] **Step 6 : Commit final**

```bash
git add docs/android/2026-08-12-publication-play.md
git commit -m "$(cat <<'EOF'
docs(android): premier dépôt sur la piste de test fermé

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## D est fini quand

1. la clé d'upload existe, est sauvegardée par Guillaume, et les quatre secrets sont dans le dépôt ;
2. le workflow rend un AAB signé, téléchargeable en artefact ;
3. cet AAB s'installe et se lance sur l'émulateur, header correct, et `apksigner` confirme la clé d'upload ;
4. l'application existe dans Play Console, fiche minimale, classification et Data safety remplies ;
5. la piste de test fermé est publiée et son lien d'inscription est connu ;
6. les 12 testeurs sont inscrits et la date d'éligibilité est écrite dans le compte rendu.
