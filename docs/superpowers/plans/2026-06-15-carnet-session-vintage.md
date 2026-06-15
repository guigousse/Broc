# Carnet de session vintage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le `CarnetSheet` bottom-sheet par un overlay flottant "cahier de compte vintage" à deux onglets — un grand livre de toutes les transactions (Comptes) et un journal des missions reçues par courrier (Missions) — en supprimant la page `/historique` redondante.

**Architecture :**
- Extension du système `Courrier` avec un nouveau payload `mission` (cible objet + état min + récompense + échéance optionnelle).
- Nouveau type `LedgerEntry` + champ `grandLivre: LedgerEntry[]` dans `GameState`, alimenté par un helper pur `appendLedger` appelé depuis toutes les mutations de budget de `GameContext`.
- Migration save N=3 qui reconstruit le grand livre best-effort depuis `historique[]`.
- Nouveau composant `CarnetOverlay` (full-screen façon `CourrierSheet`) avec habillage papier crème, tabs ruban et tableau lined-paper.

**Tech Stack :** TypeScript / React 19 / Next.js 16 / Vitest + jsdom / CSS-in-JS inline (style cohérent avec le reste du projet).

**Référence design :** `docs/superpowers/specs/2026-06-15-carnet-session-vintage-design.md`.

**File Structure :**

| Fichier | Statut | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modifier | Ajoute `CourrierPayloadMission`, `MissionResolution`, `MissionStatut`, `LedgerEntry`, `LedgerKind`. Étend `CourrierPayload` et `GameState`. |
| `src/lib/grandLivre.ts` | Créer | Helper pur `appendLedger(state, partial, opts?)` + helper `reconstruireGrandLivre(historique, budgetActuel)`. |
| `src/lib/grandLivre.test.ts` | Créer | Tests unitaires du helper. |
| `src/lib/migrations.ts` | Modifier | Bump `SAVE_VERSION` → 3, ajoute `grandLivre`/`missions` à la migration, reconstruit depuis `historique` si vide. |
| `src/lib/migrations.test.ts` | Modifier | Tests de migration pour les nouveaux champs. |
| `src/lib/__test-fixtures__/gameState.ts` | Modifier | Ajoute `grandLivre: []` et `missions: []` au mock. |
| `src/lib/courrier.ts` | Modifier | Helper `expireMissions(state)` pour le tick journalier. Helper `creerCourrierMission(...)` pour la création. |
| `src/lib/courrier.test.ts` | Modifier | Tests pour `expireMissions` + `creerCourrierMission`. |
| `src/context/GameContext.tsx` | Modifier | Instrumente toutes les mutations budget via `appendLedger`. Ajoute `payerFraisBrocante`, `livrerMission`. Initialise `grandLivre`/`missions` dans `nouvellePartie`. Tick d'expiration mission dans `avancerJour`. |
| `src/app/chiner/[brocanteId]/ClientPage.tsx` | Modifier | Remplace `ajusterBudget(-frais)` par `payerFraisBrocante(brocante)`. |
| `src/app/vitrine/[brocanteId]/ClientPage.tsx` | Modifier | Remplace `ajusterBudget(-frais)` par `payerFraisBrocante(brocante)`. |
| `src/components/mobile/qg/sheets/CourrierSheet.tsx` | Modifier | Branche de rendu pour `payload.type === "mission"` (affiche cible, récompense, échéance, bouton "Accepter"). |
| `src/components/mobile/qg/overlays/CarnetOverlay.tsx` | Créer | Overlay full-screen vintage avec tabs Comptes/Missions, tableau lined-paper, cartes mission. |
| `src/app/(panorama)/layout.tsx` | Modifier | Remplace `CarnetSheet` par `CarnetOverlay`, branche `onLivrerMission`. |
| `src/components/mobile/qg/sheets/CarnetSheet.tsx` | Supprimer | Remplacé. |
| `src/components/mobile/QgHistorique.tsx` | Supprimer | Logique inlinée dans `CarnetOverlay`. |
| `src/app/historique/page.tsx` | Supprimer | Redondant. |

---

## Task 1: Types — payload mission, ledger, état mission

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/__test-fixtures__/gameState.ts`

- [ ] **Step 1: Étendre `CourrierPayload` avec le payload mission**

Dans `src/types/game.ts`, après la déclaration de `CourrierPayloadLettre` (lignes 98-106), ajouter :

```ts
/** Mission reçue par lettre : trouver un objet précis contre récompense. */
export interface CourrierPayloadMission {
  type: "mission";
  expediteurId: string;
  titre: string;
  /** Corps narratif (même rendu que les lettres). */
  corps: string[];
  /** Objet demandé. */
  cible: {
    templateId: string;
    /** État minimum requis pour livrer (Mauvais < Bon < Très bon < Pristin). */
    etatMin?: EtatObjet;
  };
  /** Si défini, mission expirée si `jourActuel > jourLimite`. */
  jourLimite?: number;
  recompense: { argent: number };
}
```

Modifier `export type CourrierPayload = CourrierPayloadLettre;` en :

```ts
export type CourrierPayload = CourrierPayloadLettre | CourrierPayloadMission;
```

Modifier `export type CourrierType = "lettre";` en :

```ts
export type CourrierType = "lettre" | "mission";
```

- [ ] **Step 2: Ajouter `MissionResolution` et `MissionStatut`**

Toujours dans `src/types/game.ts`, juste après le bloc Courrier (après la définition de `Courrier`) :

```ts
/* === Missions (résolution côté state, dérivée des Courrier mission) === */

export type MissionStatut = "active" | "livree" | "expiree";

/** Résolution d'une mission (couple avec un Courrier de type mission). */
export interface MissionResolution {
  /** Référence vers le Courrier qui porte le payload mission. */
  courrierId: string;
  statut: MissionStatut;
  /** Jour de livraison (statut=livree) ou d'expiration (statut=expiree). */
  jourResolution?: number;
}
```

- [ ] **Step 3: Ajouter `LedgerEntry` et `LedgerKind`**

Toujours dans `src/types/game.ts`, juste après `MissionResolution` :

```ts
/* === Grand livre (journal de toutes les transactions de budget) ======= */

export type LedgerKind =
  | "session_chinage"
  | "session_vente"
  | "frais_brocante"
  | "loyer"
  | "gazette"
  | "courrier_recompense"
  | "mission_recompense"
  | "upgrade_atelier"
  | "upgrade_stockage"
  | "upgrade_camion";

export interface LedgerEntry {
  id: string;
  jour: number;
  /** Horodatage absolu (Date.now()) pour le tri stable. */
  timestamp: number;
  kind: LedgerKind;
  /** Libellé court visible dans le tableau : "Brocante du Lac · 4 acquis". */
  designation: string;
  /** Argent entrant (>= 0). */
  recette: number;
  /** Argent sortant (>= 0). */
  depense: number;
  /** Snapshot du budget après l'opération — utilisé pour la colonne Solde. */
  soldeApres: number;
  /** Si l'entrée est liée à une session du joueur (chinage/vente). */
  sessionId?: string;
  /** Si l'entrée est liée à un courrier (récompense lettre / mission). */
  courrierId?: string;
}
```

- [ ] **Step 4: Étendre `GameState`**

Dans `GameState` (ligne 118+), ajouter à la fin (après `declencheursDeclenches`) :

```ts
  /** Grand livre — journal de toutes les transactions de budget. */
  grandLivre: LedgerEntry[];
  /** Résolutions de mission (1 par Courrier de type mission lu). */
  missions: MissionResolution[];
```

- [ ] **Step 5: Mettre à jour le mock `createMockGameState`**

Dans `src/lib/__test-fixtures__/gameState.ts`, dans l'objet `base` retourné par `createMockGameState`, ajouter (juste après `declencheursDeclenches: []`) :

```ts
    grandLivre: [],
    missions: [],
```

- [ ] **Step 6: Vérifier la compilation TypeScript**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit`
Expected: erreurs uniquement sur les usages de `GameState` (nouvellePartie, migrations) qui ne fournissent pas encore `grandLivre`/`missions` — ces erreurs seront résolues aux Tasks 3 et 4. Pas d'autre erreur ailleurs.

- [ ] **Step 7: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/types/game.ts src/lib/__test-fixtures__/gameState.ts
git commit -m "feat(types): payload mission + ledger entry + état mission dans GameState"
```

---

## Task 2: Helper pur `appendLedger` + reconstruction

**Files:**
- Create: `src/lib/grandLivre.ts`
- Create: `src/lib/grandLivre.test.ts`

- [ ] **Step 1: Écrire le test (fail rouge)**

Créer `src/lib/grandLivre.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { appendLedger, reconstruireGrandLivre } from "./grandLivre";
import { createMockGameState } from "./__test-fixtures__/gameState";
import type { SessionChinage, SessionVente } from "@/types/game";

describe("appendLedger", () => {
  it("ajoute une entrée au grand livre et mute le budget par défaut", () => {
    const state = createMockGameState({ budget: 1000 });
    const next = appendLedger(state, {
      jour: 5,
      kind: "gazette",
      designation: "Gazette du jour 5",
      recette: 0,
      depense: 12,
    });
    expect(next.budget).toBe(988);
    expect(next.grandLivre).toHaveLength(1);
    expect(next.grandLivre[0]).toMatchObject({
      jour: 5,
      kind: "gazette",
      depense: 12,
      recette: 0,
      soldeApres: 988,
    });
    expect(typeof next.grandLivre[0].id).toBe("string");
    expect(typeof next.grandLivre[0].timestamp).toBe("number");
  });

  it("avec applyBudget=false : ajoute l'entrée sans toucher au budget", () => {
    const state = createMockGameState({ budget: 1000 });
    const next = appendLedger(
      state,
      {
        jour: 3,
        kind: "session_chinage",
        designation: "Brocante test · 2 acquis",
        recette: 0,
        depense: 50,
        sessionId: "sess-1",
      },
      { applyBudget: false },
    );
    expect(next.budget).toBe(1000);
    expect(next.grandLivre[0].soldeApres).toBe(1000);
    expect(next.grandLivre[0].sessionId).toBe("sess-1");
  });

  it("recette positive crédite le budget", () => {
    const state = createMockGameState({ budget: 100 });
    const next = appendLedger(state, {
      jour: 1,
      kind: "courrier_recompense",
      designation: "Lettre de la mère",
      recette: 150,
      depense: 0,
      courrierId: "c-1",
    });
    expect(next.budget).toBe(250);
    expect(next.grandLivre[0].soldeApres).toBe(250);
    expect(next.grandLivre[0].courrierId).toBe("c-1");
  });
});

describe("reconstruireGrandLivre", () => {
  it("retourne [] pour un historique vide", () => {
    expect(reconstruireGrandLivre([], 1000)).toEqual([]);
  });

  it("crée une entrée par SessionChinage avec depense = total achats", () => {
    const sess: SessionChinage = {
      id: "s1",
      type: "chinage",
      jour: 2,
      timestamp: 1000,
      brocanteId: "broc-1",
      brocanteNom: "Brocante du Lac",
      achats: [
        { nom: "A", categorie: "Musique", etat: "Bon", prixReferenceReel: 30, prixPaye: 20 },
        { nom: "B", categorie: "Musique", etat: "Bon", prixReferenceReel: 50, prixPaye: 30 },
      ],
    };
    const out = reconstruireGrandLivre([sess], 950);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "session_chinage",
      depense: 50,
      recette: 0,
      sessionId: "s1",
      jour: 2,
    });
    expect(out[0].designation).toContain("Brocante du Lac");
    expect(out[0].soldeApres).toBe(950);
  });

  it("crée une entrée par SessionVente avec recette = total ventes brutes", () => {
    const sess: SessionVente = {
      id: "s2",
      type: "vente",
      jour: 3,
      timestamp: 2000,
      niveauCamion: 1,
      loyer: 0,
      ventes: [
        { nom: "X", categorie: "Mode", etat: "Bon", prixReferenceReel: 100, prixVente: 80, prixAchat: 20 },
        { nom: "Y", categorie: "Mode", etat: "Bon", prixReferenceReel: 60, prixVente: 50, prixAchat: 10 },
      ],
      invendus: 0,
    };
    const out = reconstruireGrandLivre([sess], 1130);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "session_vente",
      depense: 0,
      recette: 130,
      sessionId: "s2",
    });
  });

  it("trie chronologiquement (plus ancien en premier) et calcule soldeApres en remontant", () => {
    const s1: SessionChinage = {
      id: "s1", type: "chinage", jour: 1, timestamp: 1000,
      brocanteId: "b", brocanteNom: "B",
      achats: [{ nom: "A", categorie: "Musique", etat: "Bon", prixReferenceReel: 0, prixPaye: 30 }],
    };
    const s2: SessionVente = {
      id: "s2", type: "vente", jour: 2, timestamp: 2000,
      niveauCamion: 1, loyer: 0,
      ventes: [{ nom: "X", categorie: "Mode", etat: "Bon", prixReferenceReel: 0, prixVente: 80, prixAchat: 0 }],
      invendus: 0,
    };
    // L'historique du jeu stocke "plus récent en premier" — on passe les deux ordres.
    const out = reconstruireGrandLivre([s2, s1], 1050);
    // Ordre chrono ascendant : s1 puis s2.
    expect(out.map((e) => e.sessionId)).toEqual(["s1", "s2"]);
    // soldeApres : on remonte depuis 1050 (état courant).
    // Après s2 (vente 80) : 1050. Donc avant s2 = 970. Après s1 (depense 30) = 970. Avant s1 = 1000.
    expect(out[0].soldeApres).toBe(970); // après s1
    expect(out[1].soldeApres).toBe(1050); // après s2
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/grandLivre.test.ts`
Expected: FAIL — `Cannot find module './grandLivre'`.

- [ ] **Step 3: Implémenter `src/lib/grandLivre.ts`**

```ts
import type {
  GameState,
  LedgerEntry,
  LedgerKind,
  Session,
  SessionChinage,
  SessionVente,
} from "@/types/game";

/** Génère un id court stable. */
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AppendLedgerPartial {
  jour: number;
  kind: LedgerKind;
  designation: string;
  recette: number;
  depense: number;
  sessionId?: string;
  courrierId?: string;
}

export interface AppendLedgerOptions {
  /** Si false, n'altère pas le budget (utile pour les entrées agrégées de session — le budget a déjà été muté pendant la journée). Défaut true. */
  applyBudget?: boolean;
  /** Timestamp explicite — par défaut `Date.now()`. */
  timestamp?: number;
}

/**
 * Pousse une entrée dans `state.grandLivre` et (par défaut) applique
 * recette/depense au budget. Retourne un nouveau state (pur).
 */
export function appendLedger(
  state: GameState,
  partial: AppendLedgerPartial,
  opts: AppendLedgerOptions = {},
): GameState {
  const applyBudget = opts.applyBudget !== false;
  const delta = partial.recette - partial.depense;
  const newBudget = applyBudget ? state.budget + delta : state.budget;
  const entry: LedgerEntry = {
    id: makeId(),
    timestamp: opts.timestamp ?? Date.now(),
    soldeApres: newBudget,
    ...partial,
  };
  return {
    ...state,
    budget: newBudget,
    grandLivre: [...state.grandLivre, entry],
  };
}

/** Convertit une session en entrée ledger (helper interne, exporté pour tests). */
export function sessionToLedgerEntry(
  s: Session,
  soldeApres: number,
): LedgerEntry {
  if (s.type === "chinage") {
    return sessionChinageToEntry(s, soldeApres);
  }
  return sessionVenteToEntry(s, soldeApres);
}

function sessionChinageToEntry(
  s: SessionChinage,
  soldeApres: number,
): LedgerEntry {
  const depense = s.achats.reduce((sum, a) => sum + a.prixPaye, 0);
  const n = s.achats.length;
  return {
    id: `ledger-rebuild-${s.id}`,
    timestamp: s.timestamp,
    jour: s.jour,
    kind: "session_chinage",
    designation: `${s.brocanteNom} · ${n} acqui${n > 1 ? "s" : ""}`,
    recette: 0,
    depense,
    soldeApres,
    sessionId: s.id,
  };
}

function sessionVenteToEntry(
  s: SessionVente,
  soldeApres: number,
): LedgerEntry {
  const recette = s.ventes.reduce((sum, v) => sum + v.prixVente, 0);
  const n = s.ventes.length;
  return {
    id: `ledger-rebuild-${s.id}`,
    timestamp: s.timestamp,
    jour: s.jour,
    kind: "session_vente",
    designation: `Étal · ${n} vente${n > 1 ? "s" : ""}`,
    recette,
    depense: 0,
    soldeApres,
    sessionId: s.id,
  };
}

/**
 * Reconstruit best-effort un grand livre depuis l'historique de sessions.
 * Tri chronologique ascendant. `soldeApres` est calculé en remontant depuis
 * `budgetActuel` (la dernière entrée a `soldeApres = budgetActuel`, les
 * précédentes retirent l'effet des suivantes).
 */
export function reconstruireGrandLivre(
  historique: Session[],
  budgetActuel: number,
): LedgerEntry[] {
  if (historique.length === 0) return [];
  // Tri chronologique ascendant.
  const sortedAsc = [...historique].sort((a, b) => a.timestamp - b.timestamp);
  // On calcule d'abord les recette/depense de chaque session, puis on remonte
  // le solde depuis le dernier vers le premier.
  const drafts = sortedAsc.map((s) => sessionToLedgerEntry(s, 0));
  let runningSolde = budgetActuel;
  for (let i = drafts.length - 1; i >= 0; i--) {
    drafts[i].soldeApres = runningSolde;
    runningSolde -= drafts[i].recette - drafts[i].depense;
  }
  return drafts;
}
```

- [ ] **Step 4: Relancer les tests, vérifier qu'ils passent**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/grandLivre.test.ts`
Expected: PASS — 6 tests verts.

- [ ] **Step 5: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/lib/grandLivre.ts src/lib/grandLivre.test.ts
git commit -m "feat(grand-livre): helper appendLedger + reconstruction depuis historique"
```

---

## Task 3: Migration save N=3 — initialise grandLivre + missions

**Files:**
- Modify: `src/lib/migrations.ts`
- Modify: `src/lib/migrations.test.ts`

- [ ] **Step 1: Écrire les nouveaux tests de migration**

Dans `src/lib/migrations.test.ts`, ajouter en fin de fichier :

```ts
describe("migrerSauvegarde — grand livre & missions", () => {
  it("ajoute grandLivre vide si historique est vide", () => {
    const state = createMockGameState({ historique: [], budget: 500 });
    const migrated = migrerSauvegarde(state);
    expect(migrated.grandLivre).toEqual([]);
    expect(migrated.missions).toEqual([]);
  });

  it("reconstruit grandLivre depuis l'historique des sessions", () => {
    const state = createMockGameState({
      budget: 950,
      historique: [
        {
          id: "s1",
          type: "chinage",
          jour: 2,
          timestamp: 1000,
          brocanteId: "broc-1",
          brocanteNom: "Test",
          achats: [
            { nom: "A", categorie: "Musique", etat: "Bon", prixReferenceReel: 0, prixPaye: 50 },
          ],
        },
      ],
    });
    const migrated = migrerSauvegarde(state);
    expect(migrated.grandLivre).toHaveLength(1);
    expect(migrated.grandLivre[0]).toMatchObject({
      kind: "session_chinage",
      depense: 50,
      sessionId: "s1",
      soldeApres: 950,
    });
  });

  it("conserve grandLivre existant si déjà peuplé", () => {
    const existantEntry = {
      id: "x1",
      timestamp: 100,
      jour: 1,
      kind: "gazette" as const,
      designation: "Gazette",
      recette: 0,
      depense: 12,
      soldeApres: 988,
    };
    const state = createMockGameState({ grandLivre: [existantEntry] });
    const migrated = migrerSauvegarde(state);
    expect(migrated.grandLivre).toEqual([existantEntry]);
  });

  it("SAVE_VERSION incrémenté à 3", () => {
    expect(SAVE_VERSION).toBe(3);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/migrations.test.ts`
Expected: FAIL (SAVE_VERSION encore 2, `grandLivre`/`missions` undefined).

- [ ] **Step 3: Bump SAVE_VERSION + ajouter import**

Dans `src/lib/migrations.ts` :

Modifier ligne 39 : `export const SAVE_VERSION = 2;` → `export const SAVE_VERSION = 3;`

Ajouter à la liste d'imports en haut, juste après l'import depuis `./tendances` :

```ts
import { reconstruireGrandLivre } from "./grandLivre";
```

- [ ] **Step 4: Ajouter `grandLivre` et `missions` dans `appliquerMigrations`**

Dans le `return { ...loaded, ... }` final de `appliquerMigrations` (lignes 273+), ajouter avant la dernière accolade (juste après `declencheursDeclenches: ...`) :

```ts
    grandLivre: (() => {
      const existing = (loaded as Partial<GameState>).grandLivre;
      if (Array.isArray(existing) && existing.length > 0) return existing;
      // Reconstruction best-effort depuis l'historique migré.
      return reconstruireGrandLivre(historique, loaded.budget ?? 0);
    })(),
    missions: (() => {
      const existing = (loaded as Partial<GameState>).missions;
      if (Array.isArray(existing)) return existing;
      return [];
    })(),
```

- [ ] **Step 5: Relancer les tests migration**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/migrations.test.ts`
Expected: PASS — tous les tests verts, dont les 4 nouveaux.

- [ ] **Step 6: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(migrations): bump SAVE_VERSION 3 — grandLivre reconstruit + missions vides"
```

---

## Task 4: GameContext — wrapping setState pour push ledger

**Files:**
- Modify: `src/context/GameContext.tsx`

Cette tâche instrumente toutes les mutations atomiques du budget pour qu'elles passent par `appendLedger`. Les mutations agrégées de session (enregistrerSession) sont traitées à la Task 6.

- [ ] **Step 1: Importer le helper**

Ajouter en haut de `src/context/GameContext.tsx`, juste après l'import depuis `./migrations` (ligne ~30) :

```ts
import { appendLedger } from "@/lib/grandLivre";
```

Pas d'autre import nécessaire — `GameState`, `Session`, `EtatObjet` sont déjà importés.

- [ ] **Step 2: Initialiser `grandLivre` et `missions` dans `nouvellePartie`**

Dans le `setState({...})` de `nouvellePartie` (lignes 178-204), ajouter à la fin (avant la `})` fermante de `setState`) :

```ts
      grandLivre: [],
      missions: [],
```

- [ ] **Step 3: Instrumenter `acheterGazette`**

Remplacer le `setState((prev) => prev ? {...} : prev)` de `acheterGazette` (lignes 907-915) par :

```ts
    setState((prev) => {
      if (!prev) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "gazette",
        designation: `Gazette du jour ${prev.jourActuel}`,
        recette: 0,
        depense: PRIX_GAZETTE,
      });
      return { ...next, gazetteAchetee: true };
    });
```

- [ ] **Step 4: Instrumenter `marquerCourrierLu` (récompense lettre)**

Remplacer le corps de `marquerCourrierLu` (lignes 878-895) par :

```ts
  const marquerCourrierLu = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const cible = prev.courriers.find((c) => c.id === id);
      if (!cible || cible.lu) return prev;
      // Marque lu (immuable).
      const courriersMaj = prev.courriers.map((c) =>
        c.id === id ? { ...c, lu: true } : c,
      );
      let next: GameState = { ...prev, courriers: courriersMaj };
      // Récompense argent (lettre uniquement — les missions sont payées à la livraison).
      if (cible.payload.type === "lettre" && cible.payload.recompense?.argent) {
        next = appendLedger(next, {
          jour: prev.jourActuel,
          kind: "courrier_recompense",
          designation: cible.payload.titre,
          recette: cible.payload.recompense.argent,
          depense: 0,
          courrierId: id,
        });
      }
      // Création de la résolution mission si payload mission.
      if (cible.payload.type === "mission") {
        next = {
          ...next,
          missions: [
            ...next.missions,
            { courrierId: id, statut: "active" },
          ],
        };
      }
      return next;
    });
  }, []);
```

- [ ] **Step 5: Instrumenter `ameliorerAtelier`**

Remplacer le `setState((prev) => prev ? {...} : prev)` (lignes 347-355) par :

```ts
    setState((prev) => {
      if (!prev) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "upgrade_atelier",
        designation: `Atelier N${upgrade.niveauCible}`,
        recette: 0,
        depense: upgrade.cout,
      });
      return { ...next, niveauAtelier: upgrade.niveauCible };
    });
```

- [ ] **Step 6: Instrumenter `ameliorerStockage`**

Remplacer le `setState` de `ameliorerStockage` (lignes 369-377) par :

```ts
    setState((prev) => {
      if (!prev) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "upgrade_stockage",
        designation: `Stockage N${upgrade.niveauCible}`,
        recette: 0,
        depense: upgrade.cout,
      });
      return { ...next, niveauStockage: upgrade.niveauCible };
    });
```

- [ ] **Step 7: Instrumenter `acheterCamion`**

Remplacer le corps du `setState` de `acheterCamion` (lignes 499-506) par :

```ts
    setState((prev) => {
      if (!prev) return prev;
      if (niveau !== prev.niveauCamion + 1) return prev;
      const camion = getCamion(niveau);
      const prix = camion.prixUpgradeVersCeNiveau ?? 0;
      if (prev.budget < prix) return prev;
      const next = appendLedger(prev, {
        jour: prev.jourActuel,
        kind: "upgrade_camion",
        designation: `Camion N${niveau}`,
        recette: 0,
        depense: prix,
      });
      return { ...next, niveauCamion: niveau };
    });
```

- [ ] **Step 8: Vérifier que la compilation passe**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit`
Expected: pas d'erreur (toutes les mutations budget passent par appendLedger).

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run`
Expected: tous les tests existants verts.

- [ ] **Step 9: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/context/GameContext.tsx
git commit -m "feat(context): instrumente gazette/courrier/upgrades via appendLedger"
```

---

## Task 5: Action `payerFraisBrocante` + câblage

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`
- Modify: `src/app/vitrine/[brocanteId]/ClientPage.tsx`

- [ ] **Step 1: Ajouter `payerFraisBrocante` dans `GameActionsValue`**

Dans `src/context/GameContext.tsx`, dans l'interface `GameActionsValue` (lignes 78-139), ajouter (avant `marquerCourrierLu`) :

```ts
  /** Paie le droit d'entrée d'une brocante (log ledger entry + déduit budget). */
  payerFraisBrocante: (brocanteId: string, brocanteNom: string, montant: number) => void;
```

- [ ] **Step 2: Implémenter `payerFraisBrocante`**

Dans le corps de `GameProvider`, juste après `acheterGazette` (vers ligne 917), ajouter :

```ts
  const payerFraisBrocante = useCallback(
    (brocanteId: string, brocanteNom: string, montant: number) => {
      void brocanteId;
      if (montant <= 0) return;
      setState((prev) => {
        if (!prev) return prev;
        return appendLedger(prev, {
          jour: prev.jourActuel,
          kind: "frais_brocante",
          designation: `Entrée · ${brocanteNom}`,
          recette: 0,
          depense: montant,
        });
      });
    },
    [],
  );
```

- [ ] **Step 3: Exposer `payerFraisBrocante` dans `actionsValue`**

Dans le `useMemo` de `actionsValue` (lignes 926-1001), ajouter `payerFraisBrocante` à l'objet ET à la deps array. Ajouter juste avant `marquerBossDebloqueVu` :

```ts
      payerFraisBrocante,
```

(deux fois : dans la valeur du `useMemo` et dans son tableau de dépendances.)

- [ ] **Step 4: Câbler dans `/chiner`**

Dans `src/app/chiner/[brocanteId]/ClientPage.tsx` :

- Importer `payerFraisBrocante` depuis `useGame()`. Vers la ligne ~42 où `ajusterBudget` est déstructuré, ajouter `payerFraisBrocante`.
- Remplacer la ligne `ajusterBudget(-frais);` (ligne 98) par `payerFraisBrocante(brocante.id, brocante.nom, frais);`
- Mettre à jour le tableau de dépendances du `useEffect` correspondant (ligne 118) : retirer `ajusterBudget` s'il n'est plus utilisé, ajouter `payerFraisBrocante`.

- [ ] **Step 5: Câbler dans `/vitrine` (prep)**

Dans `src/app/vitrine/[brocanteId]/ClientPage.tsx`, repérer la mutation `ajusterBudget(-frais)` (ligne ~116) et faire la même substitution :
- Déstructurer `payerFraisBrocante`.
- Remplacer par `payerFraisBrocante(brocante.id, brocante.nom, frais);`
- Mettre à jour les dépendances du callback/effet concerné.

- [ ] **Step 6: Vérifier la compilation + tests**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit && npx vitest run`
Expected: tout vert.

- [ ] **Step 7: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/context/GameContext.tsx src/app/chiner/[brocanteId]/ClientPage.tsx src/app/vitrine/[brocanteId]/ClientPage.tsx
git commit -m "feat(brocante): payerFraisBrocante centralisé + ledger entry"
```

---

## Task 6: Sessions + loyer dans le grand livre

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Instrumenter `enregistrerSession`**

Remplacer le corps de `enregistrerSession` (lignes 584-588) par :

```ts
  const enregistrerSession = useCallback((session: Session) => {
    setState((prev) => {
      if (!prev) return prev;
      const withSession = {
        ...prev,
        historique: [session, ...prev.historique],
      };
      // Push une entrée ledger informative (le budget a déjà été muté pendant
      // la journée par ajusterBudget / vendreDeVitrine — applyBudget=false).
      if (session.type === "chinage") {
        const depense = session.achats.reduce((s, a) => s + a.prixPaye, 0);
        const n = session.achats.length;
        return appendLedger(
          withSession,
          {
            jour: session.jour,
            kind: "session_chinage",
            designation: `${session.brocanteNom} · ${n} acqui${n > 1 ? "s" : ""}`,
            recette: 0,
            depense,
            sessionId: session.id,
          },
          { applyBudget: false, timestamp: session.timestamp },
        );
      }
      const recette = session.ventes.reduce((s, v) => s + v.prixVente, 0);
      const n = session.ventes.length;
      return appendLedger(
        withSession,
        {
          jour: session.jour,
          kind: "session_vente",
          designation: `Étal · ${n} vente${n > 1 ? "s" : ""}`,
          recette,
          depense: 0,
          sessionId: session.id,
        },
        { applyBudget: false, timestamp: session.timestamp },
      );
    });
  }, []);
```

- [ ] **Step 2: Instrumenter le loyer dans `avancerJour`**

Dans `avancerJour` (lignes 231-303), la partie loyer (lignes 267-278) calcule `budgetApresLoyer` et `dernierLoyer`. Refacto : on ne touche plus à budget directement, on passe par `appendLedger` après le calcul de la nouvelle base.

Repérer la partie :

```ts
      // Loyer hebdomadaire …
      const tierStockage = refresh ? getStockageTierParNiveau(prev.niveauStockage) : null;
      const budgetApresLoyer = tierStockage
        ? prev.budget - tierStockage.loyerHebdo
        : prev.budget;
      const dernierLoyer = tierStockage
        ? {
            jour: nouveauJour,
            montant: tierStockage.loyerHebdo,
            tierNom: tierStockage.nom,
          }
        : prev.dernierLoyer;
```

Et le `return { ... }` final qui contient `budget: budgetApresLoyer,`.

Refactoriser ainsi : conserver la construction du `next` state avec toutes les mutations non-monétaires, puis APRÈS le `return` initial, appliquer le loyer via `appendLedger`. Réorganiser comme suit :

Remplacer le bloc loyer + return final par :

```ts
      const tierStockage = refresh ? getStockageTierParNiveau(prev.niveauStockage) : null;
      const dernierLoyer = tierStockage
        ? {
            jour: nouveauJour,
            montant: tierStockage.loyerHebdo,
            tierNom: tierStockage.nom,
          }
        : prev.dernierLoyer;

      // Base state (sans encore appliquer le loyer)
      const base: GameState = {
        ...prev,
        jourActuel: nouveauJour,
        inventaireJoueur: inv,
        tendances,
        prochainesTendances,
        prochainRafraichissementTendances: refresh
          ? prochainLundi(nouveauJour + 1)
          : prev.prochainRafraichissementTendances,
        gazetteAchetee: refresh ? false : prev.gazetteAchetee,
        meteoSemaine: refresh ? tirerMeteoSemaine() : prev.meteoSemaine,
        celebriteActuelle: refresh ? tirerCelebrite() : prev.celebriteActuelle,
        influenceUtilisee: refresh ? false : prev.influenceUtilisee,
        dernierLoyer,
        chatSurFauteuil,
        passagesSansChat,
      };

      // Loyer (si refresh hebdo)
      if (tierStockage) {
        return appendLedger(base, {
          jour: nouveauJour,
          kind: "loyer",
          designation: `Loyer · ${tierStockage.nom}`,
          recette: 0,
          depense: tierStockage.loyerHebdo,
        });
      }
      return base;
    });
  }, []);
```

(Supprimer aussi la ligne `budget: budgetApresLoyer,` dans l'ancien return — elle est remplacée par `appendLedger`.)

- [ ] **Step 3: Vérifier compilation + tests**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit && npx vitest run`
Expected: tout vert.

- [ ] **Step 4: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/context/GameContext.tsx
git commit -m "feat(context): sessions + loyer dans le grand livre"
```

---

## Task 7: Missions — livraison + expiration + helper courrier

**Files:**
- Modify: `src/lib/courrier.ts`
- Modify: `src/lib/courrier.test.ts`
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Tests pour `expireMissions` et `creerCourrierMission`**

Dans `src/lib/courrier.test.ts`, ajouter à la fin :

```ts
import { creerCourrierMission, expireMissions } from "./courrier";
import type { Courrier, MissionResolution } from "@/types/game";

describe("creerCourrierMission", () => {
  it("crée un courrier de type mission avec les bons champs", () => {
    const c = creerCourrierMission({
      id: "miss-1",
      jour: 5,
      expediteurId: "joueur_vide_grenier",
      titre: "Une quête vidéoludique",
      corps: ["Cher chineur,", "Trouve-moi **Ocarina of Time**."],
      cible: { templateId: "jeu.zelda_ocarina", etatMin: "Très bon" },
      jourLimite: 12,
      recompense: { argent: 200 },
    });
    expect(c.type).toBe("mission");
    expect(c.lu).toBe(false);
    expect(c.jourRecu).toBe(5);
    if (c.payload.type === "mission") {
      expect(c.payload.cible.templateId).toBe("jeu.zelda_ocarina");
      expect(c.payload.cible.etatMin).toBe("Très bon");
      expect(c.payload.jourLimite).toBe(12);
      expect(c.payload.recompense.argent).toBe(200);
    } else {
      throw new Error("payload should be mission");
    }
  });
});

describe("expireMissions", () => {
  function missionCourrier(id: string, jourLimite?: number): Courrier {
    return {
      id,
      type: "mission",
      jourRecu: 1,
      lu: true,
      payload: {
        type: "mission",
        expediteurId: "x",
        titre: "T",
        corps: [],
        cible: { templateId: "tpl" },
        jourLimite,
        recompense: { argent: 50 },
      },
    };
  }

  it("expire les missions actives dont jourLimite < jourActuel", () => {
    const courriers: Courrier[] = [missionCourrier("m1", 5)];
    const missions: MissionResolution[] = [{ courrierId: "m1", statut: "active" }];
    const out = expireMissions(missions, courriers, 6);
    expect(out).toEqual([
      { courrierId: "m1", statut: "expiree", jourResolution: 6 },
    ]);
  });

  it("laisse intactes les missions sans jourLimite", () => {
    const courriers: Courrier[] = [missionCourrier("m1")];
    const missions: MissionResolution[] = [{ courrierId: "m1", statut: "active" }];
    const out = expireMissions(missions, courriers, 999);
    expect(out).toEqual(missions);
  });

  it("laisse intactes les missions déjà livrées", () => {
    const courriers: Courrier[] = [missionCourrier("m1", 2)];
    const missions: MissionResolution[] = [
      { courrierId: "m1", statut: "livree", jourResolution: 1 },
    ];
    const out = expireMissions(missions, courriers, 100);
    expect(out).toEqual(missions);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/courrier.test.ts`
Expected: FAIL — fonctions non exportées.

- [ ] **Step 3: Ajouter `creerCourrierMission` et `expireMissions` dans `src/lib/courrier.ts`**

Modifier les imports en haut :

```ts
import type {
  Courrier,
  CourrierPayloadMission,
  EtatObjet,
  MissionResolution,
} from "@/types/game";
```

Ajouter à la fin du fichier :

```ts
/** Crée un Courrier de type mission. */
export function creerCourrierMission(args: {
  id: string;
  jour: number;
  expediteurId: string;
  titre: string;
  corps: string[];
  cible: { templateId: string; etatMin?: EtatObjet };
  jourLimite?: number;
  recompense: { argent: number };
}): Courrier {
  const payload: CourrierPayloadMission = {
    type: "mission",
    expediteurId: args.expediteurId,
    titre: args.titre,
    corps: args.corps,
    cible: args.cible,
    recompense: args.recompense,
    ...(args.jourLimite !== undefined ? { jourLimite: args.jourLimite } : {}),
  };
  return {
    id: args.id,
    type: "mission",
    jourRecu: args.jour,
    lu: false,
    payload,
  };
}

/**
 * Marque comme expirées les missions actives dont le courrier porte un
 * `jourLimite` dépassé. Retourne un nouveau tableau.
 */
export function expireMissions(
  missions: MissionResolution[],
  courriers: Courrier[],
  jourActuel: number,
): MissionResolution[] {
  const indexCourrier = new Map(courriers.map((c) => [c.id, c]));
  return missions.map((m) => {
    if (m.statut !== "active") return m;
    const c = indexCourrier.get(m.courrierId);
    if (!c || c.payload.type !== "mission") return m;
    const limite = c.payload.jourLimite;
    if (typeof limite !== "number") return m;
    if (jourActuel <= limite) return m;
    return { ...m, statut: "expiree", jourResolution: jourActuel };
  });
}
```

- [ ] **Step 4: Relancer les tests courrier**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/courrier.test.ts`
Expected: PASS.

- [ ] **Step 5: Ajouter `livrerMission` au context**

Dans `src/context/GameContext.tsx` :

Ajouter à `GameActionsValue` (avant `marquerCourrierLu`) :

```ts
  /** Livre une mission : retire l'objet ciblé de l'inventaire et crédite la récompense. */
  livrerMission: (courrierId: string) => { ok: boolean; raison?: string };
```

Ajouter aussi à l'import de types : `MissionResolution` si pas déjà présent.

Importer le helper en haut, à côté des autres imports `./courrier` :

```ts
import {
  // ... existant
  expireMissions,
} from "@/lib/courrier";
```

Ajouter, juste avant `acheterGazette` dans `GameProvider` :

```ts
  const livrerMission = useCallback(
    (courrierId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const courrier = current.courriers.find((c) => c.id === courrierId);
      if (!courrier || courrier.payload.type !== "mission") {
        return { ok: false, raison: "Mission introuvable." };
      }
      const reso = current.missions.find((m) => m.courrierId === courrierId);
      if (!reso || reso.statut !== "active") {
        return { ok: false, raison: "Mission non active." };
      }
      const { cible, recompense } = courrier.payload;
      const ETATS_ORDRE: EtatObjet[] = ["Mauvais", "Bon", "Très bon", "Pristin état"];
      const minIdx = cible.etatMin ? ETATS_ORDRE.indexOf(cible.etatMin) : 0;
      const matchIdx = current.inventaireJoueur.findIndex(
        (o) =>
          o.templateId === cible.templateId &&
          !o.enRestauration &&
          ETATS_ORDRE.indexOf(o.etat) >= minIdx,
      );
      if (matchIdx === -1) {
        return { ok: false, raison: "Aucun objet correspondant dans l'inventaire." };
      }
      setState((prev) => {
        if (!prev) return prev;
        const invMaj = prev.inventaireJoueur.filter((_, i) => i !== matchIdx);
        const missionsMaj = prev.missions.map((m) =>
          m.courrierId === courrierId
            ? { ...m, statut: "livree" as const, jourResolution: prev.jourActuel }
            : m,
        );
        const credited = appendLedger(prev, {
          jour: prev.jourActuel,
          kind: "mission_recompense",
          designation: `Mission · ${courrier.payload.type === "mission" ? courrier.payload.titre : ""}`,
          recette: recompense.argent,
          depense: 0,
          courrierId,
        });
        return { ...credited, inventaireJoueur: invMaj, missions: missionsMaj };
      });
      return { ok: true };
    },
    [],
  );
```

Exposer `livrerMission` dans le `useMemo` `actionsValue` (objet + deps), à côté de `payerFraisBrocante`.

- [ ] **Step 6: Brancher l'expiration des missions dans `avancerJour`**

Dans `avancerJour`, juste avant le `if (tierStockage)` de la Task 6, ajouter :

```ts
      // Tick d'expiration des missions actives à échéance.
      const missionsApresExpiration = expireMissions(
        prev.missions,
        prev.courriers,
        nouveauJour,
      );
      base.missions = missionsApresExpiration;
```

(NB : `base` ayant été construit juste avant, on assigne `missions` en place — alternative : reconstruire le spread. Si l'assignment directe ne plaît pas au linter, refacto :)

```ts
      const baseAvecMissions: GameState = { ...base, missions: missionsApresExpiration };
      if (tierStockage) {
        return appendLedger(baseAvecMissions, { /* ... loyer ... */ });
      }
      return baseAvecMissions;
```

(Choisir la 2e variante : plus propre.)

- [ ] **Step 7: Vérifier compilation + tests**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit && npx vitest run`
Expected: tout vert.

- [ ] **Step 8: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/lib/courrier.ts src/lib/courrier.test.ts src/context/GameContext.tsx
git commit -m "feat(missions): création, livraison, expiration par tick journalier"
```

---

## Task 8: `CourrierSheet` — rendu du payload mission

**Files:**
- Modify: `src/components/mobile/qg/sheets/CourrierSheet.tsx`

- [ ] **Step 1: Ajouter une branche de rendu mission**

Dans `src/components/mobile/qg/sheets/CourrierSheet.tsx`, repérer la fonction `renderLettre(c)` (lignes 169-184). Ajouter en dessous une fonction `renderMission` :

```tsx
const cibleEncart: CSSProperties = {
  marginTop: 14,
  padding: "10px 12px",
  border: "1px dashed #a88f5a",
  background: "rgba(255,250,235,0.5)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "#3a2f1e",
  display: "grid",
  gap: 4,
};

function renderMission(c: Courrier) {
  if (c.payload.type !== "mission") return null;
  const p = c.payload;
  const exp = getExpediteur(p.expediteurId);
  return (
    <>
      <h3 style={titreLettre}>{p.titre}</h3>
      {p.corps.map((para, i) => (
        <p key={i} style={i === 0 ? corpsLettrePremier : corpsLettre}>
          {renderParaText(para)}
        </p>
      ))}
      <div style={cibleEncart}>
        <div>
          <strong>Objet recherché :</strong> {p.cible.templateId}
          {p.cible.etatMin ? ` (min. ${p.cible.etatMin})` : ""}
        </div>
        <div>
          <strong>Récompense :</strong> +{p.recompense.argent} €
        </div>
        {p.jourLimite !== undefined && (
          <div>
            <strong>Avant le jour :</strong> {p.jourLimite}
          </div>
        )}
      </div>
      {exp && <div style={signatureLettre}>{exp.signature}</div>}
    </>
  );
}
```

- [ ] **Step 2: Brancher le sélecteur de rendu**

Dans le composant `CourrierSheet`, repérer le `<article style={lettreCard}>{renderLettre(courant)}</article>` (ligne ~258). Remplacer par :

```tsx
          <article style={lettreCard}>
            {courant.payload.type === "mission"
              ? renderMission(courant)
              : renderLettre(courant)}
          </article>
```

- [ ] **Step 3: Adapter le label du bouton "Accepter" vs "Récupérer"**

Toujours dans `CourrierSheet`, modifier la condition `recompenseArgent` (ligne ~233) :

Avant :

```tsx
  const recompenseArgent =
    courant.payload.type === "lettre" && courant.payload.recompense?.argent;
```

Après :

```tsx
  const recompenseArgent =
    courant.payload.type === "lettre" ? courant.payload.recompense?.argent : null;
  const estMission = courant.payload.type === "mission";
```

Modifier le label du bouton (ligne ~262) :

```tsx
              {estMission
                ? "Accepter la mission"
                : recompenseArgent
                  ? `Récupérer ${recompenseArgent} €`
                  : "Compris"}
```

Note : `marquerCourrierLu` côté context gère déjà la création de la `MissionResolution` (Task 4 Step 4) quand on valide une mission.

- [ ] **Step 4: Vérifier le rendu**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit`
Expected: pas d'erreur.

- [ ] **Step 5: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/components/mobile/qg/sheets/CourrierSheet.tsx
git commit -m "feat(courrier-sheet): rendu mission + bouton Accepter"
```

---

## Task 9: Composant `CarnetOverlay`

**Files:**
- Create: `src/components/mobile/qg/overlays/CarnetOverlay.tsx`

- [ ] **Step 1: Créer le composant**

Créer le dossier `src/components/mobile/qg/overlays/` puis le fichier `CarnetOverlay.tsx` :

```tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { getTemplate } from "@/data/objetTemplates";
import type {
  Courrier,
  CourrierPayloadMission,
  EtatObjet,
  GameState,
  LedgerEntry,
  MissionResolution,
  Session,
  SessionChinage,
  SessionVente,
} from "@/types/game";

interface CarnetOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
}

type Tab = "comptes" | "missions";

const ETATS_ORDRE: EtatObjet[] = ["Mauvais", "Bon", "Très bon", "Pristin état"];

/* ─── styles ─── */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "grid",
  placeItems: "center",
  padding: "max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom))",
};

const carnet: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 480,
  maxHeight: "92dvh",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow:
    "inset 0 0 28px rgba(120, 90, 40, 0.18), 0 12px 28px rgba(0,0,0,0.35)",
  borderRadius: 3,
  transform: "rotate(-0.4deg)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  zIndex: 2,
};

const enTete: CSSProperties = {
  padding: "18px 20px 8px",
  borderBottom: "2px solid #1a1308",
  textAlign: "center",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  letterSpacing: "0.04em",
  color: "#1a1308",
  margin: 0,
};

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#5e4a25",
  marginTop: 4,
};

const tabsRow: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #b89c5e",
};

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "10px 12px",
    fontFamily: "var(--font-display)",
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    background: active ? "#1a1308" : "transparent",
    color: active ? "#f1e4c0" : "#5e4a25",
    border: "none",
    cursor: "pointer",
    position: "relative",
  };
}

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  right: 10,
  background: "#a31f1f",
  color: "#fff",
  borderRadius: 10,
  padding: "1px 6px",
  fontSize: 9,
  fontFamily: "var(--font-mono)",
};

const contenu: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px 18px",
};

/* ─── Comptes (tableau lined-paper) ─── */

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
};

const thStyle: CSSProperties = {
  background: "#1a1308",
  color: "#f1e4c0",
  fontFamily: "var(--font-display)",
  fontSize: 9.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  padding: "6px 6px",
  textAlign: "left",
  position: "sticky",
  top: 0,
};

const tdStyle: CSSProperties = {
  padding: "6px 6px",
  borderBottom: "1px dotted #c8b48a",
  verticalAlign: "top",
};

const totalRowStyle: CSSProperties = {
  background: "#efe2bd",
  fontFamily: "var(--font-display)",
  fontSize: 11,
};

/* ─── Helpers ─── */

function kindLabel(k: LedgerEntry["kind"]): string {
  switch (k) {
    case "session_chinage": return "Chinage";
    case "session_vente": return "Vente";
    case "frais_brocante": return "Entrée";
    case "loyer": return "Loyer";
    case "gazette": return "Gazette";
    case "courrier_recompense": return "Courrier";
    case "mission_recompense": return "Mission";
    case "upgrade_atelier": return "Atelier";
    case "upgrade_stockage": return "Stockage";
    case "upgrade_camion": return "Camion";
  }
}

function findSession(state: GameState, sessionId: string): Session | null {
  return state.historique.find((s) => s.id === sessionId) ?? null;
}

function CompteRow({
  e,
  expanded,
  onToggle,
  state,
}: {
  e: LedgerEntry;
  expanded: boolean;
  onToggle: () => void;
  state: GameState;
}) {
  const isSession = e.kind === "session_chinage" || e.kind === "session_vente";
  return (
    <>
      <tr onClick={isSession ? onToggle : undefined} style={{ cursor: isSession ? "pointer" : "default" }}>
        <td style={{ ...tdStyle, width: 36, color: "#5e4a25" }}>J{e.jour}</td>
        <td style={tdStyle}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5e4a25" }}>
            {kindLabel(e.kind)}
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "#1a1308" }}>
            {e.designation} {isSession ? (expanded ? "▾" : "▸") : null}
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: "right", color: "#2c5e3f", width: 56 }}>
          {e.recette > 0 ? `+${e.recette}` : ""}
        </td>
        <td style={{ ...tdStyle, textAlign: "right", color: "#a31f1f", width: 56 }}>
          {e.depense > 0 ? `−${e.depense}` : ""}
        </td>
        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-display)", width: 60 }}>
          {e.soldeApres} €
        </td>
      </tr>
      {expanded && e.sessionId && (() => {
        const sess = findSession(state, e.sessionId);
        if (!sess) return null;
        return (
          <tr>
            <td colSpan={5} style={{ ...tdStyle, background: "rgba(255,250,235,0.5)", paddingTop: 4 }}>
              {sess.type === "chinage" ? <DetailsChinage s={sess} /> : <DetailsVente s={sess} />}
            </td>
          </tr>
        );
      })()}
    </>
  );
}

function DetailsChinage({ s }: { s: SessionChinage }) {
  return (
    <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
      {s.achats.map((a, i) => (
        <li key={i}>
          {a.nom} ({a.etat}) — <span style={{ color: "#a31f1f" }}>−{a.prixPaye} €</span>
        </li>
      ))}
    </ul>
  );
}

function DetailsVente({ s }: { s: SessionVente }) {
  return (
    <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
      {s.ventes.map((v, i) => (
        <li key={i}>
          {v.nom} ({v.etat}) — <span style={{ color: "#2c5e3f" }}>+{v.prixVente} €</span>
          {v.prixAchat != null ? ` (acheté ${v.prixAchat} €)` : ""}
        </li>
      ))}
      {s.invendus > 0 && (
        <li style={{ fontStyle: "italic", color: "#5e4a25" }}>
          {s.invendus} invendu{s.invendus > 1 ? "s" : ""}.
        </li>
      )}
    </ul>
  );
}

function OngletComptes({ state }: { state: GameState }) {
  const entries = useMemo(
    () => [...state.grandLivre].sort((a, b) => b.timestamp - a.timestamp),
    [state.grandLivre],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (entries.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        Aucune écriture.
      </p>
    );
  }
  const totalRec = entries.reduce((s, e) => s + e.recette, 0);
  const totalDep = entries.reduce((s, e) => s + e.depense, 0);
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Date</th>
          <th style={thStyle}>Désignation</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Recettes</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Dépenses</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Solde</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <CompteRow
            key={e.id}
            e={e}
            expanded={expanded.has(e.id)}
            onToggle={() => {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(e.id)) next.delete(e.id);
                else next.add(e.id);
                return next;
              });
            }}
            state={state}
          />
        ))}
        <tr style={totalRowStyle}>
          <td style={tdStyle} colSpan={2}>Total</td>
          <td style={{ ...tdStyle, textAlign: "right", color: "#2c5e3f" }}>+{totalRec}</td>
          <td style={{ ...tdStyle, textAlign: "right", color: "#a31f1f" }}>−{totalDep}</td>
          <td style={{ ...tdStyle, textAlign: "right" }}>{state.budget} €</td>
        </tr>
      </tbody>
    </table>
  );
}

/* ─── Missions (cartes) ─── */

function statutLabel(s: MissionResolution["statut"], livrable: boolean): string {
  if (s === "livree") return "Livrée";
  if (s === "expiree") return "Expirée";
  return livrable ? "Livrable" : "Active";
}

function statutColor(s: MissionResolution["statut"], livrable: boolean): string {
  if (s === "livree") return "#2c5e3f";
  if (s === "expiree") return "#5e4a25";
  return livrable ? "#a31f1f" : "#5e4a25";
}

const missionCard: CSSProperties = {
  padding: "12px 14px",
  border: "1px solid #b89c5e",
  background: "rgba(255,250,235,0.65)",
  marginBottom: 12,
  borderRadius: 2,
};

function MissionCarte({
  courrier,
  reso,
  state,
  onLivrer,
}: {
  courrier: Courrier;
  reso: MissionResolution;
  state: GameState;
  onLivrer: () => void;
}) {
  if (courrier.payload.type !== "mission") return null;
  const p: CourrierPayloadMission = courrier.payload;
  const tpl = getTemplate(p.cible.templateId);
  const nomCible = tpl?.nom ?? p.cible.templateId;
  const minIdx = p.cible.etatMin ? ETATS_ORDRE.indexOf(p.cible.etatMin) : 0;
  const livrable =
    reso.statut === "active" &&
    state.inventaireJoueur.some(
      (o) =>
        o.templateId === p.cible.templateId &&
        !o.enRestauration &&
        ETATS_ORDRE.indexOf(o.etat) >= minIdx,
    );
  const grise = reso.statut !== "active";
  return (
    <article style={{ ...missionCard, opacity: grise ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#1a1308" }}>
          {p.titre}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: statutColor(reso.statut, livrable) }}>
          {statutLabel(reso.statut, livrable)}
        </div>
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#5e4a25" }}>
        De : {p.expediteurId}
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        Demande : <strong>{nomCible}</strong>
        {p.cible.etatMin ? ` · ${p.cible.etatMin} min.` : ""}
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        Récompense : <strong>+{p.recompense.argent} €</strong>
      </div>
      {p.jourLimite !== undefined && (
        <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: p.jourLimite - state.jourActuel <= 3 ? "#a31f1f" : "#5e4a25" }}>
          Avant le jour {p.jourLimite} (J−{Math.max(0, p.jourLimite - state.jourActuel)})
        </div>
      )}
      {livrable && (
        <button
          type="button"
          onClick={onLivrer}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 12px",
            background: "#1a1308",
            color: "#f1e4c0",
            border: "none",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          Livrer
        </button>
      )}
    </article>
  );
}

function OngletMissions({
  state,
  onLivrer,
}: {
  state: GameState;
  onLivrer: (id: string) => void;
}) {
  const courriersById = useMemo(
    () => new Map(state.courriers.map((c) => [c.id, c])),
    [state.courriers],
  );
  const missions = useMemo(
    () => [...state.missions].sort((a, b) => {
      const ca = courriersById.get(a.courrierId);
      const cb = courriersById.get(b.courrierId);
      return (cb?.jourRecu ?? 0) - (ca?.jourRecu ?? 0);
    }),
    [state.missions, courriersById],
  );
  if (missions.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        Aucune mission reçue.
      </p>
    );
  }
  return (
    <>
      {missions.map((m) => {
        const c = courriersById.get(m.courrierId);
        if (!c) return null;
        return (
          <MissionCarte
            key={m.courrierId}
            courrier={c}
            reso={m}
            state={state}
            onLivrer={() => onLivrer(m.courrierId)}
          />
        );
      })}
    </>
  );
}

/* ─── Composant principal ─── */

export function CarnetOverlay({ open, onClose, state, onLivrerMission }: CarnetOverlayProps) {
  const [tab, setTab] = useState<Tab>("comptes");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const nbMissionsActives = state.missions.filter((m) => m.statut === "active").length;

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={carnet}>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Cahier de Compte</h2>
            <div style={sousTitre}>Jour {state.jourActuel} · Solde {state.budget} €</div>
          </div>
          <div style={tabsRow}>
            <button type="button" style={tabStyle(tab === "comptes")} onClick={() => setTab("comptes")}>
              Comptes
            </button>
            <button type="button" style={tabStyle(tab === "missions")} onClick={() => setTab("missions")}>
              Missions
              {nbMissionsActives > 0 && <span style={badgeStyle}>{nbMissionsActives}</span>}
            </button>
          </div>
          <div style={contenu}>
            {tab === "comptes" ? (
              <OngletComptes state={state} />
            ) : (
              <OngletMissions state={state} onLivrer={(id) => onLivrerMission(id)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add src/components/mobile/qg/overlays/CarnetOverlay.tsx
git commit -m "feat(carnet-overlay): nouveau overlay vintage à deux onglets"
```

---

## Task 10: Câblage layout + suppressions

**Files:**
- Modify: `src/app/(panorama)/layout.tsx`
- Delete: `src/components/mobile/qg/sheets/CarnetSheet.tsx`
- Delete: `src/components/mobile/QgHistorique.tsx`
- Delete: `src/app/historique/page.tsx`

- [ ] **Step 1: Remplacer l'import et l'usage dans le layout panorama**

Dans `src/app/(panorama)/layout.tsx` :

Remplacer l'import (ligne 43) :
```ts
import { CarnetSheet } from "@/components/mobile/qg/sheets/CarnetSheet";
```
par :
```ts
import { CarnetOverlay } from "@/components/mobile/qg/overlays/CarnetOverlay";
```

Déstructurer `livrerMission` depuis `useGame()` à côté de `marquerCourrierLu` (lignes 107-109 environ).

Remplacer le bloc JSX `<CarnetSheet ... />` (lignes 640-644) :
```tsx
      <CarnetSheet
        open={carnetOuvert}
        onClose={() => setCarnetOuvert(false)}
        state={state}
      />
```
par :
```tsx
      <CarnetOverlay
        open={carnetOuvert}
        onClose={() => setCarnetOuvert(false)}
        state={state}
        onLivrerMission={(id) => livrerMission(id)}
      />
```

- [ ] **Step 2: Supprimer les anciens fichiers**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
rm src/components/mobile/qg/sheets/CarnetSheet.tsx
rm src/components/mobile/QgHistorique.tsx
rm src/app/historique/page.tsx
```

- [ ] **Step 3: Vérifier qu'aucun import résiduel ne casse**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx tsc --noEmit`
Expected: pas d'erreur.

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run`
Expected: tout vert.

- [ ] **Step 4: Vérifier que `/historique` est bien retiré**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && find src/app -name "page.tsx" | xargs grep -l "historique" 2>/dev/null || echo "OK aucune référence résiduelle"`

S'il y a des liens vers `/historique` ailleurs (boutons, redirections), les retirer ou rediriger vers le carnet. Notamment chercher des `router.push("/historique")` :

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && grep -rn '/historique' src/ || echo "OK"`

Si trouvé : supprimer les liens (boutons) — pas de redirection nécessaire, le carnet remplace tout.

- [ ] **Step 5: Vérifier le rendu visuel en dev**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npm run dev`

Tester manuellement :
1. Ouvrir le QG bureau, taper sur le carnet → l'overlay vintage s'ouvre.
2. Onglet Comptes : voir les écritures (au moins les anciennes sessions si save migrée).
3. Onglet Missions : "Aucune mission reçue." (pas de mission dans le pipeline pour l'instant).
4. Acheter la Gazette (12 €) → revenir au carnet → ligne "Gazette du jour X · −12 €" présente.
5. Passer le chat (fauteuil) plusieurs fois pour déclencher loyer hebdo → ligne loyer présente.
6. Aller chiner (entrer dans une brocante) → ligne "Entrée · {nom}" présente.

- [ ] **Step 6: Commit final**

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git add -A
git commit -m "refactor(carnet): câble CarnetOverlay, supprime CarnetSheet/QgHistorique/page historique"
```

---

## Notes finales

- **Génération de missions concrètes** : ce plan ne crée pas de mission dans le pipeline d'événements (`courrier.ts` / autre). Le système est en place ; il faudra une itération séparée pour brancher des déclencheurs narratifs ("Joueur du Vide-grenier réclame Ocarina of Time au jour X").
- **`livrerMission` n'a pas de tests unitaires dédiés** : la logique est suffisamment fine et testable via les helpers de `grandLivre` + `expireMissions` déjà couverts. Si on veut un filet de plus, ajouter un test d'intégration dans `GameContext.test.tsx` (n'existe pas encore — bonus YAGNI).
- **`payerFraisBrocante`** : la signature prend `brocanteId`, `brocanteNom`, `montant`. Le `brocanteId` est passé pour un lien futur potentiel (filtre par brocante dans le carnet) mais n'est pas stocké dans `LedgerEntry` pour l'instant — il est `void`-é dans le callback. À retirer si on veut être plus strict (YAGNI).
