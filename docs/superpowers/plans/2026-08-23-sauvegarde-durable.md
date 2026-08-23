# Sauvegarde durable et observable — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire vivre la sauvegarde dans un fichier écrit atomiquement dont l'échec
remonte jusqu'au joueur, au lieu d'un `localStorage` WKWebView dont l'application ne
peut pas observer la durabilité.

**Architecture :** Un plugin Tauri vendored expose lecture/écriture de fichiers
(Rust pur, iOS + Android), l'espace disque et le partage (Swift, iOS). Un
`fichierGameRepository` compose ce fichier — source de vérité — avec le
`localGameRepository` existant conservé en miroir de secours, l'arbitrage entre les
deux se faisant par numéro de révision. `GameContext` transforme l'échec de
sauvegarde en une alerte qui escalade avec le temps.

**Tech Stack :** Rust (Tauri 2), Swift (pont iOS), TypeScript / Next.js / React,
Vitest.

**Spec :** `docs/superpowers/specs/2026-08-23-sauvegarde-durable-design.md`

## Global Constraints

- **Tests :** toujours `npx vitest run --maxWorkers=4 <chemin>`. Sans ce drapeau,
  ce Mac Intel produit ~41 faux échecs par famine de workers.
- **Espionner localStorage :** uniquement `vi.spyOn(Storage.prototype, …)`.
  Réassigner `window.localStorage.setItem` ne remplace rien (le proxy `Storage` en
  fait une entrée stockée) et donne un test creux qui reste vert.
- **Lint :** `npx eslint src` (le script `npm run lint` a déjà été cassé par Next 16
  par le passé).
- **Le miroir localStorage n'est JAMAIS supprimé.** Aucune tâche de ce plan ne doit
  introduire un `removeItem` sur une clé `projet-broc:slot:N:v1`.
- **Toute migration est un no-op total en cas d'échec :** rien n'est détruit, on
  retente au lancement suivant.
- **i18n :** toute chaîne visible existe dans les quatre langues,
  `src/lib/i18n/ui/{fr,en,es,el}.ts`. Jamais de chaîne localisée en sauvegarde.
- **Nommage :** commandes du plugin en français (convention `tauri-plugin-iap`),
  code TS en français comme le reste du dépôt.
- **Seuil disque :** `SEUIL_ESPACE_LIBRE_OCTETS = 50 * 1024 * 1024`, constante
  nommée, jamais un littéral en ligne.

## Structure des fichiers

**Créés — Rust / Swift**

| Fichier | Responsabilité |
|---|---|
| `src-tauri/vendor/tauri-plugin-stockage/Cargo.toml` | Manifeste du plugin |
| `…/build.rs` | Déclaration des commandes pour la génération des permissions |
| `…/src/lib.rs` | Point d'entrée, `init()`, trait d'extension |
| `…/src/models.rs` | `Quoi` (énuméré de cible) et types d'entrée/sortie |
| `…/src/error.rs` | `Error` sérialisée en objet discriminé |
| `…/src/commands.rs` | Les quatre commandes exposées |
| `…/src/fichiers.rs` | Écriture atomique et lecture — **le cœur, testable en Rust** |
| `…/src/desktop.rs`, `…/src/mobile.rs` | Aiguillage par plateforme |
| `…/ios/Sources/StockagePlugin.swift` | Espace libre + feuille de partage |
| `…/permissions/default.toml` | Permissions par défaut |

**Créés — TypeScript**

| Fichier | Responsabilité |
|---|---|
| `src/lib/storage/pontNatif.ts` | Appels `invoke` typés + dégradation hors Tauri |
| `src/lib/storage/fichierGameRepository.ts` | Le repository composite |
| `src/lib/storage/migrationFichiers.ts` | Migration localStorage → fichiers |
| `src/components/mobile/BandeauSauvegarde.tsx` | Bandeau persistant + modale |

**Modifiés**

| Fichier | Changement |
|---|---|
| `src-tauri/src/lib.rs:8` | Enregistrer le plugin |
| `src/lib/storage/gameRepository.ts` | `save` renvoie `ResultatSave` |
| `src/lib/storage/localGameRepository.ts` | Nouveau contrat, fin du double-buffer |
| `src/lib/storage/memoryGameRepository.ts` | Nouveau contrat |
| `src/lib/storage/createGameRepository.ts` | Choisir le composite sous Tauri |
| `src/lib/storage/slots.ts:16` | `MetaSlot.revision` |
| `src/context/GameContext.tsx:366` | Machine à états de l'escalade |
| `src/app/layout.tsx:88` | Monter `BandeauSauvegarde` |
| `src/components/mobile/PartiesModal.tsx` | Icône d'export par ligne |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | Nouvelles clés |

---

### Task 1 : le cœur Rust — écriture atomique et cible sûre

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-stockage/Cargo.toml`
- Create: `src-tauri/vendor/tauri-plugin-stockage/src/models.rs`
- Create: `src-tauri/vendor/tauri-plugin-stockage/src/error.rs`
- Create: `src-tauri/vendor/tauri-plugin-stockage/src/fichiers.rs`
- Test: dans `fichiers.rs` et `models.rs` (`#[cfg(test)] mod tests`)

**Interfaces:**
- Consomme : rien.
- Produit : `Quoi::{Index,Slot1,Slot2,Slot3}` avec `nom_fichier() -> &'static str` ;
  `Error::{DisquePlein,Io,Indisponible}` sérialisée `{genre, message}` ;
  `fichiers::ecrire_atomique(&Path, &str, &str) -> Result<()>` ;
  `fichiers::lire(&Path, &str) -> Result<Option<String>>`.

- [ ] **Step 1 : créer le manifeste**

Copier la structure de `src-tauri/vendor/tauri-plugin-firebase/Cargo.toml` en
remplaçant le nom par `tauri-plugin-stockage`, et garder les mêmes versions de
`tauri`, `serde`, `thiserror` que ce voisin (ne pas introduire de version
différente).

- [ ] **Step 2 : écrire le test qui échoue — la cible ne peut pas s'échapper du répertoire**

Dans `src/models.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aucune_cible_ne_peut_sortir_du_repertoire() {
        for q in [Quoi::Index, Quoi::Slot1, Quoi::Slot2, Quoi::Slot3] {
            let n = q.nom_fichier();
            assert!(!n.contains('/'), "{n} contient un séparateur");
            assert!(!n.contains('\\'), "{n} contient un séparateur");
            assert!(!n.contains(".."), "{n} permet de remonter");
        }
    }
}
```

- [ ] **Step 3 : lancer le test, vérifier qu'il échoue**

Run: `cd src-tauri/vendor/tauri-plugin-stockage && cargo test`
Expected: FAIL — `cannot find type Quoi`.

- [ ] **Step 4 : implémenter `models.rs`**

Les `rename` sont **explicites** à dessein : `rename_all = "snake_case"` produirait
`slot1` et non `slot_1`, une ambiguïté qui se paierait côté TypeScript.

```rust
use serde::{Deserialize, Serialize};

/// Cible d'une lecture/écriture. Volontairement un énuméré et non un chemin :
/// une commande Tauri est appelable depuis n'importe quel JS de la webview, et
/// une chaîne libre ouvrirait une traversée de répertoire sur le conteneur.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Quoi {
    #[serde(rename = "index")]
    Index,
    #[serde(rename = "slot_1")]
    Slot1,
    #[serde(rename = "slot_2")]
    Slot2,
    #[serde(rename = "slot_3")]
    Slot3,
}

impl Quoi {
    pub fn nom_fichier(self) -> &'static str {
        match self {
            Quoi::Index => "slots.json",
            Quoi::Slot1 => "slot-1.json",
            Quoi::Slot2 => "slot-2.json",
            Quoi::Slot3 => "slot-3.json",
        }
    }
}
```

- [ ] **Step 5 : lancer le test, vérifier qu'il passe**

Run: `cd src-tauri/vendor/tauri-plugin-stockage && cargo test`
Expected: PASS.

- [ ] **Step 6 : écrire `error.rs`**

`ENOSPC` vaut 28 sur Darwin comme sur Linux, donc la même constante couvre iOS et
Android. On ne se sert pas de `io::ErrorKind::StorageFull`, qui n'est pas
stabilisé.

```rust
use serde::{ser::SerializeStruct, Serialize, Serializer};

pub type Result<T> = std::result::Result<T, Error>;

const ENOSPC: i32 = 28;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Disque plein")]
    DisquePlein,
    #[error("{0}")]
    Io(String),
    #[error("Indisponible sur cette plateforme")]
    Indisponible,
}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        if e.raw_os_error() == Some(ENOSPC) {
            Error::DisquePlein
        } else {
            Error::Io(e.to_string())
        }
    }
}

/// Sérialisée en objet discriminé — et non en chaîne comme `tauri-plugin-iap` —
/// parce que la couche TS doit brancher sur la cause, et que matcher un message
/// texte serait fragile en quatre langues.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        let genre = match self {
            Error::DisquePlein => "disque_plein",
            Error::Io(_) => "io",
            Error::Indisponible => "indisponible",
        };
        let mut st = s.serialize_struct("Error", 2)?;
        st.serialize_field("genre", genre)?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}
```

- [ ] **Step 7 : écrire les tests qui échouent pour `fichiers.rs`**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn repertoire_neuf(cas: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("broc-stockage-{cas}"));
        let _ = fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn ce_qui_est_ecrit_se_relit() {
        let d = repertoire_neuf("relecture");
        ecrire_atomique(&d, "slot-1.json", "{\"jour\":34}").unwrap();
        assert_eq!(
            lire(&d, "slot-1.json").unwrap(),
            Some("{\"jour\":34}".to_string())
        );
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn un_fichier_absent_rend_none_et_non_une_erreur() {
        let d = repertoire_neuf("absent");
        fs::create_dir_all(&d).unwrap();
        assert_eq!(lire(&d, "slot-2.json").unwrap(), None);
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn l_ecriture_ne_laisse_aucun_tmp_derriere_elle() {
        let d = repertoire_neuf("sans-tmp");
        ecrire_atomique(&d, "slot-1.json", "a").unwrap();
        assert!(!d.join("slot-1.json.tmp").exists());
        fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn une_seconde_ecriture_remplace_la_premiere() {
        let d = repertoire_neuf("remplacement");
        ecrire_atomique(&d, "slot-1.json", "ancien").unwrap();
        ecrire_atomique(&d, "slot-1.json", "nouveau").unwrap();
        assert_eq!(lire(&d, "slot-1.json").unwrap(), Some("nouveau".to_string()));
        fs::remove_dir_all(&d).unwrap();
    }
}
```

- [ ] **Step 8 : lancer les tests, vérifier qu'ils échouent**

Run: `cd src-tauri/vendor/tauri-plugin-stockage && cargo test`
Expected: FAIL — `cannot find function ecrire_atomique`.

- [ ] **Step 9 : implémenter `fichiers.rs`**

```rust
use crate::error::Result;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

/// Écrit `contenu` dans `repertoire/nom` sans jamais laisser le fichier cible
/// à moitié écrit : tmp → sync_all → rename → fsync du répertoire.
pub fn ecrire_atomique(repertoire: &Path, nom: &str, contenu: &str) -> Result<()> {
    fs::create_dir_all(repertoire)?;
    let cible = repertoire.join(nom);
    let tmp = repertoire.join(format!("{nom}.tmp"));

    {
        let mut f = File::create(&tmp)?;
        f.write_all(contenu.as_bytes())?;
        // C'EST ICI que ENOSPC remonte : write_all est tamponné et peut réussir
        // alors que le disque est plein. sync_all force l'écriture réelle.
        f.sync_all()?;
    }

    fs::rename(&tmp, &cible)?;

    // Le renommage lui-même doit survivre à un kill : on synchronise le
    // répertoire. Best-effort — un échec ici ne compromet pas le contenu.
    if let Ok(d) = File::open(repertoire) {
        let _ = d.sync_all();
    }

    Ok(())
}

/// Rend `None` pour un fichier absent — un slot vide n'est pas une erreur.
pub fn lire(repertoire: &Path, nom: &str) -> Result<Option<String>> {
    match fs::read_to_string(repertoire.join(nom)) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}
```

- [ ] **Step 10 : lancer les tests, vérifier qu'ils passent**

Run: `cd src-tauri/vendor/tauri-plugin-stockage && cargo test`
Expected: PASS, 5 tests.

- [ ] **Step 11 : commit**

```bash
git add src-tauri/vendor/tauri-plugin-stockage
git commit -m "feat(stockage): écriture atomique et cible sûre côté Rust"
```

---

### Task 2 : brancher le plugin et le pont TypeScript

Au bout de cette tâche, le JavaScript sait écrire et relire un fichier sur
l'appareil. `espace_libre` et `partager_fichier` existent mais sont des souches —
leur Swift arrive aux tâches 10 et 11.

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-stockage/src/{lib.rs,commands.rs}`
- Create: `src-tauri/vendor/tauri-plugin-stockage/{build.rs,permissions/default.toml}`
- Modify: `src-tauri/Cargo.toml` (bloc des dépendances, à côté de la ligne 30)
- Modify: `src-tauri/src/lib.rs:8` (enregistrement)
- Create: `src/lib/storage/pontNatif.ts`
- Modify: `src/lib/plateforme.ts` (ajout de `tauriDisponible`)
- Test: `src/lib/storage/pontNatif.test.ts`

**Interfaces:**
- Consomme : `Quoi`, `Error`, `fichiers::*` (tâche 1).
- Produit, côté TS :
  `type Quoi = "index" | "slot_1" | "slot_2" | "slot_3"` ;
  `type GenreErreur = "disque_plein" | "io" | "indisponible"` ;
  `interface ErreurStockage { genre: GenreErreur; message: string }` ;
  `lireSave(quoi): Promise<string | null>` ;
  `ecrireSave(quoi, contenu): Promise<void>` (rejette avec `ErreurStockage`) ;
  `espaceLibre(): Promise<number | null>` ;
  `partagerFichier(quoi, nomLisible): Promise<void>` ;
  `quoiDuSlot(n: NumeroSlot): Quoi`.

- [ ] **Step 1 : écrire `commands.rs`**

```rust
use crate::error::{Error, Result};
use crate::fichiers;
use crate::models::Quoi;
use tauri::{command, AppHandle, Manager, Runtime};

fn repertoire<R: Runtime>(app: &AppHandle<R>) -> Result<std::path::PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))
}

#[command]
pub(crate) async fn lire_save<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
) -> Result<Option<String>> {
    fichiers::lire(&repertoire(&app)?, quoi.nom_fichier())
}

#[command]
pub(crate) async fn ecrire_save<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
    contenu: String,
) -> Result<()> {
    fichiers::ecrire_atomique(&repertoire(&app)?, quoi.nom_fichier(), &contenu)
}

// Souches : le Swift arrive aux tâches 10 et 11. `None` signifie « je ne sais
// pas », jamais un chiffre faux — un statvfs sous-estimerait l'espace en
// ignorant la place purgeable, et déclencherait l'avertissement à tort.
#[command]
pub(crate) async fn espace_libre<R: Runtime>(_app: AppHandle<R>) -> Result<Option<u64>> {
    Ok(None)
}

#[command]
pub(crate) async fn partager_fichier<R: Runtime>(
    _app: AppHandle<R>,
    _quoi: Quoi,
    _nom_lisible: String,
) -> Result<()> {
    Err(Error::Indisponible)
}
```

- [ ] **Step 2 : écrire `lib.rs`, `build.rs` et les permissions**

`lib.rs` déclare les modules et l'`init()` avec `generate_handler!` sur les quatre
commandes. `build.rs` et `permissions/default.toml` se calquent sur
`src-tauri/vendor/tauri-plugin-firebase/` en remplaçant la liste de commandes :

```toml
[default]
description = "Permissions par défaut du plugin Stockage : lecture et écriture des sauvegardes, espace disque, partage de fichier."
permissions = ["allow-lire-save", "allow-ecrire-save", "allow-espace-libre", "allow-partager-fichier"]
```

- [ ] **Step 3 : enregistrer le plugin**

Dans `src-tauri/Cargo.toml`, à la suite de la ligne 30 :

```toml
tauri-plugin-stockage = { path = "vendor/tauri-plugin-stockage" }
```

Dans `src-tauri/src/lib.rs`, à la suite de la ligne 8 :

```rust
.plugin(tauri_plugin_stockage::init())
```

- [ ] **Step 4 : vérifier que ça compile**

Run: `cd src-tauri && cargo check`
Expected: succès, sans avertissement nouveau.

- [ ] **Step 5 : ajouter `tauriDisponible` à `plateforme.ts`**

`tauriIosDisponible()` ne convient pas : il exclut Android, où lecture et écriture
fonctionnent pourtant. On ajoute à côté, sans toucher à l'existant.

```ts
/** Vrai sous n'importe quel runtime Tauri (iOS, Android, bureau). */
export function tauriDisponible(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}
```

- [ ] **Step 6 : écrire les tests qui échouent pour le pont**

`src/lib/storage/pontNatif.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

describe("pontNatif", () => {
  beforeEach(() => {
    invoke.mockReset();
    (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
  });

  it("traduit le numéro de slot en cible du plugin", async () => {
    const { quoiDuSlot } = await import("./pontNatif");
    expect(quoiDuSlot(1)).toBe("slot_1");
    expect(quoiDuSlot(3)).toBe("slot_3");
  });

  it("rend null pour un fichier absent", async () => {
    invoke.mockResolvedValue(null);
    const { lireSave } = await import("./pontNatif");
    await expect(lireSave("slot_1")).resolves.toBeNull();
  });

  it("rejette avec une ErreurStockage discriminée quand le disque est plein", async () => {
    invoke.mockRejectedValue({ genre: "disque_plein", message: "Disque plein" });
    const { ecrireSave } = await import("./pontNatif");
    await expect(ecrireSave("slot_1", "{}")).rejects.toMatchObject({
      genre: "disque_plein",
    });
  });

  it("rejette en « indisponible » hors Tauri, sans appeler invoke", async () => {
    (globalThis as { window?: unknown }).window = {};
    const { ecrireSave } = await import("./pontNatif");
    await expect(ecrireSave("slot_1", "{}")).rejects.toMatchObject({
      genre: "indisponible",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("normalise une erreur non conforme en genre io", async () => {
    invoke.mockRejectedValue("boum");
    const { ecrireSave } = await import("./pontNatif");
    await expect(ecrireSave("slot_1", "{}")).rejects.toMatchObject({ genre: "io" });
  });
});
```

- [ ] **Step 7 : lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/pontNatif.test.ts`
Expected: FAIL — module `./pontNatif` introuvable.

- [ ] **Step 8 : implémenter `pontNatif.ts`**

```ts
import { tauriDisponible } from "@/lib/plateforme";
import type { NumeroSlot } from "./slots";

export type Quoi = "index" | "slot_1" | "slot_2" | "slot_3";
export type GenreErreur = "disque_plein" | "io" | "indisponible";

export interface ErreurStockage {
  genre: GenreErreur;
  message: string;
}

export function quoiDuSlot(n: NumeroSlot): Quoi {
  return `slot_${n}` as Quoi;
}

const INDISPONIBLE: ErreurStockage = {
  genre: "indisponible",
  message: "Stockage natif indisponible",
};

/**
 * Le Rust sérialise ses erreurs en `{genre, message}`. Tout ce qui n'a pas cette
 * forme (panique, erreur de transport, plugin absent) est normalisé en `io`
 * plutôt que propagé tel quel : les appelants n'ont qu'un seul contrat à lire.
 */
function normaliser(e: unknown): ErreurStockage {
  if (typeof e === "object" && e !== null && "genre" in e) {
    const g = (e as { genre: unknown }).genre;
    if (g === "disque_plein" || g === "io" || g === "indisponible") {
      return e as ErreurStockage;
    }
  }
  return { genre: "io", message: String(e) };
}

async function appeler<T>(commande: string, args: Record<string, unknown>): Promise<T> {
  if (!tauriDisponible()) throw INDISPONIBLE;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return (await invoke(`plugin:stockage|${commande}`, args)) as T;
  } catch (e) {
    throw normaliser(e);
  }
}

export function lireSave(quoi: Quoi): Promise<string | null> {
  return appeler<string | null>("lire_save", { quoi });
}

export function ecrireSave(quoi: Quoi, contenu: string): Promise<void> {
  return appeler<void>("ecrire_save", { quoi, contenu });
}

export function espaceLibre(): Promise<number | null> {
  return appeler<number | null>("espace_libre", {});
}

export function partagerFichier(quoi: Quoi, nomLisible: string): Promise<void> {
  return appeler<void>("partager_fichier", { quoi, nomLisible });
}
```

- [ ] **Step 9 : lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/pontNatif.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 10 : commit**

```bash
git add src-tauri src/lib/storage/pontNatif.ts src/lib/storage/pontNatif.test.ts src/lib/plateforme.ts
git commit -m "feat(stockage): plugin branché et pont TypeScript typé"
```

---

### Task 3 : le contrat `save` devient une cause, pas un booléen

Tâche purement TypeScript, sans changement de comportement : elle prépare
l'escalade de la tâche 8, qui doit distinguer « disque plein » de « stockage
indisponible ».

**Files:**
- Modify: `src/lib/storage/gameRepository.ts`
- Modify: `src/lib/storage/localGameRepository.ts:52-80`
- Modify: `src/lib/storage/memoryGameRepository.ts`
- Modify: `src/context/GameContext.tsx:366` et `:1442`
- Test: `src/lib/storage/localGameRepository.test.ts`

**Interfaces:**
- Consomme : `GenreErreur` (tâche 2).
- Produit : `type ResultatSave = { ok: true } | { ok: false; genre: GenreErreur }`,
  et `GameRepository.save(state): Promise<ResultatSave>`.

- [ ] **Step 1 : écrire le test qui échoue**

Dans `src/lib/storage/localGameRepository.test.ts`, en réutilisant le
`MemoryStorage` déjà présent en tête de fichier :

```ts
it("rend { ok: true } quand l'écriture réussit", async () => {
  const r = await localGameRepository.save(createMockGameState());
  expect(r).toEqual({ ok: true });
});

it("rend le genre disque_plein quand le quota est dépassé", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    const e = new Error("quota");
    e.name = "QuotaExceededError";
    throw e;
  });
  const r = await localGameRepository.save(createMockGameState());
  expect(r).toEqual({ ok: false, genre: "disque_plein" });
});
```

Le `vi.spyOn(Storage.prototype, …)` n'est pas un détail de style : réassigner
`window.localStorage.setItem` ne remplacerait rien et le test resterait vert quoi
qu'il arrive.

- [ ] **Step 2 : lancer le test, vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/localGameRepository.test.ts`
Expected: FAIL — reçoit `true` au lieu de `{ ok: true }`.

- [ ] **Step 3 : changer l'interface**

Dans `gameRepository.ts` :

```ts
import type { GenreErreur } from "./pontNatif";

/** Résultat d'une sauvegarde : succès, ou échec qualifié pour que l'UI puisse
 *  proposer une action ("libère de l'espace" plutôt qu'un message générique). */
export type ResultatSave = { ok: true } | { ok: false; genre: GenreErreur };

export interface GameRepository {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<ResultatSave>;
  clear(): Promise<void>;
}
```

- [ ] **Step 4 : adapter `localGameRepository.save`**

Remplacer `return false` par `return { ok: false, genre }` et `return true` par
`return { ok: true }`. Le genre se déduit du nom de l'exception :

```ts
function genreDeLErreur(err: unknown): GenreErreur {
  const nom = err instanceof Error ? err.name : "";
  return nom === "QuotaExceededError" || nom === "NS_ERROR_DOM_QUOTA_REACHED"
    ? "disque_plein"
    : "io";
}
```

- [ ] **Step 5 : adapter `memoryGameRepository` et les deux sites d'appel**

Dans `memoryGameRepository`, `save` rend `{ ok: true }`.

Dans `GameContext.tsx:366`, remplacer le test `if (!ok …)` par `if (!res.ok …)`.
Ne rien changer d'autre au comportement à ce stade — l'escalade est la tâche 8.
Même traitement pour l'appel de `:1442`.

- [ ] **Step 6 : lancer toute la suite**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS. Corriger les tests qui attendaient encore un booléen.

- [ ] **Step 7 : lint puis commit**

```bash
npx eslint src
git add -A src
git commit -m "refactor(stockage): save rend une cause au lieu d'un booléen"
```

---

### Task 4 : le numéro de révision dans l'index

**Files:**
- Modify: `src/lib/storage/slots.ts:16` (`MetaSlot`), `:41` (`estMetaSlotValide`), `:288` (`toucherDerniereSession`)
- Test: `src/lib/storage/slots.test.ts`

**Interfaces:**
- Produit : `MetaSlot.revision?: number` ;
  `revisionDe(n: NumeroSlot): number` (0 si absente) ;
  `toucherDerniereSession(n: NumeroSlot, revision?: number)` — le paramètre est
  optionnel pour que les appels existants continuent de compiler.

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
it("rend 0 pour un slot dont la révision n'a jamais été écrite", () => {
  window.localStorage.setItem(
    CLE_INDEX,
    JSON.stringify({
      actif: 1,
      slots: { 1: { nom: null, derniereSession: 123 }, 2: null, 3: null },
    }),
  );
  expect(revisionDe(1)).toBe(0);
});

it("conserve la révision écrite", () => {
  toucherDerniereSession(1, 7);
  expect(revisionDe(1)).toBe(7);
});

it("accepte une meta ancienne, sans champ revision", () => {
  window.localStorage.setItem(
    CLE_INDEX,
    JSON.stringify({
      actif: 2,
      slots: { 1: null, 2: { nom: "Partie", derniereSession: 5 }, 3: null },
    }),
  );
  expect(slotActif()).toBe(2);
});

it("refuse une revision mal typée plutôt que de la propager", () => {
  window.localStorage.setItem(
    CLE_INDEX,
    JSON.stringify({
      actif: 1,
      slots: { 1: { nom: null, derniereSession: 5, revision: "sept" }, 2: null, 3: null },
    }),
  );
  expect(revisionDe(1)).toBe(0);
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/slots.test.ts`
Expected: FAIL — `revisionDe` n'est pas exportée.

- [ ] **Step 3 : implémenter**

Dans `MetaSlot`, ajouter :

```ts
  /** Compteur monotone d'écritures de ce slot. Absent sur toute donnée
   *  antérieure à ce chantier : vaut alors 0, ce qui fait perdre l'arbitrage
   *  au magasin qui ne l'a pas encore. */
  revision?: number;
```

Dans `estMetaSlotValide`, ajouter à la conjonction :

```ts
    (candidat.revision === undefined || typeof candidat.revision === "number") &&
```

Une révision mal typée invalide la meta entière, donc `chargerIndex()` retombe sur
le défaut et `revisionDe` rend 0 — le comportement attendu par le quatrième test.

Ajouter :

```ts
export function revisionDe(n: NumeroSlot): number {
  if (typeof window === "undefined") return 0;
  return chargerIndex().slots[n]?.revision ?? 0;
}
```

Et élargir `toucherDerniereSession` :

```ts
export function toucherDerniereSession(n: NumeroSlot, revision?: number): void {
  if (typeof window === "undefined") return;
  const index = chargerIndex();
  const existant = index.slots[n];
  index.slots[n] = {
    nom: existant ? existant.nom : null,
    derniereSession: Date.now(),
    revision: revision ?? existant?.revision ?? 0,
  };
  ecrireIndex(index);
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/slots.test.ts`
Expected: PASS.

- [ ] **Step 5 : commit**

```bash
git add src/lib/storage/slots.ts src/lib/storage/slots.test.ts
git commit -m "feat(stockage): numéro de révision par emplacement"
```

---

### Task 5 : le repository composite

**Files:**
- Create: `src/lib/storage/fichierGameRepository.ts`
- Test: `src/lib/storage/fichierGameRepository.test.ts`

**Interfaces:**
- Consomme : `lireSave`, `ecrireSave`, `quoiDuSlot`, `ErreurStockage` (tâche 2) ;
  `ResultatSave` (tâche 3) ; `revisionDe`, `toucherDerniereSession`, `slotActif`,
  `cleSlot`, `NumeroSlot` (tâche 4) ; `localGameRepository`.
- Produit : `fichierGameRepository: GameRepository`, et
  `interface IndexFichier { actif: NumeroSlot; revisions: Record<NumeroSlot, number> }`.

La migration n'est PAS dans cette tâche — ici, l'absence de `slots.json` fait
simplement retomber sur le miroir. La tâche 6 branchera la migration à cet endroit.

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockGameState } from "../__test-fixtures__/gameState";
import { cleSlot, toucherDerniereSession } from "./slots";

const fichiers = new Map<string, string>();
vi.mock("./pontNatif", async (orig) => ({
  ...(await orig<typeof import("./pontNatif")>()),
  lireSave: vi.fn(async (q: string) => fichiers.get(q) ?? null),
  ecrireSave: vi.fn(async (q: string, c: string) => {
    fichiers.set(q, c);
  }),
}));

describe("fichierGameRepository", () => {
  beforeEach(() => {
    fichiers.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("écrit le slot puis l'index, et rend ok", async () => {
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const r = await fichierGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: true });
    expect(fichiers.has("slot_1")).toBe(true);
    expect(fichiers.has("index")).toBe(true);
  });

  it("relit ce qu'il a écrit", async () => {
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const etat = createMockGameState({ jourActuel: 42 });
    await fichierGameRepository.save(etat);
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(42);
  });

  it("remonte le genre disque_plein sans écrire l'index", async () => {
    const { ecrireSave } = await import("./pontNatif");
    vi.mocked(ecrireSave).mockRejectedValueOnce({
      genre: "disque_plein",
      message: "Disque plein",
    });
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const r = await fichierGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: false, genre: "disque_plein" });
    expect(fichiers.has("index")).toBe(false);
  });

  it("miroite dans localStorage même quand le fichier a réussi", async () => {
    const { fichierGameRepository } = await import("./fichierGameRepository");
    await fichierGameRepository.save(createMockGameState());
    expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
  });

  it("rend ok même si le miroir localStorage échoue", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const r = await fichierGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: true });
  });

  it("retombe sur le miroir quand le fichier du slot est corrompu", async () => {
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ jourActuel: 9 })),
    );
    fichiers.set("index", JSON.stringify({ actif: 1, revisions: { 1: 1, 2: 0, 3: 0 } }));
    fichiers.set("slot_1", "{ceci n'est pas du json");
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(9);
  });

  it("préfère le miroir quand sa révision est plus haute", async () => {
    // Le scénario de l'incident : le fichier a décroché, le miroir a continué.
    fichiers.set("index", JSON.stringify({ actif: 1, revisions: { 1: 4, 2: 0, 3: 0 } }));
    fichiers.set("slot_1", JSON.stringify(createMockGameState({ jourActuel: 10 })));
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ jourActuel: 17 })),
    );
    toucherDerniereSession(1, 9);
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(17);
  });

  it("préfère le fichier à révision égale", async () => {
    fichiers.set("index", JSON.stringify({ actif: 1, revisions: { 1: 3, 2: 0, 3: 0 } }));
    fichiers.set("slot_1", JSON.stringify(createMockGameState({ jourActuel: 10 })));
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ jourActuel: 17 })),
    );
    toucherDerniereSession(1, 3);
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(10);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/fichierGameRepository.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : implémenter**

```ts
import type { GameState } from "@/types/game";
import type { GameRepository, ResultatSave } from "./gameRepository";
import { localGameRepository } from "./localGameRepository";
import { ecrireSave, lireSave, quoiDuSlot } from "./pontNatif";
import type { ErreurStockage } from "./pontNatif";
import {
  cleSlot,
  revisionDe,
  slotActif,
  toucherDerniereSession,
  viderSlotActif,
  type NumeroSlot,
} from "./slots";

/** Index côté fichier. Volontairement plus maigre que `IndexSlots` : les noms
 *  d'emplacements restent l'affaire du miroir, seul l'arbitrage voyage ici. */
export interface IndexFichier {
  actif: NumeroSlot;
  revisions: Record<NumeroSlot, number>;
}

function parse<T>(brut: string | null): T | null {
  if (!brut) return null;
  try {
    return JSON.parse(brut) as T;
  } catch {
    return null;
  }
}

async function lireIndexFichier(): Promise<IndexFichier | null> {
  try {
    return parse<IndexFichier>(await lireSave("index"));
  } catch {
    return null;
  }
}

function genreDe(e: unknown): ErreurStockage["genre"] {
  return typeof e === "object" && e !== null && "genre" in e
    ? ((e as ErreurStockage).genre)
    : "io";
}

export const fichierGameRepository: GameRepository = {
  async load() {
    const n = slotActif();
    const index = await lireIndexFichier();

    // Pas d'index fichier : rien n'a encore été migré (tâche 6 branchera ici).
    if (!index) return localGameRepository.load();

    let duFichier: GameState | null = null;
    try {
      duFichier = parse<GameState>(await lireSave(quoiDuSlot(n)));
    } catch {
      duFichier = null;
    }

    const revFichier = index.revisions[n] ?? 0;
    const revMiroir = revisionDe(n);

    // Le fichier ne l'emporte QUE s'il est lisible ET au moins aussi frais.
    // Un fichier corrompu, ou distancé parce qu'il avait décroché pendant que
    // le miroir continuait, laisse la main au miroir.
    if (duFichier && revFichier >= revMiroir) return duFichier;

    const duMiroir = await localGameRepository.load();
    if (duMiroir) {
      console.warn(
        `[fichierGameRepository] Slot ${n} servi depuis le miroir ` +
          `(fichier ${duFichier ? "distancé" : "illisible"}, ` +
          `révisions fichier=${revFichier} miroir=${revMiroir}).`,
      );
      return duMiroir;
    }
    return duFichier;
  },

  async save(state): Promise<ResultatSave> {
    const n = slotActif();
    const serialise = JSON.stringify(state);
    const index = await lireIndexFichier();
    const revision = Math.max(index?.revisions[n] ?? 0, revisionDe(n)) + 1;

    // 1. Le slot d'abord : c'est lui qui rend le verdict.
    try {
      await ecrireSave(quoiDuSlot(n), serialise);
    } catch (e) {
      return { ok: false, genre: genreDe(e) };
    }

    // 2. L'index ensuite. Une save sans entrée d'index est récupérable ;
    //    l'inverse serait un emplacement fantôme.
    const suivant: IndexFichier = {
      actif: n,
      revisions: { ...(index?.revisions ?? { 1: 0, 2: 0, 3: 0 }), [n]: revision },
    };
    try {
      await ecrireSave("index", JSON.stringify(suivant));
    } catch (e) {
      return { ok: false, genre: genreDe(e) };
    }

    // 3. Le miroir en best-effort : son échec ne change pas le verdict.
    await localGameRepository.save(state);
    toucherDerniereSession(n, revision);

    return { ok: true };
  },

  async clear() {
    viderSlotActif();
    try {
      await ecrireSave(quoiDuSlot(slotActif()), "");
    } catch {
      // Le fichier restera, mais l'index du miroir dit déjà l'emplacement vide.
    }
  },
};
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/fichierGameRepository.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5 : commit**

```bash
git add src/lib/storage/fichierGameRepository.ts src/lib/storage/fichierGameRepository.test.ts
git commit -m "feat(stockage): repository composite fichier + miroir, arbitré par révision"
```

---

### Task 6 : la migration des joueurs actuels

**Files:**
- Create: `src/lib/storage/migrationFichiers.ts`
- Modify: `src/lib/storage/fichierGameRepository.ts` (le `if (!index)` de `load`)
- Test: `src/lib/storage/migrationFichiers.test.ts`

**Interfaces:**
- Consomme : `lireSave`, `ecrireSave`, `quoiDuSlot` (tâche 2) ; `chargerIndex`,
  `cleSlot`, `cleBackup`, `revisionDe` (tâche 4).
- Produit : `migrerVersFichiers(): Promise<boolean>` — `true` si les fichiers sont
  désormais en place, `false` si on doit continuer sur le miroir.

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
it("copie les slots existants et écrit l'index", async () => {
  window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
  window.localStorage.setItem(CLE_INDEX, JSON.stringify({
    actif: 1, slots: { 1: { nom: null, derniereSession: 1 }, 2: null, 3: null },
  }));
  const { migrerVersFichiers } = await import("./migrationFichiers");
  await expect(migrerVersFichiers()).resolves.toBe(true);
  expect(fichiers.get("slot_1")).toBe(window.localStorage.getItem(cleSlot(1)));
  expect(fichiers.has("index")).toBe(true);
});

it("est un no-op total quand une écriture échoue", async () => {
  window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
  const { ecrireSave } = await import("./pontNatif");
  vi.mocked(ecrireSave).mockRejectedValue({ genre: "disque_plein", message: "" });
  const { migrerVersFichiers } = await import("./migrationFichiers");
  await expect(migrerVersFichiers()).resolves.toBe(false);
  expect(fichiers.has("index")).toBe(false);
  // Surtout : le miroir est intact.
  expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
});

it("annule si la relecture ne rend pas exactement ce qui a été écrit", async () => {
  window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
  const { lireSave } = await import("./pontNatif");
  vi.mocked(lireSave).mockResolvedValue("un contenu different");
  const { migrerVersFichiers } = await import("./migrationFichiers");
  await expect(migrerVersFichiers()).resolves.toBe(false);
  expect(fichiers.has("index")).toBe(false);
});

it("efface les copies de secours devenues orphelines, et elles seules", async () => {
  window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
  window.localStorage.setItem(cleBackup(1), "vieille copie");
  const { migrerVersFichiers } = await import("./migrationFichiers");
  await migrerVersFichiers();
  expect(window.localStorage.getItem(cleBackup(1))).toBeNull();
  expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
});

it("réussit sans rien copier quand aucune partie n'existe", async () => {
  const { migrerVersFichiers } = await import("./migrationFichiers");
  await expect(migrerVersFichiers()).resolves.toBe(true);
  expect(fichiers.has("index")).toBe(true);
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/migrationFichiers.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : implémenter**

```ts
import { ecrireSave, lireSave, quoiDuSlot } from "./pontNatif";
// `import type` OBLIGATOIRE : `fichierGameRepository` importe ce module en
// retour (tâche 6, étape 4). Un import de valeur créerait un cycle à
// l'exécution ; l'import de type est effacé à la compilation.
import type { IndexFichier } from "./fichierGameRepository";
import { chargerIndex, cleBackup, cleSlot, revisionDe, type NumeroSlot } from "./slots";

const NUMEROS: readonly NumeroSlot[] = [1, 2, 3];

function lireMiroir(n: NumeroSlot): string | null {
  try {
    return window.localStorage.getItem(cleSlot(n));
  } catch {
    return null;
  }
}

/**
 * Copie les sauvegardes du miroir vers les fichiers, puis écrit l'index
 * fichier. Paranoïaque comme `tenterMigrationLegacy` : chaque copie est relue
 * PAR LE FICHIER et comparée par égalité de chaîne stricte — une relecture
 * localStorage ne prouverait rien, elle serait servie par la copie mémoire.
 *
 * Le moindre échec rend `false` sans rien détruire : le jeu continue sur le
 * miroir et on retentera au prochain lancement.
 */
export async function migrerVersFichiers(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const index = chargerIndex();
  const revisions: Record<NumeroSlot, number> = { 1: 0, 2: 0, 3: 0 };

  for (const n of NUMEROS) {
    const brut = lireMiroir(n);
    if (brut === null) continue;

    try {
      await ecrireSave(quoiDuSlot(n), brut);
      if ((await lireSave(quoiDuSlot(n))) !== brut) return false;
    } catch {
      return false;
    }
    revisions[n] = revisionDe(n);
  }

  const indexFichier: IndexFichier = { actif: index.actif, revisions };
  try {
    await ecrireSave("index", JSON.stringify(indexFichier));
  } catch {
    return false;
  }

  // Les fichiers sont en place et atomiques : le double-buffer du miroir n'a
  // plus de raison d'être. On ne touche JAMAIS aux clés de slot elles-mêmes.
  for (const n of NUMEROS) {
    try {
      window.localStorage.removeItem(cleBackup(n));
    } catch {
      // Copie orpheline mais inerte : plus personne ne la relit.
    }
  }

  return true;
}
```

- [ ] **Step 4 : brancher la migration dans `load`**

Dans `fichierGameRepository.load`, remplacer la retombée directe :

```ts
    // Pas d'index fichier : première ouverture après mise à jour. On migre,
    // et si ça échoue on continue sur le miroir — jamais de perte.
    if (!index) {
      const migre = await migrerVersFichiers();
      if (!migre) return localGameRepository.load();
      return this.load();
    }
```

L'appel récursif ne peut pas boucler : la migration n'a rendu `true` qu'après avoir
écrit l'index, donc `lireIndexFichier()` le trouvera au second tour.

- [ ] **Step 5 : lancer les deux suites, vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/`
Expected: PASS.

- [ ] **Step 6 : commit**

```bash
git add src/lib/storage/migrationFichiers.ts src/lib/storage/migrationFichiers.test.ts src/lib/storage/fichierGameRepository.ts
git commit -m "feat(stockage): migration du miroir vers les fichiers, no-op si elle échoue"
```

---

### Task 7 : câbler le composite et retirer le double-buffer

**Files:**
- Modify: `src/lib/storage/createGameRepository.ts`
- Modify: `src/lib/storage/localGameRepository.ts:52-80` (retrait du double-buffer)
- Test: `src/lib/storage/createGameRepository.test.ts` (créer), `localGameRepository.test.ts`

**Interfaces:**
- Consomme : `fichierGameRepository` (tâche 5), `tauriDisponible` (tâche 2).
- Produit : aucun nouveau symbole.

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
it("choisit le composite sous Tauri", async () => {
  (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
  const { createGameRepository } = await import("./createGameRepository");
  const { fichierGameRepository } = await import("./fichierGameRepository");
  expect(createGameRepository()).toBe(fichierGameRepository);
});

it("reste sur le local dans un navigateur", async () => {
  (globalThis as { window?: unknown }).window = {};
  const { createGameRepository } = await import("./createGameRepository");
  const { localGameRepository } = await import("./localGameRepository");
  expect(createGameRepository()).toBe(localGameRepository);
});
```

Et, dans `localGameRepository.test.ts`, remplacer les tests qui attendaient une
écriture de `cleBackup` par :

```ts
it("n'écrit plus de copie de secours — le fichier atomique l'a remplacée", async () => {
  await localGameRepository.save(createMockGameState());
  expect(window.localStorage.getItem(cleBackup(1))).toBeNull();
});
```

Conserver en revanche les tests de **lecture** de `cleBackup` : une copie écrite
par une version antérieure du jeu doit encore pouvoir sauver un joueur au premier
chargement, avant que la migration ne l'efface.

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/storage/`
Expected: FAIL sur les deux fichiers.

- [ ] **Step 3 : implémenter**

`createGameRepository.ts` :

```ts
import type { GameRepository } from "./gameRepository";
import { fichierGameRepository } from "./fichierGameRepository";
import { localGameRepository } from "./localGameRepository";
import { tauriDisponible } from "@/lib/plateforme";

/**
 * Point unique de décision. Sous Tauri (iOS, Android), la sauvegarde vit dans
 * un fichier écrit atomiquement dont l'échec est observable ; le localStorage
 * reste en miroir de secours. Dans un navigateur (`next dev`), il n'y a pas de
 * commande native : on garde le chemin historique.
 */
export function createGameRepository(): GameRepository {
  return tauriDisponible() ? fichierGameRepository : localGameRepository;
}
```

Dans `localGameRepository.save`, supprimer le premier bloc `try` qui écrit
`cleBackup(n)` et son commentaire. **Ne pas toucher à `load`** : la lecture de la
copie de secours reste le filet des saves écrites par l'ancienne version.

- [ ] **Step 4 : lancer toute la suite**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS.

- [ ] **Step 5 : lint puis commit**

```bash
npx eslint src
git add -A src
git commit -m "feat(stockage): le composite devient l'implémentation sous Tauri"
```

---

### Task 8 : l'alerte qui escalade

C'est la tâche qui répare le défaut d'origine : un seul toast de 2,5 s pour une
heure de perte.

**Files:**
- Modify: `src/context/GameContext.tsx:317-395` (état + machine)
- Create: `src/components/mobile/BandeauSauvegarde.tsx`
- Modify: `src/app/layout.tsx:88`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (bloc `raisons`, à partir de la ligne 745 pour `fr`)
- Test: `src/components/mobile/BandeauSauvegarde.test.tsx`

**Interfaces:**
- Consomme : `ResultatSave` (tâche 3), `GenreErreur` (tâche 2).
- Produit :
  `type EtatSauvegarde = { enEchec: false } | { enEchec: true; genre: GenreErreur; depuis: number }`,
  exposé par `GameStateContext` sous le nom `etatSauvegarde` ;
  `DELAI_MODALE_MS = 120_000` et `RAPPEL_MODALE_MS = 300_000` exportés depuis
  `BandeauSauvegarde.tsx`.

- [ ] **Step 1 : ajouter les clés i18n dans les quatre langues**

Dans le bloc `raisons` de chaque fichier, à côté de `sauvegardeImpossible` :

```ts
    sauvegardeBandeau: "Sauvegarde impossible — ta progression n'est pas enregistrée.",
    sauvegardeModaleTitre: "Ta progression n'est pas sauvegardée",
    sauvegardeModaleDepuisUn: "Depuis 1 minute.",
    sauvegardeModaleDepuisN: "Depuis {minutes} minutes.",
    sauvegardeModaleDisquePlein:
      "Le stockage de ton téléphone est plein. Libère de la place pour que ta partie soit enregistrée.",
    sauvegardeModaleIo:
      "Le stockage n'est pas disponible en ce moment. Ta partie n'est pas enregistrée.",
    sauvegardeModaleBouton: "J'ai compris",
```

Les clés `Un`/`N` suivent la convention de pluriel déjà en place dans ce fichier.
Le grec est traduit comme les trois autres, pas laissé en anglais.

- [ ] **Step 2 : écrire le test qui échoue**

```ts
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `estRoutePartie` est vraie par défaut ; un test la passe à faux.
const pathname = { valeur: "/bureau" };
vi.mock("next/navigation", () => ({ usePathname: () => pathname.valeur }));

describe("BandeauSauvegarde", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname.valeur = "/bureau";
  });

  it("n'affiche rien tant que la sauvegarde passe", () => {
    rendreAvecEtat({ enEchec: false });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("affiche le bandeau dès le premier échec", () => {
    rendreAvecEtat({ enEchec: true, genre: "disque_plein", depuis: Date.now() });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("le bandeau ne s'efface pas tout seul — c'est tout le point", () => {
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("n'ouvre la modale qu'au bout de deux minutes", () => {
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(119_000));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => void vi.advanceTimersByTime(2_000));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("revient cinq minutes après avoir été fermée", () => {
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(DELAI_MODALE_MS));
    screen.getByRole("button", { name: /compris/i }).click();
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => void vi.advanceTimersByTime(RAPPEL_MODALE_MS));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dit de libérer de la place quand le disque est plein", () => {
    rendreAvecEtat({ enEchec: true, genre: "disque_plein", depuis: Date.now() });
    act(() => void vi.advanceTimersByTime(DELAI_MODALE_MS));
    expect(screen.getByRole("dialog").textContent).toMatch(/place/i);
  });

  it("ne s'affiche pas hors d'une route de partie", () => {
    pathname.valeur = "/";
    rendreAvecEtat({ enEchec: true, genre: "io", depuis: Date.now() });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
```

`rendreAvecEtat` est un utilitaire local du fichier de test qui monte le composant
dans un `GameStateContext.Provider` porteur de l'`etatSauvegarde` donné.

- [ ] **Step 3 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/BandeauSauvegarde.test.tsx`
Expected: FAIL — composant introuvable.

- [ ] **Step 4 : la machine à états dans `GameContext`**

Remplacer la garde `saveEnEchecRef` et son toast unique par un état partagé :

```ts
export type EtatSauvegarde =
  | { enEchec: false }
  | { enEchec: true; genre: GenreErreur; depuis: number };

const [etatSauvegarde, setEtatSauvegarde] = useState<EtatSauvegarde>({
  enEchec: false,
});
```

Dans `doSave` :

```ts
      gameRepository.save(state).then((res) => {
        setEtatSauvegarde((prec) => {
          if (res.ok) {
            if (prec.enEchec) toast(raisonLocalisee("sauvegardeRetablie"), { type: "succes" });
            return prec.enEchec ? { enEchec: false } : prec;
          }
          // `depuis` est posé au PREMIER échec et ne bouge plus : c'est lui qui
          // mesure le temps de jeu réellement en danger.
          if (prec.enEchec) {
            return prec.genre === res.genre ? prec : { ...prec, genre: res.genre };
          }
          return { enEchec: true, genre: res.genre, depuis: Date.now() };
        });
      });
```

Exposer `etatSauvegarde` dans la valeur de `GameStateContext` (et dans le type
`GameStateValue`). Le toast d'échec disparaît : le bandeau le remplace.

- [ ] **Step 5 : écrire `BandeauSauvegarde.tsx`**

Points obligatoires :

- `if (!estRoutePartie(pathname)) return null;` — comme tout composant du layout
  racine, sinon il s'afficherait au menu où aucune partie n'est chargée.
- Le bandeau est en `position: fixed`. `TutorielBanniere` occupe déjà
  `top: calc(var(--safe-top, 0px) + var(--mobile-header-h) + …)` en `zIndex: 90`
  (`TutorielBanniere.tsx:21-27`) : **empiler sous celui du tutoriel** en ajoutant sa
  hauteur au `top`, et prendre `zIndex: 91`. Une perte de sauvegarde prime
  visuellement sur une consigne de tutoriel.
- `role="status"` sur le bandeau, `role="dialog"` sur la modale.
- Un `setInterval` de 10 s pilote la relecture de l'horloge — inutile de battre à
  la seconde pour un seuil de deux minutes.
- Les minutes affichées : `Math.floor((maintenant - depuis) / 60_000)`, rendues par
  `sauvegardeModaleDepuisUn` / `…DepuisN`.

```ts
export const DELAI_MODALE_MS = 120_000;
export const RAPPEL_MODALE_MS = 300_000;
```

- [ ] **Step 6 : monter le composant**

Dans `src/app/layout.tsx`, juste après `<TutorielBanniere />` (ligne 88) :

```tsx
                <BandeauSauvegarde />
```

- [ ] **Step 7 : lancer, vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/BandeauSauvegarde.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 8 : l'interrupteur de debug**

Sans lui, la chaîne d'alerte n'est pas recettable sur appareil. Dans
`pontNatif.ts`, en tête de `ecrireSave` :

```ts
  // Recette : `localStorage["broc.debug.echec-save"] = "1"` fait échouer toute
  // écriture comme le ferait un disque plein. Aucune incidence en production —
  // la clé n'est jamais posée par le jeu.
  if (window.localStorage.getItem("broc.debug.echec-save") === "1") {
    throw { genre: "disque_plein", message: "Échec forcé (debug)" } as ErreurStockage;
  }
```

- [ ] **Step 9 : suite complète, lint, commit**

```bash
npx vitest run --maxWorkers=4
npx eslint src
git add -A src
git commit -m "feat(stockage): bandeau persistant et modale d'escalade à la place du toast"
```

---

### Task 9 : l'avertissement d'espace disque

**Files:**
- Create: `src-tauri/vendor/tauri-plugin-stockage/ios/Sources/StockagePlugin.swift`
- Modify: `…/src/{commands.rs,mobile.rs,desktop.rs}` (brancher `espace_libre`)
- Modify: `src-tauri/gen/apple/project.yml` (source Swift du plugin, si nécessaire)
- Create: `src/components/mobile/AvertissementEspace.tsx`
- Modify: `src/app/layout.tsx`, `src/lib/i18n/ui/{fr,en,es,el}.ts`
- Test: `src/components/mobile/AvertissementEspace.test.tsx`

**Interfaces:**
- Consomme : `espaceLibre()` (tâche 2).
- Produit : `SEUIL_ESPACE_LIBRE_OCTETS = 50 * 1024 * 1024`, exporté depuis
  `AvertissementEspace.tsx`.

- [ ] **Step 1 : le Swift**

`volumeAvailableCapacityForImportantUsageKey` et **pas** `statvfs` : ce dernier
ignore la place purgeable qu'iOS rendra au besoin, sous-estime l'espace, et
déclencherait l'avertissement à tort — précisément le bruit qu'on veut éviter.

```swift
func espaceLibre() -> UInt64? {
  let url = URL(fileURLWithPath: NSHomeDirectory())
  guard let v = try? url.resourceValues(
    forKeys: [.volumeAvailableCapacityForImportantUsageKey]
  ), let o = v.volumeAvailableCapacityForImportantUsage else { return nil }
  return o < 0 ? nil : UInt64(o)
}
```

Côté Rust, `mobile.rs` route vers le plugin Swift sur iOS ; `desktop.rs` et
Android gardent `Ok(None)`.

- [ ] **Step 2 : écrire les tests qui échouent**

```ts
it("n'avertit pas quand la place est suffisante", async () => {
  vi.mocked(espaceLibre).mockResolvedValue(SEUIL_ESPACE_LIBRE_OCTETS + 1);
  render(<AvertissementEspace />);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("avertit sous le seuil", async () => {
  vi.mocked(espaceLibre).mockResolvedValue(SEUIL_ESPACE_LIBRE_OCTETS - 1);
  render(<AvertissementEspace />);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
});

it("n'avertit pas quand la plateforme ne sait pas mesurer", async () => {
  // Android, bureau : mieux vaut ne rien dire qu'un chiffre faux.
  vi.mocked(espaceLibre).mockResolvedValue(null);
  render(<AvertissementEspace />);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("ne mesure qu'une fois par lancement", async () => {
  vi.mocked(espaceLibre).mockResolvedValue(1);
  const { rerender } = render(<AvertissementEspace />);
  rerender(<AvertissementEspace />);
  expect(espaceLibre).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/AvertissementEspace.test.tsx`
Expected: FAIL — composant introuvable.

- [ ] **Step 4 : implémenter le composant**

Un `useEffect` sans dépendance, gardé par un `useRef` pour ne mesurer qu'une fois.
Nouvelles clés i18n dans les quatre langues :

```ts
    espaceTitre: "Le stockage de ton téléphone est presque plein",
    espaceCorps:
      "BROC risque de ne plus pouvoir enregistrer ta partie. Libère un peu de place pour continuer sereinement.",
    espaceBouton: "J'ai compris",
```

- [ ] **Step 5 : lancer, monter dans le layout, commit**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/AvertissementEspace.test.tsx
npx eslint src
git add -A src src-tauri
git commit -m "feat(stockage): avertissement quand l'espace disque passe sous 50 Mo"
```

---

### Task 10 : l'export de sauvegarde

**Files:**
- Modify: `…/ios/Sources/StockagePlugin.swift` (feuille de partage)
- Modify: `…/src/commands.rs` (brancher `partager_fichier`)
- Modify: `src/components/mobile/PartiesModal.tsx` (icône par ligne, cf. `:478`)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`
- Test: `src/components/mobile/PartiesModal.test.tsx`

**Interfaces:**
- Consomme : `partagerFichier(quoi, nomLisible)` (tâche 2), `resumeSlot` (`slots.ts`).

- [ ] **Step 1 : le Swift**

Copier `slot-N.json` sous le nom lisible dans `NSTemporaryDirectory()`, puis
présenter un `UIActivityViewController` sur le contrôleur racine. Sur iPad, ne pas
oublier `popoverPresentationController` — sans lui l'app plante à la présentation.

- [ ] **Step 2 : écrire les tests qui échouent**

```ts
it("propose l'export sur un emplacement occupé", async () => {
  vi.mocked(partagerFichier).mockResolvedValue(undefined);
  rendreParties();
  expect(await screen.findAllByLabelText(/exporter/i)).toHaveLength(1);
});

it("nomme le fichier avec le jour de jeu", async () => {
  rendreParties();
  (await screen.findByLabelText(/exporter/i)).click();
  await waitFor(() =>
    expect(partagerFichier).toHaveBeenCalledWith("slot_1", "broc-partie-jour-34.json"),
  );
});

it("masque l'export quand la plateforme ne sait pas partager", async () => {
  vi.mocked(partagerFichier).mockRejectedValue({ genre: "indisponible", message: "" });
  rendreParties();
  await waitFor(() => expect(screen.queryByLabelText(/exporter/i)).toBeNull());
});

it("n'affiche pas d'export sur un emplacement vide", async () => {
  rendreParties({ slotsOccupes: [] });
  await waitFor(() => expect(screen.queryByLabelText(/exporter/i)).toBeNull());
});
```

- [ ] **Step 3 : lancer, vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/PartiesModal.test.tsx`
Expected: FAIL.

- [ ] **Step 4 : implémenter**

Une icône `Share2` de `lucide-react` (déjà importé ligne 4) dans la rangée
crayon/poubelle, à `:478`. Le nom se construit depuis `resumeSlot(n)`, qui lit déjà
`jourActuel` de façon défensive : `broc-partie-jour-${resume.jour}.json`, avec une
retombée `broc-partie.json` si `resumeSlot` rend `null`.

La disponibilité se sonde une fois au montage : un `partagerFichier` qui rejette en
`indisponible` masque définitivement l'icône pour cette session.

Clé i18n : `exporterPartie: "Exporter cette partie"` dans les quatre langues.

- [ ] **Step 5 : lancer, lint, commit**

```bash
npx vitest run --maxWorkers=4
npx eslint src
git add -A src src-tauri
git commit -m "feat(stockage): export d'une partie par la feuille de partage iOS"
```

---

### Task 11 : vérification d'ensemble et fiche de recette

**Files:**
- Modify: `docs/superpowers/specs/2026-08-23-sauvegarde-durable-design.md` (section recette)

- [ ] **Step 1 : suite complète et lint**

Run: `npx vitest run --maxWorkers=4 && npx eslint src`
Expected: tout au vert. Noter le nombre de tests, à comparer aux 2474 d'avant
chantier.

- [ ] **Step 2 : build web et compilation Rust**

Run: `npm run build && cd src-tauri && cargo check`
Expected: succès.

- [ ] **Step 3 : vérifier la migration sur une vraie sauvegarde**

Charger `public/dev-save-bazar.html` dans le simulateur, relancer l'app, vérifier
dans les journaux que la migration s'est faite une fois et que `slots.json` existe.
Relancer une seconde fois : la migration ne doit PAS se rejouer.

- [ ] **Step 4 : recetter la chaîne d'alerte au simulateur**

Poser `localStorage["broc.debug.echec-save"] = "1"`, jouer, et vérifier dans
l'ordre : bandeau immédiat, modale à 2 min, retour de la modale à 7 min, puis
retrait de la clé → bandeau retiré et toast « Sauvegarde rétablie ».

- [ ] **Step 5 : recetter l'avertissement disque**

Monter temporairement `SEUIL_ESPACE_LIBRE_OCTETS` à une valeur énorme, vérifier la
modale au lancement, puis remettre la constante.

- [ ] **Step 6 : trancher la mention de `site/privacy.html`**

La spec le réclame et rien d'autre dans ce plan ne le fait. La page affirme
aujourd'hui « le contenu de votre sauvegarde ne quitte jamais votre appareil ».
La phrase **reste vraie** — la sauvegarde iPhone est un mécanisme système, pas un
envoi par le jeu — mais la section « stockage local du système » gagne à
mentionner le fichier. Décider avec Guillaume : soit on complète la phrase dans
les quatre langues, soit on justifie par écrit qu'elle est déjà exacte. Ne pas
laisser le point ouvert.

- [ ] **Step 7 : consigner ce qui reste non prouvé**

Dans la section « Recette, et sa limite » de la spec, noter ce qui a été recetté et
rappeler que le vrai chemin `ENOSPC` reste non reproduit — il demande de remplir un
iPhone, et la recette device passe par TestFlight sur ce Mac.

- [ ] **Step 8 : commit**

```bash
git add docs/superpowers/specs/2026-08-23-sauvegarde-durable-design.md site/
git commit -m "docs(stockage): résultat de recette et incertitude résiduelle"
```
