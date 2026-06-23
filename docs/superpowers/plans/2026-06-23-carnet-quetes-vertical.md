# Carnet de commandes vertical — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire évoluer les missions (catégories principale/secondaire, multi-cibles, commanditaires avec avatar) et refondre le carnet de commandes en UI verticale (header fixe, sections, lignes avatar·nom·progression, détails en accordéon).

**Architecture:** Le modèle (`CourrierPayloadMission`) passe d'une cible unique à une liste `cibles[]` + un champ `categorie`. La logique de progression/livraison multi-cibles vit dans `src/lib/missions.ts` (fonctions pures testables). `GameContext.livrerMission` consomme un objet par cible (moins bon état d'abord) via un helper pur. L'UI `CarnetNotesOverlay` est refondue avec un sous-composant `CommandeRow` (ligne + accordéon). Une migration convertit les sauvegardes existantes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest + @testing-library/react (jsdom).

Spec : `docs/superpowers/specs/2026-06-23-carnet-quetes-vertical-design.md`. Branche : `feat/bureau-deux-carnets`.

---

## Task 1 : Types — catégories + multi-cibles

**Files:**
- Modify: `src/types/game.ts:108-124`

- [ ] **Step 1: Remplacer le type mission**

Dans `src/types/game.ts`, remplacer le bloc `CourrierPayloadMission` (lignes ~108-124) par :

```ts
/** Catégorie d'une commande : principale (importante/scénarisée) ou secondaire. */
export type MissionCategorie = "principale" | "secondaire";

/** Une cible d'une commande : un objet précis à fournir. */
export interface MissionCible {
  templateId: string;
  /** État minimum requis (Mauvais < Bon < Très bon < Pristin état). */
  etatMin?: EtatObjet;
}

/** Mission reçue par lettre : fournir un ou plusieurs objets contre récompense. */
export interface CourrierPayloadMission {
  type: "mission";
  categorie: MissionCategorie;
  expediteurId: string;
  titre: string;
  /** Corps narratif (même rendu que les lettres). */
  corps: string[];
  /** Objets demandés (1 ou plusieurs). */
  cibles: MissionCible[];
  /** Si défini, mission expirée si `jourActuel > jourLimite`. */
  jourLimite?: number;
  recompense: { argent: number };
}
```

- [ ] **Step 2: Vérifier la compilation des types (erreurs attendues ailleurs)**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs de type là où `.cible` est encore utilisé (missions.ts, courrier.ts, GameContext.tsx, CarnetNotesOverlay.tsx). C'est normal — les tâches suivantes les corrigent.

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): missions à catégorie + multi-cibles (cible → cibles[])"
```

---

## Task 2 : Commanditaires enrichis + nouveaux personnages

**Files:**
- Modify: `src/data/expediteursCourrier.ts`

- [ ] **Step 1: Réécrire le fichier**

Remplacer tout `src/data/expediteursCourrier.ts` par :

```ts
import type { CategorieObjet } from "@/types/game";

export interface ExpediteurDef {
  id: string;
  /** Nom affiché (signature, ligne du carnet). */
  nom: string;
  /** Personnalité affichée sous le titre de la quête. */
  personnalite: string;
  /** Catégorie d'objets que ce commanditaire demande (sert au sous-projet 2). */
  domaine?: CategorieObjet;
  /** Lien avec le joueur (optionnel). */
  relation?: string;
  /** Chemin du portrait (webp dans public/personas/commanditaires/). */
  avatar?: string;
  /** Formule de fin de lettre (multi-ligne ok). */
  signature: string;
}

export const EXPEDITEURS: Record<string, ExpediteurDef> = {
  maman: {
    id: "maman",
    nom: "Maman",
    personnalite: "Ta mère",
    relation: "Mère",
    avatar: "/personas/commanditaires/maman.webp",
    signature: "Avec tout mon amour,\nMaman",
  },
  "jeux-video": {
    id: "jeux-video",
    nom: "Théo",
    personnalite: "Passionné de jeux vidéo",
    domaine: "Jeux & Loisirs",
    avatar: "/personas/commanditaires/jeux-video.webp",
    signature: "À plus dans le pixel,\nThéo",
  },
  "set-designer": {
    id: "set-designer",
    nom: "Margaux",
    personnalite: "Set designer",
    domaine: "Maison",
    avatar: "/personas/commanditaires/set-designer.webp",
    signature: "Merci d'avance,\nMargaux",
  },
  mode: {
    id: "mode",
    nom: "Camille",
    personnalite: "Designeuse de mode",
    domaine: "Mode",
    avatar: "/personas/commanditaires/mode.webp",
    signature: "Avec style,\nCamille",
  },
  art: {
    id: "art",
    nom: "M. Aubert",
    personnalite: "Collectionneur d'art",
    domaine: "Objets d'art",
    avatar: "/personas/commanditaires/art.webp",
    signature: "Bien à vous,\nM. Aubert",
  },
};

export function getExpediteur(id: string): ExpediteurDef | null {
  return EXPEDITEURS[id] ?? null;
}
```

> Note : les fichiers `public/personas/commanditaires/{id}.webp` seront fournis par l'auteur. En leur absence, l'UI (Task 7) affiche une pastille à initiale via `onError`.

- [ ] **Step 2: Vérifier que ça compile**

Run: `npx tsc --noEmit 2>&1 | grep expediteurs || echo "OK expediteurs"`
Expected: `OK expediteurs`

- [ ] **Step 3: Commit**

```bash
git add src/data/expediteursCourrier.ts
git commit -m "feat(commanditaires): personnalité, domaine, avatar + 4 nouveaux"
```

---

## Task 3 : Logique de progression multi-cibles (`missions.ts`)

**Files:**
- Modify: `src/lib/missions.ts`
- Test: `src/lib/missions.test.ts` (créer)

- [ ] **Step 1: Écrire les tests**

Créer `src/lib/missions.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  progressionMission,
  estMissionLivrable,
  indicesAConsommerPourLivraison,
} from "./missions";
import type { CourrierPayloadMission, Objet } from "@/types/game";

function obj(patch: Partial<Objet>): Objet {
  return {
    id: Math.random().toString(36).slice(2),
    templateId: "x",
    nom: "X",
    categorie: "Musique",
    prixReferenceReel: 10,
    etat: "Bon",
    ...patch,
  } as Objet;
}

function mission(cibles: CourrierPayloadMission["cibles"]): CourrierPayloadMission {
  return {
    type: "mission",
    categorie: "secondaire",
    expediteurId: "maman",
    titre: "T",
    corps: [],
    cibles,
    recompense: { argent: 10 },
  };
}

describe("progressionMission", () => {
  it("0/n quand aucun objet ne correspond", () => {
    const p = progressionMission(mission([{ templateId: "a" }, { templateId: "b" }]), []);
    expect(p.remplies).toBe(0);
    expect(p.total).toBe(2);
    expect(p.livrable).toBe(false);
    expect(p.ciblesRemplies).toEqual([false, false]);
  });

  it("compte une cible remplie si l'état est suffisant", () => {
    const inv = [obj({ templateId: "a", etat: "Très bon" })];
    const p = progressionMission(mission([{ templateId: "a", etatMin: "Bon" }]), inv);
    expect(p.remplies).toBe(1);
    expect(p.livrable).toBe(true);
  });

  it("ignore un objet en restauration", () => {
    const inv = [obj({ templateId: "a", enRestauration: true })];
    const p = progressionMission(mission([{ templateId: "a" }]), inv);
    expect(p.remplies).toBe(0);
  });

  it("exige deux objets distincts si deux cibles partagent le templateId", () => {
    const un = [obj({ templateId: "a" })];
    const deux = [obj({ templateId: "a" }), obj({ templateId: "a" })];
    expect(progressionMission(mission([{ templateId: "a" }, { templateId: "a" }]), un).remplies).toBe(1);
    expect(progressionMission(mission([{ templateId: "a" }, { templateId: "a" }]), deux).livrable).toBe(true);
  });
});

describe("indicesAConsommerPourLivraison", () => {
  it("retourne null si non livrable", () => {
    expect(indicesAConsommerPourLivraison(mission([{ templateId: "a" }]), [])).toBeNull();
  });

  it("consomme le moins bon état d'abord", () => {
    const inv = [
      obj({ templateId: "a", etat: "Très bon" }), // idx 0
      obj({ templateId: "a", etat: "Bon" }),       // idx 1 (le moins bon)
    ];
    const idx = indicesAConsommerPourLivraison(mission([{ templateId: "a", etatMin: "Bon" }]), inv);
    expect(idx).toEqual([1]);
  });

  it("réserve des objets distincts pour des cibles identiques", () => {
    const inv = [obj({ templateId: "a", etat: "Bon" }), obj({ templateId: "a", etat: "Très bon" })];
    const idx = indicesAConsommerPourLivraison(mission([{ templateId: "a" }, { templateId: "a" }]), inv);
    expect([...idx!].sort()).toEqual([0, 1]);
  });
});

describe("estMissionLivrable (compat)", () => {
  it("reste un booléen dérivé de la progression", () => {
    const inv = [obj({ templateId: "a" })];
    expect(estMissionLivrable(mission([{ templateId: "a" }]), inv)).toBe(true);
    expect(estMissionLivrable(mission([{ templateId: "a" }, { templateId: "b" }]), inv)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests (échec attendu)**

Run: `npm run test:run -- src/lib/missions.test.ts 2>&1 | tail -15`
Expected: FAIL (fonctions `progressionMission` / `indicesAConsommerPourLivraison` non exportées).

- [ ] **Step 3: Réécrire `src/lib/missions.ts`**

```ts
import { ETATS_ORDRE } from "@/lib/etat";
import type { CourrierPayloadMission, Objet } from "@/types/game";

function etatIdx(e: Objet["etat"]): number {
  return ETATS_ORDRE.indexOf(e);
}

/** Indices d'inventaire candidats pour une cible (état ok, hors restauration). */
function candidats(cible: CourrierPayloadMission["cibles"][number], inv: Objet[]): number[] {
  const minIdx = cible.etatMin ? ETATS_ORDRE.indexOf(cible.etatMin) : 0;
  return inv
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.templateId === cible.templateId && !o.enRestauration && etatIdx(o.etat) >= minIdx)
    .map(({ i }) => i);
}

export interface ProgressionMission {
  remplies: number;
  total: number;
  livrable: boolean;
  /** Pour chaque cible (même ordre), satisfaite ou non. */
  ciblesRemplies: boolean[];
}

/**
 * Calcule la progression d'une mission : pour chaque cible, on réserve un objet
 * d'inventaire DISTINCT (un objet ne peut satisfaire qu'une seule cible).
 * On traite les cibles les plus contraintes (etatMin le plus élevé) d'abord pour
 * éviter qu'une cible facile ne « vole » un objet utile à une cible exigeante.
 */
export function progressionMission(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): ProgressionMission {
  const ordre = payload.cibles
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (b.c.etatMin ? ETATS_ORDRE.indexOf(b.c.etatMin) : 0) - (a.c.etatMin ? ETATS_ORDRE.indexOf(a.c.etatMin) : 0));
  const pris = new Set<number>();
  const ciblesRemplies = new Array(payload.cibles.length).fill(false);
  for (const { c, i } of ordre) {
    const dispo = candidats(c, inventaire).filter((idx) => !pris.has(idx));
    if (dispo.length > 0) {
      pris.add(dispo[0]);
      ciblesRemplies[i] = true;
    }
  }
  const remplies = ciblesRemplies.filter(Boolean).length;
  return { remplies, total: payload.cibles.length, livrable: remplies === payload.cibles.length, ciblesRemplies };
}

/**
 * Si la mission est livrable, retourne les indices d'inventaire à consommer
 * (un par cible, le MOINS BON état d'abord, objets distincts). Sinon `null`.
 */
export function indicesAConsommerPourLivraison(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): number[] | null {
  const ordre = payload.cibles
    .slice()
    .sort((a, b) => (b.etatMin ? ETATS_ORDRE.indexOf(b.etatMin) : 0) - (a.etatMin ? ETATS_ORDRE.indexOf(a.etatMin) : 0));
  const pris = new Set<number>();
  for (const c of ordre) {
    const dispo = candidats(c, inventaire)
      .filter((idx) => !pris.has(idx))
      .sort((i, j) => etatIdx(inventaire[i].etat) - etatIdx(inventaire[j].etat)); // moins bon d'abord
    if (dispo.length === 0) return null;
    pris.add(dispo[0]);
  }
  return [...pris];
}

/** Compat : une mission est livrable si toutes ses cibles sont remplies. */
export function estMissionLivrable(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): boolean {
  return progressionMission(payload, inventaire).livrable;
}
```

- [ ] **Step 4: Lancer les tests (succès attendu)**

Run: `npm run test:run -- src/lib/missions.test.ts 2>&1 | tail -8`
Expected: PASS (tous).

- [ ] **Step 5: Commit**

```bash
git add src/lib/missions.ts src/lib/missions.test.ts
git commit -m "feat(missions): progression et consommation multi-cibles"
```

---

## Task 4 : Création de missions au nouveau format (`courrier.ts`)

**Files:**
- Modify: `src/lib/courrier.ts` (`creerCourrierMission`, `creerMissionsTest`)
- Test: `src/lib/courrier.test.ts` (ajouter un test)

- [ ] **Step 1: Mettre à jour `creerCourrierMission`**

Dans `src/lib/courrier.ts`, remplacer la signature/cible de `creerCourrierMission` par une version `cibles[]` + `categorie` :

```ts
export function creerCourrierMission(args: {
  id: string;
  jour: number;
  expediteurId: string;
  titre: string;
  corps: string[];
  categorie: import("@/types/game").MissionCategorie;
  cibles: import("@/types/game").MissionCible[];
  jourLimite?: number;
  recompense: { argent: number };
}): Courrier {
  const payload: CourrierPayloadMission = {
    type: "mission",
    categorie: args.categorie,
    expediteurId: args.expediteurId,
    titre: args.titre,
    corps: args.corps,
    cibles: args.cibles,
    recompense: args.recompense,
    ...(args.jourLimite !== undefined ? { jourLimite: args.jourLimite } : {}),
  };
  return { id: args.id, type: "mission", jourRecu: args.jour, lu: false, payload };
}
```

- [ ] **Step 2: Mettre à jour les 3 missions de test**

Dans `creerMissionsTest`, pour chacune des 3 missions, remplacer `cible: { templateId, etatMin }` par `categorie` + `cibles: [...]`. Exemple pour la lampe (mission_test_etagere) :

```ts
        categorie: "principale",
        cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
```
Pour `mission_test_balance` :
```ts
        categorie: "secondaire",
        cibles: [{ templateId: "br.balance_romaine_fonte", etatMin: "Très bon" }],
```
Pour `mission_test_vinyle` :
```ts
        categorie: "secondaire",
        cibles: [{ templateId: "mus.vinyle_des_scarabees_passage_cloute" }],
```
(supprimer les anciennes lignes `cible: {...}`).

- [ ] **Step 3: Ajouter un test de format**

Dans `src/lib/courrier.test.ts`, ajouter :

```ts
import { creerMissionsTest } from "./courrier";

describe("creerMissionsTest — nouveau format", () => {
  it("produit des missions avec categorie et cibles[]", () => {
    const ms = creerMissionsTest(1);
    for (const c of ms) {
      expect(c.payload.type).toBe("mission");
      if (c.payload.type !== "mission") continue;
      expect(["principale", "secondaire"]).toContain(c.payload.categorie);
      expect(Array.isArray(c.payload.cibles)).toBe(true);
      expect(c.payload.cibles.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 4: Lancer les tests**

Run: `npm run test:run -- src/lib/courrier.test.ts 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/courrier.ts src/lib/courrier.test.ts
git commit -m "feat(courrier): missions au format categorie + cibles[]"
```

---

## Task 5 : Migration des sauvegardes existantes

**Files:**
- Modify: `src/lib/migrations.ts`
- Test: `src/lib/migrations.test.ts`

- [ ] **Step 1: Écrire le test**

Ajouter dans `src/lib/migrations.test.ts` :

```ts
describe("migrerSauvegarde — missions cible→cibles", () => {
  it("convertit l'ancien champ cible en cibles[] et ajoute categorie", () => {
    const save = createMockGameState();
    (save as unknown as { courriers: unknown[] }).courriers = [
      {
        id: "m1",
        type: "mission",
        jourRecu: 1,
        lu: true,
        payload: {
          type: "mission",
          expediteurId: "maman",
          titre: "Vieux format",
          corps: [],
          cible: { templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" },
          recompense: { argent: 50 },
        },
      },
    ];
    const out = migrerSauvegarde(save);
    const p = out.courriers[0].payload;
    expect(p.type).toBe("mission");
    if (p.type !== "mission") return;
    expect(p.categorie).toBe("secondaire");
    expect(p.cibles).toEqual([{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }]);
    expect((p as unknown as { cible?: unknown }).cible).toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/migrations.test.ts 2>&1 | tail -12`
Expected: FAIL (cibles undefined / cible encore présent).

- [ ] **Step 3: Ajouter la normalisation dans `appliquerMigrations`**

Dans `src/lib/migrations.ts`, dans `appliquerMigrations`, là où les `courriers` sont reconstruits (chercher `migrerCourriers` / `courriers:`), insérer une normalisation des payloads mission. Ajouter cette fonction au niveau module :

```ts
function normaliserMissionPayload(c: Courrier): Courrier {
  if (c.payload.type !== "mission") return c;
  const p = c.payload as Record<string, unknown>;
  if (Array.isArray(p.cibles) && typeof p.categorie === "string") return c;
  const cibles = Array.isArray(p.cibles)
    ? (p.cibles as unknown[])
    : p.cible
      ? [p.cible]
      : [];
  const next = { ...p, categorie: (p.categorie as string) ?? "secondaire", cibles };
  delete (next as { cible?: unknown }).cible;
  return { ...c, payload: next as Courrier["payload"] };
}
```
(`import type { Courrier } from "@/types/game"` est déjà présent via le bloc d'import de types — sinon l'ajouter.)

Puis appliquer la normalisation sur la liste des courriers retournée. Repérer dans `appliquerMigrations` la construction de `courriers` (ex. `const courriers = migrerCourriers(loaded.courriers);`) et remplacer par :
```ts
  const courriers = migrerCourriers(loaded.courriers).map(normaliserMissionPayload);
```
Si la variable a un autre nom, normaliser au même endroit (juste avant le `return`, mapper `courriers`).

- [ ] **Step 4: Lancer les tests migrations**

Run: `npm run test:run -- src/lib/migrations.test.ts 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(migrations): missions cible→cibles + categorie par défaut"
```

---

## Task 6 : Livraison multi-cibles + compteurs (`GameContext`)

**Files:**
- Modify: `src/context/GameContext.tsx` (`livrerMission` ~997-1043)
- Modify: `src/app/(panorama)/layout.tsx` (compteurs `missionsCounters` si présents)

- [ ] **Step 1: Réécrire `livrerMission`**

Dans `src/context/GameContext.tsx`, remplacer le corps de `livrerMission` (du `const { cible, recompense } = ...` jusqu'au `return { ok: true };`) par une version multi-cibles utilisant le helper pur. Ajouter en haut du fichier l'import :
```ts
import { indicesAConsommerPourLivraison } from "@/lib/missions";
```
Nouveau corps (après les gardes `courrier`/`reso` inchangées) :
```ts
      const { recompense } = courrier.payload;
      const aRetirer = indicesAConsommerPourLivraison(
        courrier.payload,
        current.inventaireJoueur,
      );
      if (!aRetirer) {
        return { ok: false, raison: "Objets requis manquants dans l'inventaire." };
      }
      const titreMission = courrier.payload.titre;
      const aRetirerSet = new Set(aRetirer);
      setState((prev) => {
        if (!prev) return prev;
        const invMaj = prev.inventaireJoueur.filter((_, i) => !aRetirerSet.has(i));
        const missionsMaj = prev.missions.map((m) =>
          m.courrierId === courrierId
            ? { ...m, statut: "livree" as const, jourResolution: prev.jourActuel }
            : m,
        );
        const credited = appendLedger(prev, {
          jour: prev.jourActuel,
          kind: "mission_recompense",
          designation: `Mission · ${titreMission}`,
          recette: recompense.argent,
          depense: 0,
          courrierId,
        });
        return { ...credited, inventaireJoueur: invMaj, missions: missionsMaj };
      });
      return { ok: true };
```
Supprimer l'ancien bloc `ETATS_ORDRE`/`minIdx`/`matchIdx` devenu inutile (si `ETATS_ORDRE` n'est plus utilisé ailleurs dans le fichier, retirer sa déclaration locale).

- [ ] **Step 2: Vérifier les références à `.cible` restantes**

Run: `grep -rn "\.cible\b\|payload.cible" src/ --include=*.ts --include=*.tsx | grep -v cibles`
Expected: aucune ligne (sinon corriger : remplacer par la logique `cibles`/`progressionMission`). Le compteur `missionsCounters` dans `src/app/(panorama)/layout.tsx` utilise déjà `estMissionLivrable(c.payload, …)` qui reste valide — ne rien changer s'il n'accède pas à `.cible`.

- [ ] **Step 3: Build + tests complets**

Run: `npm run test:run 2>&1 | grep -E "Test Files|Tests "` puis `npm run build 2>&1 | grep -iE "Compiled|error"`
Expected: tous les tests passent ; build compile sans erreur.

- [ ] **Step 4: Commit**

```bash
git add src/context/GameContext.tsx src/app/
git commit -m "feat(missions): livraison multi-cibles (moins bon état d'abord)"
```

---

## Task 7 : Composant `CommandeRow` (ligne + accordéon)

**Files:**
- Create: `src/components/mobile/qg/overlays/CommandeRow.tsx`
- Test: `src/components/mobile/qg/overlays/CommandeRow.test.tsx`

- [ ] **Step 1: Écrire le test (rendu + bouton livrer)**

Créer `src/components/mobile/qg/overlays/CommandeRow.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState } from "@/types/game";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function courrierMission(): Courrier {
  return {
    id: "m1", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "maman",
      titre: "Le coffre rétro", corps: ["Aide-moi."],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 90 },
    },
  };
}

describe("CommandeRow", () => {
  it("affiche le titre et le nom du commanditaire", () => {
    const state = createMockGameState();
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("Le coffre rétro")).toBeTruthy();
    expect(screen.getByText(/Maman/)).toBeTruthy();
  });

  it("montre le bouton Livrer actif quand toutes les cibles sont réunies", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: /Livrer/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("grise Livrer si une cible manque", () => {
    const state = createMockGameState({ inventaireJoueur: [] });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: /Livrer/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/components/mobile/qg/overlays/CommandeRow.test.tsx 2>&1 | tail -10`
Expected: FAIL (module CommandeRow introuvable).

- [ ] **Step 3: Écrire `CommandeRow.tsx`**

```tsx
"use client";

import { type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { getExpediteur } from "@/data/expediteursCourrier";
import { progressionMission } from "@/lib/missions";
import { ItemImage } from "@/components/ui/ItemImage";
import type { Courrier, GameState } from "@/types/game";

interface Props {
  courrier: Courrier;
  state: GameState;
  ouvert: boolean;
  onToggle: () => void;
  onLivrer: () => void;
}

const row: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  padding: "10px 12px", background: "transparent", border: "none",
  borderBottom: "1px solid rgba(110,31,31,0.18)", cursor: "pointer", textAlign: "left",
};
const avatar: CSSProperties = {
  width: 42, height: 42, borderRadius: "50%", flex: "0 0 auto",
  border: "2px solid #c8a24a", objectFit: "cover", background: "#d9c79a",
  display: "grid", placeItems: "center", color: "#6e1f1f",
  fontFamily: "var(--font-display)", fontSize: 16, overflow: "hidden",
};

export function CommandeRow({ courrier, state, ouvert, onToggle, onLivrer }: Props) {
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
  const exp = getExpediteur(p.expediteurId);
  const prog = progressionMission(p, state.inventaireJoueur);
  const jLimite = p.jourLimite;
  const jRestants = jLimite !== undefined ? Math.max(0, jLimite - state.jourActuel) : null;

  return (
    <div>
      <button type="button" style={row} onClick={onToggle} aria-expanded={ouvert}>
        {exp?.avatar ? (
          <img src={exp.avatar} alt="" style={avatar} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <span style={avatar}>{exp?.nom?.[0] ?? "?"}</span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 13, color: "#1a1308" }}>{p.titre}</span>
          <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: 11, color: "#7a6a44" }}>
            {exp ? `${exp.nom} · ${exp.personnalite}` : ""}
          </span>
        </span>
        <span style={{ textAlign: "right", flex: "0 0 auto" }}>
          {prog.livrable ? (
            <span style={{ display: "inline-block", background: "#2c5e3f", color: "#f4e9cd", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10 }}>Prêt ✓</span>
          ) : (
            <>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#8a6d2e", fontSize: 13 }}>{prog.remplies}/{prog.total}</span>
              <span style={{ display: "block", width: 46, height: 5, background: "#e3d7b6", borderRadius: 3, marginTop: 3, overflow: "hidden" }}>
                <span style={{ display: "block", width: `${(prog.remplies / prog.total) * 100}%`, height: "100%", background: "#c8a24a" }} />
              </span>
            </>
          )}
          {jRestants !== null && (
            <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, marginTop: 2, color: jRestants <= 3 ? "#a31f1f" : "#8a7a52" }}>J−{jRestants}</span>
          )}
        </span>
      </button>

      {ouvert && (
        <div style={{ padding: "4px 14px 14px", background: "rgba(255,250,235,0.45)", borderBottom: "1px solid rgba(110,31,31,0.18)" }}>
          {p.corps.map((para, i) => (
            <p key={i} style={{ fontStyle: "italic", color: "#4a3f28", fontSize: 12, margin: "6px 0" }}>{para}</p>
          ))}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6e1f1f", margin: "8px 0 4px" }}>
            Objets demandés ({prog.remplies}/{prog.total})
          </div>
          {p.cibles.map((cible, i) => {
            const tpl = getTemplate(cible.templateId);
            const ok = prog.ciblesRemplies[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px dashed rgba(110,31,31,0.18)", opacity: ok ? 1 : 0.7 }}>
                <span style={{ width: 30, height: 30, flex: "0 0 auto" }}>
                  <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" />
                </span>
                <span style={{ flex: 1, fontSize: 12, color: "#2b2418" }}>
                  {tpl?.nom ?? cible.templateId}
                  {cible.etatMin ? <span style={{ display: "block", fontSize: 10, color: "#8a7a52" }}>état min : {cible.etatMin}</span> : null}
                </span>
                <span style={{ color: ok ? "#2c5e3f" : "#b3a06a", fontWeight: 700 }}>{ok ? "✓" : "○"}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "#4a3f28" }}>Récompense <b style={{ color: "#8a6d2e" }}>+{p.recompense.argent} €</b></span>
            <button
              type="button"
              onClick={onLivrer}
              disabled={!prog.livrable}
              style={{
                background: prog.livrable ? "#6e1f1f" : "#b3a06a", color: "#f4e9cd", border: "none",
                borderRadius: 6, padding: "8px 16px", fontFamily: "var(--font-display)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase", cursor: prog.livrable ? "pointer" : "default",
                opacity: prog.livrable ? 1 : 0.6,
              }}
            >
              {prog.livrable ? "Livrer" : `Livrer (${prog.remplies}/${prog.total})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

> Vérifier la signature de `ItemImage` (`src/components/ui/ItemImage.tsx`) : props `templateId` + `categorie`. Adapter l'appel si la prop diffère (ex. `taille`).

- [ ] **Step 4: Lancer les tests**

Run: `npm run test:run -- src/components/mobile/qg/overlays/CommandeRow.test.tsx 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/qg/overlays/CommandeRow.tsx src/components/mobile/qg/overlays/CommandeRow.test.tsx
git commit -m "feat(carnet): composant CommandeRow (ligne + détails accordéon)"
```

---

## Task 8 : Refonte de `CarnetNotesOverlay` (sections + accordéon unique)

**Files:**
- Modify: `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx`
- Test: `src/components/mobile/qg/overlays/CarnetNotesOverlay.test.tsx` (créer)

- [ ] **Step 1: Écrire le test (sections + accordéon unique)**

Créer `src/components/mobile/qg/overlays/CarnetNotesOverlay.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { CarnetNotesOverlay } from "./CarnetNotesOverlay";
import type { GameState } from "@/types/game";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function withMissions(): GameState {
  const s = createMockGameState();
  s.courriers = [
    { id: "p1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "principale", expediteurId: "maman", titre: "Quête A", corps: ["a"], cibles: [{ templateId: "x" }], recompense: { argent: 10 } } },
    { id: "s1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "secondaire", expediteurId: "art", titre: "Quête B", corps: ["b"], cibles: [{ templateId: "y" }], recompense: { argent: 20 } } },
  ];
  s.missions = [
    { courrierId: "p1", statut: "active" },
    { courrierId: "s1", statut: "active" },
  ];
  return s;
}

describe("CarnetNotesOverlay", () => {
  it("affiche les sections principales et secondaires", () => {
    render(<CarnetNotesOverlay open state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    expect(screen.getByText(/principales/i)).toBeTruthy();
    expect(screen.getByText(/secondaires/i)).toBeTruthy();
    expect(screen.getByText("Quête A")).toBeTruthy();
    expect(screen.getByText("Quête B")).toBeTruthy();
  });

  it("n'ouvre qu'un détail à la fois", () => {
    render(<CarnetNotesOverlay open state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    fireEvent.click(screen.getByText("Quête A"));
    expect(screen.getAllByText(/Objets demandés/).length).toBe(1);
    fireEvent.click(screen.getByText("Quête B"));
    expect(screen.getAllByText(/Objets demandés/).length).toBe(1); // A refermée
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/components/mobile/qg/overlays/CarnetNotesOverlay.test.tsx 2>&1 | tail -10`
Expected: FAIL (sections absentes / accordéon non géré).

- [ ] **Step 3: Réécrire le composant principal**

Dans `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx` : garder les styles `scrim/stage/carnet/closeBtn/ruban/enTete/titre/sousTitre/contenu/sectionLabel` et le `useEffect` Escape/scroll. Remplacer les sous-composants `MissionActiveCarte`/`MissionTermineeCarte` et le corps de rendu. Nouveau composant principal :

```tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { estMissionLivrable } from "@/lib/missions";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

// … (conserver les const de styles existants : scrim, stage, carnet, closeBtn, ruban, enTete, titre, sousTitre, contenu, sectionLabel) …

interface CarnetNotesOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
}

function trierActives(missions: MissionResolution[], byId: Map<string, Courrier>, inv: GameState["inventaireJoueur"], state: GameState) {
  return [...missions].sort((a, b) => {
    const ca = byId.get(a.courrierId); const cb = byId.get(b.courrierId);
    const pa = ca?.payload.type === "mission" ? ca.payload : null;
    const pb = cb?.payload.type === "mission" ? cb.payload : null;
    const lva = pa && estMissionLivrable(pa, inv) ? 0 : 1;
    const lvb = pb && estMissionLivrable(pb, inv) ? 0 : 1;
    if (lva !== lvb) return lva - lvb;                       // livrables d'abord
    const ja = pa?.jourLimite ?? Infinity; const jb = pb?.jourLimite ?? Infinity;
    if (ja !== jb) return ja - jb;                            // échéance proche
    return (ca?.jourRecu ?? 0) - (cb?.jourRecu ?? 0);
  });
}

export function CarnetNotesOverlay({ open, onClose, state, onLivrerMission }: CarnetNotesOverlayProps) {
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const [termineesVisibles, setTermineesVisibles] = useState(false);
  const byId = useMemo(() => new Map(state.courriers.map((c) => [c.id, c])), [state.courriers]);

  const actives = useMemo(() => state.missions.filter((m) => m.statut === "active"), [state.missions]);
  const estCat = (m: MissionResolution, cat: string) => {
    const c = byId.get(m.courrierId);
    return c?.payload.type === "mission" && c.payload.categorie === cat;
  };
  const principales = useMemo(() => trierActives(actives.filter((m) => estCat(m, "principale")), byId, state.inventaireJoueur, state), [actives, byId, state]);
  const secondaires = useMemo(() => trierActives(actives.filter((m) => estCat(m, "secondaire")), byId, state.inventaireJoueur, state), [actives, byId, state]);
  const terminees = useMemo(() => [...state.missions].filter((m) => m.statut !== "active").sort((a, b) => (b.jourResolution ?? 0) - (a.jourResolution ?? 0)), [state.missions]);
  const nbLivrables = useMemo(() => actives.filter((m) => { const c = byId.get(m.courrierId); return c?.payload.type === "mission" && estMissionLivrable(c.payload, state.inventaireJoueur); }).length, [actives, byId, state.inventaireJoueur]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const renderSection = (label: string, liste: MissionResolution[]) => {
    if (liste.length === 0) return null;
    return (
      <>
        <div style={sectionLabel}>{label}</div>
        {liste.map((m) => {
          const c = byId.get(m.courrierId);
          if (!c) return null;
          return (
            <CommandeRow
              key={m.courrierId}
              courrier={c}
              state={state}
              ouvert={ouvertId === m.courrierId}
              onToggle={() => setOuvertId((id) => (id === m.courrierId ? null : m.courrierId))}
              onLivrer={() => onLivrerMission(m.courrierId)}
            />
          );
        })}
      </>
    );
  };

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={carnet}>
          <div style={ruban} aria-hidden />
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Carnet de commandes</h2>
            <div style={sousTitre}>Jour {state.jourActuel}{nbLivrables > 0 ? ` · ${nbLivrables} livrable${nbLivrables > 1 ? "s" : ""}` : ""}</div>
          </div>
          <div style={contenu}>
            {actives.length === 0 && terminees.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
                Aucune commande pour l'instant.
              </p>
            ) : (
              <>
                {renderSection("Commandes principales", principales)}
                {renderSection("Commandes secondaires", secondaires)}
                {terminees.length > 0 && (
                  <>
                    <button type="button" onClick={() => setTermineesVisibles((v) => !v)} style={{ ...sectionLabel, background: "none", border: "none", width: "100%", cursor: "pointer" }}>
                      Terminées {termineesVisibles ? "▾" : "▸"}
                    </button>
                    {termineesVisibles && terminees.map((m) => {
                      const c = byId.get(m.courrierId);
                      if (!c || c.payload.type !== "mission") return null;
                      const tpl = getTemplate(c.payload.cibles[0]?.templateId ?? "");
                      const couleur = m.statut === "livree" ? "#2c5e3f" : "#a31f1f";
                      return (
                        <div key={m.courrierId} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 14px", opacity: 0.55, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
                          <span style={{ textDecoration: "line-through" }}>{c.payload.titre} — {tpl?.nom ?? ""}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", color: couleur }}>
                            {m.statut === "livree" ? `Livrée J${m.jourResolution}` : `Expirée J${m.jourResolution}`}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

> Conserver le titre interne « Carnet de commandes » (cohérent avec le renommage récent). Garder les styles existants ; seules les cartes deviennent des `CommandeRow`.

- [ ] **Step 4: Lancer les tests du composant**

Run: `npm run test:run -- src/components/mobile/qg/overlays/CarnetNotesOverlay.test.tsx 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 5: Suite complète + build**

Run: `npm run test:run 2>&1 | grep -E "Test Files|Tests "` puis `npm run build 2>&1 | grep -iE "Compiled|error"`
Expected: tout vert ; build OK.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx src/components/mobile/qg/overlays/CarnetNotesOverlay.test.tsx
git commit -m "feat(carnet): UI verticale (sections principales/secondaires, accordéon unique)"
```

---

## Task 9 : Vérification visuelle (app réelle)

**Files:** aucun (validation)

- [ ] **Step 1: Lancer l'app et ouvrir le carnet**

Run: `npm run dev` (puis ouvrir le bureau, taper le carnet rouge). Vérifier : header fixe, sections, lignes avatar·nom·progression (jauge X/Y, badge « Prêt ✓ »), accordéon unique, checklist multi-objets, bouton Livrer grisé/actif, section Terminées repliable. Avatars : pastille à initiale si les webp ne sont pas encore fournis.

- [ ] **Step 2: Commit éventuel d'ajustements**

```bash
git add -A && git commit -m "fix(carnet): ajustements visuels mode vertical"
```

---

## Notes finales

- Les portraits `public/personas/commanditaires/{id}.webp` (maman, jeux-video, set-designer, mode, art) sont fournis par l'auteur ; l'UI dégrade proprement en attendant (pastille à initiale via `onError`).
- Sous-projet 2 (génération auto + contenu scénarisé) : spec/plan séparés.
- Après implémentation : push (déploiement Vercel auto) puis test sur iPhone (fermer/rouvrir la web app).
