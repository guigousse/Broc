# Socle Android (sous-projet A) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire tourner BROC de bout en bout sur un émulateur Android, avec bouton retour matériel et plein écran corrects, publicités et achat intégré **visiblement indisponibles** plutôt que gratuits.

**Architecture:** Le socle Rust compile déjà pour Android (les plugins vendorés gatent sur `#[cfg(target_os = "ios")]` et retombent sur `desktop.rs`). Tout le travail de code est donc côté front : remplacer la détection de plateforme booléenne (iOS / pas iOS) par une valeur à trois états (`"ios"` / `"android"` / `null`), brancher des providers « indisponible » sur Android, et masquer dans l'UI ce qui en dépend. S'y ajoutent deux adaptations natives légères (bouton retour, orientation) et l'outillage de recette sur émulateur.

**Tech Stack:** Next.js 16 (export statique), React 19, TypeScript, Tauri v2.11, vitest 4, Android Studio + SDK + NDK, `@tauri-apps/api@2.11`.

**Spec de référence :** `docs/superpowers/specs/2026-08-10-android-socle-design.md`

## Global Constraints

- **Tests :** toujours `npx vitest run --maxWorkers=4`. Sans ce drapeau, ~41 faux échecs par famine de workers sur ce Mac Intel.
- **Lint :** `npx eslint src`. `npm run lint` est cassé depuis Next 16 — ne pas l'utiliser.
- **Aucun changement de schéma de sauvegarde en A** : `SAVE_VERSION` ne bouge pas, aucune migration.
- **Jamais de chaîne localisée dans une sauvegarde.**
- **Tout composant monté dans le layout racine doit être gaté sur `estRoutePartie(pathname)`** (`src/lib/routesPartie.ts:22`) : la sauvegarde reste chargée hors partie, un composant global qui ne se fie qu'à `state` s'affiche aussi par-dessus le menu principal.
- **Jamais de scroll ni de virtualisation basés sur `window`** : le `body` est verrouillé en webview mobile.
- **Aucun code natif Kotlin n'est écrit en A.** Les publicités (sous-projet B) et l'achat (C) viendront plus tard.
- **Commits en français**, fréquents, avec le trailer :
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```
- **Branche de travail :** `feat/android-socle`.

## File Structure

**Créés**

| Fichier | Responsabilité |
|---|---|
| `src/lib/retourAndroid.ts` | Pile de fermetures : registre des overlays ouverts, du plus haut au plus bas |
| `src/lib/retourAndroid.test.ts` | Tests de la pile |
| `src/lib/plateforme.test.ts` | Tests de la détection de plateforme |
| `src/lib/ads/adProvider.android.test.ts` | Tests du choix de provider et de `pubDisponible()` selon la plateforme |
| `src/lib/iap/iapProvider.android.test.ts` | Tests du choix de provider et de `achatDisponible()` selon la plateforme |
| `src/components/mobile/BoutonRetourAndroid.tsx` | Écoute le bouton retour matériel et applique la pile de fermeture |
| `scripts/android-sim.sh` | Build + installation + lancement sur émulateur, jumeau de `scripts/ios-sim.sh` |
| `docs/android/2026-08-10-recette-emulateur.md` | Compte rendu de recette — le livrable non-code de A |
| `src-tauri/gen/android/**` | Projet Android généré par `tauri android init` |

**Modifiés**

| Fichier | Modification |
|---|---|
| `src/lib/plateforme.ts` | `plateformeNative()` remplace le booléen ; `tauriIosDisponible()` devient un alias |
| `src/lib/ads/adMobProvider.ts:8-20` | `adMobDisponible()` délègue à `plateformeNative()` |
| `src/lib/ads/adProvider.ts:40-47` | `IndisponibleAdProvider`, `pubDisponible()`, aiguillage à trois branches |
| `src/lib/iap/iapProvider.ts:36-45` | `IndisponibleIapProvider`, `achatDisponible()`, aiguillage à trois branches |
| `src/lib/boiteMystere.ts` | Ajout de `vendeurMysterePeutApparaitre()`, pur et testable |
| `src/app/chiner/[brocanteId]/ClientPage.tsx:243-252` | Utilise le nouvel helper |
| `src/components/mobile/EnergieRecharge.tsx:470-528` | Cartel pub, levier et bouton d'achat conditionnés |
| `src/app/(qg)/atelier/page.tsx:840-843` | Bouton d'accélération conditionné |
| `src/components/mobile/ReglagesModal.tsx:289` | Section « Achats » conditionnée |
| `src/components/mobile/BottomSheet.tsx` | S'enregistre dans la pile de fermeture (châssis partagé par 6 sheets) |
| `src/app/layout.tsx:95` | Monte `<BoutonRetourAndroid />` |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | Clé `chrome.appuyezPourQuitter` |
| `src-tauri/gen/android/app/src/main/AndroidManifest.xml` | Orientation portrait verrouillée |

---

### Task 1 : Ranger la base git et créer la branche

**Files:**
- Modify: aucun fichier de code — mise au propre de l'arbre de travail

**Interfaces:**
- Consumes: rien
- Produces: la branche `feat/android-socle`, sur laquelle toutes les tâches suivantes travaillent

- [ ] **Step 1 : Constater l'état de l'arbre**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git status --porcelain
git branch --show-current
```

Attendu : la branche est `feat/tuto-brocante-scriptee`, et 15 fichiers sont modifiés ou non suivis. Ils relèvent de deux sujets distincts : le travail AdMob par emplacement, et le polish tutoriel / `dialogueActif`.

- [ ] **Step 2 : Lancer les tests avant de committer quoi que ce soit**

```bash
npx vitest run --maxWorkers=4
```

Attendu : PASS. **Si des tests échouent, arrêter et signaler** — ce plan ne corrige pas du travail en cours qui ne lui appartient pas.

- [ ] **Step 3 : Committer le travail AdMob par emplacement**

```bash
git add src/lib/ads/adProvider.ts src/lib/ads/adProvider.test.ts \
        src/lib/ads/adMobProvider.ts src/lib/ads/adMobProvider.test.ts \
        src/lib/ads/emplacementsAppeles.test.ts \
        src-tauri/vendor/tauri-plugin-admob/src/commands.rs \
        src-tauri/vendor/tauri-plugin-admob/src/desktop.rs \
        src-tauri/vendor/tauri-plugin-admob/src/mobile.rs \
        src-tauri/vendor/tauri-plugin-admob/ios/Sources/AdmobPlugin.swift \
        src-tauri/gen/apple/Sources/app/AdmobBridge.swift
git commit -m "$(cat <<'EOF'
feat(pub): un bloc AdMob par emplacement (énergie, boîte mystère, restauration)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4 : Committer le reste (polish tutoriel et dialogue actif)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(tuto): polish de fin de branche et suivi du dialogue actif

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5 : Vérifier que l'arbre est propre et créer la branche**

```bash
git status --porcelain
git switch -c feat/android-socle
git branch --show-current
```

Attendu : `git status --porcelain` ne renvoie rien, et la branche courante est `feat/android-socle`.

---

### Task 2 : Toolchain Android et projet généré

**Files:**
- Create: `src-tauri/gen/android/**` (généré)
- Modify: `~/.zshrc` (hors dépôt)

**Interfaces:**
- Consumes: la branche `feat/android-socle` (Task 1)
- Produces: un émulateur x86_64 fonctionnel, `ANDROID_HOME` / `NDK_HOME` / `JAVA_HOME` définis, et `src-tauri/gen/android/` commité — prérequis des Tasks 8, 9, 10 et 11

**Note :** les téléchargements de cette tâche sont longs (plusieurs Gi). Les Tasks 3 à 7 ne dépendent pas d'elle et peuvent être menées pendant ce temps.

- [ ] **Step 1 : Vérifier l'espace disque disponible**

```bash
df -h /System/Volumes/Data | tail -1
```

Attendu : **au moins 15 Gi disponibles**. Si ce n'est pas le cas, arrêter et signaler à Guillaume : la libération d'espace (suppression de simulateurs iOS) lui incombe, le garde-fou de sécurité bloque `simctl delete` côté agent. La liste exacte est en section 5 de la spec.

- [ ] **Step 2 : Installer Android Studio**

```bash
brew install --cask android-studio
```

Puis lancer Android Studio une fois et, dans le SDK Manager (*Settings → Languages & Frameworks → Android SDK*) :
- onglet *SDK Platforms* : la dernière plateforme stable
- onglet *SDK Tools* : **NDK (Side by side)**, Android SDK Build-Tools, Android SDK Command-line Tools, Android SDK Platform-Tools, Android Emulator

- [ ] **Step 3 : Déclarer les variables d'environnement**

Ajouter à `~/.zshrc` :

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk | tail -1)"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

- [ ] **Step 4 : Vérifier la toolchain**

```bash
source ~/.zshrc
java -version
ls "$ANDROID_HOME/platform-tools/adb"
ls "$NDK_HOME"
```

Attendu : une version de Java s'affiche (17 ou plus), `adb` existe, `$NDK_HOME` liste des dossiers. **Si `java -version` échoue encore, ne pas continuer** — tout le reste en dépend.

- [ ] **Step 5 : Ajouter la cible Rust**

```bash
rustup target add x86_64-linux-android
rustup target list --installed | grep android
```

Attendu : `x86_64-linux-android` apparaît. Le Mac est Intel, l'émulateur sera donc x86_64 ; les trois autres cibles (`aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`) ne seront nécessaires qu'à l'AAB de release, en sous-projet D.

- [ ] **Step 6 : Créer un émulateur avec image Google Play**

Dans Android Studio, *Device Manager → Create Device* : un téléphone récent, une image système **x86_64 avec Google Play** (pas une image « Google APIs » seule — les sous-projets B et C exigeront les Google Play Services). Puis :

```bash
emulator -list-avds
```

Attendu : le nom de l'AVD créé s'affiche.

- [ ] **Step 7 : Générer le projet Android**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
npm run tauri android init
ls src-tauri/gen/android
```

Attendu : `src-tauri/gen/android/` contient notamment `app/`, `build.gradle.kts`, `settings.gradle`.

- [ ] **Step 8 : Vérifier que rien de local ne sera commité**

```bash
git status --porcelain src-tauri/gen/android | grep -E "local\.properties|\.gradle/|/build/" || echo "OK : rien de local n'est suivi"
```

Attendu : `OK : rien de local n'est suivi`. `local.properties` contient un chemin absolu vers le SDK et ne doit jamais être commité ; si la commande renvoie des lignes, les ajouter à `src-tauri/gen/android/.gitignore`.

- [ ] **Step 9 : Première build de vérification**

```bash
npm run build
npm run tauri android build -- --debug --target x86_64
```

Attendu : la build se termine sans erreur et produit un APK. Noter le chemin affiché et la taille du fichier — c'est la mesure de départ demandée au point 10 de la recette.

- [ ] **Step 10 : Commit**

```bash
git add src-tauri/gen/android
git commit -m "$(cat <<'EOF'
chore(android): projet Android généré par tauri android init

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : Une plateforme à trois états

**Files:**
- Modify: `src/lib/plateforme.ts` (fichier entier)
- Modify: `src/lib/ads/adMobProvider.ts:8-20`
- Test: `src/lib/plateforme.test.ts` (créer)

**Interfaces:**
- Consumes: rien
- Produces:
  - `export type PlateformeNative = "ios" | "android"`
  - `export function plateformeNative(): PlateformeNative | null`
  - `export function tauriIosDisponible(): boolean` (conservée, appelants inchangés)

  Utilisées par les Tasks 4, 6 et 8.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/plateforme.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { plateformeNative, tauriIosDisponible } from "./plateforme";

const uaOrigine = window.navigator.userAgent;

function poserUa(valeur: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: valeur,
    configurable: true,
  });
}

function poserTactile(n: number) {
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: n,
    configurable: true,
  });
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  poserUa(uaOrigine);
  poserTactile(0);
});

function simulerTauri(ua: string) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  poserUa(ua);
}

describe("plateformeNative", () => {
  it("null hors runtime Tauri (web, dev desktop, tests)", () => {
    poserUa("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)");
    expect(plateformeNative()).toBe(null);
  });

  it("« ios » sous Tauri iPhone", () => {
    simulerTauri("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)");
    expect(plateformeNative()).toBe("ios");
  });

  it("« ios » sous Tauri iPadOS 13+ (UA « Macintosh » + tactile)", () => {
    simulerTauri("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    poserTactile(5);
    expect(plateformeNative()).toBe("ios");
  });

  it("null sous Tauri sur un vrai Mac (UA « Macintosh » sans tactile)", () => {
    simulerTauri("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    poserTactile(0);
    expect(plateformeNative()).toBe(null);
  });

  it("« android » sous Tauri Android", () => {
    simulerTauri(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );
    expect(plateformeNative()).toBe("android");
  });
});

describe("tauriIosDisponible", () => {
  it("vrai sous Tauri iOS", () => {
    simulerTauri("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)");
    expect(tauriIosDisponible()).toBe(true);
  });

  it("faux sous Tauri Android — garde contre le retour des stubs sur Android", () => {
    simulerTauri("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36");
    expect(tauriIosDisponible()).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/plateforme.test.ts
```

Attendu : ÉCHEC — `plateformeNative` n'est pas exportée.

- [ ] **Step 3 : Écrire l'implémentation**

Remplacer tout le contenu de `src/lib/plateforme.ts` par :

```ts
/**
 * Plateforme native sous laquelle tourne le jeu, ou `null` hors runtime Tauri
 * (web, dev desktop, tests) — où les stubs de développement prennent le relais.
 *
 * Source unique de vérité : `adMobDisponible` (src/lib/ads/adMobProvider.ts) et
 * `tauriIosDisponible` délèguent toutes deux ici. Le cas iPadOS 13+ vaut d'être
 * connu : sa WKWebView se présente avec un User-Agent desktop « Macintosh »
 * sans « iPad », qu'on ne distingue d'un vrai Mac que par le tactile.
 */
export type PlateformeNative = "ios" | "android";

export function plateformeNative(): PlateformeNative | null {
  if (typeof window === "undefined") return null;
  if (!("__TAURI_INTERNALS__" in window)) return null;
  const ua = window.navigator.userAgent;
  if (/Android/.test(ua)) return "android";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1) return "ios";
  return null;
}

/** Vrai uniquement sous runtime Tauri sur iOS. */
export function tauriIosDisponible(): boolean {
  return plateformeNative() === "ios";
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run --maxWorkers=4 src/lib/plateforme.test.ts
```

Attendu : PASS.

- [ ] **Step 5 : Faire déléguer `adMobDisponible`**

Dans `src/lib/ads/adMobProvider.ts`, remplacer la fonction `adMobDisponible` (et son bloc de commentaire) par :

```ts
import { plateformeNative } from "@/lib/plateforme";

/** Vrai uniquement sous runtime Tauri sur iOS (le plugin n'existe que là). */
export function adMobDisponible(): boolean {
  return plateformeNative() === "ios";
}
```

L'import de `plateformeNative` va en tête de fichier, avec les autres imports.

- [ ] **Step 6 : Vérifier que la suite complète passe**

```bash
npx vitest run --maxWorkers=4
npx eslint src
```

Attendu : PASS et aucune erreur de lint. Les tests existants de `adMobProvider.test.ts` (iPhone, iPadOS tactile, vrai Mac, hors Tauri) doivent passer sans modification — c'est la preuve que la délégation n'a rien changé au comportement iOS.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/plateforme.ts src/lib/plateforme.test.ts src/lib/ads/adMobProvider.ts
git commit -m "$(cat <<'EOF'
refactor(plateforme): plateformeNative() à trois états au lieu d'un booléen iOS

Prépare Android : la détection par User-Agent n'est plus dupliquée entre
plateforme.ts et adMobProvider.ts, et sait désormais dire « android ».

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : Providers indisponibles et prédicats d'UI

**Files:**
- Modify: `src/lib/ads/adProvider.ts:40-47`
- Modify: `src/lib/iap/iapProvider.ts:36-45`
- Test: `src/lib/ads/adProvider.android.test.ts` (créer)
- Test: `src/lib/iap/iapProvider.android.test.ts` (créer)

**Interfaces:**
- Consumes: `plateformeNative()` (Task 3)
- Produces:
  - `export class IndisponibleAdProvider implements AdProvider`
  - `export function pubDisponible(): boolean`
  - `export class IndisponibleIapProvider implements IapProvider`
  - `export function achatDisponible(): boolean`

  `pubDisponible()` est utilisée par les Tasks 5 et 6 ; `achatDisponible()` par la Task 7.

**Pourquoi des fichiers de test séparés :** `getAdProvider()` et `getIapProvider()` mémoïsent un singleton au niveau du module. Tester plusieurs plateformes exige `vi.resetModules()` entre les cas, ce qui ne se marie pas avec les fichiers de test existants (`adProvider.test.ts` tourne en environnement node et vérifie justement la stabilité du singleton). On isole donc les nouveaux cas.

- [ ] **Step 1 : Écrire le test des publicités**

Créer `src/lib/ads/adProvider.android.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const uaOrigine = window.navigator.userAgent;

function simulerTauri(ua: string) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const UA_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)";

async function chargerFrais() {
  vi.resetModules();
  return await import("./adProvider");
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  Object.defineProperty(window.navigator, "userAgent", {
    value: uaOrigine,
    configurable: true,
  });
});

describe("pubDisponible", () => {
  it("faux sous Tauri Android — aucune régie n'y est branchée", async () => {
    simulerTauri(UA_ANDROID);
    const { pubDisponible } = await chargerFrais();
    expect(pubDisponible()).toBe(false);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauri(UA_IOS);
    const { pubDisponible } = await chargerFrais();
    expect(pubDisponible()).toBe(true);
  });

  it("vrai hors Tauri (le stub de dev reste disponible)", async () => {
    const { pubDisponible } = await chargerFrais();
    expect(pubDisponible()).toBe(true);
  });
});

describe("getAdProvider selon la plateforme", () => {
  it("sur Android, renvoie le provider indisponible", async () => {
    simulerTauri(UA_ANDROID);
    const { getAdProvider, IndisponibleAdProvider } = await chargerFrais();
    expect(getAdProvider()).toBeInstanceOf(IndisponibleAdProvider);
  });

  it("hors Tauri, renvoie le stub", async () => {
    const { getAdProvider, StubAdProvider } = await chargerFrais();
    expect(getAdProvider()).toBeInstanceOf(StubAdProvider);
  });

  it("GARDE : sur Android, aucune récompense n'est jamais accordée", async () => {
    simulerTauri(UA_ANDROID);
    const { getAdProvider, EMPLACEMENTS_PUB } = await chargerFrais();
    await expect(
      getAdProvider().showRewardedAd(EMPLACEMENTS_PUB.energie),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/ads/adProvider.android.test.ts
```

Attendu : ÉCHEC — `pubDisponible` et `IndisponibleAdProvider` ne sont pas exportées.

- [ ] **Step 3 : Implémenter côté publicités**

Dans `src/lib/ads/adProvider.ts`, ajouter l'import en tête de fichier :

```ts
import { plateformeNative } from "@/lib/plateforme";
```

Puis, après la classe `StubAdProvider`, ajouter :

```ts
/**
 * Provider des plateformes où aucune régie n'est encore branchée — Android,
 * tant que le plugin Kotlin du sous-projet B n'existe pas. Il ne récompense
 * jamais : c'est le filet, pas le mécanisme. Le mécanisme est `pubDisponible()`,
 * que l'UI consulte pour ne proposer aucune pub du tout.
 */
export class IndisponibleAdProvider implements AdProvider {
  async showRewardedAd(_emplacement: EmplacementPub): Promise<AdResult> {
    throw new Error("Publicités indisponibles sur cette plateforme");
  }
}

/** Faux là où aucune régie n'est branchée : l'UI ne doit alors ni proposer de
 *  pub, ni en offrir la récompense gratuitement. */
export function pubDisponible(): boolean {
  return plateformeNative() !== "android";
}
```

Et remplacer le corps de `getAdProvider` par :

```ts
export function getAdProvider(): AdProvider {
  if (!instance) {
    if (adMobDisponible()) instance = new AdMobAdProvider();
    else if (plateformeNative() === "android") instance = new IndisponibleAdProvider();
    else instance = new StubAdProvider();
  }
  return instance;
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run --maxWorkers=4 src/lib/ads/adProvider.android.test.ts
```

Attendu : PASS.

- [ ] **Step 5 : Écrire le test des achats**

Créer `src/lib/iap/iapProvider.android.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";

const uaOrigine = window.navigator.userAgent;

function simulerTauri(ua: string) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const UA_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)";

async function chargerFrais() {
  vi.resetModules();
  return await import("./iapProvider");
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  Object.defineProperty(window.navigator, "userAgent", {
    value: uaOrigine,
    configurable: true,
  });
  window.localStorage.clear();
});

describe("achatDisponible", () => {
  it("faux sous Tauri Android — Play Billing n'est pas encore branché", async () => {
    simulerTauri(UA_ANDROID);
    const { achatDisponible } = await chargerFrais();
    expect(achatDisponible()).toBe(false);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauri(UA_IOS);
    const { achatDisponible } = await chargerFrais();
    expect(achatDisponible()).toBe(true);
  });

  it("vrai hors Tauri (le stub de dev reste disponible)", async () => {
    const { achatDisponible } = await chargerFrais();
    expect(achatDisponible()).toBe(true);
  });
});

describe("getIapProvider selon la plateforme", () => {
  it("sur Android, renvoie le provider indisponible", async () => {
    simulerTauri(UA_ANDROID);
    const { getIapProvider, IndisponibleIapProvider } = await chargerFrais();
    expect(getIapProvider()).toBeInstanceOf(IndisponibleIapProvider);
  });

  it("GARDE : sur Android, aucun achat n'aboutit jamais", async () => {
    simulerTauri(UA_ANDROID);
    const { getIapProvider } = await chargerFrais();
    await expect(getIapProvider().acheter()).rejects.toThrow();
    await expect(getIapProvider().verifierEntitlement()).resolves.toBe(false);
    await expect(getIapProvider().restaurer()).resolves.toBe(false);
  });
});
```

- [ ] **Step 6 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/iap/iapProvider.android.test.ts
```

Attendu : ÉCHEC — `achatDisponible` et `IndisponibleIapProvider` ne sont pas exportées.

- [ ] **Step 7 : Implémenter côté achats**

Dans `src/lib/iap/iapProvider.ts`, remplacer la ligne d'import de `plateforme` par :

```ts
import { plateformeNative, tauriIosDisponible } from "@/lib/plateforme";
```

Après la classe `StubIapProvider`, ajouter :

```ts
/**
 * Provider des plateformes sans boutique branchée — Android, tant que le
 * plugin Google Play Billing du sous-projet C n'existe pas. Il n'accorde
 * jamais l'entitlement, et échoue franchement si on tente un achat.
 */
export class IndisponibleIapProvider implements IapProvider {
  async verifierEntitlement(): Promise<boolean> {
    return false;
  }
  async obtenirPrix(): Promise<string> {
    throw new Error("Achats indisponibles sur cette plateforme");
  }
  async acheter(): Promise<StatutAchat> {
    throw new Error("Achats indisponibles sur cette plateforme");
  }
  async restaurer(): Promise<boolean> {
    return false;
  }
}

/** Faux là où aucune boutique n'est branchée : l'UI ne doit alors ni proposer
 *  l'achat, ni proposer de le restaurer. */
export function achatDisponible(): boolean {
  return plateformeNative() !== "android";
}
```

Et remplacer le corps de `getIapProvider` par :

```ts
export function getIapProvider(): IapProvider {
  if (!instance) {
    if (tauriIosDisponible()) instance = new TauriIapProvider();
    else if (plateformeNative() === "android") instance = new IndisponibleIapProvider();
    else instance = new StubIapProvider();
  }
  return instance;
}
```

- [ ] **Step 8 : Lancer la suite complète**

```bash
npx vitest run --maxWorkers=4
npx eslint src
```

Attendu : PASS et aucune erreur de lint.

- [ ] **Step 9 : Commit**

```bash
git add src/lib/ads/adProvider.ts src/lib/ads/adProvider.android.test.ts \
        src/lib/iap/iapProvider.ts src/lib/iap/iapProvider.android.test.ts
git commit -m "$(cat <<'EOF'
feat(android): providers « indisponible » pour les pubs et l'achat

Sans ça, Android retombait sur les stubs de développement et offrait
récompenses et énergie infinie gratuitement, en silence.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : Masquer les publicités dans l'UI

**Files:**
- Modify: `src/components/mobile/EnergieRecharge.tsx:470-512`
- Modify: `src/app/(qg)/atelier/page.tsx:840-843`

**Interfaces:**
- Consumes: `pubDisponible()` (Task 4)
- Produces: rien que d'autres tâches consomment

**Note :** `src/components/mobile/AdMobBootstrap.tsx:15` est déjà gaté par `adMobDisponible()` puis par `instanceof AdMobAdProvider` : il est correct par construction sur Android, **il n'y a rien à y faire**.

- [ ] **Step 1 : Masquer le cartel pub et le levier de la machine à énergie**

Dans `src/components/mobile/EnergieRecharge.tsx`, ajouter `pubDisponible` à l'import existant :

```ts
import { getAdProvider, EMPLACEMENTS_PUB, pubDisponible } from "@/lib/ads/adProvider";
```

Puis, juste après la ligne `const pubIndisponible = ...` (ligne 275), introduire :

```ts
  // Android tant que le plugin AdMob Kotlin n'existe pas : aucune pub n'est
  // proposée du tout — ni cartel, ni levier. La recharge par le temps suffit
  // à faire tourner la modale.
  const pubProposee = pubDisponible();
```

Remplacer ensuite les deux conditions de rendu `{!infinie && (` des lignes 470 et 510 par `{!infinie && pubProposee && (`. Les deux blocs concernés sont le `<CartelPub …>` et le `<div aria-hidden style={levierTapStyle(…)} …/>`.

**Ne pas toucher** au troisième bloc `{!infinie && (` de la ligne 516 : c'est le bouton d'achat, traité en Task 7.

- [ ] **Step 2 : Masquer le bouton d'accélération de l'atelier**

Dans `src/app/(qg)/atelier/page.tsx`, ajouter `pubDisponible` à l'import existant :

```ts
import { getAdProvider, EMPLACEMENTS_PUB, pubDisponible } from "@/lib/ads/adProvider";
```

Puis, ligne 840, remplacer la condition de rendu :

```tsx
            {peutTerminerImmediat(
              enCoursDetail.enRestauration,
              tempsConfiance() ?? Date.now(),
            ) && (
```

par :

```tsx
            {pubDisponible() &&
              peutTerminerImmediat(
                enCoursDetail.enRestauration,
                tempsConfiance() ?? Date.now(),
              ) && (
```

**Attention à la parenthèse fermante** de ce bloc JSX, qui doit rester appariée. Vérifier par la compilation à l'étape suivante.

- [ ] **Step 3 : Vérifier que rien n'est cassé**

```bash
npx tsc --noEmit
npx vitest run --maxWorkers=4
npx eslint src
```

Attendu : aucune erreur de type, PASS, aucune erreur de lint. Les tests existants tournent hors Tauri, donc `pubDisponible()` y vaut `true` et les comportements testés sont inchangés.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/EnergieRecharge.tsx "src/app/(qg)/atelier/page.tsx"
git commit -m "$(cat <<'EOF'
feat(android): aucune publicité proposée dans l'UI sur Android

Cartel et levier de la machine à énergie, bouton d'accélération de l'atelier :
absents plutôt que désactivés ou en échec.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6 : Le vendeur mystère n'apparaît pas sur Android

**Files:**
- Modify: `src/lib/boiteMystere.ts` (ajout en fin de fichier)
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx:243-252`
- Test: `src/lib/boiteMystere.test.ts` (ajout)

**Interfaces:**
- Consumes: `pubDisponible()` (Task 4)
- Produces: `export function vendeurMysterePeutApparaitre(opts: { tutorielActif: boolean; placeRestante: number; pubDisponible: boolean }): boolean`

**Pourquoi cette tâche existe :** la boîte mystère **est** la publicité. Masquer seulement son bouton laisserait dans le deck de chinage une carte impossible à ouvrir, donc une frustration. Sur Android, le vendeur ne doit pas apparaître du tout. Cette décision disparaîtra à la livraison du sous-projet B.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin de `src/lib/boiteMystere.test.ts` :

```ts
describe("vendeurMysterePeutApparaitre", () => {
  const base = { tutorielActif: false, placeRestante: 3, pubDisponible: true };

  it("vrai dans le cas nominal", () => {
    expect(vendeurMysterePeutApparaitre(base)).toBe(true);
  });

  it("faux pendant le tutoriel guidé (pas de distraction pub)", () => {
    expect(vendeurMysterePeutApparaitre({ ...base, tutorielActif: true })).toBe(false);
  });

  it("faux si le stockage est plein (jamais de pub gâchée)", () => {
    expect(vendeurMysterePeutApparaitre({ ...base, placeRestante: 0 })).toBe(false);
  });

  it("faux si aucune régie n'est branchée — sinon carte inouvrable dans le deck", () => {
    expect(vendeurMysterePeutApparaitre({ ...base, pubDisponible: false })).toBe(false);
  });
});
```

Ajouter `vendeurMysterePeutApparaitre` à la liste des imports en tête de ce fichier de test.

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/boiteMystere.test.ts
```

Attendu : ÉCHEC — `vendeurMysterePeutApparaitre` n'est pas exportée.

- [ ] **Step 3 : Écrire l'implémentation**

Ajouter à la fin de `src/lib/boiteMystere.ts` :

```ts
/**
 * Le vendeur mystère peut-il apparaître dans le deck de cette session ?
 * Faux pendant le tutoriel guidé (pas de distraction pub/récompense sur la
 * première session encadrée), faux si le stockage est plein (jamais de pub
 * gâchée), et faux si aucune régie publicitaire n'est branchée — sa boîte ne
 * s'ouvre qu'en regardant une pub, elle serait une carte inouvrable.
 *
 * Fonction pure : le tirage aléatoire reste dans `tenterApparition`.
 */
export function vendeurMysterePeutApparaitre(opts: {
  tutorielActif: boolean;
  placeRestante: number;
  pubDisponible: boolean;
}): boolean {
  return !opts.tutorielActif && opts.placeRestante >= 1 && opts.pubDisponible;
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run --maxWorkers=4 src/lib/boiteMystere.test.ts
```

Attendu : PASS.

- [ ] **Step 5 : Brancher l'helper dans la page de chine**

Dans `src/app/chiner/[brocanteId]/ClientPage.tsx`, ajouter `vendeurMysterePeutApparaitre` à l'import existant depuis `@/lib/boiteMystere`, et ajouter :

```ts
import { pubDisponible } from "@/lib/ads/adProvider";
```

Puis remplacer le bloc des lignes 244 à 248 :

```ts
      if (
        !tutorielActif(state) &&
        placeRestante(state) >= 1 &&
        tenterApparition(nReclamees)
      ) {
```

par :

```ts
      if (
        vendeurMysterePeutApparaitre({
          tutorielActif: tutorielActif(state),
          placeRestante: placeRestante(state),
          pubDisponible: pubDisponible(),
        }) &&
        tenterApparition(nReclamees)
      ) {
```

Le commentaire des lignes 239-242 reste valable ; y ajouter une phrase :

```
      // Absent aussi là où aucune régie n'est branchée (Android avant le
      // sous-projet B) : sa boîte ne s'ouvre qu'en regardant une pub.
```

- [ ] **Step 6 : Vérifier**

```bash
npx tsc --noEmit
npx vitest run --maxWorkers=4
npx eslint src
```

Attendu : aucune erreur de type, PASS, aucune erreur de lint.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/boiteMystere.ts src/lib/boiteMystere.test.ts "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "$(cat <<'EOF'
feat(android): pas de vendeur mystère là où aucune régie n'est branchée

Sa boîte ne s'ouvre qu'en regardant une pub : sans régie, elle serait une
carte inouvrable au milieu du deck. Condition extraite en fonction pure.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 : Masquer l'offre d'achat et la restauration

**Files:**
- Modify: `src/components/mobile/EnergieRecharge.tsx:210-222, 516-528`
- Modify: `src/components/mobile/ReglagesModal.tsx:289`

**Interfaces:**
- Consumes: `achatDisponible()` (Task 4)
- Produces: rien que d'autres tâches consomment

**Note :** `src/components/mobile/IapBootstrap.tsx:19` est déjà gaté par `tauriIosDisponible()` : correct par construction sur Android, rien à y faire.

- [ ] **Step 1 : Masquer le bouton d'achat de la machine à énergie**

Dans `src/components/mobile/EnergieRecharge.tsx`, ajouter `achatDisponible` à l'import existant :

```ts
import { getIapProvider, achatDisponible } from "@/lib/iap/iapProvider";
```

Modifier l'effet de récupération du prix (ligne 210) pour ne pas interroger une boutique absente — sans quoi `obtenirPrix()` rejette à chaque montage :

```ts
  // Prix localisé au montage — non-acheteur seulement (StoreKit / stub).
  useEffect(() => {
    if (infinie || !achatDisponible()) return;
    let annule = false;
    getIapProvider()
      .obtenirPrix()
      .then((p) => {
        if (!annule) setPrix(p);
      })
      .catch(() => {}); // hors-ligne : le bouton reste sans prix, l'achat re-tentera
    return () => {
      annule = true;
    };
  }, [infinie]);
```

Puis, ligne 516, remplacer la condition de rendu du bouton d'achat `{!infinie && (` par :

```tsx
        {!infinie && achatDisponible() && (
```

- [ ] **Step 2 : Masquer la section « Achats » des réglages**

Dans `src/components/mobile/ReglagesModal.tsx`, ajouter `achatDisponible` à l'import existant :

```ts
import { getIapProvider, achatDisponible } from "@/lib/iap/iapProvider";
```

Ligne 289, remplacer :

```tsx
        <SectionAchats />
```

par :

```tsx
        {achatDisponible() && <SectionAchats />}
```

Et corriger le commentaire de `SectionAchats` (ligne 364), devenu faux — il affirme « Toujours visible » :

```ts
/** Restauration du non-consommable « Énergie infinie » — bouton exigé par
 *  Apple. Visible partout où une boutique est branchée : en dev/web le stub
 *  relit le drapeau local, sur Android rien n'est branché et la section
 *  n'est pas rendue du tout. */
```

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit
npx vitest run --maxWorkers=4
npx eslint src
```

Attendu : aucune erreur de type, PASS, aucune erreur de lint. En particulier `src/components/mobile/IapBootstrap.test.tsx` doit rester vert.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/EnergieRecharge.tsx src/components/mobile/ReglagesModal.tsx
git commit -m "$(cat <<'EOF'
feat(android): offre d'achat et restauration masquées sans boutique branchée

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8 : Bouton retour matériel

**Files:**
- Create: `src/lib/retourAndroid.ts`
- Create: `src/lib/retourAndroid.test.ts`
- Create: `src/components/mobile/BoutonRetourAndroid.tsx`
- Modify: `src/components/mobile/BottomSheet.tsx`
- Modify: `src/app/layout.tsx:95`
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts`

**Interfaces:**
- Consumes: `plateformeNative()` (Task 3), `estRoutePartie()` (`src/lib/routesPartie.ts:22`), l'émulateur (Task 2)
- Produces:
  - `export function empilerFermeture(f: () => void): () => void`
  - `export function fermerLePlusHaut(): boolean`
  - `export function viderPile(): void` (tests uniquement)

**Comportement retenu :** le retour ferme d'abord l'overlay ou la sheet la plus haute ; à défaut il remonte d'un niveau de navigation ; sur l'écran racine il demande confirmation (double appui) avant de quitter.

- [ ] **Step 1 : Établir la sémantique réelle de `onBackButtonPress`**

La documentation Tauri décrit la signature (`onBackButtonPress(handler): Promise<PluginListener>`, charge utile `{ canGoBack: boolean }`) mais **ne dit pas si l'enregistrement d'un écouteur supprime le comportement par défaut** (fermeture de l'activité). Il faut le constater, pas le supposer.

Créer un composant temporaire minimal qui journalise l'événement, le monter dans `layout.tsx`, lancer sur émulateur (`./scripts/android-sim.sh` une fois la Task 10 faite, ou `npm run tauri android dev` en attendant), puis appuyer sur retour depuis l'écran racine en observant `adb logcat`.

Noter la réponse dans `docs/android/2026-08-10-recette-emulateur.md` :
- **Cas A — le défaut est supprimé** (l'app ne se ferme pas) : il faut une sortie explicite, voir Step 6.
- **Cas B — le défaut subsiste** (l'app se ferme malgré l'écouteur) : la confirmation de sortie est inutile, voir Step 6.

Supprimer le composant temporaire avant de continuer.

- [ ] **Step 2 : Écrire le test de la pile de fermeture**

Créer `src/lib/retourAndroid.test.ts` :

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { empilerFermeture, fermerLePlusHaut, viderPile } from "./retourAndroid";

beforeEach(() => {
  viderPile();
});

describe("pile de fermeture", () => {
  it("faux quand rien n'est ouvert", () => {
    expect(fermerLePlusHaut()).toBe(false);
  });

  it("ferme le plus haut d'abord (dernier empilé, premier appelé)", () => {
    const ordre: string[] = [];
    empilerFermeture(() => ordre.push("bas"));
    empilerFermeture(() => ordre.push("haut"));

    expect(fermerLePlusHaut()).toBe(true);
    expect(ordre).toEqual(["haut"]);

    expect(fermerLePlusHaut()).toBe(true);
    expect(ordre).toEqual(["haut", "bas"]);

    expect(fermerLePlusHaut()).toBe(false);
  });

  it("le désenregistrement retire le fermoir sans toucher aux autres", () => {
    const bas = vi.fn();
    const haut = vi.fn();
    empilerFermeture(bas);
    const retirerHaut = empilerFermeture(haut);

    retirerHaut();

    expect(fermerLePlusHaut()).toBe(true);
    expect(haut).not.toHaveBeenCalled();
    expect(bas).toHaveBeenCalledOnce();
  });

  it("désenregistrer après fermeture ne casse rien (double retrait)", () => {
    const f = vi.fn();
    const retirer = empilerFermeture(f);
    expect(fermerLePlusHaut()).toBe(true);
    expect(() => retirer()).not.toThrow();
    expect(fermerLePlusHaut()).toBe(false);
  });
});
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/retourAndroid.test.ts
```

Attendu : ÉCHEC — le module `./retourAndroid` n'existe pas.

- [ ] **Step 4 : Écrire la pile**

Créer `src/lib/retourAndroid.ts` :

```ts
/**
 * Pile des fermetures ouvertes, du plus bas au plus haut. Le bouton retour
 * matériel d'Android ferme d'abord ce qui est au-dessus, comme le ferait un
 * tap sur le voile : c'est la seule façon d'avoir un comportement correct
 * quel que soit l'empilement (sheet par-dessus overlay par-dessus modale).
 *
 * Volontairement hors React : les overlays s'y enregistrent au montage, et le
 * lecteur du bouton retour (BoutonRetourAndroid) la consulte sans avoir à
 * connaître qui que ce soit.
 */
type Fermeture = () => void;

const pile: Fermeture[] = [];

/** Enregistre un fermoir. Retourne la fonction de désenregistrement, à appeler
 *  au démontage (elle est sans effet si le fermoir a déjà été consommé). */
export function empilerFermeture(f: Fermeture): () => void {
  pile.push(f);
  return () => {
    const i = pile.lastIndexOf(f);
    if (i !== -1) pile.splice(i, 1);
  };
}

/** Ferme l'élément le plus haut. Vrai s'il y en avait un à fermer. */
export function fermerLePlusHaut(): boolean {
  const f = pile.pop();
  if (!f) return false;
  f();
  return true;
}

/** Réservé aux tests : remet la pile à zéro entre deux cas. */
export function viderPile(): void {
  pile.length = 0;
}
```

- [ ] **Step 5 : Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run --maxWorkers=4 src/lib/retourAndroid.test.ts
```

Attendu : PASS.

- [ ] **Step 6 : Ajouter la chaîne de confirmation dans les 4 langues**

Dans chacun des fichiers `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts`, ajouter une clé dans le bloc `chrome` :

- `fr.ts` : `appuyezPourQuitter: "Appuyez à nouveau pour quitter",`
- `en.ts` : `appuyezPourQuitter: "Press back again to exit",`
- `es.ts` : `appuyezPourQuitter: "Pulsa de nuevo para salir",`
- `el.ts` : `appuyezPourQuitter: "Πατήστε ξανά για έξοδο",`

**Si le Step 1 a conclu au cas B** (le comportement par défaut subsiste), cette clé n'est pas utilisée : ne pas l'ajouter, et sauter la partie « écran racine » du Step 7.

- [ ] **Step 7 : Écrire le composant**

Créer `src/components/mobile/BoutonRetourAndroid.tsx` :

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { plateformeNative } from "@/lib/plateforme";
import { estRoutePartie } from "@/lib/routesPartie";
import { fermerLePlusHaut } from "@/lib/retourAndroid";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useToastSafe } from "@/components/ui/Toast";

/** Délai pendant lequel un second appui sur retour confirme la sortie. */
const CONFIRMATION_MS = 2000;

/**
 * Bouton retour matériel d'Android. Non traité, il ferme l'application depuis
 * n'importe quel écran, y compris au milieu d'une session de chine.
 *
 * Ordre de priorité : fermer l'overlay le plus haut, sinon remonter d'un
 * niveau de navigation, sinon (écran racine) demander confirmation.
 *
 * Ne rend rien. Inerte hors Android — l'import de l'API Tauri est dynamique
 * pour que rien de natif ne soit évalué ailleurs (même motif que
 * src/lib/notifications).
 */
export function BoutonRetourAndroid() {
  const router = useRouter();
  const pathname = usePathname();
  const { d } = useLangue();
  const { toast } = useToastSafe();

  // Le pathname change sans que l'écouteur natif soit réenregistré : on le lit
  // par ref pour que le gestionnaire voie toujours la route courante.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const dernierAppui = useRef(0);

  useEffect(() => {
    if (plateformeNative() !== "android") return;

    let annule = false;
    let detacher: (() => void) | undefined;

    void (async () => {
      const { onBackButtonPress } = await import("@tauri-apps/api/app");
      const listener = await onBackButtonPress(() => {
        if (fermerLePlusHaut()) return;

        const route = pathnameRef.current;
        if (estRoutePartie(route) && route !== "/bureau") {
          router.back();
          return;
        }

        const maintenant = Date.now();
        if (maintenant - dernierAppui.current < CONFIRMATION_MS) {
          void (async () => {
            const { exit } = await import("@tauri-apps/plugin-process");
            await exit(0);
          })();
          return;
        }
        dernierAppui.current = maintenant;
        toast(d.chrome.appuyezPourQuitter);
      });

      if (annule) listener.unregister();
      else detacher = () => listener.unregister();
    })();

    return () => {
      annule = true;
      detacher?.();
    };
  }, [router, toast, d]);

  return null;
}
```

**Si le Step 1 a conclu au cas B**, remplacer tout le bloc à partir de `const maintenant = Date.now();` par un simple `return;` — Android fermera l'application de lui-même — et retirer `useLangue`, `useToastSafe`, `dernierAppui` et `CONFIRMATION_MS`, devenus inutiles.

**Si le Step 1 a conclu au cas A**, le plugin `process` doit être ajouté, car rien d'autre ne permet de quitter :

```bash
npm install @tauri-apps/plugin-process
cargo add tauri-plugin-process --manifest-path src-tauri/Cargo.toml
```

et enregistrer `.plugin(tauri_plugin_process::init())` dans `src-tauri/src/lib.rs`, à côté des autres plugins, puis ajouter `"process:default"` aux `permissions` de `src-tauri/capabilities/default.json`.

- [ ] **Step 8 : Enregistrer le châssis de sheet dans la pile**

Dans `src/components/mobile/BottomSheet.tsx`, ajouter l'import :

```tsx
import { empilerFermeture } from "@/lib/retourAndroid";
```

et, dans le corps du composant à côté des autres effets :

```tsx
  // Le bouton retour d'Android ferme la sheet la plus haute, exactement comme
  // un tap sur le voile. L'enregistrement suit l'ouverture, le retrait suit le
  // démontage.
  useEffect(() => {
    if (!open) return;
    return empilerFermeture(onClose);
  }, [open, onClose]);
```

Les props de `BottomSheet` sont bien `open: boolean` et `onClose: () => void` (`BottomSheetProps`, ligne 13).

Ce seul châssis couvre six écrans : `ConcessionSheet`, `NegociationSheet`, `CoffreChargement`, `PersonaInfoOverlay`, `DonationPickerSheet`, et les sheets montées par les pages `chiner` et `atelier`.

**`FloatingRoomOverlay` n'est pas concerné** : c'est un châssis de mise en page pur (`bande` / `milieu` / `children`), sans état d'ouverture ni fermoir — il n'a rien à enregistrer.

Les overlays qui gèrent eux-mêmes leur voile et leur fermeture (modales de réglages, de parties, de crédits, gazette, parcours, dialogue) ne sont **pas** traités ici : ils seront repérés à l'usage pendant la recette (Task 11, point 3) et enregistrés alors, avec le même effet de trois lignes.

- [ ] **Step 9 : Monter le composant dans le layout racine**

Dans `src/app/layout.tsx`, ajouter l'import puis le composant à côté des autres éléments du chrome global :

```tsx
                <AdMobBootstrap />
                <IapBootstrap />
                <BoutonRetourAndroid />
```

Le composant est inerte hors Android et ne rend rien : il n'a pas besoin d'être gaté sur `estRoutePartie()` au montage — c'est son **gestionnaire** qui consulte la route, ce qui est le comportement voulu (le retour doit aussi fonctionner sur l'écran titre).

- [ ] **Step 10 : Vérifier**

```bash
npx tsc --noEmit
npx vitest run --maxWorkers=4
npx eslint src
```

Attendu : aucune erreur de type, PASS, aucune erreur de lint.

- [ ] **Step 11 : Commit**

```bash
git add src/lib/retourAndroid.ts src/lib/retourAndroid.test.ts \
        src/components/mobile/BoutonRetourAndroid.tsx \
        src/components/mobile/BottomSheet.tsx \
        src/app/layout.tsx src/lib/i18n/ui
git commit -m "$(cat <<'EOF'
feat(android): bouton retour matériel — pile de fermeture puis navigation

Sans ça, le retour ferme l'application depuis n'importe quel écran, y compris
au milieu d'une session de chine.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9 : Verrouiller l'orientation portrait

**Files:**
- Modify: `src-tauri/gen/android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: le projet Android généré (Task 2)
- Produces: rien que d'autres tâches consomment

- [ ] **Step 1 : Constater le comportement actuel**

Lancer le jeu sur l'émulateur et faire pivoter l'appareil (`Ctrl+F11` ou le bouton de rotation de la barre latérale de l'émulateur). Attendu : la mise en page casse — le jeu est conçu en portrait.

- [ ] **Step 2 : Verrouiller l'orientation**

Dans `src-tauri/gen/android/app/src/main/AndroidManifest.xml`, ajouter à la balise `<activity>` principale :

```xml
android:screenOrientation="portrait"
```

- [ ] **Step 3 : Vérifier**

Rebuild, réinstaller, faire pivoter l'émulateur. Attendu : l'affichage reste en portrait.

- [ ] **Step 4 : Documenter l'édition manuelle**

`AndroidManifest.xml` est un fichier généré désormais édité à la main — même situation que `main.mm` et `AdmobBridge.swift` côté iOS. Ajouter en tête du fichier, juste après la ligne `<?xml … ?>` :

```xml
<!-- ⚠ Fichier généré par `tauri android init` mais ÉDITÉ À LA MAIN :
     `android:screenOrientation="portrait"` (le jeu est conçu en portrait, la
     rotation casse la mise en page). Ne pas régénérer sans reporter ce
     réglage. -->
```

- [ ] **Step 5 : Commit**

```bash
git add src-tauri/gen/android/app/src/main/AndroidManifest.xml
git commit -m "$(cat <<'EOF'
fix(android): orientation verrouillée en portrait

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10 : Script de lancement sur émulateur

**Files:**
- Create: `scripts/android-sim.sh`

**Interfaces:**
- Consumes: la toolchain et l'émulateur (Task 2)
- Produces: `./scripts/android-sim.sh`, utilisé par les Tasks 8 et 11

**Pourquoi :** `next dev` est inutilisable en webview mobile (piège connu du projet, cf. mémoire « Pièges WKWebView/Tauri iOS »). On sert l'export statique `out/`, comme sur iOS.

- [ ] **Step 1 : Lire le script iOS existant**

```bash
cat scripts/ios-sim.sh
```

Reprendre sa structure, ses conventions de messages et sa gestion d'erreurs — le script Android doit lui ressembler.

- [ ] **Step 2 : Écrire le script**

Créer `scripts/android-sim.sh` :

```bash
#!/usr/bin/env bash
# Build + installation + lancement de BROC sur un émulateur Android.
#
# Jumeau de scripts/ios-sim.sh. On sert l'export statique (out/), jamais
# `next dev` : le serveur de dev est inutilisable en webview mobile.
#
# Usage : ./scripts/android-sim.sh
# Prérequis : un émulateur démarré (Android Studio → Device Manager),
#             $ANDROID_HOME et $NDK_HOME définis.
set -euo pipefail

cd "$(dirname "$0")/.."

APP_ID="com.guigousse.broc.debug"

if ! adb devices | grep -q "device$"; then
  echo "❌ Aucun appareil/émulateur détecté. Démarre un AVD, puis relance."
  echo "   emulator -list-avds        # pour voir les AVD disponibles"
  echo "   emulator -avd <nom> &      # pour en démarrer un"
  exit 1
fi

echo "▸ Export statique du front…"
npm run build

echo "▸ Build Android (debug, x86_64)…"
npm run tauri android build -- --debug --target x86_64

APK=$(find src-tauri/gen/android/app/build/outputs/apk -name "*x86_64*debug*.apk" | head -1)
if [ -z "$APK" ]; then
  echo "❌ APK introuvable sous src-tauri/gen/android/app/build/outputs/apk"
  exit 1
fi

echo "▸ APK : $APK ($(du -h "$APK" | cut -f1))"
adb install -r "$APK"
adb shell am start -n "$APP_ID/.MainActivity"

echo "✅ Lancé."
echo "   Capture :  adb exec-out screencap -p > /tmp/broc-android.png"
echo "   Logs    :  adb logcat | grep -i broc"
```

- [ ] **Step 3 : Rendre le script exécutable et le lancer**

```bash
chmod +x scripts/android-sim.sh
./scripts/android-sim.sh
```

Attendu : le jeu se lance sur l'émulateur. **Si le nom de l'activité `.MainActivity` est incorrect**, le lire dans `src-tauri/gen/android/app/src/main/AndroidManifest.xml` et corriger `APP_ID` / le nom d'activité en conséquence. De même pour `APP_ID` : le suffixe `.debug` vient de `bundle.android.debugApplicationIdSuffix` dans `tauri.conf.json` ; le vérifier avec `adb shell pm list packages | grep broc`.

- [ ] **Step 4 : Commit**

```bash
git add scripts/android-sim.sh
git commit -m "$(cat <<'EOF'
chore(android): script de build/install/lancement sur émulateur

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11 : Recette sur émulateur et compte rendu

**Files:**
- Create: `docs/android/2026-08-10-recette-emulateur.md`

**Interfaces:**
- Consumes: tout ce qui précède
- Produces: le compte rendu écrit — livrable non-code de A, qui alimentera les sous-projets B, C et D

- [ ] **Step 1 : Lancer le jeu et dérouler la recette**

```bash
./scripts/android-sim.sh
```

Parcourir les dix points, en notant pour chacun ce qui est observé — pas seulement « OK » :

1. **Lancement** — écran de démarrage, transition iris, absence de flash blanc
2. **Plein écran** — le contenu touche les bords ; pas de bande claire ; barre système à `--forest-800` (`#1A3326`). *C'est le point à risque : rien ne garantit que la WebView Android renseigne `env(safe-area-inset-*)`.* Mesurer plutôt que juger à l'œil : `window.innerHeight` face à la hauteur réelle de l'écran, et la valeur calculée de `--safe-top` / `--safe-bottom`.
3. **Bouton retour** — depuis chaque niveau : sheet ouverte, modale, fenêtre flottante, session de chine en cours, écran racine. Noter tout overlay qui ne se ferme pas — il faudra l'enregistrer dans la pile (Task 8, Step 8).
4. **Orientation** — portrait verrouillé
5. **Parcours complet** — tutoriel, chine, vente, atelier, carnet
6. **Audio** — jazz du menu et sons de chine (les politiques d'autoplay diffèrent de WebKit)
7. **Notifications** — la permission runtime `POST_NOTIFICATIONS` (Android 13+) est un ajout par rapport à iOS : est-elle demandée ? les notifications arrivent-elles ?
8. **Pubs et achat** — vérifier qu'ils sont **absents** et non gratuits : pas de cartel pub dans la machine à énergie, pas de bouton d'accélération à l'atelier, pas d'offre « énergie infinie », pas de section « Achats » dans les réglages, **aucun vendeur mystère au fil d'une dizaine de sessions de chine**
9. **Les 4 langues** — grec en priorité, point faible connu
10. **Poids et performances** — taille de l'APK, fluidité des animations, temps de démarrage

- [ ] **Step 2 : Écrire le compte rendu**

Créer `docs/android/2026-08-10-recette-emulateur.md` avec, pour chacun des dix points : ce qui a été fait, ce qui a été observé, et le verdict (conforme / à corriger / à surveiller). Y consigner aussi :

- la réponse au Step 1 de la Task 8 (le comportement par défaut du bouton retour est-il supprimé ?) ;
- la taille de l'APK debug ;
- la version d'Android et le modèle d'AVD utilisés ;
- **la liste des surprises Android** — la section qui compte, celle qui alimentera B, C et D.

- [ ] **Step 3 : Corriger ce qui est corrigeable dans le périmètre de A**

Les défauts relevant de A (overlay non enregistré dans la pile, inset mal appliqué, chaîne non traduite) sont corrigés maintenant, avec un commit par correction. Ceux qui relèvent de B, C ou D sont consignés dans le compte rendu et **laissés en l'état** — ne pas élargir le périmètre.

- [ ] **Step 4 : Vérification finale**

```bash
npx vitest run --maxWorkers=4
npx eslint src
npx tsc --noEmit
git status --porcelain
```

Attendu : PASS, aucune erreur de lint, aucune erreur de type, arbre propre.

- [ ] **Step 5 : Commit**

```bash
git add docs/android/2026-08-10-recette-emulateur.md
git commit -m "$(cat <<'EOF'
docs(android): compte rendu de recette sur émulateur

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6 : Pousser la branche**

```bash
git push -u origin feat/android-socle
```

La PR est ouverte à la main par Guillaume (pas de `gh` sur cette machine).

---

## Rappels hors périmètre

Ces points **ne sont pas** du ressort de ce plan, mais doivent être suivis en parallèle par Guillaume :

- **Vérifier dans Play Console si la règle « 12 testeurs pendant 14 jours » s'applique** (comptes personnels créés après novembre 2023). C'est le chemin critique de la date de sortie, et ça se lance dès qu'un AAB jouable existe.
- **Créer l'application Android et les 3 blocs rewarded dans AdMob** — prérequis du sous-projet B. Les identifiants iOS ne fonctionnent pas sur Android.
