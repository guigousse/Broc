# AdMob Rewarded Ads iOS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le `StubAdProvider` par de vraies rewarded ads AdMob sur iOS (plugin Tauri Swift vendoré, consentement UMP + ATT), pour la 1.0 App Store.

**Architecture:** Plugin Tauri 2 vendoré `src-tauri/vendor/tauri-plugin-admob` (Rust bridge + Swift, modèle : `tauri-plugin-notification` vendoré). Le Swift du plugin est compilé pendant le build cargo (script Xcode « Build Rust Code ») → le SDK GoogleMobileAds doit être déclaré **des deux côtés** : dépendance SPM du `Package.swift` du plugin (compilation) ET paquet SPM du projet Xcode via `project.yml`/XcodeGen (link de l'app). Côté TS, `AdMobAdProvider` branché dans le point de swap unique `getAdProvider()`.

**Tech Stack:** Tauri 2.11 / Rust, Swift (GMA SDK v12 — API Swift moderne `MobileAds`/`RewardedAd`/`ConsentInformation`, PAS les anciens noms `GAD*`), XcodeGen (local, `/usr/local/bin/xcodegen`), Next.js 16 statique, vitest.

## Global Constraints

- **Aucun build iOS local possible** (Mac 2018) : toute vérification native passe par GitHub Actions (`.github/workflows/ios-testflight.yml`, déclenchable par `gh workflow run ios-testflight.yml --ref <branche>`) puis TestFlight. En local on ne vérifie que : `cargo check`, vitest, eslint, `npm run build`, `xcodegen generate`.
- **IDs AdMob** : `GADApplicationIdentifier` (Info.plist) = le VRAI App ID `ca-app-pub-6928338731034491~1504112334` dès le début (exigence Google). Le **bloc d'annonces** reste l'ID de TEST officiel Google `ca-app-pub-3940256099942544/1712485313` jusqu'à la Task 10 incluse ; le vrai bloc `ca-app-pub-6928338731034491/5859004325` n'est branché qu'en Task 11. Jamais de vrai bloc pendant le dev (risque de ban).
- **Spike CI d'abord** : aucune logique Swift complète avant que le squelette + SDK ne compile sur CI (Task 4 est un GATE — si elle échoue, corriger avant de continuer).
- Commentaires de code en **français**, style du dépôt (expliquer les contraintes, pas le déroulé).
- Aucun changement dans les 3 écrans consommateurs (`BoiteMystereOverlay.tsx`, `EnergieRecharge.tsx`, `atelier/page.tsx`) ni dans les libellés i18n existants.
- Branche de travail : `feat/admob` (créée en Task 1, PR vers `main` à la fin).
- Tests existants (1236) doivent rester verts à chaque commit.

---

### Task 1: Crate Rust `tauri-plugin-admob` (bridge + enregistrement)

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-admob/Cargo.toml`
- Create: `src-tauri/vendor/tauri-plugin-admob/build.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/src/lib.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/src/error.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/src/models.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/src/commands.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/src/desktop.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/src/mobile.rs`
- Create: `src-tauri/vendor/tauri-plugin-admob/permissions/default.toml`
- Modify: `src-tauri/Cargo.toml` (dependencies)
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces (pour Task 2/6) : commandes Tauri `plugin:admob|initialize` → `()` et `plugin:admob|show_rewarded_ad` → `{ rewarded: boolean }` ; noms Swift attendus par `run_mobile_plugin` : `"initialize"` et `"showRewardedAd"`.

- [ ] **Step 1 : créer la branche**

```bash
cd "/Users/guillaume/dev/Projet Broc V2" && git checkout -b feat/admob
```

- [ ] **Step 2 : écrire le crate**

`Cargo.toml` :
```toml
[package]
name = "tauri-plugin-admob"
version = "0.1.0"
edition = "2021"
rust-version = "1.77.2"
links = "tauri-plugin-admob"

[build-dependencies]
tauri-plugin = { version = "2", features = ["build"] }

[dependencies]
tauri = { version = "2" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
```

`build.rs` :
```rust
const COMMANDS: &[&str] = &["initialize", "show_rewarded_ad"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .build();
}
```

`src/lib.rs` :
```rust
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;
mod models;

#[cfg(target_os = "ios")]
mod mobile;
#[cfg(not(target_os = "ios"))]
mod desktop;

#[cfg(target_os = "ios")]
use mobile::Admob;
#[cfg(not(target_os = "ios"))]
use desktop::Admob;

pub use error::{Error, Result};
pub use models::AdResult;

/// Accès à l'état du plugin depuis les commandes.
pub trait AdmobExt<R: Runtime> {
    fn admob(&self) -> &Admob<R>;
}

impl<R: Runtime, T: Manager<R>> AdmobExt<R> for T {
    fn admob(&self) -> &Admob<R> {
        self.state::<Admob<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("admob")
        .invoke_handler(tauri::generate_handler![
            commands::initialize,
            commands::show_rewarded_ad
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let admob = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let admob = desktop::init(app, api)?;
            app.manage(admob);
            Ok(())
        })
        .build()
}
```

`src/models.rs` :
```rust
use serde::{Deserialize, Serialize};

/// Résultat d'une rewarded ad. `rewarded` n'est vrai que si la pub a été
/// visionnée jusqu'au déclenchement de la récompense côté SDK Google.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdResult {
    pub rewarded: bool,
}
```

`src/error.rs` :
```rust
use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[cfg(target_os = "ios")]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
    #[error("AdMob indisponible sur cette plateforme")]
    UnsupportedPlatform,
}

// Les erreurs de commande Tauri doivent être sérialisables vers JS.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

`src/commands.rs` :
```rust
use tauri::{command, AppHandle, Runtime};

use crate::{models::AdResult, AdmobExt, Result};

#[command]
pub(crate) async fn initialize<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.admob().initialize()
}

#[command]
pub(crate) async fn show_rewarded_ad<R: Runtime>(app: AppHandle<R>) -> Result<AdResult> {
    app.admob().show_rewarded_ad()
}
```

`src/desktop.rs` (stub : jamais appelé en pratique, `getAdProvider()` côté TS ne
choisit AdMob que sur iOS ; il garantit juste la compilation desktop) :
```rust
use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::AdResult;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
    Ok(Admob(app.clone()))
}

pub struct Admob<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Admob<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        Err(crate::Error::UnsupportedPlatform)
    }
    pub fn show_rewarded_ad(&self) -> crate::Result<AdResult> {
        Err(crate::Error::UnsupportedPlatform)
    }
}
```

`src/mobile.rs` :
```rust
use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::AdResult;

tauri::ios_plugin_binding!(init_plugin_admob);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
    let handle = api.register_ios_plugin(init_plugin_admob)?;
    Ok(Admob(handle))
}

pub struct Admob<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Admob<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("initialize", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn show_rewarded_ad(&self) -> crate::Result<AdResult> {
        self.0
            .run_mobile_plugin("showRewardedAd", serde_json::json!({}))
            .map_err(Into::into)
    }
}
```

`permissions/default.toml` :
```toml
[default]
description = "Permissions par défaut du plugin AdMob : init du SDK et affichage de rewarded ads."
permissions = ["allow-initialize", "allow-show-rewarded-ad"]
```

- [ ] **Step 3 : brancher dans l'app**

`src-tauri/Cargo.toml`, section `[dependencies]`, ajouter :
```toml
tauri-plugin-admob = { path = "vendor/tauri-plugin-admob" }
```

`src-tauri/src/lib.rs` : ajouter `.plugin(tauri_plugin_admob::init())` juste après la ligne `.plugin(tauri_plugin_notification::init())`.

`src-tauri/capabilities/default.json` : ajouter `"admob:default"` à la liste `permissions` existante.

- [ ] **Step 4 : vérifier la compilation desktop**

```bash
cd "/Users/guillaume/dev/Projet Broc V2/src-tauri" && cargo check 2>&1 | tail -5
```
Attendu : `Finished` sans erreur. (Le chemin iOS — mobile.rs, Swift — n'est PAS compilé ici ; c'est le rôle de la Task 4.)

- [ ] **Step 5 : commit**

```bash
git add src-tauri && git commit -m "feat(admob): crate plugin Tauri vendoré (bridge Rust, stub desktop)"
```

---

### Task 2: Squelette Swift + Package.swift (dépendance GoogleMobileAds)

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-admob/ios/Package.swift`
- Create: `src-tauri/vendor/tauri-plugin-admob/ios/Sources/AdmobPlugin.swift`

**Interfaces:**
- Consumes: noms de commandes `"initialize"` / `"showRewardedAd"` (Task 1, `run_mobile_plugin`).
- Produces: classe `AdmobPlugin: Plugin` + `@_cdecl("init_plugin_admob")` (nom attendu par `ios_plugin_binding!` de Task 1). La Task 6 remplacera le corps des deux méthodes sans changer leurs signatures.

- [ ] **Step 1 : écrire le paquet Swift**

`ios/Package.swift` (calqué sur celui de tauri-plugin-notification ; `.tauri/tauri-api` est copié là par la CLI Tauri au build) :
```swift
// swift-tools-version:5.5
import PackageDescription

let package = Package(
  name: "tauri-plugin-admob",
  platforms: [
    .iOS(.v13)
  ],
  products: [
    .library(
      name: "tauri-plugin-admob",
      type: .static,
      targets: ["tauri-plugin-admob"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api"),
    .package(
      url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git",
      from: "12.0.0")
  ],
  targets: [
    .target(
      name: "tauri-plugin-admob",
      dependencies: [
        .byName(name: "Tauri"),
        .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads")
      ],
      path: "Sources")
  ]
)
```

`ios/Sources/AdmobPlugin.swift` — squelette volontairement minimal MAIS avec les
imports du SDK, pour que le spike CI (Task 4) prouve la résolution ET le link :
```swift
import SwiftRs
import Tauri
import UIKit
import WebKit
import GoogleMobileAds
import UserMessagingPlatform

// Squelette du spike CI : les imports GoogleMobileAds/UserMessagingPlatform
// suffisent à prouver que le SDK est résolu et linké des deux côtés
// (Package.swift du plugin + project.yml de l'app). Logique réelle en Task 6.
class AdmobPlugin: Plugin {
  @objc public func initialize(_ invoke: Invoke) throws {
    invoke.resolve()
  }

  @objc public func showRewardedAd(_ invoke: Invoke) throws {
    invoke.resolve(["rewarded": false])
  }
}

@_cdecl("init_plugin_admob")
func initPluginAdmob() -> Plugin {
  return AdmobPlugin()
}
```

- [ ] **Step 2 : vérification locale (limitée) + commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2/src-tauri" && cargo check 2>&1 | tail -3
git add vendor/tauri-plugin-admob/ios && git commit -m "feat(admob): squelette Swift + dépendance SPM GoogleMobileAds"
```
Attendu : `cargo check` toujours vert (le Swift n'est pas compilé en desktop).

---

### Task 3: `project.yml` — paquet SPM côté app + clés Info.plist + ATT localisée

**Files:**
- Modify: `src-tauri/gen/apple/project.yml`
- Create: `src-tauri/gen/apple/app_iOS/fr.lproj/InfoPlist.strings`
- Create: `src-tauri/gen/apple/app_iOS/es.lproj/InfoPlist.strings`
- Create: `src-tauri/gen/apple/app_iOS/el.lproj/InfoPlist.strings`
- Regenerate: `src-tauri/gen/apple/app.xcodeproj/project.pbxproj` + `src-tauri/gen/apple/app_iOS/Info.plist` (via `xcodegen generate` — ne PAS les éditer à la main)

**Interfaces:**
- Consumes: rien.
- Produces: SDK linké au niveau app (résout « module not found »), App ID AdMob déclaré, prompt ATT localisé. Règle la foulée le bloquant d'audit `ITSAppUsesNonExemptEncryption`.

- [ ] **Step 1 : déclarer le paquet SPM dans project.yml**

Au niveau racine de `project.yml` (après la section `settingGroups:`), ajouter :
```yaml
packages:
  GoogleMobileAds:
    url: https://github.com/googleads/swift-package-manager-google-mobile-ads
    from: 12.0.0
```
Dans `targets: app_iOS: dependencies:`, ajouter à la liste existante :
```yaml
      - package: GoogleMobileAds
```

- [ ] **Step 2 : ajouter les clés Info.plist**

Dans `targets: app_iOS: info: properties:`, ajouter (en gardant les clés existantes) :
```yaml
        ITSAppUsesNonExemptEncryption: false
        GADApplicationIdentifier: ca-app-pub-6928338731034491~1504112334
        NSUserTrackingUsageDescription: "Your permission allows us to show more relevant ads when you choose to watch one for an in-game bonus."
```

- [ ] **Step 3 : récupérer la liste SKAdNetworkItems officielle**

Récupérer la liste à jour publiée par Google (page « Quick start » AdMob iOS,
section Info.plist) : `https://developers.google.com/admob/ios/quick-start`.
Utiliser WebFetch avec le prompt « extrais la liste complète des
SKAdNetworkIdentifier du snippet Info.plist ». Convertir en YAML et l'ajouter
dans `properties:` :
```yaml
        SKAdNetworkItems:
          - SKAdNetworkIdentifier: cstr6suwn9.skadnetwork
          - SKAdNetworkIdentifier: 4fzdc2evr5.skadnetwork
          # … (toutes les entrées de la page Google, ~50)
```
Vérification : la liste DOIT contenir `cstr6suwn9.skadnetwork` (Google) et
compter au moins 40 entrées ; sinon la récupération a échoué, ne pas continuer
avec une liste partielle.

- [ ] **Step 4 : textes ATT localisés**

Créer les trois fichiers (l'anglais est la valeur par défaut du plist, Step 2) :

`app_iOS/fr.lproj/InfoPlist.strings` :
```text
"NSUserTrackingUsageDescription" = "Votre autorisation permet d'afficher des publicités plus pertinentes quand vous choisissez d'en regarder une pour obtenir un bonus en jeu.";
```
`app_iOS/es.lproj/InfoPlist.strings` :
```text
"NSUserTrackingUsageDescription" = "Tu permiso nos permite mostrar anuncios más relevantes cuando eliges ver uno para obtener una bonificación en el juego.";
```
`app_iOS/el.lproj/InfoPlist.strings` :
```text
"NSUserTrackingUsageDescription" = "Η άδειά σας επιτρέπει την εμφάνιση πιο σχετικών διαφημίσεων όταν επιλέγετε να δείτε μία για μπόνους στο παιχνίδι.";
```
Et dans `project.yml` → `info: properties:`, ajouter `CFBundleLocalizations: [en, fr, es, el]`.

- [ ] **Step 5 : régénérer le projet Xcode et vérifier**

```bash
cd "/Users/guillaume/dev/Projet Broc V2/src-tauri/gen/apple" && xcodegen generate
grep -c SKAdNetworkIdentifier app_iOS/Info.plist
grep -n "GADApplicationIdentifier\|ITSAppUsesNonExemptEncryption" app_iOS/Info.plist
grep -n "XCRemoteSwiftPackageReference\|GoogleMobileAds" app.xcodeproj/project.pbxproj | head -5
git diff --stat
```
Attendu : ≥ 40 SKAdNetworkIdentifier ; les 2 clés présentes ; au moins une référence
`XCRemoteSwiftPackageReference` GoogleMobileAds dans le pbxproj. Vérifier dans le
diff que les réglages existants (preBuildScripts « Build Rust Code », Externals,
entitlements) sont toujours là — xcodegen régénère TOUT le pbxproj depuis
project.yml, un réglage disparu = il manquait dans project.yml, à y reporter.

- [ ] **Step 6 : commit**

```bash
git add src-tauri/gen/apple && git commit -m "feat(admob): SDK GoogleMobileAds côté app (SPM/XcodeGen), App ID, SKAdNetwork, ATT localisé + ITSAppUsesNonExemptEncryption"
```

---

### Task 4: SPIKE CI (GATE) — le squelette compile et s'uploade sur TestFlight

**Files:** aucun (exécution CI uniquement).

- [ ] **Step 1 : pousser et déclencher**

```bash
git push -u origin feat/admob
gh workflow run ios-testflight.yml --ref feat/admob
sleep 30 && gh run list --workflow=ios-testflight.yml --limit 1
```

- [ ] **Step 2 : suivre le run jusqu'au bout**

```bash
gh run watch $(gh run list --workflow=ios-testflight.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```
Attendu : run vert (archive + signature + upload fastlane). C'est LE point de
validation du risque « module not found » (tauri#13332).

- [ ] **Step 3 : si échec, diagnostiquer AVANT toute suite**

Pistes dans l'ordre : (1) erreur de résolution SPM dans le `swift build` du
plugin → épingler une version exacte (`exact: "12.x.y"`) dans les DEUX
déclarations ; (2) `module not found` au link de l'app → vérifier que la
dépendance `package: GoogleMobileAds` est bien sur le target `app_iOS` dans le
pbxproj régénéré ; (3) plateforme minimale → passer `.iOS(.v13)` à `.v14` dans
Package.swift ET `deploymentTarget` à 14.0 dans project.yml (+ vérifier
`bundle.iOS.minimumSystemVersion` dans tauri.conf.json). Corriger, committer,
relancer le Step 1. Ne pas passer à la Task 5 sans run vert.

---

### Task 5: TS — `AdMobAdProvider` + sélection de provider (TDD)

**Files:**
- Create: `src/lib/ads/adMobProvider.ts`
- Create: `src/lib/ads/adMobProvider.test.ts`
- Modify: `src/lib/ads/adProvider.ts`
- Modify: `package.json` (dépendance `@tauri-apps/api`)

**Interfaces:**
- Consumes: commandes `plugin:admob|initialize` / `plugin:admob|show_rewarded_ad` (Task 1).
- Produces: `adMobDisponible(): boolean` ; `class AdMobAdProvider implements AdProvider` avec `initialiser(): Promise<void>` (idempotente) et `showRewardedAd(): Promise<AdResult>` ; `getAdProvider()` inchangé de signature. Contrat d'erreur (aligné sur les 3 consommateurs existants, qui affichent `erreurPub` sur exception) : échec technique (invoke rejeté, hors-ligne, no-fill) → **throw** ; pub fermée avant la fin → `{ rewarded: false }` sans throw.

- [ ] **Step 1 : lire les 3 consommateurs pour confirmer le contrat d'erreur**

Lire `src/components/mobile/BoiteMystereOverlay.tsx:122`,
`src/components/mobile/EnergieRecharge.tsx:257`, `src/app/(qg)/atelier/page.tsx:102`
et noter comment chacun réagit à un throw vs `{rewarded:false}`. Si l'un d'eux
ne gère pas le throw (pas de try/catch), y ajouter le try/catch → toast
`erreurPub` (clé i18n existante), en suivant le style local du fichier.

- [ ] **Step 2 : ajouter la dépendance**

```bash
cd "/Users/guillaume/dev/Projet Broc V2" && npm install "@tauri-apps/api@^2"
```

- [ ] **Step 3 : écrire les tests (rouges)**

`src/lib/ads/adMobProvider.test.ts` :
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted : vi.mock est hissé en tête de fichier, la factory ne doit pas
// capturer une variable déclarée après coup.
const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

function simulerTauriIos() {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "userAgent", {
    value: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)",
    configurable: true,
  });
}

async function chargerFrais() {
  vi.resetModules();
  return {
    adMob: await import("./adMobProvider"),
    provider: await import("./adProvider"),
  };
}

beforeEach(() => {
  invokeMock.mockReset();
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("adMobDisponible", () => {
  it("faux hors Tauri (web)", async () => {
    const { adMob } = await chargerFrais();
    expect(adMob.adMobDisponible()).toBe(false);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauriIos();
    const { adMob } = await chargerFrais();
    expect(adMob.adMobDisponible()).toBe(true);
  });
});

describe("getAdProvider", () => {
  it("retombe sur le stub hors Tauri iOS", async () => {
    const { provider } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(provider.StubAdProvider);
  });

  it("choisit AdMob sous Tauri iOS", async () => {
    simulerTauriIos();
    const { adMob, provider } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(adMob.AdMobAdProvider);
  });
});

describe("AdMobAdProvider", () => {
  it("initialise une seule fois (idempotent) puis montre la pub", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ rewarded: true });
    const { adMob } = await chargerFrais();
    const p = new adMob.AdMobAdProvider();
    await p.showRewardedAd();
    await p.showRewardedAd();
    const initCalls = invokeMock.mock.calls.filter(
      (c) => c[0] === "plugin:admob|initialize"
    );
    expect(initCalls).toHaveLength(1);
  });

  it("mappe rewarded=true", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ rewarded: true });
    const { adMob } = await chargerFrais();
    await expect(new adMob.AdMobAdProvider().showRewardedAd()).resolves.toEqual({
      rewarded: true,
    });
  });

  it("mappe rewarded=false (pub fermée avant la fin) sans throw", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ rewarded: false });
    const { adMob } = await chargerFrais();
    await expect(new adMob.AdMobAdProvider().showRewardedAd()).resolves.toEqual({
      rewarded: false,
    });
  });

  it("propage l'échec technique (invoke rejeté) en exception", async () => {
    simulerTauriIos();
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "plugin:admob|initialize"
        ? Promise.resolve()
        : Promise.reject(new Error("no-fill"))
    );
    const { adMob } = await chargerFrais();
    await expect(new adMob.AdMobAdProvider().showRewardedAd()).rejects.toThrow();
  });

  it("retente l'init au prochain appel si elle a échoué", async () => {
    simulerTauriIos();
    invokeMock.mockRejectedValueOnce(new Error("offline"));
    invokeMock.mockResolvedValue({ rewarded: true });
    const { adMob } = await chargerFrais();
    const p = new adMob.AdMobAdProvider();
    await expect(p.showRewardedAd()).rejects.toThrow();
    await expect(p.showRewardedAd()).resolves.toEqual({ rewarded: true });
  });
});
```

- [ ] **Step 4 : vérifier que les tests échouent**

```bash
npx vitest run src/lib/ads/ 2>&1 | tail -5
```
Attendu : FAIL (`adMobProvider` introuvable).

- [ ] **Step 5 : implémenter**

`src/lib/ads/adMobProvider.ts` :
```ts
/**
 * Provider AdMob natif (plugin Tauri vendoré). Import DYNAMIQUE de
 * l'API Tauri pour que rien de natif ne soit évalué hors runtime Tauri
 * (même motif que src/lib/notifications).
 */
import type { AdProvider, AdResult } from "./adProvider";

/** Vrai uniquement sous runtime Tauri sur iOS (le plugin n'existe que là). */
export function adMobDisponible(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  return /iPhone|iPad|iPod/.test(window.navigator.userAgent);
}

export class AdMobAdProvider implements AdProvider {
  /** Promesse d'init partagée — consentement UMP/ATT + start SDK + préchargement. */
  private initEnCours: Promise<void> | null = null;

  /** Idempotent ; en cas d'échec (hors-ligne…), le prochain appel retente. */
  initialiser(): Promise<void> {
    if (!this.initEnCours) {
      this.initEnCours = (async () => {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("plugin:admob|initialize");
      })();
      this.initEnCours.catch(() => {
        this.initEnCours = null;
      });
    }
    return this.initEnCours;
  }

  /**
   * Échec technique → exception (l'UI affiche `erreurPub`).
   * Pub fermée avant la récompense → `{ rewarded: false }` sans exception.
   */
  async showRewardedAd(): Promise<AdResult> {
    await this.initialiser();
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ rewarded: boolean }>("plugin:admob|show_rewarded_ad");
    return { rewarded: res.rewarded === true };
  }
}
```

`src/lib/ads/adProvider.ts` — remplacer le singleton final par :
```ts
import { AdMobAdProvider, adMobDisponible } from "./adMobProvider";

// Singleton injectable — AdMob natif sous Tauri iOS, stub partout ailleurs
// (web Safari, simulateur, dev desktop).
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) {
    instance = adMobDisponible() ? new AdMobAdProvider() : new StubAdProvider();
  }
  return instance;
}
```
(Les interfaces `AdResult`/`AdProvider` et `StubAdProvider` ne changent pas.
Attention au cycle d'import : `adMobProvider.ts` n'importe que les TYPES de
`adProvider.ts` — garder `import type`.)

- [ ] **Step 6 : vérifier vert + filets globaux**

```bash
npx vitest run src/lib/ads/ 2>&1 | tail -5
npx eslint src/lib/ads && npx tsc --noEmit 2>&1 | tail -3
```
Attendu : tests PASS, eslint/tsc muets.

- [ ] **Step 7 : commit**

```bash
git add src/lib/ads package.json package-lock.json src/components/mobile/BoiteMystereOverlay.tsx src/components/mobile/EnergieRecharge.tsx "src/app/(qg)/atelier/page.tsx"
git commit -m "feat(admob): AdMobAdProvider TS branché dans getAdProvider (Tauri iOS uniquement)"
```
(Ne mettre les 3 composants dans le commit que si le Step 1 les a modifiés.)

---

### Task 6: Swift — logique complète (UMP + ATT + load/show/reload)

> **RÉVISÉ après le spike CI** : `swift build` (swift-rs) ne résout pas les
> xcframeworks binaires SPM (tauri#13332, confirmé sur CI). Architecture en
> pont : le plugin vendoré (`AdmobPlugin.swift`, DÉJÀ FINAL depuis le fix du
> spike — ne pas le retoucher) transfère au runtime vers la classe
> `BrocAdmobBridge` du target app via `NSClassFromString` et les sélecteurs
> `initialiser:` / `montrerRewarded:` (blocs `() -> Void` et
> `(Bool, String?) -> Void`). Cette tâche remplit le pont.

**Files:**
- Modify: `src-tauri/gen/apple/Sources/app/AdmobBridge.swift` (remplacement complet du squelette du spike)

**Interfaces:**
- Consumes: sélecteurs `initialiser(_:)` / `montrerRewarded(_:)` appelés par le plugin — signatures `@objc` INCHANGÉES (classe `@objc(BrocAdmobBridge)`, singleton `@objc static let shared`).
- Produces: `montrerRewarded` appelle `fin(rewarded, nil)` en succès (rewarded=false si fermeture anticipée) et `fin(false, message)` sur échec technique — le plugin mappe message → `invoke.reject` → exception côté TS (contrat Task 5).

- [ ] **Step 1 : remplacer AdmobBridge.swift**

```swift
import Foundation
import UIKit
import GoogleMobileAds
import UserMessagingPlatform
import AppTrackingTransparency

// Pont AdMob côté app : SEUL endroit autorisé à importer le SDK Google
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. AdmobPlugin.swift). Joint au runtime par
// le plugin via NSClassFromString("BrocAdmobBridge").
// API SDK v12 (noms Swift : MobileAds/RewardedAd/Request,
// ConsentInformation/ConsentForm — PAS les anciens GAD*/UMP*).
// Bloc de TEST officiel Google jusqu'à la bascule de lancement (Task 11) ;
// le GADApplicationIdentifier du plist est, lui, déjà le vrai (exigence Google).
private let AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313"

@objc(BrocAdmobBridge) public class BrocAdmobBridge: NSObject {
  @objc public static let shared = BrocAdmobBridge()

  private var rewardedAd: RewardedAd?
  private var finEnAttente: ((Bool, String?) -> Void)?
  private var recompenseGagnee = false
  private var sdkPret = false

  // MARK: - Entrées du pont (sélecteurs appelés par le plugin vendoré)

  @objc public func initialiser(_ fin: @escaping () -> Void) {
    DispatchQueue.main.async {
      self.parcoursConsentement {
        MobileAds.shared.start()
        self.sdkPret = true
        self.prechargerPub()
        fin()
      }
    }
  }

  @objc public func montrerRewarded(_ fin: @escaping (Bool, String?) -> Void) {
    DispatchQueue.main.async {
      guard self.sdkPret else {
        fin(false, "SDK non initialisé")
        return
      }
      if let pub = self.rewardedAd {
        self.presenter(pub: pub, fin: fin)
      } else {
        // Pas de pub préchargée (hors-ligne au boot, no-fill…) : tentative à
        // la demande — le SDK gère son propre timeout réseau.
        RewardedAd.load(with: AD_UNIT_ID, request: Request()) { pub, erreur in
          guard let pub else {
            fin(false, erreur?.localizedDescription ?? "Aucune pub disponible")
            return
          }
          self.presenter(pub: pub, fin: fin)
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
        fin()
        return
      }
      ConsentForm.loadAndPresentIfRequired(from: self.rootViewController()) { _ in
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

  private func prechargerPub() {
    RewardedAd.load(with: AD_UNIT_ID, request: Request()) { [weak self] pub, _ in
      self?.rewardedAd = pub
      pub?.fullScreenContentDelegate = self
    }
  }

  private func presenter(pub: RewardedAd, fin: @escaping (Bool, String?) -> Void) {
    guard let racine = rootViewController() else {
      fin(false, "Pas de view controller racine")
      return
    }
    finEnAttente = fin
    recompenseGagnee = false
    pub.fullScreenContentDelegate = self
    rewardedAd = nil
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
    prechargerPub()
  }

  public func ad(
    _ ad: FullScreenPresentingAd,
    didFailToPresentFullScreenContentWithError error: Error
  ) {
    finEnAttente?(false, error.localizedDescription)
    finEnAttente = nil
    prechargerPub()
  }
}
```

- [ ] **Step 2 : relire contre le contrat**

Relire le fichier en vérifiant : (1) chaque chemin de `montrerRewarded` finit
par exactement UN appel de `fin` (pas de double appel : `presenter` transfère
la responsabilité au delegate) ; (2) `rewardedAd = nil` avant présentation (une
pub Google ne se présente qu'une fois) ; (3) tout se passe sur le main thread ;
(4) les signatures `@objc` (`initialiser:`, `montrerRewarded:`) et
`@objc(BrocAdmobBridge)`/`shared` sont STRICTEMENT identiques au squelette du
spike — le plugin vendoré les résout par nom au runtime, un renommage casse le
pont silencieusement. Puis `cd src-tauri/gen/apple && xcodegen generate` (le
fichier existait déjà, la régénération doit être un no-op — vérifier
`git status` du pbxproj).

- [ ] **Step 3 : commit + push + run CI**

```bash
git add src-tauri/gen/apple && git commit -m "feat(admob): logique Swift complète dans le pont app (UMP+ATT, load/show/reload, delegate)"
git push && gh workflow run ios-testflight.yml --ref feat/admob
gh run watch $(gh run list --workflow=ios-testflight.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```
Attendu : run vert. Si erreur de compilation Swift sur des noms d'API (le SDK v12
a renommé les symboles), consulter la doc de migration
`https://developers.google.com/admob/ios/migration` et corriger les noms — la
structure du fichier ne change pas.

---

### Task 7: Bootstrap — lancer l'init (consentement + préchargement) au démarrage

**Files:**
- Create: `src/components/mobile/AdMobBootstrap.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `adMobDisponible()`, `getAdProvider()`, `AdMobAdProvider.initialiser()` (Task 5).

- [ ] **Step 1 : composant**

`src/components/mobile/AdMobBootstrap.tsx` :
```tsx
"use client";

import { useEffect } from "react";
import { getAdProvider } from "@/lib/ads/adProvider";
import { AdMobAdProvider, adMobDisponible } from "@/lib/ads/adMobProvider";

/**
 * Déclenche au boot (Tauri iOS uniquement) le parcours de consentement
 * UMP/ATT puis le préchargement d'une rewarded ad, pour que la première
 * demande de pub du joueur soit instantanée. Rend rien ; toute erreur est
 * avalée (une panne de pub ne doit jamais casser le jeu).
 */
export function AdMobBootstrap() {
  useEffect(() => {
    if (!adMobDisponible()) return;
    const provider = getAdProvider();
    if (provider instanceof AdMobAdProvider) {
      provider.initialiser().catch(() => {});
    }
  }, []);
  return null;
}
```

- [ ] **Step 2 : monter dans le layout**

Dans `src/app/layout.tsx` : importer `AdMobBootstrap` et l'ajouter dans le JSX
juste sous `<GlobalVinylAmbiance />`.

- [ ] **Step 3 : vérifier + commit**

```bash
npx vitest run 2>&1 | tail -3 && npx eslint src && npm run build 2>&1 | tail -3
git add src/components/mobile/AdMobBootstrap.tsx src/app/layout.tsx
git commit -m "feat(admob): consentement + préchargement lancés au démarrage (Tauri iOS)"
```
Attendu : suite complète verte, build OK.

---

### Task 8: Pages légales + app-ads.txt

**Files:**
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/mentions-legales/page.tsx`
- Create: `public/app-ads.txt`

- [ ] **Step 1 : app-ads.txt**

`public/app-ads.txt` (exigence AdMob ; servi à la racine du domaine Vercel qui
sera déclaré comme site du développeur sur la fiche App Store) :
```text
google.com, pub-6928338731034491, DIRECT, f08c47fec0942fa0
```

- [ ] **Step 2 : mettre à jour /privacy (FR et EN, même structure que l'existant)**

Lire d'abord la page pour en suivre la structure bilingue. Remplacer la section
« pas de publicité » par une section Publicités, en FR :

> **Publicités.** L'application affiche des publicités récompensées, uniquement
> lorsque vous choisissez d'en regarder une pour obtenir un bonus en jeu. Elles
> sont fournies par Google AdMob. À cette fin, Google peut collecter des
> identifiants d'appareil (dont l'identifiant publicitaire, avec votre accord via
> la popup iOS « Autoriser l'app à suivre vos activités ? »), votre adresse IP et
> des données de diagnostic publicitaire. Au premier lancement, un formulaire de
> consentement (RGPD) vous permet d'accepter ou de refuser les publicités
> personnalisées ; en cas de refus, des publicités non personnalisées sont
> affichées. Vous pouvez modifier ce choix à tout moment (voir la politique de
> confidentialité de Google : https://policies.google.com/privacy).

Et l'équivalent EN dans le bloc anglais. Mettre à jour la date « Dernière mise à
jour » des deux langues à la date du jour. Supprimer toute phrase devenue fausse
(« aucun SDK tiers », « aucune donnée collectée » absolue) dans les deux pages.

- [ ] **Step 3 : mentions légales**

Dans `src/app/mentions-legales/page.tsx`, ajouter Google AdMob (Google Ireland
Ltd pour l'UE) à la liste des prestataires, FR + EN, et mettre à jour la date.

- [ ] **Step 4 : vérifier + commit**

```bash
npm run build 2>&1 | tail -3
git add public/app-ads.txt src/app/privacy src/app/mentions-legales
git commit -m "docs(legal): publicités AdMob dans /privacy et mentions légales + app-ads.txt"
```

---

### Task 9: Revue de branche + merge

- [ ] **Step 1 : filets complets**

```bash
npx vitest run 2>&1 | tail -4 && npx eslint src && npx tsc --noEmit && npm run build 2>&1 | tail -3
cd src-tauri && cargo check 2>&1 | tail -3 && cd ..
```
Attendu : tout vert.

- [ ] **Step 2 : demander la revue**

Utiliser superpowers:requesting-code-review sur le diff `feat/admob` vs `main`,
corriger ce qui en sort, puis ouvrir la PR :
```bash
git push && gh pr create --base main --title "feat: rewarded ads AdMob iOS (plugin Tauri vendoré, UMP+ATT)" --body "Voir docs/superpowers/specs/2026-07-23-admob-rewarded-ios-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Merge après validation de Guillaume. Le push sur `main` déclenchera le build
TestFlight de validation.

---

### Task 10: Validation device (Guillaume, pubs de TEST)

**Files:** aucun — checklist TestFlight sur l'iPhone 12 (iOS 26.2).

- [ ] Installer le build depuis TestFlight (celui du merge, blocs de test).
- [ ] Premier lancement : formulaire de consentement UMP (choisir « Accepter ») puis popup ATT — les deux s'affichent une seule fois, textes FR corrects.
- [ ] Boîte mystère → « Regarder une pub » : une VRAIE pub de test Google s'affiche (bannière « Test Ad »), visionnage complet → la boîte s'ouvre.
- [ ] Recharge d'énergie et accélération d'atelier : idem, le gain n'arrive qu'après la pub.
- [ ] Fermer une pub AVANT la fin (croix) → PAS de gain, pas d'erreur affichée.
- [ ] Mode avion → « Regarder une pub » → message d'erreur propre (`erreurPub`), pas de gain, pas de crash ; retour du réseau → la pub remarche.
- [ ] Mettre l'app en arrière-plan pendant une pub, revenir → pas de blocage (la pub reprend ou se ferme proprement).
- [ ] Relancer l'app : PAS de re-prompt UMP/ATT ; une pub est disponible rapidement (préchargement).
- [ ] Supprimer/réinstaller l'app : le parcours de consentement revient (stockage local purgé).

Si un point échoue : retour Tasks 5-7 avec le symptôme précis (logs via console Xcode du Mac si besoin).

---

### Task 11: Bascule vrais IDs + soumission

**Files:**
- Modify: `src-tauri/gen/apple/Sources/app/AdmobBridge.swift` (constante `AD_UNIT_ID`)

- [ ] **Step 1 : brancher le vrai bloc**

Dans `AdmobBridge.swift`, remplacer la valeur de `AD_UNIT_ID` par
`ca-app-pub-6928338731034491/5859004325` et adapter le commentaire (garder la
mention du bloc de test officiel en référence pour les futurs débogages).

```bash
git checkout main && git pull && git checkout -b chore/admob-prod-ids
git add src-tauri && git commit -m "chore(admob): bascule sur le bloc rewarded de production"
git push -u origin chore/admob-prod-ids && gh pr create --base main --fill
```
Merge → build TestFlight final. Sur device : vérifier qu'une pub s'affiche (les
vrais blocs peuvent servir peu/pas de pubs les premières heures — un « no-fill »
propre avec `erreurPub` est acceptable ici, PAS un crash).

- [ ] **Step 2 : console AdMob + App Store Connect (Guillaume, guidé)**

- AdMob : configurer le message RGPD (Confidentialité et messages) avec le
  message ATT joint, s'il ne l'est pas déjà — sans lui, `loadAndPresentIfRequired`
  ne montre rien en UE et les pubs restent non personnalisées.
- App Store Connect → App Privacy : déclarer (« Données utilisées pour vous
  suivre » si ATT : Identifiants ; + Localisation approximative via IP,
  Identifiants d'appareil, Données d'utilisation publicitaire, Diagnostics —
  collectées par des tiers, finalité Publicité). Ne PAS laisser « Data Not
  Collected ».
- Fiche App Store : renseigner l'URL de la politique de confidentialité
  (`https://<domaine-vercel>/privacy`) et le site web du développeur (le domaine
  qui sert `app-ads.txt`).
- AdMob → Applications : lier l'app à sa fiche App Store dès qu'elle est publiée
  (débloque la vérification `app-ads.txt`).
- Répondre « Non » à la question chiffrement du premier build si posée (la clé
  `ITSAppUsesNonExemptEncryption` l'évite pour les suivants).

- [ ] **Step 3 : mémoire de session**

Mettre à jour la mémoire projet `admob-integration.md` : fait/reste, et le
statut de la checklist device de la Task 10.
