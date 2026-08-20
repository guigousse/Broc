# Firebase Analytics (iOS) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** mesurer ce que font les joueurs de BROC sur iOS (décrochage, rétention, économie, monétisation) via Firebase Analytics, sans jamais collecter quoi que ce soit avant le consentement UMP.

**Architecture :** quatre couches calquées sur le chemin AdMob déjà en production — un plugin Tauri vendoré sans SDK, un pont Swift dans le target app (seul endroit qui importe Firebase), une façade TypeScript avec provider factice hors device, et un composant de boot dans le layout racine. Le jour de jeu et le niveau sont injectés automatiquement dans chaque événement.

**Tech Stack :** Rust (plugin Tauri 2), Swift 5 / SPM (`firebase-ios-sdk`, produit `FirebaseAnalytics` seul), TypeScript / React 19 / Next 16, vitest, XcodeGen.

**Spec :** `docs/superpowers/specs/2026-08-20-firebase-analytics-design.md`

**Branche :** `feat/firebase-analytics` (partie de `main`).

## Global Constraints

- **Tous les tests tournent avec `--maxWorkers=4`.** Sans ce drapeau, ~41 faux échecs apparaissent par famine de workers sur ce Mac Intel. Commande de référence : `npx vitest run --maxWorkers=4 <chemin>`.
- **Une panne de mesure ne casse jamais une partie.** Tout appel à la façade est enveloppé d'un `catch` silencieux. Aucune commande du plugin ne rejette pour une raison métier.
- **Aucune chaîne localisée, aucun identifiant personnel, aucun texte libre** dans un événement ou un paramètre. Noms d'événements et de paramètres en `snake_case`, en français non accentué, figés dans un `as const`.
- **Agrégation au niveau session** : jamais un événement par objet ni par tap.
- **`SAVE_VERSION` reste inchangé.** Aucun champ n'est ajouté à `EtatJeu`.
- **Le SDK Firebase ne peut être importé QUE dans `src-tauri/gen/apple/Sources/app/`** (compilé par Xcode). Le plugin vendoré est compilé par `swift build` (swift-rs) qui n'expose pas les modules des xcframeworks SPM — contrainte tauri#13332, documentée en tête d'`AdmobPlugin.swift`.
- **`FIREBASE_ANALYTICS_COLLECTION_ENABLED = false`** dans l'Info.plist : la collecte démarre éteinte, toujours.
- **`main.mm` et `AdmobBridge.swift` sont générés mais édités à la main.** Ne jamais relancer `tauri ios init` sans reporter leurs correctifs.
- **Lint :** `npx eslint src` (le script `npm run lint` est cassé depuis Next 16).

## Fichiers

**Créés — Rust / plugin**
- `src-tauri/vendor/tauri-plugin-firebase/Cargo.toml`
- `src-tauri/vendor/tauri-plugin-firebase/build.rs`
- `src-tauri/vendor/tauri-plugin-firebase/permissions/default.toml`
- `src-tauri/vendor/tauri-plugin-firebase/src/{lib,commands,models,error,mobile,desktop}.rs`
- `src-tauri/vendor/tauri-plugin-firebase/ios/Package.swift`
- `src-tauri/vendor/tauri-plugin-firebase/ios/Sources/FirebasePlugin.swift`

**Créés — Swift, target app**
- `src-tauri/gen/apple/Sources/app/FirebaseBridge.swift` — seul importeur du SDK
- `src-tauri/gen/apple/Sources/app/ConsentementBroc.swift` — publication du verdict UMP
- `src-tauri/gen/apple/app_iOS/GoogleService-Info.plist` — fourni par Guillaume

**Créés — TypeScript**
- `src/lib/analytics/analytics.ts` — interface, catalogue, stub, singleton
- `src/lib/analytics/firebaseProvider.ts` — provider natif
- `src/lib/analytics/contexte.ts` — injection `jour` / `jour_tranche` / `niveau`
- `src/lib/analytics/ecrans.ts` — noms d'écrans stables depuis les routes
- `src/components/mobile/FirebaseBootstrap.tsx` — init + contexte + `screen_view`
- Les tests jumeaux `*.test.ts` de chacun

**Modifiés**
- `src-tauri/Cargo.toml` — dépendance du plugin
- `src-tauri/src/lib.rs:4-7` — enregistrement du plugin
- `src-tauri/capabilities/default.json` — permission `firebase:default`
- `src-tauri/gen/apple/project.yml` — paquet SPM, dépendance, propriété Info.plist
- `src-tauri/gen/apple/Sources/app/AdmobBridge.swift` — **une seule ligne** ajoutée en fin de `parcoursConsentement`
- `src/app/layout.tsx` — montage de `<FirebaseBootstrap />`
- `src/context/GameContext.tsx` — appels d'instrumentation (tâches 6-8)
- `src/lib/ads/adMobProvider.ts` — événements `pub_demandee` / `pub_terminee`
- `src/app/privacy/page.tsx` — section mesure d'audience en 4 langues

---

### Task 1 : Le plugin Tauri vendoré

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-firebase/Cargo.toml`
- Create: `src-tauri/vendor/tauri-plugin-firebase/build.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/permissions/default.toml`
- Create: `src-tauri/vendor/tauri-plugin-firebase/src/lib.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/src/commands.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/src/models.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/src/error.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/src/mobile.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/src/desktop.rs`
- Create: `src-tauri/vendor/tauri-plugin-firebase/ios/Package.swift`
- Create: `src-tauri/vendor/tauri-plugin-firebase/ios/Sources/FirebasePlugin.swift`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: rien.
- Produces: trois commandes Tauri invocables depuis le web —
  `plugin:firebase|initialize` (aucun argument, résout `()`),
  `plugin:firebase|log_event` (`{ nom: string, params: Record<string, unknown> }`, résout `()`),
  `plugin:firebase|set_user_property` (`{ nom: string, valeur: string | null }`, résout `()`).

- [ ] **Step 1 : Créer `Cargo.toml`**

```toml
[package]
name = "tauri-plugin-firebase"
version = "0.1.0"
edition = "2021"
rust-version = "1.77.2"
links = "tauri-plugin-firebase"

[build-dependencies]
tauri-plugin = { version = "2", features = ["build"] }

[dependencies]
tauri = { version = "2" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
```

- [ ] **Step 2 : Créer `build.rs`**

```rust
const COMMANDS: &[&str] = &["initialize", "log_event", "set_user_property"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .build();
}
```

- [ ] **Step 3 : Créer `permissions/default.toml`**

```toml
[default]
description = "Permissions par défaut du plugin Firebase : démarrage du SDK, journalisation d'événements et propriétés utilisateur."
permissions = ["allow-initialize", "allow-log-event", "allow-set-user-property"]
```

- [ ] **Step 4 : Créer `src/error.rs`**

```rust
use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[cfg(target_os = "ios")]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
    #[error("Firebase Analytics indisponible sur cette plateforme")]
    UnsupportedPlatform,
}

// Les erreurs de commande Tauri doivent être sérialisables vers JS.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

- [ ] **Step 5 : Créer `src/models.rs`**

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Un événement Analytics. `params` est libre (nombres, booléens, chaînes
/// courtes) ; c'est le natif qui l'aplatit vers l'API Firebase.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Evenement {
    pub nom: String,
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,
}
```

- [ ] **Step 6 : Créer `src/mobile.rs`**

```rust
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

tauri::ios_plugin_binding!(init_plugin_firebase);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Firebase<R>> {
    let handle = api.register_ios_plugin(init_plugin_firebase)?;
    Ok(Firebase(handle))
}

pub struct Firebase<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Firebase<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("initialize", serde_json::json!({}))
            .map_err(Into::into)
    }

    pub fn log_event(
        &self,
        nom: String,
        params: HashMap<String, serde_json::Value>,
    ) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("logEvent", serde_json::json!({ "nom": nom, "params": params }))
            .map_err(Into::into)
    }

    pub fn set_user_property(&self, nom: String, valeur: Option<String>) -> crate::Result<()> {
        self.0
            .run_mobile_plugin(
                "setUserProperty",
                serde_json::json!({ "nom": nom, "valeur": valeur }),
            )
            .map_err(Into::into)
    }
}
```

- [ ] **Step 7 : Créer `src/desktop.rs`**

```rust
use serde::de::DeserializeOwned;
use std::collections::HashMap;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Firebase<R>> {
    Ok(Firebase(app.clone()))
}

pub struct Firebase<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

// Hors iOS il n'y a pas de SDK : les trois commandes sont des no-op qui
// réussissent. Contrairement à AdMob (où l'absence de pub prive le joueur de
// sa récompense et mérite une erreur), une mesure absente ne doit rien changer
// au déroulement du jeu — ni erreur, ni toast, ni trace.
impl<R: Runtime> Firebase<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        Ok(())
    }
    pub fn log_event(
        &self,
        _nom: String,
        _params: HashMap<String, serde_json::Value>,
    ) -> crate::Result<()> {
        Ok(())
    }
    pub fn set_user_property(&self, _nom: String, _valeur: Option<String>) -> crate::Result<()> {
        Ok(())
    }
}
```

- [ ] **Step 8 : Créer `src/commands.rs`**

```rust
use std::collections::HashMap;
use tauri::{command, AppHandle, Runtime};

use crate::{FirebaseExt, Result};

#[command]
pub(crate) async fn initialize<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.firebase().initialize()
}

#[command]
pub(crate) async fn log_event<R: Runtime>(
    app: AppHandle<R>,
    nom: String,
    params: HashMap<String, serde_json::Value>,
) -> Result<()> {
    app.firebase().log_event(nom, params)
}

#[command]
pub(crate) async fn set_user_property<R: Runtime>(
    app: AppHandle<R>,
    nom: String,
    valeur: Option<String>,
) -> Result<()> {
    app.firebase().set_user_property(nom, valeur)
}
```

- [ ] **Step 9 : Créer `src/lib.rs`**

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
use mobile::Firebase;
#[cfg(not(target_os = "ios"))]
use desktop::Firebase;

pub use error::{Error, Result};
pub use models::Evenement;

/// Accès à l'état du plugin depuis les commandes.
pub trait FirebaseExt<R: Runtime> {
    fn firebase(&self) -> &Firebase<R>;
}

impl<R: Runtime, T: Manager<R>> FirebaseExt<R> for T {
    fn firebase(&self) -> &Firebase<R> {
        self.state::<Firebase<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("firebase")
        .invoke_handler(tauri::generate_handler![
            commands::initialize,
            commands::log_event,
            commands::set_user_property
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let firebase = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let firebase = desktop::init(app, api)?;
            app.manage(firebase);
            Ok(())
        })
        .build()
}
```

- [ ] **Step 10 : Créer `ios/Package.swift`**

```swift
// swift-tools-version:5.5
import PackageDescription

let package = Package(
  name: "tauri-plugin-firebase",
  platforms: [
    .iOS(.v13)
  ],
  products: [
    .library(
      name: "tauri-plugin-firebase",
      type: .static,
      targets: ["tauri-plugin-firebase"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-firebase",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
```

- [ ] **Step 11 : Créer `ios/Sources/FirebasePlugin.swift`**

```swift
import SwiftRs
import Tauri
import UIKit

// Le SDK Firebase ne peut PAS être importé ici : ce paquet est compilé par
// `swift build` (swift-rs), qui n'expose pas les modules des xcframeworks
// binaires SPM (tauri#13332) — même contrainte que AdmobPlugin.swift. Tout le
// code touchant le SDK vit dans le target de l'app
// (gen/apple/Sources/app/FirebaseBridge.swift, compilé par Xcode) et est
// joint au runtime via NSClassFromString.
class FirebasePlugin: Plugin {
  private func pont() -> NSObject? {
    guard let cls = NSClassFromString("BrocFirebaseBridge") as? NSObject.Type else { return nil }
    return cls.value(forKey: "shared") as? NSObject
  }

  private struct ArgsEvenement: Decodable {
    let nom: String
    let params: [String: JSValue]?
  }

  private struct ArgsPropriete: Decodable {
    let nom: String
    let valeur: String?
  }

  @objc public func initialize(_ invoke: Invoke) throws {
    // Pont absent : on résout quand même. Une mesure absente ne doit jamais
    // remonter d'erreur au jeu.
    guard let pont = pont() else {
      invoke.resolve()
      return
    }
    _ = pont.perform(NSSelectorFromString("demarrer"))
    invoke.resolve()
  }

  @objc public func logEvent(_ invoke: Invoke) throws {
    guard let pont = pont(), let args = try? invoke.parseArgs(ArgsEvenement.self) else {
      invoke.resolve()
      return
    }
    let params = FirebasePlugin.aplatir(args.params ?? [:])
    _ = pont.perform(
      NSSelectorFromString("loguer:params:"), with: args.nom, with: params)
    invoke.resolve()
  }

  @objc public func setUserProperty(_ invoke: Invoke) throws {
    guard let pont = pont(), let args = try? invoke.parseArgs(ArgsPropriete.self) else {
      invoke.resolve()
      return
    }
    _ = pont.perform(
      NSSelectorFromString("definirPropriete:valeur:"), with: args.nom, with: args.valeur)
    invoke.resolve()
  }

  /// Firebase n'accepte que String et NSNumber en valeur de paramètre : tout
  /// le reste est jeté plutôt que stringifié (un objet stringifié pollue les
  /// rapports sans rien apprendre).
  private static func aplatir(_ brut: [String: JSValue]) -> [String: Any] {
    var sortie: [String: Any] = [:]
    for (cle, valeur) in brut {
      switch valeur {
      case let .string(s): sortie[cle] = s
      case let .int(i): sortie[cle] = NSNumber(value: i)
      case let .float(f): sortie[cle] = NSNumber(value: f)
      case let .bool(b): sortie[cle] = NSNumber(value: b)
      default: continue
      }
    }
    return sortie
  }
}

@_cdecl("init_plugin_firebase")
func initPluginFirebase() -> Plugin {
  return FirebasePlugin()
}
```

> **Note pour l'implémenteur :** vérifie les cas exacts de l'énumération `JSValue` dans `src-tauri/vendor/tauri-plugin-admob/.tauri/tauri-api/Sources/Tauri/JSTypes.swift` et adapte le `switch` si les noms diffèrent. C'est la seule inconnue de cette tâche.

- [ ] **Step 12 : Câbler le plugin dans l'app**

Dans `src-tauri/Cargo.toml`, sous `tauri-plugin-iap` :

```toml
tauri-plugin-firebase = { path = "vendor/tauri-plugin-firebase" }
```

Dans `src-tauri/src/lib.rs`, après la ligne 7 (`.plugin(tauri_plugin_iap::init())`) :

```rust
    .plugin(tauri_plugin_firebase::init())
```

Dans `src-tauri/capabilities/default.json`, ajouter `"firebase:default"` à la fin du tableau `permissions`.

- [ ] **Step 13 : Vérifier que ça compile**

Run: `cd src-tauri && cargo check`
Expected: `Finished` sans erreur. C'est la branche `desktop.rs` qui est compilée ici (on n'est pas sur iOS) — elle valide la génération des permissions, les signatures de commandes et le câblage.

- [ ] **Step 14 : Commit**

```bash
git add src-tauri/vendor/tauri-plugin-firebase src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat(analytics): le plugin Tauri firebase, sans SDK"
```

---

### Task 2 : La façade TypeScript

**Files:**
- Create: `src/lib/analytics/analytics.ts`
- Create: `src/lib/analytics/analytics.test.ts`
- Create: `src/lib/analytics/firebaseProvider.ts`
- Create: `src/lib/analytics/firebaseProvider.test.ts`

**Interfaces:**
- Consumes: les commandes de la tâche 1 ; `tauriIosDisponible()` de `src/lib/plateforme.ts`.
- Produces:
  - `interface AnalyticsProvider { logEvent(nom: string, params?: ParamsEvenement): void; setUserProperty(nom: string, valeur: string | null): void }`
  - `type ParamsEvenement = Record<string, string | number | boolean>`
  - `const EVENEMENTS` (catalogue figé) et `const PROPRIETES`
  - `class StubAnalyticsProvider` avec `readonly appels: { nom: string; params: ParamsEvenement }[]` et `viderAppels(): void`
  - `class FirebaseAnalyticsProvider` avec `initialiser(): Promise<void>`
  - `getAnalytics(): AnalyticsProvider`, `reinitialiserAnalyticsPourTest(p?: AnalyticsProvider): void`
  - `firebaseDisponible(): boolean`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/analytics/analytics.test.ts` :

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  EVENEMENTS,
  PROPRIETES,
  StubAnalyticsProvider,
  getAnalytics,
  reinitialiserAnalyticsPourTest,
} from "./analytics";

describe("EVENEMENTS", () => {
  it("chaque événement a un nom distinct", () => {
    const noms = Object.values(EVENEMENTS);
    expect(new Set(noms).size).toBe(noms.length);
  });

  it("les noms respectent la convention Firebase (snake_case, sans accent, ≤ 40 car.)", () => {
    for (const nom of Object.values(EVENEMENTS)) {
      expect(nom).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
    }
  });

  it("les propriétés utilisateur respectent la même convention (≤ 24 car.)", () => {
    for (const nom of Object.values(PROPRIETES)) {
      expect(nom).toMatch(/^[a-z][a-z0-9_]{0,23}$/);
    }
  });
});

describe("StubAnalyticsProvider", () => {
  it("enregistre les événements reçus", () => {
    const stub = new StubAnalyticsProvider();
    stub.logEvent(EVENEMENTS.tutoTermine);
    stub.logEvent(EVENEMENTS.niveauAtteint, { niveau: 4 });
    expect(stub.appels).toEqual([
      { nom: "tuto_termine", params: {} },
      { nom: "niveau_atteint", params: { niveau: 4 } },
    ]);
  });

  it("viderAppels remet le journal à zéro", () => {
    const stub = new StubAnalyticsProvider();
    stub.logEvent(EVENEMENTS.tutoTermine);
    stub.viderAppels();
    expect(stub.appels).toEqual([]);
  });
});

describe("getAnalytics", () => {
  beforeEach(() => reinitialiserAnalyticsPourTest());

  it("rend le stub hors runtime Tauri", () => {
    expect(getAnalytics()).toBeInstanceOf(StubAnalyticsProvider);
  });

  it("rend un singleton stable", () => {
    expect(getAnalytics()).toBe(getAnalytics());
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/analytics/analytics.test.ts`
Expected: FAIL — `Failed to resolve import "./analytics"`.

- [ ] **Step 3 : Écrire `src/lib/analytics/analytics.ts`**

```ts
/**
 * Façade de mesure d'audience. Le jeu n'appelle JAMAIS le natif directement :
 * il passe par `getAnalytics()`, qui rend le provider Firebase sous Tauri iOS
 * et un stub inerte partout ailleurs (web, simulateur, dev desktop, vitest).
 *
 * Règle absolue : une panne de mesure ne casse pas une partie. Aucun appel
 * d'ici ne peut lever ni rejeter.
 */
import { firebaseDisponible, FirebaseAnalyticsProvider } from "./firebaseProvider";

/** Firebase n'accepte que des scalaires en valeur de paramètre. */
export type ParamsEvenement = Record<string, string | number | boolean>;

export interface AnalyticsProvider {
  logEvent(nom: string, params?: ParamsEvenement): void;
  setUserProperty(nom: string, valeur: string | null): void;
}

/**
 * Catalogue figé des événements. Toute mesure passe par une clé d'ici — jamais
 * par une chaîne écrite sur place, sous peine de rapports illisibles le jour où
 * deux écrans écrivent le même concept différemment.
 *
 * Contraintes Firebase : ≤ 40 caractères, `snake_case`, sans accent, et le
 * préfixe `firebase_`/`google_`/`ga_` est réservé.
 */
export const EVENEMENTS = {
  // Décrochage
  tutoEtape: "tuto_etape",
  tutoTermine: "tuto_termine",
  miniTutoTermine: "mini_tuto_termine",
  // Rétention & progression
  jourAtteint: "jour_atteint",
  niveauAtteint: "niveau_atteint",
  competenceDebloquee: "competence_debloquee",
  // Économie
  sessionChineTerminee: "session_chine_terminee",
  sessionVenteTerminee: "session_vente_terminee",
  ameliorationAchetee: "amelioration_achetee",
  bazarAchat: "bazar_achat",
  // Monétisation
  energieEpuisee: "energie_epuisee",
  pubDemandee: "pub_demandee",
  pubTerminee: "pub_terminee",
  iapEcranVu: "iap_ecran_vu",
  // Navigation (screen_view est un nom réservé Firebase, on l'écrit tel quel)
  ecranVu: "screen_view",
} as const;

export type Evenement = (typeof EVENEMENTS)[keyof typeof EVENEMENTS];

/** Propriétés utilisateur : ≤ 24 caractères. Servent à découper la population. */
export const PROPRIETES = {
  tutoTermine: "tuto_termine",
  acheteurIap: "acheteur_iap",
  langue: "langue",
  niveauTranche: "niveau_tranche",
} as const;

/** Provider factice : n'envoie rien, enregistre tout. C'est lui qui rend les tests possibles. */
export class StubAnalyticsProvider implements AnalyticsProvider {
  readonly appels: { nom: string; params: ParamsEvenement }[] = [];
  readonly proprietes: { nom: string; valeur: string | null }[] = [];

  logEvent(nom: string, params: ParamsEvenement = {}): void {
    this.appels.push({ nom, params });
  }

  setUserProperty(nom: string, valeur: string | null): void {
    this.proprietes.push({ nom, valeur });
  }

  viderAppels(): void {
    this.appels.length = 0;
    this.proprietes.length = 0;
  }
}

let instance: AnalyticsProvider | null = null;

export function getAnalytics(): AnalyticsProvider {
  if (!instance) {
    instance = firebaseDisponible()
      ? new FirebaseAnalyticsProvider()
      : new StubAnalyticsProvider();
  }
  return instance;
}

/** Réservé aux tests : force le provider (ou repart du choix automatique). */
export function reinitialiserAnalyticsPourTest(provider?: AnalyticsProvider): void {
  instance = provider ?? null;
}
```

- [ ] **Step 4 : Écrire `src/lib/analytics/firebaseProvider.ts`**

```ts
/**
 * Provider Firebase natif (plugin Tauri vendoré). Import DYNAMIQUE de l'API
 * Tauri pour que rien de natif ne soit évalué hors runtime Tauri — même motif
 * que src/lib/ads/adMobProvider.ts.
 */
import type { AnalyticsProvider, ParamsEvenement } from "./analytics";
import { tauriIosDisponible } from "@/lib/plateforme";

/** Vrai uniquement sous runtime Tauri sur iOS (le plugin n'existe que là). */
export function firebaseDisponible(): boolean {
  return tauriIosDisponible();
}

export class FirebaseAnalyticsProvider implements AnalyticsProvider {
  private initEnCours: Promise<void> | null = null;

  /** Idempotent ; en cas d'échec, le prochain appel retente. */
  initialiser(): Promise<void> {
    if (!this.initEnCours) {
      this.initEnCours = (async () => {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("plugin:firebase|initialize");
      })();
      this.initEnCours.catch(() => {
        this.initEnCours = null;
      });
    }
    return this.initEnCours;
  }

  // Volontairement synchrone et sans retour : un appelant ne doit jamais avoir
  // à attendre, ni à gérer une erreur de mesure. Tout est avalé.
  logEvent(nom: string, params: ParamsEvenement = {}): void {
    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:firebase|log_event", { nom, params });
    })().catch(() => {});
  }

  setUserProperty(nom: string, valeur: string | null): void {
    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:firebase|set_user_property", { nom, valeur });
    })().catch(() => {});
  }
}
```

- [ ] **Step 5 : Écrire `src/lib/analytics/firebaseProvider.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { firebaseDisponible, FirebaseAnalyticsProvider } from "./firebaseProvider";

describe("firebaseDisponible", () => {
  it("est faux hors runtime Tauri (jsdom)", () => {
    expect(firebaseDisponible()).toBe(false);
  });
});

describe("FirebaseAnalyticsProvider", () => {
  it("logEvent n'explose pas quand l'API Tauri est absente", () => {
    const p = new FirebaseAnalyticsProvider();
    expect(() => p.logEvent("tuto_termine")).not.toThrow();
    expect(() => p.setUserProperty("langue", "fr")).not.toThrow();
  });
});
```

- [ ] **Step 6 : Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run --maxWorkers=4 src/lib/analytics/`
Expected: PASS, 8 tests.

- [ ] **Step 7 : Lint**

Run: `npx eslint src/lib/analytics`
Expected: aucune sortie.

- [ ] **Step 8 : Commit**

```bash
git add src/lib/analytics
git commit -m "feat(analytics): la façade TypeScript et son provider factice"
```

---

### Task 3 : L'injection du jour de jeu et du niveau

**Files:**
- Create: `src/lib/analytics/contexte.ts`
- Create: `src/lib/analytics/contexte.test.ts`
- Modify: `src/lib/analytics/analytics.ts`
- Modify: `src/lib/analytics/analytics.test.ts`

**Interfaces:**
- Consumes: `ParamsEvenement`, `StubAnalyticsProvider`, `getAnalytics` de la tâche 2.
- Produces:
  - `type ContexteJeu = { jour: number; niveau: number } | null`
  - `definirLecteurContexte(lecteur: (() => ContexteJeu) | null): void`
  - `contexteCourant(): ParamsEvenement`
  - `trancheJour(jour: number): string`
  - `logEvenement(nom: string, params?: ParamsEvenement): void` — **le point d'entrée qu'utilise tout le jeu à partir d'ici**

**Pourquoi un lecteur enregistré plutôt qu'un import :** `src/lib/analytics` ne doit pas importer `GameContext` (dépendance circulaire, et la lib deviendrait intestable sans React). C'est le composant de la tâche 5 qui pousse un lecteur vers la lib.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/analytics/contexte.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  definirLecteurContexte,
  contexteCourant,
  trancheJour,
  logEvenement,
} from "./contexte";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "./analytics";

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
});

afterEach(() => {
  definirLecteurContexte(null);
  reinitialiserAnalyticsPourTest();
});

describe("trancheJour", () => {
  it("range le jour dans la bonne tranche, bornes comprises", () => {
    expect(trancheJour(1)).toBe("1-7");
    expect(trancheJour(7)).toBe("1-7");
    expect(trancheJour(8)).toBe("8-14");
    expect(trancheJour(14)).toBe("8-14");
    expect(trancheJour(15)).toBe("15-30");
    expect(trancheJour(30)).toBe("15-30");
    expect(trancheJour(31)).toBe("31-60");
    expect(trancheJour(60)).toBe("31-60");
    expect(trancheJour(61)).toBe("61+");
    expect(trancheJour(400)).toBe("61+");
  });
});

describe("contexteCourant", () => {
  it("est vide sans lecteur enregistré", () => {
    expect(contexteCourant()).toEqual({});
  });

  it("est vide quand le lecteur rend null (hors partie)", () => {
    definirLecteurContexte(() => null);
    expect(contexteCourant()).toEqual({});
  });

  it("rend jour, jour_tranche et niveau quand une partie est en cours", () => {
    definirLecteurContexte(() => ({ jour: 12, niveau: 5 }));
    expect(contexteCourant()).toEqual({ jour: 12, jour_tranche: "8-14", niveau: 5 });
  });

  it("survit à un lecteur qui lève", () => {
    definirLecteurContexte(() => {
      throw new Error("état pas prêt");
    });
    expect(contexteCourant()).toEqual({});
  });
});

describe("logEvenement", () => {
  it("injecte le contexte dans TOUT événement", () => {
    definirLecteurContexte(() => ({ jour: 3, niveau: 2 }));
    logEvenement(EVENEMENTS.tutoTermine);
    logEvenement(EVENEMENTS.pubDemandee, { emplacement: "energie" });
    expect(stub.appels).toEqual([
      { nom: "tuto_termine", params: { jour: 3, jour_tranche: "1-7", niveau: 2 } },
      {
        nom: "pub_demandee",
        params: { emplacement: "energie", jour: 3, jour_tranche: "1-7", niveau: 2 },
      },
    ]);
  });

  it("n'ajoute rien hors partie", () => {
    definirLecteurContexte(() => null);
    logEvenement(EVENEMENTS.ecranVu, { screen_name: "menu" });
    expect(stub.appels).toEqual([{ nom: "screen_view", params: { screen_name: "menu" } }]);
  });

  it("les paramètres explicites l'emportent sur le contexte", () => {
    definirLecteurContexte(() => ({ jour: 3, niveau: 2 }));
    logEvenement(EVENEMENTS.jourAtteint, { jour: 9 });
    expect(stub.appels[0].params.jour).toBe(9);
  });

  it("n'explose jamais, même si le provider lève", () => {
    reinitialiserAnalyticsPourTest({
      logEvent() {
        throw new Error("natif cassé");
      },
      setUserProperty() {},
    });
    expect(() => logEvenement(EVENEMENTS.tutoTermine)).not.toThrow();
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/analytics/contexte.test.ts`
Expected: FAIL — `Failed to resolve import "./contexte"`.

- [ ] **Step 3 : Écrire `src/lib/analytics/contexte.ts`**

```ts
/**
 * Contexte de jeu injecté dans CHAQUE événement.
 *
 * Pourquoi un paramètre d'événement et pas une propriété utilisateur : une
 * propriété utilisateur GA4 ne conserve que sa DERNIÈRE valeur. Un joueur
 * arrivé au jour 80 verrait ses événements du jour 3 étiquetés « jour 80 »,
 * ce qui rend toute analyse de décrochage fausse.
 *
 * Le lecteur est poussé par <FirebaseBootstrap/> plutôt qu'importé : cette lib
 * ne doit dépendre ni de React ni de GameContext.
 */
import { getAnalytics, type ParamsEvenement } from "./analytics";

/** `null` = pas de partie en cours (menu, crédits, pages légales). */
export type ContexteJeu = { jour: number; niveau: number } | null;

let lecteur: (() => ContexteJeu) | null = null;

export function definirLecteurContexte(f: (() => ContexteJeu) | null): void {
  lecteur = f;
}

/**
 * Tranches de jour de jeu. Déclarée en DIMENSION côté console (le `jour` brut,
 * lui, est une MÉTRIQUE numérique : pas de plafond de cardinalité, et on
 * obtient moyennes et médianes).
 */
export function trancheJour(jour: number): string {
  if (jour <= 7) return "1-7";
  if (jour <= 14) return "8-14";
  if (jour <= 30) return "15-30";
  if (jour <= 60) return "31-60";
  return "61+";
}

export function contexteCourant(): ParamsEvenement {
  if (!lecteur) return {};
  let ctx: ContexteJeu;
  try {
    ctx = lecteur();
  } catch {
    // Le lecteur touche l'état React : s'il n'est pas prêt, on mesure sans
    // contexte plutôt que de casser l'appelant.
    return {};
  }
  if (!ctx) return {};
  return { jour: ctx.jour, jour_tranche: trancheJour(ctx.jour), niveau: ctx.niveau };
}

/**
 * LE point d'entrée de mesure du jeu. Tout passe par ici — jamais par
 * `getAnalytics().logEvent` en direct, sinon le contexte manque.
 */
export function logEvenement(nom: string, params: ParamsEvenement = {}): void {
  try {
    getAnalytics().logEvent(nom, { ...contexteCourant(), ...params });
  } catch {
    // Une panne de mesure ne casse pas une partie.
  }
}
```

- [ ] **Step 4 : Ajouter le test de garde dans `analytics.test.ts`**

Ajouter à la fin du fichier :

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("garde : personne n'appelle logEvent en contournant le contexte", () => {
  it("aucun fichier de src/ n'appelle getAnalytics().logEvent hors de la lib analytics", () => {
    const fautifs: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, entree.name);
        if (entree.isDirectory()) {
          parcourir(chemin);
        } else if (/\.tsx?$/.test(entree.name) && !chemin.includes("lib/analytics")) {
          if (/getAnalytics\(\)\s*\.\s*logEvent/.test(readFileSync(chemin, "utf8"))) {
            fautifs.push(chemin);
          }
        }
      }
    };
    parcourir("src");
    expect(fautifs).toEqual([]);
  });
});
```

- [ ] **Step 5 : Lancer tous les tests analytics**

Run: `npx vitest run --maxWorkers=4 src/lib/analytics/`
Expected: PASS, 19 tests.

- [ ] **Step 6 : Lint et commit**

```bash
npx eslint src/lib/analytics
git add src/lib/analytics
git commit -m "feat(analytics): le jour de jeu et le niveau injectés dans chaque événement"
```

---

### Task 4 : Le pont Swift, la config Xcode et le consentement

**Files:**
- Create: `src-tauri/gen/apple/Sources/app/ConsentementBroc.swift`
- Create: `src-tauri/gen/apple/Sources/app/FirebaseBridge.swift`
- Modify: `src-tauri/gen/apple/Sources/app/AdmobBridge.swift` (fin de `parcoursConsentement`, une ligne)
- Modify: `src-tauri/gen/apple/project.yml`

**Interfaces:**
- Consumes: `plugin:firebase|initialize` / `log_event` / `set_user_property` de la tâche 1, qui joignent ce pont par `NSClassFromString("BrocFirebaseBridge")`.
- Produces: la classe Objective-C `BrocFirebaseBridge` exposant les sélecteurs `demarrer`, `loguer:params:`, `definirPropriete:valeur:` ; et `ConsentementBroc.shared` exposant `resoudre(canRequestAds:)` et `auVerdict(_:)`.

**Prérequis :** `GoogleService-Info.plist` déposé dans `src-tauri/gen/apple/app_iOS/` par Guillaume. Sans lui, l'app crashe au `FirebaseApp.configure()`. Si le fichier n'est pas là, **arrête-toi et demande-le** plutôt que d'en fabriquer un.

- [ ] **Step 1 : Créer `ConsentementBroc.swift`**

```swift
import Foundation

/// Publication du verdict de consentement UMP, pour que plusieurs
/// consommateurs (Firebase aujourd'hui, d'autres demain) s'y branchent sans
/// que le parcours lui-même — délicat, recetté sur appareil — ait à les
/// connaître. AdmobBridge appelle `resoudre` en fin de `parcoursConsentement`.
///
/// Tout se passe sur le main thread : les callbacks du SDK UMP y arrivent, et
/// les abonnés sont rappelés là aussi. Pas de synchronisation additionnelle.
@objc(BrocConsentement) public class ConsentementBroc: NSObject {
  @objc public static let shared = ConsentementBroc()

  private var verdict: Bool?
  private var abonnes: [(Bool) -> Void] = []

  /// Appelé une fois par lancement, à la fin du parcours UMP/ATT.
  @objc public func resoudre(canRequestAds: Bool) {
    DispatchQueue.main.async {
      self.verdict = canRequestAds
      let aPrevenir = self.abonnes
      self.abonnes.removeAll()
      for cb in aPrevenir { cb(canRequestAds) }
    }
  }

  /// Rappelle immédiatement si le verdict est déjà tombé, sinon met en file.
  /// Le verdict n'arrivant jamais (UMP hors-ligne) laisse simplement l'abonné
  /// en attente : c'est le comportement voulu, fail-closed.
  @objc public func auVerdict(_ cb: @escaping (Bool) -> Void) {
    DispatchQueue.main.async {
      if let verdict = self.verdict {
        cb(verdict)
      } else {
        self.abonnes.append(cb)
      }
    }
  }
}
```

- [ ] **Step 2 : Créer `FirebaseBridge.swift`**

```swift
import FirebaseAnalytics
import FirebaseCore
import Foundation

// Pont Firebase côté app : SEUL endroit autorisé à importer le SDK Firebase
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. FirebasePlugin.swift). Joint au runtime
// par le plugin via NSClassFromString("BrocFirebaseBridge").
//
// La collecte démarre ÉTEINTE (FIREBASE_ANALYTICS_COLLECTION_ENABLED = false
// dans l'Info.plist) et n'est allumée qu'au verdict UMP.
@objc(BrocFirebaseBridge) public class BrocFirebaseBridge: NSObject {
  @objc public static let shared = BrocFirebaseBridge()

  private var demarre = false

  /// Idempotent. `FirebaseApp.configure()` n'ouvre aucune connexion réseau
  /// tant que la collecte est désactivée : il est sûr de l'appeler avant que
  /// le consentement soit connu.
  @objc public func demarrer() {
    DispatchQueue.main.async {
      guard !self.demarre else { return }
      self.demarre = true
      if FirebaseApp.app() == nil {
        FirebaseApp.configure()
      }
      // Le verdict est réappliqué à CHAQUE lancement, pas seulement au
      // premier : `setAnalyticsCollectionEnabled` persiste entre les sessions
      // et surcharge l'Info.plist. Sans ce rejeu, une révocation ultérieure du
      // consentement ne couperait jamais la collecte.
      ConsentementBroc.shared.auVerdict { consenti in
        self.appliquerConsentement(consenti)
      }
    }
  }

  @objc public func appliquerConsentement(_ consenti: Bool) {
    // L'ordre compte : la personnalisation publicitaire doit être posée AVANT
    // l'activation de la collecte.
    Analytics.setUserProperty(
      consenti ? "true" : "false",
      forName: AnalyticsUserPropertyAllowAdPersonalizationSignals)
    Analytics.setAnalyticsCollectionEnabled(consenti)
  }

  @objc public func loguer(_ nom: String, params: [String: Any]) {
    Analytics.logEvent(nom, parameters: params)
  }

  @objc public func definirPropriete(_ nom: String, valeur: String?) {
    Analytics.setUserProperty(valeur, forName: nom)
  }
}
```

- [ ] **Step 3 : Brancher le verdict dans `AdmobBridge.swift`**

Dans `parcoursConsentement`, **deux** points d'appel — le repli hors-ligne et le chemin nominal. Remplacer :

```swift
      guard erreur == nil else {
        // Hors-ligne : on continue sans bloquer, les pubs échoueront proprement.
        fin()
        return
      }
```

par :

```swift
      guard erreur == nil else {
        // Hors-ligne : on continue sans bloquer, les pubs échoueront proprement.
        // Aucun verdict publié → la mesure d'audience reste éteinte (fail-closed),
        // le prochain lancement réessaiera.
        fin()
        return
      }
```

et, dans le bloc `ConsentForm.loadAndPresentIfRequired`, insérer la publication du verdict **avant** la demande ATT :

```swift
      ConsentForm.loadAndPresentIfRequired(from: self.rootViewController()) { _ in
        // Verdict publié pour les autres consommateurs (mesure d'audience).
        // `canRequestAds` est vrai aussi quand l'UMP juge le formulaire non
        // requis (hors UE).
        ConsentementBroc.shared.resoudre(
          canRequestAds: ConsentInformation.shared.canRequestAds)
        // ATT après le formulaire UMP : l'ordre évite deux popups d'affilée
        // sans contexte. Idempotent (iOS ne re-prompt jamais une fois décidé).
        if #available(iOS 14, *) {
```

Le reste de la méthode est inchangé.

- [ ] **Step 4 : Ajouter Firebase à `project.yml`**

Sous la clé `packages`, après `GoogleMobileAds` :

```yaml
  Firebase:
    url: https://github.com/firebase/firebase-ios-sdk
    from: 11.0.0
```

Dans `targets.app_iOS.dependencies`, après `- package: GoogleMobileAds` :

```yaml
      - package: Firebase
        product: FirebaseAnalytics
```

Dans `targets.app_iOS.info.properties`, après `ITSAppUsesNonExemptEncryption: false` :

```yaml
        FIREBASE_ANALYTICS_COLLECTION_ENABLED: false
        FirebaseAutomaticScreenReportingEnabled: false
```

`FirebaseAutomaticScreenReportingEnabled` n'est **pas optionnel** : le suivi
d'écran automatique de Firebase est actif par défaut et **indépendant** de
`FIREBASE_ANALYTICS_COLLECTION_ENABLED` — sans ce second réglage, le SDK logue
son propre `screen_view` pour l'unique `UIViewController` de la WebView, et son
`firebase_screen_class` collant vient ré-étiqueter tous les autres événements
avec ce nom de contrôleur au lieu des écrans que `ecrans.ts` calcule (spec §3.3).

- [ ] **Step 5 : Vérifier que le projet se génère et compile**

Run:
```bash
cd "src-tauri/gen/apple" && xcodegen generate
```
Expected: `Created project at …/app.xcodeproj`.

Puis, depuis la racine :
```bash
npm run tauri ios dev "iPhone 16 Pro"
```
Expected: la compilation Swift **réussit** (la résolution du paquet SPM Firebase est lente à la première fois, plusieurs minutes). L'étape `archive` échoue ensuite avec le code 65 — **c'est attendu sur ce Mac Intel**, cf. l'en-tête de `scripts/ios-sim.sh`. Ce qu'on valide ici, c'est uniquement que Swift compile.

Si la compilation échoue sur `GoogleService-Info.plist` introuvable : le fichier n'a pas été déposé, s'arrêter et le demander.

- [ ] **Step 6 : Commit**

```bash
git add src-tauri/gen/apple/Sources/app/FirebaseBridge.swift \
        src-tauri/gen/apple/Sources/app/ConsentementBroc.swift \
        src-tauri/gen/apple/Sources/app/AdmobBridge.swift \
        src-tauri/gen/apple/project.yml \
        src-tauri/gen/apple/app_iOS/GoogleService-Info.plist
git commit -m "feat(analytics): le pont Firebase et son consentement adossé à l'UMP"
```

---

### Task 5 : Le boot, le contexte et `screen_view`

**Files:**
- Create: `src/lib/analytics/ecrans.ts`
- Create: `src/lib/analytics/ecrans.test.ts`
- Create: `src/components/mobile/FirebaseBootstrap.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `FirebaseAnalyticsProvider`, `firebaseDisponible`, `getAnalytics` (tâche 2) ; `definirLecteurContexte`, `logEvenement`, `EVENEMENTS` (tâches 2-3) ; `useGame()` de `@/context/GameContext` ; `estRoutePartie` de `@/lib/routesPartie`.
- Produces: `nomEcran(pathname: string | null): string | null` ; le composant `<FirebaseBootstrap />`.

**Refinement de la spec, assumé :** la spec décrivait un `FirebaseBootstrap` qui n'appelle qu'`initialize`. On lui confie ici **trois** effets — init, enregistrement du lecteur de contexte, et `screen_view` — parce que les trois ont besoin exactement des mêmes hooks (`usePathname` + `useGame`) et qu'en faire trois composants montés au même endroit n'apporterait rien.

**Piège à connaître :** `/bazar` **n'est pas** dans `ROUTES_PARTIE` (`src/lib/routesPartie.ts:11-19`). Cette liste pilote le chrome global (bannière de tutoriel, level-up) et **ne doit pas être modifiée ici** — ce serait un changement de comportement de jeu hors périmètre. La mesure tient donc sa propre liste d'écrans.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/analytics/ecrans.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { nomEcran } from "./ecrans";

describe("nomEcran", () => {
  it("nomme les pièces du QG", () => {
    expect(nomEcran("/bureau")).toBe("bureau");
    expect(nomEcran("/stockage")).toBe("stockage");
    expect(nomEcran("/atelier")).toBe("atelier");
    expect(nomEcran("/collection")).toBe("collection");
    expect(nomEcran("/bibliotheque")).toBe("bibliotheque");
  });

  it("distingue les écrans de vitrine", () => {
    expect(nomEcran("/vitrine/prep")).toBe("vitrine-prep");
    expect(nomEcran("/vitrine/broc-42/journee")).toBe("vitrine-journee");
    expect(nomEcran("/vitrine/broc-42")).toBe("vitrine");
    expect(nomEcran("/vitrine")).toBe("vitrine");
  });

  it("ne fait jamais fuiter un identifiant de brocante dans le nom d'écran", () => {
    expect(nomEcran("/chiner/broc-42")).toBe("chiner");
  });

  it("nomme le menu et le bazar", () => {
    expect(nomEcran("/")).toBe("menu");
    expect(nomEcran("/bazar")).toBe("bazar");
  });

  it("rend null pour les écrans hors jeu et les entrées vides", () => {
    expect(nomEcran("/privacy")).toBeNull();
    expect(nomEcran("/mentions-legales")).toBeNull();
    expect(nomEcran(null)).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/analytics/ecrans.test.ts`
Expected: FAIL — `Failed to resolve import "./ecrans"`.

- [ ] **Step 3 : Écrire `src/lib/analytics/ecrans.ts`**

```ts
/**
 * Noms d'écran stables et NON localisés pour `screen_view`.
 *
 * Pourquoi manuellement : le suivi d'écran automatique de Firebase s'appuie
 * sur le cycle de vie des UIViewController. Dans une WebView Tauri il n'y en a
 * qu'un — sans cette table, tous les écrans du jeu seraient confondus en un
 * seul.
 *
 * Aucun identifiant de brocante ne doit entrer dans un nom d'écran : la route
 * est réduite à sa forme, jamais à son contenu.
 */
const EXACTS: Record<string, string> = {
  "/": "menu",
  "/bazar": "bazar",
  "/bureau": "bureau",
  "/stockage": "stockage",
  "/atelier": "atelier",
  "/collection": "collection",
  "/bibliotheque": "bibliotheque",
};

export function nomEcran(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  if (EXACTS[pathname]) return EXACTS[pathname];
  if (pathname === "/vitrine/prep") return "vitrine-prep";
  if (pathname.startsWith("/vitrine/") && pathname.endsWith("/journee")) return "vitrine-journee";
  if (pathname === "/vitrine" || pathname.startsWith("/vitrine/")) return "vitrine";
  if (pathname === "/chiner" || pathname.startsWith("/chiner/")) return "chiner";
  return null;
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `npx vitest run --maxWorkers=4 src/lib/analytics/ecrans.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5 : Écrire `src/components/mobile/FirebaseBootstrap.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { estRoutePartie } from "@/lib/routesPartie";
import { getAnalytics, EVENEMENTS } from "@/lib/analytics/analytics";
import { FirebaseAnalyticsProvider } from "@/lib/analytics/firebaseProvider";
import { definirLecteurContexte, logEvenement } from "@/lib/analytics/contexte";
import { nomEcran } from "@/lib/analytics/ecrans";

/**
 * Trois effets, montés une fois dans le layout racine :
 *   1. démarrage du SDK natif (Tauri iOS uniquement) ;
 *   2. publication du contexte de jeu (jour, niveau) vers la lib analytics ;
 *   3. `screen_view` à chaque changement de route.
 * Rend rien ; toute erreur est avalée (une panne de mesure ne casse pas le jeu).
 */
export function FirebaseBootstrap() {
  const { state } = useGame();
  const pathname = usePathname();

  // Le lecteur de contexte est appelé de façon synchrone au moment du log :
  // il doit voir l'état COURANT, pas celui figé à la création du lecteur.
  // D'où la ref, réassignée à chaque rendu.
  const etatRef = useRef({ jour: 0, niveau: 0, enPartie: false });
  etatRef.current = {
    jour: state?.jourActuel ?? 0,
    niveau: state?.brocanteur?.niveau ?? 0,
    // `/bazar` est un écran de jeu absent de ROUTES_PARTIE (cette liste pilote
    // le chrome global, on n'y touche pas). D'où le complément explicite.
    enPartie: estRoutePartie(pathname) || pathname === "/bazar",
  };

  useEffect(() => {
    const provider = getAnalytics();
    if (provider instanceof FirebaseAnalyticsProvider) {
      provider.initialiser().catch(() => {});
    }
  }, []);

  useEffect(() => {
    definirLecteurContexte(() => {
      const { jour, niveau, enPartie } = etatRef.current;
      // Hors partie, la save du slot actif reste chargée en mémoire : envoyer
      // son jour donnerait des chiffres d'une partie qu'on ne joue pas.
      return enPartie ? { jour, niveau } : null;
    });
    return () => definirLecteurContexte(null);
  }, []);

  useEffect(() => {
    const nom = nomEcran(pathname);
    if (nom) logEvenement(EVENEMENTS.ecranVu, { screen_name: nom });
  }, [pathname]);

  return null;
}
```

- [ ] **Step 6 : Monter le composant dans `src/app/layout.tsx`**

Ajouter l'import à côté de celui d'`AdMobBootstrap` :

```tsx
import { FirebaseBootstrap } from "@/components/mobile/FirebaseBootstrap";
```

et le montage juste après `<IapBootstrap />` :

```tsx
                <FirebaseBootstrap />
```

- [ ] **Step 7 : Vérifier la suite complète**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS. Aucun test existant ne doit régresser (le composant est inerte hors Tauri).

- [ ] **Step 8 : Lint et commit**

```bash
npx eslint src
git add src/lib/analytics src/components/mobile/FirebaseBootstrap.tsx src/app/layout.tsx
git commit -m "feat(analytics): le boot, le contexte de partie et screen_view"
```

---

### Task 6 : Instrumentation du décrochage (tutoriel)

**Files:**
- Modify: `src/context/GameContext.tsx` (`avancerTutoriel` ~l.985, `terminerMiniTutoVinyle` ~l.1054, `terminerMiniTutoCarnet` ~l.1063, `terminerMiniTutoAtelier`, `terminerTutoriel` ~l.1071)
- Create: `src/context/GameContext.analyticsTuto.test.tsx`

**Interfaces:**
- Consumes: `logEvenement`, `EVENEMENTS` (tâches 2-3).
- Produces: les événements `tuto_etape { etape }`, `tuto_termine`, `mini_tuto_termine { lequel }`.

**Méthode :** chaque action de `GameContext` gagne **un seul appel** `logEvenement(...)`, placé après la mise à jour d'état et **jamais** dans le corps d'un `setState` (React 19 en StrictMode invoque les updaters deux fois — l'événement partirait en double). Ce piège vaut pour les tâches 6, 7 et 8.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/context/GameContext.analyticsTuto.test.tsx`. Prendre pour modèle un test existant de GameContext (`src/context/GameContext.marquerNiveauVu.test.tsx`) pour le montage du provider ; la partie propre à cette tâche :

```tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "@/lib/analytics/analytics";
import { definirLecteurContexte } from "@/lib/analytics/contexte";

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
  definirLecteurContexte(() => ({ jour: 1, niveau: 1 }));
});

afterEach(() => {
  reinitialiserAnalyticsPourTest();
  definirLecteurContexte(null);
});

const noms = () => stub.appels.map((a) => a.nom);

describe("instrumentation du tutoriel", () => {
  it("chaque avancement d'étape émet tuto_etape avec l'étape visée", () => {
    // …monter le provider, appeler avancerTutoriel("<une étape réelle du type
    // TutorielEtape, à lire dans src/types/game.ts:320>")…
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.tutoEtape)).toHaveLength(1);
    expect(stub.appels[0].params.etape).toBe("<la même étape>");
  });

  it("émet tuto_etape une seule fois par avancement, malgré StrictMode", () => {
    // …appeler avancerTutoriel une fois…
    expect(noms().filter((n) => n === EVENEMENTS.tutoEtape)).toHaveLength(1);
  });

  it("terminerTutoriel émet tuto_termine", () => {
    // …appeler terminerTutoriel()…
    expect(noms()).toContain(EVENEMENTS.tutoTermine);
  });

  it("chaque mini-tuto émet mini_tuto_termine avec son identifiant", () => {
    // …appeler les trois terminerMiniTuto*()…
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.miniTutoTermine).map((a) => a.params.lequel),
    ).toEqual(["vinyle", "carnet", "atelier"]);
  });
});
```

> Les `…` sont à remplacer par le montage réel du provider, copié d'un test GameContext existant. **Ne pas laisser de commentaire non résolu dans le fichier final.**

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/context/GameContext.analyticsTuto.test.tsx`
Expected: FAIL — aucun événement enregistré.

- [ ] **Step 3 : Instrumenter les cinq actions**

Dans `src/context/GameContext.tsx`, ajouter l'import :

```tsx
import { logEvenement } from "@/lib/analytics/contexte";
import { EVENEMENTS } from "@/lib/analytics/analytics";
```

Puis, dans `avancerTutoriel`, **après** l'appel de mise à jour d'état et hors de tout updater :

```tsx
    logEvenement(EVENEMENTS.tutoEtape, { etape: vers });
```

Dans `terminerTutoriel` :

```tsx
    logEvenement(EVENEMENTS.tutoTermine);
```

Dans `terminerMiniTutoVinyle`, `terminerMiniTutoCarnet`, `terminerMiniTutoAtelier` respectivement :

```tsx
    logEvenement(EVENEMENTS.miniTutoTermine, { lequel: "vinyle" });
    logEvenement(EVENEMENTS.miniTutoTermine, { lequel: "carnet" });
    logEvenement(EVENEMENTS.miniTutoTermine, { lequel: "atelier" });
```

- [ ] **Step 4 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/context/`
Expected: PASS, y compris les tests GameContext existants.

- [ ] **Step 5 : Commit**

```bash
git add src/context/GameContext.tsx src/context/GameContext.analyticsTuto.test.tsx
git commit -m "feat(analytics): l'entonnoir du tutoriel"
```

---

### Task 7 : Instrumentation de la progression et de l'économie

**Files:**
- Modify: `src/context/GameContext.tsx` (`avancerJour` ~l.785, `ameliorerAtelier` ~l.894, `ameliorerStockage` ~l.919, `acheterCamion` ~l.1166, `enregistrerSession` ~l.1292, `debloquerCompetence` ~l.1334, `acheterAuBazar`)
- Create: `src/context/GameContext.analyticsJeu.test.tsx`

**Interfaces:**
- Consumes: `logEvenement`, `EVENEMENTS`.
- Produces: `jour_atteint { jour }`, `niveau_atteint { niveau }`, `competence_debloquee { competence_id }`, `session_vente_terminee { objets_vendus, recette, marge }`, `amelioration_achetee { quoi, niveau }`, `bazar_achat { article, prix_jetons }`.

**Le point délicat — `jour_atteint` :** il ne doit partir **que** sur un nouveau record de jour, pas à chaque `avancerJour`. `jourActuel` étant strictement croissant dans une partie, « nouveau record » se lit simplement : le jour après avancement est strictement supérieur au jour avant. Charger une sauvegarde ne passe pas par `avancerJour` et n'émet donc rien : c'est voulu.

**`niveau_atteint` :** ne pas l'accrocher à `gagnerXPBrocanteur` (l'XP monte sans forcément changer de niveau). L'accrocher à la transition de `state.brocanteur.niveau`, via un `useEffect` comparant à une ref — un seul endroit, quelle que soit la source d'XP.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/context/GameContext.analyticsJeu.test.tsx`, même préambule (stub + lecteur de contexte) que la tâche 6, et les cas suivants :

```tsx
describe("instrumentation du jeu", () => {
  it("avancerJour émet jour_atteint avec le nouveau jour", () => {
    // …avancerJour(1) depuis le jour 1…
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.jourAtteint)).toEqual([
      { nom: "jour_atteint", params: expect.objectContaining({ jour: 2 }) },
    ]);
  });

  it("avancerJour(3) n'émet qu'UN jour_atteint, sur le jour d'arrivée", () => {
    // …avancerJour(3) depuis le jour 1…
    const emis = stub.appels.filter((a) => a.nom === EVENEMENTS.jourAtteint);
    expect(emis).toHaveLength(1);
    expect(emis[0].params.jour).toBe(4);
  });

  it("une montée de niveau émet niveau_atteint une seule fois", () => {
    // …gagnerXPBrocanteur(assez pour passer au niveau 2)…
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.niveauAtteint)).toEqual([
      { nom: "niveau_atteint", params: expect.objectContaining({ niveau: 2 }) },
    ]);
  });

  it("un gain d'XP sans changement de niveau n'émet rien", () => {
    // …gagnerXPBrocanteur(1)…
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.niveauAtteint)).toHaveLength(0);
  });

  it("debloquerCompetence n'émet QUE si le déblocage a réussi", () => {
    // …tenter un déblocage impossible (points insuffisants), puis un possible…
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.competenceDebloquee),
    ).toHaveLength(1);
  });

  it("enregistrerSession émet session_vente_terminee avec objets, recette et marge", () => {
    // …enregistrerSession(<une Session réelle, cf. src/types/game.ts>)…
    const e = stub.appels.find((a) => a.nom === EVENEMENTS.sessionVenteTerminee);
    expect(e?.params).toMatchObject({
      objets_vendus: expect.any(Number),
      recette: expect.any(Number),
      marge: expect.any(Number),
    });
  });

  it("les améliorations émettent amelioration_achetee avec leur cible", () => {
    // …ameliorerAtelier(), ameliorerStockage(), acheterCamion(2)…
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.ameliorationAchetee).map((a) => a.params.quoi),
    ).toEqual(["atelier", "stockage", "camion"]);
  });

  it("acheterAuBazar émet bazar_achat quand l'achat réussit", () => {
    // …acheterAuBazar(<un AchatBazar réel>) avec assez de jetons…
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.bazarAchat)).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/context/GameContext.analyticsJeu.test.tsx`
Expected: FAIL.

- [ ] **Step 3 : Instrumenter**

`avancerJour` — capturer le jour avant, émettre après :

```tsx
    // Un seul événement par appel, sur le jour d'arrivée : `avancerJour(3)`
    // est un saut, pas trois journées vécues.
    logEvenement(EVENEMENTS.jourAtteint, { jour: jourAvant + nbJours });
```

`niveau_atteint` — un `useEffect` unique, placé près des autres effets du provider :

```tsx
  // La montée de niveau se lit sur la transition d'état, pas sur la source
  // d'XP : il y a huit sources, et seule la transition compte.
  const niveauPrecedentRef = useRef<number | null>(null);
  useEffect(() => {
    const niveau = state?.brocanteur?.niveau;
    if (typeof niveau !== "number") return;
    const precedent = niveauPrecedentRef.current;
    niveauPrecedentRef.current = niveau;
    // Premier rendu (ou chargement de save) : on mémorise sans rien émettre.
    if (precedent === null) return;
    if (niveau > precedent) logEvenement(EVENEMENTS.niveauAtteint, { niveau });
  }, [state?.brocanteur?.niveau]);
```

`debloquerCompetence` — uniquement dans la branche de succès, avant le `return { ok: true }` :

```tsx
    logEvenement(EVENEMENTS.competenceDebloquee, { competence_id: id });
```

`enregistrerSession` — après la mise à jour d'état :

```tsx
    logEvenement(EVENEMENTS.sessionVenteTerminee, {
      objets_vendus: <le nombre d'objets vendus de la Session>,
      recette: Math.round(<la recette de la Session>),
      marge: Math.round(<recette − coût d'achat des objets vendus>),
    });
```

> Lire la forme exacte du type `Session` dans `src/types/game.ts` et utiliser ses champs réels. Arrondir : Firebase n'a pas besoin des centimes, et les entiers se lisent mieux en rapport.

`ameliorerAtelier` / `ameliorerStockage` / `acheterCamion` — dans la branche de succès de chacune :

```tsx
    logEvenement(EVENEMENTS.ameliorationAchetee, { quoi: "atelier", niveau: <nouveau niveau> });
    logEvenement(EVENEMENTS.ameliorationAchetee, { quoi: "stockage", niveau: <nouveau niveau> });
    logEvenement(EVENEMENTS.ameliorationAchetee, { quoi: "camion", niveau });
```

`acheterAuBazar` — dans la branche de succès :

```tsx
    logEvenement(EVENEMENTS.bazarAchat, {
      article: <l'identifiant d'article de l'AchatBazar>,
      prix_jetons: <le prix en jetons>,
    });
```

- [ ] **Step 4 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/context/`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/context/GameContext.tsx src/context/GameContext.analyticsJeu.test.tsx
git commit -m "feat(analytics): la progression et l'économie"
```

---

### Task 8 : Instrumentation de la monétisation

**Files:**
- Modify: `src/lib/ads/adMobProvider.ts` (`showRewardedAd`)
- Modify: `src/lib/ads/adProvider.ts` (`StubAdProvider.showRewardedAd`)
- Modify: `src/context/GameContext.tsx` (`consommerEnergie` ~l.407)
- Modify: l'écran d'achat de l'IAP énergie infinie (le localiser par `grep -rn "iap" src/components src/app --include="*.tsx" -l`)
- Create: `src/lib/ads/analyticsPub.test.ts`
- Create: `src/context/GameContext.analyticsMonetisation.test.tsx`

**Interfaces:**
- Consumes: `logEvenement`, `EVENEMENTS` ; `EmplacementPub` de `@/lib/ads/adProvider`.
- Produces: `pub_demandee { emplacement }`, `pub_terminee { emplacement, rewarded }`, `energie_epuisee`, `iap_ecran_vu { source }`.

**Où placer les événements de pub :** dans **les deux** providers (`AdMobAdProvider` et `StubAdProvider`), pas dans les écrans appelants — il y a trois appelants et il y en aura d'autres. Instrumenter les providers garantit qu'aucun emplacement futur ne sera oublié.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/ads/analyticsPub.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StubAdProvider, EMPLACEMENTS_PUB } from "./adProvider";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "@/lib/analytics/analytics";
import { definirLecteurContexte } from "@/lib/analytics/contexte";

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
  definirLecteurContexte(() => ({ jour: 5, niveau: 3 }));
});

afterEach(() => {
  reinitialiserAnalyticsPourTest();
  definirLecteurContexte(null);
});

describe("mesure des pubs récompensées", () => {
  it("émet pub_demandee puis pub_terminee, dans cet ordre, avec l'emplacement", async () => {
    await new StubAdProvider(0).showRewardedAd(EMPLACEMENTS_PUB.boiteMystere);
    expect(stub.appels.map((a) => a.nom)).toEqual([
      EVENEMENTS.pubDemandee,
      EVENEMENTS.pubTerminee,
    ]);
    expect(stub.appels[0].params.emplacement).toBe("boite-mystere");
    expect(stub.appels[1].params).toMatchObject({
      emplacement: "boite-mystere",
      rewarded: true,
    });
  });

  it("porte le contexte de jeu sur les deux événements", async () => {
    await new StubAdProvider(0).showRewardedAd(EMPLACEMENTS_PUB.energie);
    for (const appel of stub.appels) {
      expect(appel.params).toMatchObject({ jour: 5, jour_tranche: "1-7", niveau: 3 });
    }
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/ads/analyticsPub.test.ts`
Expected: FAIL — `stub.appels` est vide.

- [ ] **Step 3 : Instrumenter les deux providers de pub**

Dans `src/lib/ads/adProvider.ts`, `StubAdProvider.showRewardedAd` :

```ts
  async showRewardedAd(emplacement: EmplacementPub): Promise<AdResult> {
    logEvenement(EVENEMENTS.pubDemandee, { emplacement });
    await new Promise((r) => setTimeout(r, this.delaiMs));
    logEvenement(EVENEMENTS.pubTerminee, { emplacement, rewarded: true });
    return { rewarded: true };
  }
```

Dans `src/lib/ads/adMobProvider.ts`, `AdMobAdProvider.showRewardedAd` — `pub_demandee` avant l'appel natif, `pub_terminee` dans un `finally`-équivalent qui distingue l'échec :

```ts
  async showRewardedAd(emplacement: EmplacementPub): Promise<AdResult> {
    logEvenement(EVENEMENTS.pubDemandee, { emplacement });
    await this.initialiser();
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      const res = await invoke<{ rewarded: boolean }>("plugin:admob|show_rewarded_ad", {
        emplacement,
      });
      const rewarded = res.rewarded === true;
      logEvenement(EVENEMENTS.pubTerminee, { emplacement, rewarded });
      return { rewarded };
    } catch (e) {
      // Échec technique (pas d'inventaire, hors-ligne) : `rewarded: false`
      // distingue « pub non aboutie » de « joueur qui ferme avant la fin »
      // uniquement au croisement avec la console AdMob. On mesure les deux
      // pareil ici, et on relance : l'UI doit toujours voir l'erreur.
      logEvenement(EVENEMENTS.pubTerminee, { emplacement, rewarded: false });
      throw e;
    }
  }
```

- [ ] **Step 4 : Instrumenter `energie_epuisee` et `iap_ecran_vu`**

Dans `GameContext.consommerEnergie`, émettre **au passage à zéro seulement** (pas à chaque consommation quand l'énergie est déjà à zéro) :

```tsx
    // Le moment qui déclenche à la fois la pub et l'IAP : mesuré une fois, à
    // la transition vers 0, jamais tant que l'énergie y reste.
    if (energieAvant > 0 && energieApres === 0) logEvenement(EVENEMENTS.energieEpuisee);
```

Dans le composant de l'écran d'achat de l'IAP, un effet au montage :

```tsx
  useEffect(() => {
    logEvenement(EVENEMENTS.iapEcranVu, { source: <l'origine d'ouverture, ex. "machine-energie"> });
  }, []);
```

> Si l'écran d'achat ne connaît pas son origine, passer `source: "inconnu"` plutôt qu'omettre le paramètre : une dimension toujours présente se lit mieux qu'une dimension parfois absente.

- [ ] **Step 5 : Écrire `src/context/GameContext.analyticsMonetisation.test.tsx`**

Même préambule que les tâches 6-7, avec :

```tsx
it("energie_epuisee n'est émis qu'à la transition vers zéro", () => {
  // …consommer toute l'énergie en deux appels, puis retenter à zéro…
  expect(stub.appels.filter((a) => a.nom === EVENEMENTS.energieEpuisee)).toHaveLength(1);
});
```

- [ ] **Step 6 : Lancer la suite complète**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS. Attention aux tests existants `src/lib/ads/emplacementsAppeles.test.ts` et `adMobProvider.test.ts` — s'ils comptent des appels, les ajuster.

- [ ] **Step 7 : Lint et commit**

```bash
npx eslint src
git add src/lib/ads src/context src/components
git commit -m "feat(analytics): la monétisation, pubs et écran d'achat"
```

---

### Task 9 : La politique de confidentialité, en quatre langues

**Files:**
- Modify: `src/app/privacy/page.tsx`

**Interfaces:**
- Consumes: rien.
- Produces: rien de programmatique. C'est un préalable **bloquant** à la soumission.

**Contenu à couvrir**, dans les quatre versions linguistiques (FR, EN, ES, EL), en suivant exactement la structure et le ton des sections existantes (`4. Publicités` est le modèle le plus proche) :

- ce qui est collecté : événements de jeu (progression, écrans consultés, pubs regardées), identifiant d'installation attribué par Firebase, modèle d'appareil, version du système, pays ;
- ce qui **n'est pas** collecté : ni nom, ni adresse e-mail, ni compte, ni contenu de la sauvegarde ;
- par qui : Google, via Firebase Analytics, avec le lien vers la politique de confidentialité de Google déjà présent en section 4 ;
- pourquoi : comprendre comment le jeu est joué pour l'améliorer ;
- le consentement : la collecte est **conditionnée** au formulaire présenté au premier lancement, et refuser n'ôte rien au jeu ;
- la durée de conservation : 14 mois.

Mettre aussi à jour la phrase d'introduction de la section 1 (« ne collecte directement aucune donnée personnelle »), qui devient inexacte telle quelle.

- [ ] **Step 1 : Rédiger la section française**

Insérer une nouvelle section après « 4. Publicités », renuméroter les suivantes.

- [ ] **Step 2 : Décliner en anglais, espagnol et grec**

Reprendre la structure à l'identique. Le grec est la langue la plus souvent oubliée dans ce projet : vérifier qu'elle est bien traitée.

- [ ] **Step 3 : Vérifier le rendu**

Run: `npx vitest run --maxWorkers=4 && npx eslint src`
Expected: PASS.

- [ ] **Step 4 : Commit**

```bash
git add src/app/privacy/page.tsx
git commit -m "docs(privacy): la mesure d'audience dans les quatre langues"
```

---

### Task 10 : Recette sur appareil et PR

**Files:** aucun (sauf correctifs issus de la recette).

**Prérequis côté console, à confirmer avec Guillaume avant de commencer** — les deux premiers ne sont **pas rétroactifs** :

- [ ] Export BigQuery activé
- [ ] Conservation des données passée à 14 mois
- [ ] Compte AdMob lié au projet Firebase

- [ ] **Step 1 : Construire et installer sur appareil**

```bash
npm run build
npm run tauri ios dev "iPhone 16 Pro"
```

Pour DebugView, ajouter l'argument de lancement `-FIRDebugEnabled` dans le schéma Xcode (Product → Scheme → Edit Scheme → Run → Arguments). **Ne jamais le laisser dans une build de production.**

- [ ] **Step 2 : Dérouler les huit points de recette**

Ouvrir la console Firebase → Analytics → DebugView, puis :

1. **Refus UMP → zéro événement.** Réinstaller l'app, refuser le formulaire : DebugView doit rester **vide**. C'est le point critique — s'il échoue, tout s'arrête.
2. **Acceptation → `first_open`** apparaît.
3. **Révocation.** Accepter, puis révoquer, relancer : la collecte doit s'arrêter (preuve que le verdict est réappliqué au boot).
4. **Entonnoir du tutoriel** : dérouler les premières étapes, voir `tuto_etape` s'enchaîner avec les bons identifiants.
5. **Une pub** : `pub_demandee` puis `pub_terminee` avec le bon `emplacement`.
6. **Le jour** : sur une partie avancée, vérifier `jour` et `jour_tranche` sur chaque événement.
7. **`screen_view`** : naviguer entre les pièces, vérifier les noms d'écran (et qu'aucun identifiant de brocante n'apparaît).
8. **Aucune régression AdMob** : la pub récompensée fonctionne toujours, l'ordre UMP → ATT est intact.
9. **Aucun `screen_view` automatique concurrent** : vérifier dans DebugView qu'il n'y a pas un second flux de `screen_view` issu du suivi automatique Firebase, et que `firebase_screen_class` ne s'est pas figé sur le nom du contrôleur natif sur les autres événements — confirme que `FirebaseAutomaticScreenReportingEnabled: false` (Task 4) est bien pris en compte.

- [ ] **Step 3 : Retirer `-FIRDebugEnabled` du schéma**

- [ ] **Step 4 : Ouvrir la PR**

```bash
git push -u origin feat/firebase-analytics
```

Puis ouvrir la PR **vers `main`** à la main (pas de `gh` sur ce poste) avec, dans la description : le lien vers la spec, la liste des huit points de recette cochés, et le rappel des actions de console encore à faire (déclarer `jour` et `niveau` en métriques, `jour_tranche` en dimension — ce qui n'est possible qu'une fois les événements réellement reçus).

---

## Auto-relecture

**Couverture de la spec :** §1.1 → tâche 1 ; §1.2 et §2 → tâche 4 ; §1.3 → tâche 4 (step 4) ; §1.4 → tâches 2, 3, 5 ; §3.3 → tâche 5 ; §3.4 → tâches 6, 7, 8 ; §3.5 → tâche 3 ; §4 → tests de chaque tâche ; §5 → tâche 10 ; §6 → tâche 9 ; §7 → prérequis de la tâche 10 ; §8 → le découpage lui-même.

**Deux écarts assumés par rapport à la spec, tous deux justifiés dans la tâche concernée :**
1. `FirebaseBootstrap` porte trois effets et non un seul (tâche 5) — les trois exigent les mêmes hooks.
2. Les propriétés utilisateur du §3.6 (`tuto_termine`, `acheteur_iap`, `langue`, `niveau_tranche`) sont **déclarées** dans le catalogue (tâche 2) mais **jamais posées** : aucune tâche ne les émet. C'est délibéré — les quatre se recalculent depuis les événements et depuis BigQuery, et poser une propriété utilisateur demande un point d'appel fiable qu'on n'a pas encore éprouvé. À rouvrir après la première semaine de données réelles, quand on saura lesquelles manquent vraiment.

**Zones où l'implémenteur devra lire le code avant d'écrire** (signalées en clair dans les steps, pas des trous laissés au hasard) : les cas de l'énumération `JSValue` (tâche 1), les champs réels du type `Session` et d'`AchatBazar` (tâche 7), le montage du provider dans les tests GameContext (tâches 6-8), et l'origine d'ouverture de l'écran IAP (tâche 8).
