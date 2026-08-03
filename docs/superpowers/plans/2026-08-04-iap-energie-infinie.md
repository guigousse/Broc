# IAP « Énergie infinie » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achat in-app non-consommable à 3,99 € qui rend l'énergie du joueur réellement illimitée (jauge ∞, plus aucun débit), pour toutes les parties existantes et futures.

**Architecture:** Nouveau plugin Tauri vendoré `tauri-plugin-iap` (miroir exact de `tauri-plugin-admob`) dont le Swift importe **StoreKit directement** (framework système — pas besoin du détour `NSClassFromString` qui n'existait que pour le xcframework Google). Côté TS, un module `src/lib/iap/` miroir de `src/lib/ads/` (provider natif + stub dev/web), un drapeau device `broc.energieInfinie` en localStorage **hors save** (revalidé par StoreKit au boot), et un gating d'une ligne dans `consommerEnergie` (GameContext).

**Tech Stack:** Tauri 2 (plugin vendoré Rust + Swift), StoreKit 2 (`Transaction.currentEntitlements`, `Product.purchase`, `AppStore.sync`), Next.js/React, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-03-iap-energie-infinie-design.md`

## Global Constraints

- Branche de travail : `feat/iap-energie-infinie` (worktree isolé à créer à l'exécution via superpowers:using-git-worktrees ; ⚠ piège connu : Turbopack casse sur node_modules symlinké → `--webpack` si dev server nécessaire).
- Tests : **toujours** `npx vitest run --maxWorkers=4 <fichiers>` (sans le drapeau : ~41 faux échecs sur ce Mac Intel).
- Lint : `npm run lint` (alias `eslint src`).
- **SAVE_VERSION intact** : aucune donnée nouvelle en save, aucune migration. Le drapeau vit en localStorage device (`broc.energieInfinie`) — c'est ce qui garantit l'exigence « toutes les parties, existantes et futures, en profitent ».
- Jamais de chaîne localisée en save.
- Product ID : `com.guigousse.broc.energie_infinie` (bundle `com.guigousse.broc`).
- Deployment target iOS 13.0 (gen/apple/project.yml) → tout StoreKit 2 sous garde `#available(iOS 15.0, *)` ; sous iOS < 15, `verifierEntitlement` répond `false` et `acheter` rejette.
- La boîte mystère et son AdMob sont **hors périmètre** : ne toucher ni `src/lib/ads/`, ni `AdmobBridge.swift`, ni `BoiteMystereOverlay.tsx`.
- Le plugin AdMob vendoré est le modèle de référence : en cas de doute sur un détail d'infra (permissions, build.rs, Package.swift), copier ce que fait `src-tauri/vendor/tauri-plugin-admob`.

---

### Task 1: Plugin Rust vendoré `tauri-plugin-iap` + enregistrement

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-iap/Cargo.toml`
- Create: `src-tauri/vendor/tauri-plugin-iap/build.rs`
- Create: `src-tauri/vendor/tauri-plugin-iap/permissions/default.toml`
- Create: `src-tauri/vendor/tauri-plugin-iap/src/{lib.rs, commands.rs, models.rs, error.rs, mobile.rs, desktop.rs}`
- Create: `src-tauri/vendor/tauri-plugin-iap/ios/Package.swift`
- Create (copie) : `src-tauri/vendor/tauri-plugin-iap/.tauri/` (copié depuis le plugin admob)
- Modify: `src-tauri/Cargo.toml` (dépendance path)
- Modify: `src-tauri/src/lib.rs` (`.plugin(...)`)
- Modify: `src-tauri/capabilities/default.json` (`"iap:default"`)

**Interfaces:**
- Consumes: rien (première brique).
- Produces: commandes invocables depuis JS — `plugin:iap|verifier_entitlement` → `{ energieInfinie: boolean }`, `plugin:iap|obtenir_prix` → `{ prix: string }`, `plugin:iap|acheter` → `{ statut: "achete"|"annule"|"pending" }` (échec → reject), `plugin:iap|restaurer` → `{ energieInfinie: boolean }`. Le Swift de la Task 2 implémente les sélecteurs `verifierEntitlement`/`obtenirPrix`/`acheter`/`restaurer`.

- [ ] **Step 1: Copier l'ossature du plugin admob**

```bash
cd src-tauri/vendor
mkdir -p tauri-plugin-iap/{src,permissions,ios/Sources}
cp -R tauri-plugin-admob/.tauri tauri-plugin-iap/.tauri
```

- [ ] **Step 2: Écrire les fichiers Rust et la config**

`Cargo.toml` :

```toml
[package]
name = "tauri-plugin-iap"
version = "0.1.0"
edition = "2021"
rust-version = "1.77.2"
links = "tauri-plugin-iap"

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
const COMMANDS: &[&str] = &["verifier_entitlement", "obtenir_prix", "acheter", "restaurer"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .build();
}
```

`permissions/default.toml` :

```toml
[default]
description = "Permissions par défaut du plugin IAP : entitlement, prix, achat et restauration."
permissions = [
  "allow-verifier-entitlement",
  "allow-obtenir-prix",
  "allow-acheter",
  "allow-restaurer",
]
```

`src/models.rs` :

```rust
use serde::{Deserialize, Serialize};

/// Possession du non-consommable « Énergie infinie » (StoreKit 2,
/// entitlement vérifié on-device, remboursements exclus).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitlementResult {
    pub energie_infinie: bool,
}

/// Prix localisé formaté par StoreKit (`displayPrice`) — jamais codé en dur.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrixResult {
    pub prix: String,
}

/// Résultat d'achat. `annule` = fermeture volontaire (pas un échec) ;
/// `pending` = Ask to Buy / approbation parentale différée.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchatResult {
    pub statut: String,
}
```

`src/error.rs` (même forme que l'admob) :

```rust
use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[cfg(target_os = "ios")]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
    #[error("Achats indisponibles sur cette plateforme")]
    UnsupportedPlatform,
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(self.to_string().as_ref())
    }
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
use mobile::Iap;
#[cfg(not(target_os = "ios"))]
use desktop::Iap;

pub use error::{Error, Result};
pub use models::{AchatResult, EntitlementResult, PrixResult};

pub trait IapExt<R: Runtime> {
    fn iap(&self) -> &Iap<R>;
}

impl<R: Runtime, T: Manager<R>> IapExt<R> for T {
    fn iap(&self) -> &Iap<R> {
        self.state::<Iap<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("iap")
        .invoke_handler(tauri::generate_handler![
            commands::verifier_entitlement,
            commands::obtenir_prix,
            commands::acheter,
            commands::restaurer
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let iap = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let iap = desktop::init(app, api)?;
            app.manage(iap);
            Ok(())
        })
        .build()
}
```

`src/commands.rs` :

```rust
use tauri::{command, AppHandle, Runtime};

use crate::{models::{AchatResult, EntitlementResult, PrixResult}, IapExt, Result};

#[command]
pub(crate) async fn verifier_entitlement<R: Runtime>(app: AppHandle<R>) -> Result<EntitlementResult> {
    app.iap().verifier_entitlement()
}

#[command]
pub(crate) async fn obtenir_prix<R: Runtime>(app: AppHandle<R>) -> Result<PrixResult> {
    app.iap().obtenir_prix()
}

#[command]
pub(crate) async fn acheter<R: Runtime>(app: AppHandle<R>) -> Result<AchatResult> {
    app.iap().acheter()
}

#[command]
pub(crate) async fn restaurer<R: Runtime>(app: AppHandle<R>) -> Result<EntitlementResult> {
    app.iap().restaurer()
}
```

`src/mobile.rs` (même pattern bloquant que l'admob — le pool async absorbe) :

```rust
use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::{AchatResult, EntitlementResult, PrixResult};

tauri::ios_plugin_binding!(init_plugin_iap);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Iap<R>> {
    let handle = api.register_ios_plugin(init_plugin_iap)?;
    Ok(Iap(handle))
}

pub struct Iap<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Iap<R> {
    pub fn verifier_entitlement(&self) -> crate::Result<EntitlementResult> {
        self.0
            .run_mobile_plugin("verifierEntitlement", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn obtenir_prix(&self) -> crate::Result<PrixResult> {
        self.0
            .run_mobile_plugin("obtenirPrix", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn acheter(&self) -> crate::Result<AchatResult> {
        self.0
            .run_mobile_plugin("acheter", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn restaurer(&self) -> crate::Result<EntitlementResult> {
        self.0
            .run_mobile_plugin("restaurer", serde_json::json!({}))
            .map_err(Into::into)
    }
}
```

`src/desktop.rs` — **ouvrir `vendor/tauri-plugin-admob/src/desktop.rs` et reproduire sa forme exacte** (struct `Iap<R>` + `init` no-op) avec quatre méthodes qui retournent `Err(crate::Error::UnsupportedPlatform)` pour `verifier_entitlement`, `obtenir_prix`, `acheter`, `restaurer`.

`ios/Package.swift` :

```swift
// swift-tools-version:5.5
import PackageDescription

let package = Package(
  name: "tauri-plugin-iap",
  platforms: [
    .iOS(.v13)
  ],
  products: [
    .library(
      name: "tauri-plugin-iap",
      type: .static,
      targets: ["tauri-plugin-iap"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-iap",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
```

Créer aussi un `ios/Sources/IapPlugin.swift` **provisoire minimal** pour que le paquet compile (la vraie implémentation arrive en Task 2) :

```swift
import SwiftRs
import Tauri
import UIKit
import WebKit

class IapPlugin: Plugin {}

@_cdecl("init_plugin_iap")
func initPluginIap() -> Plugin {
  return IapPlugin()
}
```

- [ ] **Step 3: Enregistrer le plugin dans l'app**

`src-tauri/Cargo.toml` — sous la ligne `tauri-plugin-admob = { path = "vendor/tauri-plugin-admob" }` :

```toml
tauri-plugin-iap = { path = "vendor/tauri-plugin-iap" }
```

`src-tauri/src/lib.rs` — sous `.plugin(tauri_plugin_admob::init())` (ligne ~5) :

```rust
.plugin(tauri_plugin_iap::init())
```

`src-tauri/capabilities/default.json` — dans le tableau des permissions, après `"admob:default"` :

```json
"iap:default"
```

- [ ] **Step 4: Vérifier la compilation Rust**

Run : `cd src-tauri && cargo check`
Expected : succès (cible desktop → chemin `desktop.rs`). Le build génère `permissions/autogenerated/` du nouveau plugin ; les commiter avec le reste.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/vendor/tauri-plugin-iap src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat(iap): plugin Tauri vendoré iap (ossature Rust + enregistrement)"
```

---

### Task 2: `IapPlugin.swift` — StoreKit 2

**Files:**
- Modify: `src-tauri/vendor/tauri-plugin-iap/ios/Sources/IapPlugin.swift` (remplace le provisoire de la Task 1)

**Interfaces:**
- Consumes: classe `Plugin` du paquet Tauri vendoré (`load(webview:)`, `invoke.resolve([String: Any])`, `invoke.reject(String)`).
- Produces: les 4 sélecteurs appelés par `mobile.rs` — `verifierEntitlement:`, `obtenirPrix:`, `acheter:`, `restaurer:` — avec les payloads décrits en Task 1.

- [ ] **Step 1: Écrire l'implémentation complète**

```swift
import SwiftRs
import Tauri
import UIKit
import WebKit
import StoreKit

// StoreKit est un framework SYSTÈME : importable ici, sous `swift build`
// (contrairement au SDK Google, cf. AdmobPlugin.swift — pas besoin du détour
// NSClassFromString/gen-apple pour ce plugin-ci).
// Produit non-consommable « Énergie infinie » (App Store Connect).
private let PRODUCT_ID = "com.guigousse.broc.energie_infinie"

class IapPlugin: Plugin {
  // Écouteur de fond : transactions abouties hors du flux d'achat (Ask to Buy
  // approuvé plus tard, achat interrompu, restauration système). On se
  // contente de finish() — l'état est relu par verifierEntitlement au prochain
  // boot / à l'ouverture de la machine à énergie.
  private var ecouteur: Any?

  public override func load(webview: WKWebView) {
    if #available(iOS 15.0, *) {
      ecouteur = Task.detached {
        for await maj in Transaction.updates {
          if case .verified(let transaction) = maj {
            await transaction.finish()
          }
        }
      }
    }
  }

  @available(iOS 15.0, *)
  private func entitlementActuel() async -> Bool {
    for await res in Transaction.currentEntitlements {
      if case .verified(let t) = res, t.productID == PRODUCT_ID, t.revocationDate == nil {
        return true
      }
    }
    return false
  }

  @objc public func verifierEntitlement(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.resolve(["energieInfinie": false])
      return
    }
    Task {
      invoke.resolve(["energieInfinie": await self.entitlementActuel()])
    }
  }

  @objc public func obtenirPrix(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.reject("iOS 15 requis")
      return
    }
    Task {
      do {
        guard let produit = try await Product.products(for: [PRODUCT_ID]).first else {
          invoke.reject("Produit introuvable")
          return
        }
        invoke.resolve(["prix": produit.displayPrice])
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func acheter(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.reject("iOS 15 requis")
      return
    }
    Task { @MainActor in
      do {
        guard let produit = try await Product.products(for: [PRODUCT_ID]).first else {
          invoke.reject("Produit introuvable")
          return
        }
        switch try await produit.purchase() {
        case .success(let verification):
          switch verification {
          case .verified(let transaction):
            await transaction.finish()
            invoke.resolve(["statut": "achete"])
          case .unverified:
            invoke.reject("Transaction non vérifiée")
          }
        case .userCancelled:
          invoke.resolve(["statut": "annule"])
        case .pending:
          invoke.resolve(["statut": "pending"])
        @unknown default:
          invoke.reject("Résultat d'achat inconnu")
        }
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func restaurer(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.resolve(["energieInfinie": false])
      return
    }
    Task {
      do {
        try await AppStore.sync()
      } catch {
        // Sync annulée/échouée (mot de passe refusé, hors-ligne) : on relit
        // quand même les entitlements locaux plutôt que d'échouer sec.
      }
      invoke.resolve(["energieInfinie": await self.entitlementActuel()])
    }
  }
}

@_cdecl("init_plugin_iap")
func initPluginIap() -> Plugin {
  return IapPlugin()
}
```

- [ ] **Step 2: Vérifier la compilation iOS complète**

Run : `bash scripts/ios-sim.sh` (workflow simulateur du projet — Tauri archive est cassé sur ce Mac Intel, ne pas utiliser autre chose).
Expected : build OK, app démarre dans le simulateur. Les achats sandbox ne marchent PAS en simulateur — ici on vérifie uniquement que le plugin compile et que le boot ne casse rien (`verifierEntitlement` y répondra `false`).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/vendor/tauri-plugin-iap/ios/Sources/IapPlugin.swift
git commit -m "feat(iap): implémentation StoreKit 2 (entitlement, prix, achat, restauration)"
```

---

### Task 3: Drapeau device `energieInfinie` + détection plateforme

**Files:**
- Create: `src/lib/plateforme.ts`
- Create: `src/lib/iap/energieInfinie.ts`
- Test: `src/lib/iap/energieInfinie.test.ts`

**Interfaces:**
- Consumes: `safeLocalStorageGet/Set` (`src/lib/storage/safeLocalStorage.ts`).
- Produces: `tauriIosDisponible(): boolean` ; `energieInfinieActive(): boolean` ; `definirEnergieInfinie(active: boolean): void` ; `useEnergieInfinie(): boolean` (hook réactif) ; `EVENEMENT_ENERGIE_INFINIE: "broc:energie-infinie"`.

- [ ] **Step 1: Écrire les tests (rouges)**

`src/lib/iap/energieInfinie.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EVENEMENT_ENERGIE_INFINIE,
  definirEnergieInfinie,
  energieInfinieActive,
} from "./energieInfinie";

afterEach(() => {
  window.localStorage.clear();
});

describe("energieInfinie — drapeau device hors save", () => {
  it("inactif par défaut (localStorage vierge)", () => {
    expect(energieInfinieActive()).toBe(false);
  });

  it("definirEnergieInfinie(true) pose le drapeau et le relit", () => {
    definirEnergieInfinie(true);
    expect(energieInfinieActive()).toBe(true);
  });

  it("definirEnergieInfinie(false) retombe (cas remboursement)", () => {
    definirEnergieInfinie(true);
    definirEnergieInfinie(false);
    expect(energieInfinieActive()).toBe(false);
  });

  it("notifie l'UI via l'événement broc:energie-infinie", () => {
    const espion = vi.fn();
    window.addEventListener(EVENEMENT_ENERGIE_INFINIE, espion);
    definirEnergieInfinie(true);
    window.removeEventListener(EVENEMENT_ENERGIE_INFINIE, espion);
    expect(espion).toHaveBeenCalledTimes(1);
  });

  it("survit à une valeur corrompue en storage", () => {
    window.localStorage.setItem("broc.energieInfinie", "{pas-du-json");
    expect(energieInfinieActive()).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/lib/iap/energieInfinie.test.ts`
Expected : FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

`src/lib/plateforme.ts` :

```ts
/**
 * Vrai uniquement sous runtime Tauri sur iOS. Même détection que
 * `adMobDisponible` (src/lib/ads/adMobProvider.ts) — dupliquée à dessein pour
 * ne pas coupler le module iap au module ads (y compris le cas iPadOS 13+ qui
 * se présente en UA « Macintosh » : on le distingue d'un vrai Mac au tactile).
 */
export function tauriIosDisponible(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  const ua = window.navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
}
```

`src/lib/iap/energieInfinie.ts` :

```ts
import { useSyncExternalStore } from "react";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/**
 * Drapeau « Énergie infinie » — clé DEVICE, volontairement HORS des slots de
 * save : l'achat (lié à l'Apple ID) vaut pour toutes les parties, existantes
 * et futures. Cache d'affichage seulement : StoreKit reste la source de
 * vérité, IapBootstrap réécrit la valeur à chaque lancement (couvre le
 * remboursement).
 */
const CLE = "broc.energieInfinie";
export const EVENEMENT_ENERGIE_INFINIE = "broc:energie-infinie";

export function energieInfinieActive(): boolean {
  return safeLocalStorageGet<boolean>(CLE, false) === true;
}

/** Pose/retire le drapeau et notifie l'UI (header, machine, GameContext). */
export function definirEnergieInfinie(active: boolean): void {
  safeLocalStorageSet(CLE, active);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENEMENT_ENERGIE_INFINIE));
  }
}

function souscrire(cb: () => void): () => void {
  window.addEventListener(EVENEMENT_ENERGIE_INFINIE, cb);
  // `storage` : synchronise d'éventuels autres onglets (web dev).
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENEMENT_ENERGIE_INFINIE, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Version réactive pour l'UI (SSR : false). */
export function useEnergieInfinie(): boolean {
  return useSyncExternalStore(souscrire, energieInfinieActive, () => false);
}
```

- [ ] **Step 4: Vérifier le vert**

Run : `npx vitest run --maxWorkers=4 src/lib/iap/energieInfinie.test.ts`
Expected : PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/plateforme.ts src/lib/iap/energieInfinie.ts src/lib/iap/energieInfinie.test.ts
git commit -m "feat(iap): drapeau device energieInfinie (hors save) + hook réactif"
```

---

### Task 4: Provider IAP (stub + natif) + bootstrap au boot

**Files:**
- Create: `src/lib/iap/iapProvider.ts`
- Create: `src/lib/iap/iapNatif.ts`
- Create: `src/components/mobile/IapBootstrap.tsx`
- Modify: `src/app/layout.tsx` (montage à côté d'`<AdMobBootstrap />`, ligne ~92)
- Test: `src/lib/iap/iapProvider.test.ts`

**Interfaces:**
- Consumes: `tauriIosDisponible()` (Task 3), `energieInfinieActive`/`definirEnergieInfinie` (Task 3).
- Produces: `type StatutAchat = "achete" | "annule" | "pending"` ; `interface IapProvider { verifierEntitlement(): Promise<boolean>; obtenirPrix(): Promise<string>; acheter(): Promise<StatutAchat>; restaurer(): Promise<boolean> }` ; `getIapProvider(): IapProvider` ; `StubIapProvider`. **Le provider ne pose jamais le drapeau lui-même** : l'appelant (UI/bootstrap) est l'unique écrivain via `definirEnergieInfinie`.

- [ ] **Step 1: Écrire les tests (rouges)**

`src/lib/iap/iapProvider.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { StubIapProvider, getIapProvider } from "./iapProvider";
import { definirEnergieInfinie } from "./energieInfinie";

afterEach(() => {
  window.localStorage.clear();
});

describe("iapProvider — stub et singleton", () => {
  it("hors Tauri iOS, getIapProvider retourne le stub (et toujours le même)", () => {
    const p = getIapProvider();
    expect(p).toBeInstanceOf(StubIapProvider);
    expect(getIapProvider()).toBe(p);
  });

  it("le stub simule un achat réussi", async () => {
    const stub = new StubIapProvider(0);
    await expect(stub.acheter()).resolves.toBe("achete");
  });

  it("le stub expose un prix d'affichage", async () => {
    const stub = new StubIapProvider(0);
    await expect(stub.obtenirPrix()).resolves.toBe("3,99 €");
  });

  it("verifierEntitlement / restaurer reflètent le drapeau local", async () => {
    const stub = new StubIapProvider(0);
    await expect(stub.verifierEntitlement()).resolves.toBe(false);
    definirEnergieInfinie(true);
    await expect(stub.verifierEntitlement()).resolves.toBe(true);
    await expect(stub.restaurer()).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/lib/iap/iapProvider.test.ts`
Expected : FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

`src/lib/iap/iapProvider.ts` :

```ts
import { tauriIosDisponible } from "@/lib/plateforme";
import { energieInfinieActive } from "./energieInfinie";
import { TauriIapProvider } from "./iapNatif";

export type StatutAchat = "achete" | "annule" | "pending";

export interface IapProvider {
  /** Possession du non-consommable (source : StoreKit ; stub : drapeau local). */
  verifierEntitlement(): Promise<boolean>;
  /** Prix localisé formaté (displayPrice StoreKit) — jamais codé en dur en UI. */
  obtenirPrix(): Promise<string>;
  /** `annule` = fermeture volontaire (silence en UI) ; échec technique → exception. */
  acheter(): Promise<StatutAchat>;
  /** Relance la synchro App Store puis relit l'entitlement. */
  restaurer(): Promise<boolean>;
}

/** Provider factice (web/dev/simulateur) : achat toujours réussi après délai. */
export class StubIapProvider implements IapProvider {
  constructor(private readonly delaiMs: number = 300) {}

  async verifierEntitlement(): Promise<boolean> {
    return energieInfinieActive();
  }
  async obtenirPrix(): Promise<string> {
    return "3,99 €";
  }
  async acheter(): Promise<StatutAchat> {
    await new Promise((r) => setTimeout(r, this.delaiMs));
    return "achete";
  }
  async restaurer(): Promise<boolean> {
    return energieInfinieActive();
  }
}

// Singleton injectable — StoreKit natif sous Tauri iOS, stub partout ailleurs
// (même motif que getAdProvider).
let instance: IapProvider | null = null;
export function getIapProvider(): IapProvider {
  if (!instance) {
    instance = tauriIosDisponible() ? new TauriIapProvider() : new StubIapProvider();
  }
  return instance;
}
```

`src/lib/iap/iapNatif.ts` (import DYNAMIQUE de l'API Tauri, même motif que `adMobProvider.ts`) :

```ts
import type { IapProvider, StatutAchat } from "./iapProvider";

/** Provider StoreKit natif (plugin Tauri vendoré `iap`). */
export class TauriIapProvider implements IapProvider {
  async verifierEntitlement(): Promise<boolean> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ energieInfinie: boolean }>(
      "plugin:iap|verifier_entitlement",
    );
    return res.energieInfinie === true;
  }

  async obtenirPrix(): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ prix: string }>("plugin:iap|obtenir_prix");
    return res.prix;
  }

  async acheter(): Promise<StatutAchat> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ statut: string }>("plugin:iap|acheter");
    if (res.statut === "achete" || res.statut === "annule" || res.statut === "pending") {
      return res.statut;
    }
    throw new Error(`Statut d'achat inattendu : ${res.statut}`);
  }

  async restaurer(): Promise<boolean> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ energieInfinie: boolean }>("plugin:iap|restaurer");
    return res.energieInfinie === true;
  }
}
```

`src/components/mobile/IapBootstrap.tsx` :

```tsx
"use client";

import { useEffect } from "react";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { getIapProvider } from "@/lib/iap/iapProvider";
import { tauriIosDisponible } from "@/lib/plateforme";

/**
 * Au boot (Tauri iOS uniquement) : revalide l'achat « Énergie infinie »
 * auprès de StoreKit (source de vérité) et réécrit le cache localStorage —
 * couvre aussi le remboursement (le drapeau retombe). Rend rien ; toute
 * erreur est avalée (une panne d'IAP ne doit jamais casser le jeu, et le
 * cache local reste alors en l'état).
 */
export function IapBootstrap() {
  useEffect(() => {
    if (!tauriIosDisponible()) return;
    getIapProvider()
      .verifierEntitlement()
      .then((actif) => definirEnergieInfinie(actif))
      .catch(() => {});
  }, []);
  return null;
}
```

`src/app/layout.tsx` : importer `IapBootstrap` (à côté de l'import `AdMobBootstrap`, ligne ~10) et monter `<IapBootstrap />` juste sous `<AdMobBootstrap />` (ligne ~92).

- [ ] **Step 4: Vérifier le vert + non-régression layout**

Run : `npx vitest run --maxWorkers=4 src/lib/iap/iapProvider.test.ts src/app/page.test.tsx`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/iap/iapProvider.ts src/lib/iap/iapNatif.ts src/lib/iap/iapProvider.test.ts src/components/mobile/IapBootstrap.tsx src/app/layout.tsx
git commit -m "feat(iap): provider StoreKit + stub dev et revalidation au boot"
```

---

### Task 5: Libellés i18n ×4 (FR/EN/ES/EL)

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts` (sections `chrome` — vers ligne 110 — et `reglages` — vers ligne 46)
- Modify: `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts`, `src/lib/i18n/ui/el.ts` (mêmes emplacements)

**Interfaces:**
- Consumes: structure existante (`d.chrome.*`, `d.reglages.*`, placeholders `{prix}` via `tr`).
- Produces: clés `d.chrome.energieInfinie`, `d.chrome.acheterEnergieInfinie`, `d.chrome.achatReussi`, `d.chrome.achatEnAttente`, `d.chrome.erreurAchat` ; `d.reglages.achats`, `d.reglages.restaurerAchats`, `d.reglages.restaurationEnCours`, `d.reglages.achatsRestaures`, `d.reglages.rienARestaurer` — utilisées par les Tasks 7, 8, 9.

- [ ] **Step 1: Ajouter les clés dans les 4 locales**

`fr.ts` — dans `chrome` (à la suite de `energieInsuffisante`) :

```ts
    energieInfinie: "Énergie infinie",
    acheterEnergieInfinie: "Énergie infinie — {prix}",
    achatReussi: "Énergie infinie débloquée !",
    achatEnAttente: "Achat en attente d'approbation.",
    erreurAchat: "L'achat n'a pas abouti. Réessaie plus tard.",
```

`fr.ts` — dans `reglages` :

```ts
    achats: "Achats",
    restaurerAchats: "Restaurer les achats",
    restaurationEnCours: "Restauration…",
    achatsRestaures: "Achats restaurés — énergie infinie active !",
    rienARestaurer: "Aucun achat à restaurer.",
```

`en.ts` :

```ts
    energieInfinie: "Unlimited energy",
    acheterEnergieInfinie: "Unlimited energy — {prix}",
    achatReussi: "Unlimited energy unlocked!",
    achatEnAttente: "Purchase awaiting approval.",
    erreurAchat: "The purchase could not be completed. Try again later.",
```

```ts
    achats: "Purchases",
    restaurerAchats: "Restore purchases",
    restaurationEnCours: "Restoring…",
    achatsRestaures: "Purchases restored — unlimited energy is active!",
    rienARestaurer: "No purchases to restore.",
```

`es.ts` :

```ts
    energieInfinie: "Energía infinita",
    acheterEnergieInfinie: "Energía infinita — {prix}",
    achatReussi: "¡Energía infinita desbloqueada!",
    achatEnAttente: "Compra pendiente de aprobación.",
    erreurAchat: "No se pudo completar la compra. Inténtalo más tarde.",
```

```ts
    achats: "Compras",
    restaurerAchats: "Restaurar compras",
    restaurationEnCours: "Restaurando…",
    achatsRestaures: "Compras restauradas: ¡energía infinita activa!",
    rienARestaurer: "No hay compras que restaurar.",
```

`el.ts` :

```ts
    energieInfinie: "Άπειρη ενέργεια",
    acheterEnergieInfinie: "Άπειρη ενέργεια — {prix}",
    achatReussi: "Η άπειρη ενέργεια ξεκλειδώθηκε!",
    achatEnAttente: "Η αγορά εκκρεμεί έγκριση.",
    erreurAchat: "Η αγορά δεν ολοκληρώθηκε. Δοκίμασε ξανά αργότερα.",
```

```ts
    achats: "Αγορές",
    restaurerAchats: "Επαναφορά αγορών",
    restaurationEnCours: "Επαναφορά…",
    achatsRestaures: "Οι αγορές επαναφέρθηκαν — η άπειρη ενέργεια είναι ενεργή!",
    rienARestaurer: "Δεν υπάρχουν αγορές για επαναφορά.",
```

- [ ] **Step 2: Vérifier la parité des clés**

Run : `npx vitest run --maxWorkers=4 src/lib/i18n`
Expected : PASS (le test de parité des libellés couvre les 4 locales ; s'il échoue, une clé manque dans une locale).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/ui
git commit -m "feat(iap): libellés énergie infinie + restauration d'achats (4 langues)"
```

---

### Task 6: GameContext — plus de débit + remplissage de la jauge

**Files:**
- Modify: `src/context/GameContext.tsx` (`consommerEnergie` ligne ~402 ; nouvel effet + helper à proximité)
- Test: `src/context/GameContext.energieInfinie.test.tsx`

**Interfaces:**
- Consumes: `energieInfinieActive`, `EVENEMENT_ENERGIE_INFINIE` (Task 3) ; `ENERGIE_MAX` (déjà importé dans le fichier).
- Produces: comportement — `consommerEnergie` no-op quand le drapeau est actif ; toute partie chargée (ou achat en cours de partie via l'événement) voit sa jauge calée à `ENERGIE_MAX` minimum. Aucune nouvelle action publique.

- [ ] **Step 1: Écrire les tests (rouges)**

`src/context/GameContext.energieInfinie.test.tsx` (harnais identique à `GameContext.utiliserActive.test.tsx` — vrai `GameProvider`, aucun mock de la logique testée) :

```tsx
// @vitest-environment jsdom
/**
 * Achat « Énergie infinie » : le débit est coupé et la jauge est calée au max
 * pour TOUTE partie (drapeau device hors save — y compris une vieille save à
 * jauge basse chargée après l'achat, et l'achat réalisé en cours de partie).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { ENERGIE_MAX } from "@/lib/energie";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupNouvellePartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

describe("GameContext — énergie infinie", () => {
  it("sans achat : consommerEnergie débite normalement", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(2);
    });
    expect(result.current.state!.energie).toBe(ENERGIE_MAX - 2);
  });

  it("avec achat : consommerEnergie ne débite plus", async () => {
    definirEnergieInfinie(true);
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(2);
    });
    expect(result.current.state!.energie).toBe(ENERGIE_MAX);
  });

  it("achat en cours de partie : la jauge basse remonte au max via l'événement", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.consommerEnergie(4);
    });
    expect(result.current.state!.energie).toBe(ENERGIE_MAX - 4);
    act(() => {
      definirEnergieInfinie(true);
    });
    await waitFor(() => expect(result.current.state!.energie).toBe(ENERGIE_MAX));
  });
});
```

Note d'adaptation : si `consommerEnergie` n'est pas exposé par `useGame()` mais seulement par `useGameActions()`, monter les deux : `renderHook(() => ({ jeu: useGame(), actions: useGameActions() }), { wrapper })` et ajuster les accès.

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/context/GameContext.energieInfinie.test.tsx`
Expected : FAIL sur les tests 2 et 3 (le débit passe encore).

- [ ] **Step 3: Implémenter dans GameContext.tsx**

Import (en tête, près des imports lib) :

```ts
import {
  EVENEMENT_ENERGIE_INFINIE,
  energieInfinieActive,
} from "@/lib/iap/energieInfinie";
```

Gating dans `consommerEnergie` (ligne ~402), première ligne du callback :

```ts
  const consommerEnergie = useCallback(
    (n: number) => {
      // Achat « Énergie infinie » : le débit est coupé (drapeau device, hors save).
      if (energieInfinieActive()) return;
      setState((prev) => {
```

Effet de remplissage, à placer près des autres `useEffect` du provider :

```ts
  // Achat « Énergie infinie » : toute partie (même une vieille save à jauge
  // basse chargée après l'achat) est calée à ENERGIE_MAX — les portes
  // « energie >= coût » passent immédiatement, et comme le débit est coupé la
  // jauge n'en redescend plus. Déclenché au chargement ET à l'achat (événement).
  const estChargee = state !== null;
  useEffect(() => {
    const remplir = () => {
      if (!energieInfinieActive()) return;
      setState((prev) => {
        if (!prev || prev.energie >= ENERGIE_MAX) return prev;
        const now = tempsConfiance() ?? Date.now();
        return { ...prev, energie: ENERGIE_MAX, energieDerniereMaj: now };
      });
    };
    remplir();
    window.addEventListener(EVENEMENT_ENERGIE_INFINIE, remplir);
    return () => window.removeEventListener(EVENEMENT_ENERGIE_INFINIE, remplir);
  }, [estChargee, tempsConfiance]);
```

- [ ] **Step 4: Vérifier le vert + non-régression des tests GameContext**

Run : `npx vitest run --maxWorkers=4 src/context`
Expected : PASS (nouveau fichier + tous les tests GameContext existants).

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx src/context/GameContext.energieInfinie.test.tsx
git commit -m "feat(iap): énergie infinie — débit coupé et jauge calée au max pour toute partie"
```

---

### Task 7: Jauge du header — ∞

**Files:**
- Modify: `src/components/mobile/MobileHeader.tsx` (calculs lignes ~136-151, rendu lignes ~244-250)
- Test: `src/components/mobile/MobileHeader.energieInfinie.test.tsx`

**Interfaces:**
- Consumes: `useEnergieInfinie()` (Task 3), clé `d.chrome.energieInfinie` (Task 5).
- Produces: la pastille `data-fly-target="energie-header"` affiche `∞` (sans `/5`) quand le drapeau est actif.

- [ ] **Step 1: Écrire le test (rouge)**

`src/components/mobile/MobileHeader.energieInfinie.test.tsx` — reprendre le harnais du test existant de `MobileHeader` s'il y en a un (sinon : render sous `GameProvider` + provider de langue, avec les deux mêmes `vi.mock` que Task 6) :

```tsx
it("acheteur : la jauge d'énergie affiche ∞ au lieu de n/5", async () => {
  definirEnergieInfinie(true);
  // …setup partie + render <MobileHeader/> selon le harnais du fichier…
  expect(await screen.findByText("∞")).toBeInTheDocument();
  expect(screen.queryByText(`/${ENERGIE_MAX}`)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/MobileHeader.energieInfinie.test.tsx`
Expected : FAIL (« ∞ » introuvable).

- [ ] **Step 3: Implémenter**

Dans le composant : `const energieInfinie = useEnergieInfinie();` puis remplacer le couple de spans du compteur (lignes ~247-248) :

```tsx
              {energieInfinie ? (
                <span style={{ color: couleurReste }} aria-label={d.chrome.energieInfinie}>
                  ∞
                </span>
              ) : (
                <>
                  <span style={{ color: couleurEnergie }}>{energieAffichee}</span>
                  <span style={{ color: couleurReste }}>/{energieMax}</span>
                </>
              )}
```

Vérifier au passage que les couleurs d'alerte basse (`aSec`, ligne ~147) ne s'appliquent pas en mode ∞ (la jauge étant au max, c'est déjà le cas — ne rien sur-coder).

- [ ] **Step 4: Vérifier le vert**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/MobileHeader.energieInfinie.test.tsx`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/MobileHeader.tsx src/components/mobile/MobileHeader.energieInfinie.test.tsx
git commit -m "feat(iap): jauge header en ∞ pour l'acheteur"
```

---

### Task 8: Machine à énergie — état ∞ + bouton d'achat

**Files:**
- Modify: `src/components/mobile/EnergieRecharge.tsx`
- Test: `src/components/mobile/EnergieRecharge.test.tsx` (étendre le fichier existant, en suivant son harnais)

**Interfaces:**
- Consumes: `useEnergieInfinie`, `definirEnergieInfinie` (Task 3) ; `getIapProvider` (Task 4) ; clés `d.chrome.acheterEnergieInfinie`, `d.chrome.energieInfinie`, `d.chrome.achatReussi`, `d.chrome.achatEnAttente`, `d.chrome.erreurAchat` (Task 5) ; toast types `"succes" | "info" | "erreur"` (`src/components/ui/Toast.tsx:13`).
- Produces: parcours d'achat complet côté UI. Le remplissage de la jauge est automatique (événement → GameContext, Task 6) : **ne pas** appeler d'action de jeu ici.

- [ ] **Step 1: Écrire les tests (rouges)**

À ajouter dans `EnergieRecharge.test.tsx` (mêmes wrappers/mocks que les tests existants du fichier) :

```tsx
describe("EnergieRecharge — achat énergie infinie", () => {
  it("non-acheteur : le bouton d'achat affiche le prix du stub", async () => {
    // …render selon le harnais existant…
    expect(
      await screen.findByRole("button", { name: /Énergie infinie — 3,99 €/ }),
    ).toBeInTheDocument();
  });

  it("l'achat pose le drapeau et bascule la machine en ∞", async () => {
    // …render…
    fireEvent.click(await screen.findByRole("button", { name: /Énergie infinie/ }));
    await waitFor(() => expect(energieInfinieActive()).toBe(true));
    expect(await screen.findByText("∞")).toBeInTheDocument();
  });

  it("acheteur : ni bouton d'achat, ni cartel pub, compteur en ∞", async () => {
    definirEnergieInfinie(true);
    // …render…
    expect(screen.queryByRole("button", { name: /Énergie infinie —/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regarder une pub/)).not.toBeInTheDocument();
    expect(screen.getByText("∞")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/EnergieRecharge.test.tsx`
Expected : les 3 nouveaux tests FAIL, les anciens PASS.

- [ ] **Step 3: Implémenter**

Dans `EnergieRecharge.tsx` :

1. Imports : `useEnergieInfinie`, `definirEnergieInfinie`, `getIapProvider`.
2. `const infinie = useEnergieInfinie();` + états `const [prix, setPrix] = useState<string | null>(null);` et `const [achatEnCours, setAchatEnCours] = useState(false);`.
3. Prix au montage (non-acheteur seulement) :

```tsx
  useEffect(() => {
    if (infinie) return;
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

4. Handler d'achat :

```tsx
  const acheterEnergieInfinie = async () => {
    if (achatEnCours) return;
    setAchatEnCours(true);
    try {
      const statut = await getIapProvider().acheter();
      if (statut === "achete") {
        // Unique écrivain du drapeau ; GameContext cale la jauge via l'événement.
        definirEnergieInfinie(true);
        setEtincelles(true);
        void audioManager.playRecharge();
        toast(d.chrome.achatReussi, { type: "succes" });
      } else if (statut === "pending") {
        toast(d.chrome.achatEnAttente);
      }
      // "annule" : silence (fermeture volontaire du sheet Apple).
    } catch {
      toast(d.chrome.erreurAchat, { type: "erreur" });
    } finally {
      setAchatEnCours(false);
    }
  };
```

5. Mode ∞ : `const angle = angleAiguille(infinie ? energieMax : energie, energieMax);` ; dans le compteur, si `infinie` → `<span>∞</span>` + `<Zap/>` et la ligne du bas affiche `d.chrome.energieInfinie` (plus de minuteur) ; le `<CartelPub>` **et** la zone de tap du levier ne sont rendus que si `!infinie`.
6. Bouton d'achat, sous la carte machine (dans l'overlay, après le div `carteStyle`, avec `stopPropagation`) — rendu seulement si `!infinie` :

```tsx
        {!infinie && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void acheterEnergieInfinie();
            }}
            disabled={achatEnCours}
            style={{
              marginTop: 12,
              width: "100%",
              maxWidth: 340,
              padding: "12px 16px",
              borderRadius: 10,
              background: "linear-gradient(180deg, var(--brass-300), var(--brass-500))",
              border: "2px solid var(--brass-700)",
              color: "var(--forest-800)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(13px, 3.8vw, 15px)",
              letterSpacing: "0.03em",
              cursor: achatEnCours ? "default" : "pointer",
              opacity: achatEnCours ? 0.6 : 1,
              boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            }}
          >
            {tr(d.chrome.acheterEnergieInfinie, { prix: prix ?? "…" })}
          </button>
        )}
```

- [ ] **Step 4: Vérifier le vert**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/EnergieRecharge.test.tsx`
Expected : PASS (anciens + nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/EnergieRecharge.tsx src/components/mobile/EnergieRecharge.test.tsx
git commit -m "feat(iap): machine à énergie — bouton d'achat et état ∞"
```

---

### Task 9: Réglages — Restaurer les achats

**Files:**
- Modify: `src/components/mobile/ReglagesModal.tsx` (nouvelle section après `<SectionNotifications />`, ligne ~285)
- Test: `src/components/mobile/ReglagesModal.test.tsx` (étendre, harnais existant)

**Interfaces:**
- Consumes: `getIapProvider().restaurer()` (Task 4), `definirEnergieInfinie` (Task 3), clés `d.reglages.achats/restaurerAchats/restaurationEnCours/achatsRestaures/rienARestaurer` + `d.chrome.erreurAchat` (Task 5) ; styles locaux du fichier (`carte`, `sectionTitle`).
- Produces: section « Achats » toujours visible (stub en dev/web), bouton de restauration exigé par Apple.

- [ ] **Step 1: Écrire les tests (rouges)**

À ajouter dans `ReglagesModal.test.tsx` :

```tsx
describe("ReglagesModal — restaurer les achats", () => {
  it("restauration sans achat : toast « rien à restaurer », drapeau inchangé", async () => {
    // …render selon le harnais existant…
    fireEvent.click(screen.getByRole("button", { name: /Restaurer les achats/ }));
    expect(await screen.findByText(/Aucun achat à restaurer/)).toBeInTheDocument();
    expect(energieInfinieActive()).toBe(false);
  });

  it("restauration avec achat : toast de succès et drapeau posé", async () => {
    definirEnergieInfinie(true); // le stub relit le drapeau local
    // …render…
    fireEvent.click(screen.getByRole("button", { name: /Restaurer les achats/ }));
    expect(await screen.findByText(/Achats restaurés/)).toBeInTheDocument();
    expect(energieInfinieActive()).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/ReglagesModal.test.tsx`
Expected : nouveaux tests FAIL (bouton introuvable), anciens PASS.

- [ ] **Step 3: Implémenter**

Nouvelle fonction dans `ReglagesModal.tsx` (même facture que `SectionNotifications`, réutilise `carte`/`sectionTitle` du fichier) + `<SectionAchats />` monté après `<SectionNotifications />` :

```tsx
/** Restauration du non-consommable « Énergie infinie » — bouton exigé par
 *  Apple. Toujours visible : en dev/web le stub relit le drapeau local. */
function SectionAchats() {
  const { d } = useLangue();
  const { toast } = useToastSafe();
  const [enCours, setEnCours] = useState(false);

  const restaurer = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      const actif = await getIapProvider().restaurer();
      definirEnergieInfinie(actif);
      if (actif) {
        toast(d.reglages.achatsRestaures, { type: "succes" });
      } else {
        toast(d.reglages.rienARestaurer);
      }
    } catch {
      toast(d.chrome.erreurAchat, { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section style={carte} aria-label={d.reglages.achats}>
      <h3 style={sectionTitle}>{d.reglages.achats}</h3>
      <button
        type="button"
        onClick={() => void restaurer()}
        disabled={enCours}
        style={{ ...rowLabel, cursor: enCours ? "default" : "pointer" }}
      >
        {enCours ? d.reglages.restaurationEnCours : d.reglages.restaurerAchats}
      </button>
    </section>
  );
}
```

(Adapter `style` au bouton segmenté du fichier — `segBtn(true)` — si `rowLabel` n'est pas un style de bouton pertinent ; regarder comment `d.reglages.autoriser` est stylé ligne ~347 et faire pareil.)

- [ ] **Step 4: Vérifier le vert**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/ReglagesModal.test.tsx`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/ReglagesModal.tsx src/components/mobile/ReglagesModal.test.tsx
git commit -m "feat(iap): restaurer les achats dans les réglages"
```

---

### Task 10: Filet final — suite complète, lint, build

**Files:**
- Aucun nouveau (corrections éventuelles uniquement).

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: branche prête pour la PR et la recette device.

- [ ] **Step 1: Suite de tests complète**

Run : `npx vitest run --maxWorkers=4`
Expected : 100 % PASS (≈1800+ tests). Tout échec se corrige AVANT de continuer.

- [ ] **Step 2: Lint + build web**

Run : `npm run lint && npm run build`
Expected : zéro erreur. (Piège connu : ne pas juger une retouche UI via `next dev` sans avoir purgé `.next` si un style semble fantôme.)

- [ ] **Step 3: Build iOS simulateur**

Run : `bash scripts/ios-sim.sh`
Expected : build + boot OK ; en simulateur le jeu se comporte comme le stub n'existe pas côté natif : `verifierEntitlement` répond `false`, le bouton d'achat s'affiche avec le prix en erreur silencieuse (« … ») — normal, les achats ne se testent qu'en sandbox device.

- [ ] **Step 4: Commit final éventuel + push**

```bash
git push -u origin feat/iap-energie-infinie
```

PR à ouvrir à la main par Guillaume (pas de gh sur ce poste).

---

## Hors-code (manuel, Guillaume — après merge, avant soumission)

1. **App Store Connect** : créer l'in-app « Non-Consumable », ID produit `com.guigousse.broc.energie_infinie`, prix 3,99 € (point de prix équivalent), métadonnées FR/EN/ES/EL (nom « Énergie infinie » + description courte), capture d'écran de review (la machine à énergie avec le bouton), et **joindre l'IAP à la version 1.2.0** lors de la soumission (un premier IAP est examiné avec un binaire).
2. **Compte sandbox** : créer un testeur sandbox dans App Store Connect → Users and Access, s'y connecter sur le device (Réglages → App Store → Sandbox Account).
3. **Recette device (sandbox)** : achat nominal → jauge ∞ partout (header, machine, brocante) ; annulation du sheet → silence ; re-tap achat → restauration transparente ; « Restaurer les achats » sur réinstallation ; vieille save à jauge basse → remonte au max ; boîte mystère → la pub marche toujours.
