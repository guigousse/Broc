# Génération des quêtes + arc principal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer des quêtes secondaires au fil du jeu (probabiliste, réalisable, équilibrée) et dérouler un arc principal scénarisé (le grand-père antiquaire disparu) culminant sur l'objet unique « Les bijoux de la reine ».

**Architecture:** Fonctions pures dans `src/lib/quetes/` + registre `src/data/quetesPrincipales.ts`, orchestrées par `tickQuetes` appelé dans `GameContext.avancerJour`. Les générateurs lisent l'état (brocantes débloquées via `lib/deblocage`, objets via `poolPourTier`) et renvoient des `Courrier` mission ; le caller crée les `MissionResolution` actives.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest.

Spec : `docs/superpowers/specs/2026-06-23-generation-quetes-design.md`. Branche : `feat/bureau-deux-carnets`.

**Rappels API (vérifiés)** :
- `poolPourTier(tier: 1|2|3|4): ObjetTemplate[]` — `@/data/objetTemplates` (pool générique, hors uniques/légendaires).
- `ObjetTemplate` = `{ templateId, nom, categorie, rarete: "commun"|"rare"|"legendaire", prixRefBase, unique?, … }`.
- `getTemplate(id)`, `ALL_TEMPLATES` — `@/data/objetTemplates`.
- `BROCANTES: Brocante[]`, `Brocante = { id, nom, tier: 1|2|3|4, specialisation?: CategorieObjet, poolExclusif: string[], conditionDeblocage: ConditionDeblocage, … }` — `@/data/brocantes`.
- `calculerBrocantesDebloqueesParTier(state): Map<1|2|3|4, Set<string>>` — `@/lib/deblocage`.
- `ETATS_ORDRE: readonly EtatObjet[]` — `@/lib/etat`. `EtatObjet = "Mauvais"|"Bon"|"Très bon"|"Pristin état"`.
- `ConditionDeblocage` (union avec `depart`, `valeurCollection`, `brocantesDebloquees {tier:1|2|3, nombre}`, `ET`, …) — `@/types/game`.
- `expireMissions`, `creerCourrierMission` — `@/lib/courrier`.

---

## Task 1 : Renommer l'unique « Les bijoux de la reine »

**Files:**
- Modify: `src/data/uniques.ts`
- Test: `src/data/uniques.test.ts` (créer)

- [ ] **Step 1: Écrire le test**

Créer `src/data/uniques.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { UNIQUES } from "./uniques";

describe("UNIQUES", () => {
  it("expose l'unique des bijoux de la reine", () => {
    const u = UNIQUES.find((t) => t.templateId === "uniq.mo.bijou_marie_antoinette");
    expect(u).toBeDefined();
    expect(u!.nom).toBe("Les bijoux de la reine");
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/data/uniques.test.ts 2>&1 | tail -8`
Expected: FAIL (nom actuel = « Bijou ayant appartenu à Marie-Antoinette »).

- [ ] **Step 3: Renommer**

Dans `src/data/uniques.ts`, pour l'entrée `templateId: "uniq.mo.bijou_marie_antoinette"`, remplacer la ligne `nom: "..."` par :

```ts
    nom: "Les bijoux de la reine",
```

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/data/uniques.test.ts 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/uniques.ts src/data/uniques.test.ts
git commit -m "feat(quetes): renomme l'unique en « Les bijoux de la reine »

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Objets atteignables

**Files:**
- Create: `src/lib/quetes/atteignables.ts`
- Test: `src/lib/quetes/atteignables.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/atteignables.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { objetsAtteignables } from "./atteignables";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("objetsAtteignables", () => {
  it("au départ, ne renvoie que des objets tier 1 (brocante de départ débloquée)", () => {
    const state = createMockGameState();
    const objets = objetsAtteignables(state);
    expect(objets.length).toBeGreaterThan(0);
    // aucun unique / légendaire
    expect(objets.every((o) => !o.unique && o.rarete !== "legendaire")).toBe(true);
    // pas de templateId en double
    const ids = objets.map((o) => o.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("n'inclut jamais l'unique des bijoux de la reine", () => {
    const state = createMockGameState();
    const ids = objetsAtteignables(state).map((o) => o.templateId);
    expect(ids).not.toContain("uniq.mo.bijou_marie_antoinette");
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/atteignables.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/atteignables.ts` :

```ts
import { BROCANTES } from "@/data/brocantes";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { getTemplate, poolPourTier } from "@/data/objetTemplates";
import type { GameState, ObjetTemplate } from "@/types/game";

/**
 * Ensemble des ObjetTemplate que le joueur peut effectivement trouver, à partir
 * des brocantes débloquées : pool générique du tier + poolExclusif résolu.
 * Exclut les uniques et légendaires (réservés au chinage / arc principal).
 */
export function objetsAtteignables(state: GameState): ObjetTemplate[] {
  const parTier = calculerBrocantesDebloqueesParTier(state);
  const idsDebloquees = new Set<string>();
  for (const set of parTier.values()) for (const id of set) idsDebloquees.add(id);

  const parTemplateId = new Map<string, ObjetTemplate>();
  for (const b of BROCANTES) {
    if (!idsDebloquees.has(b.id)) continue;
    for (const t of poolPourTier(b.tier)) parTemplateId.set(t.templateId, t);
    for (const exclId of b.poolExclusif) {
      const t = getTemplate(exclId);
      if (t) parTemplateId.set(t.templateId, t);
    }
  }
  return [...parTemplateId.values()].filter(
    (t) => !t.unique && t.rarete !== "legendaire",
  );
}
```

> Note : `ObjetTemplate` doit être importable depuis `@/types/game` ; s'il n'y est pas, importer depuis `@/data/objetTemplates` (vérifier où le type est défini — il est dans `objetTemplates.ts`). Ajuster l'import en conséquence.

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/atteignables.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/atteignables.ts src/lib/quetes/atteignables.test.ts
git commit -m "feat(quetes): objetsAtteignables (objets des brocantes débloquées)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Progression & cap

**Files:**
- Create: `src/lib/quetes/progression.ts`
- Test: `src/lib/quetes/progression.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/progression.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { niveauProgression, capSecondaires } from "./progression";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("progression", () => {
  it("au départ : tierMax 1, cap minimal 2", () => {
    const state = createMockGameState();
    const n = niveauProgression(state);
    expect(n.tierMax).toBe(1);
    expect(n.nbDebloquees).toBeGreaterThanOrEqual(1);
    expect(capSecondaires(state)).toBeGreaterThanOrEqual(2);
    expect(capSecondaires(state)).toBeLessThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/progression.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/progression.ts` :

```ts
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import type { GameState } from "@/types/game";

export interface NiveauProgression {
  tierMax: 1 | 2 | 3 | 4;
  nbDebloquees: number;
}

export function niveauProgression(state: GameState): NiveauProgression {
  const parTier = calculerBrocantesDebloqueesParTier(state);
  let tierMax: 1 | 2 | 3 | 4 = 1;
  let nbDebloquees = 0;
  for (const tier of [1, 2, 3, 4] as const) {
    const n = parTier.get(tier)?.size ?? 0;
    nbDebloquees += n;
    if (n > 0) tierMax = tier;
  }
  return { tierMax, nbDebloquees };
}

/** Nombre max de quêtes secondaires actives, croissant avec la progression. */
export function capSecondaires(state: GameState): number {
  const { nbDebloquees } = niveauProgression(state);
  return Math.min(6, Math.max(2, 2 + Math.floor(nbDebloquees / 3)));
}
```

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/progression.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/progression.ts src/lib/quetes/progression.test.ts
git commit -m "feat(quetes): niveauProgression + capSecondaires

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : Calcul de récompense

**Files:**
- Create: `src/lib/quetes/recompense.ts`
- Test: `src/lib/quetes/recompense.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/recompense.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { calculerRecompense } from "./recompense";
import type { ObjetTemplate } from "@/data/objetTemplates";

function tpl(prix: number): ObjetTemplate {
  return { templateId: "x", nom: "X", categorie: "Maison", rarete: "commun", prixRefBase: prix } as ObjetTemplate;
}

describe("calculerRecompense", () => {
  it("applique la prime sur la valeur de marché", () => {
    const r = calculerRecompense([{ templateId: "x" }], new Map([["x", tpl(100)]]));
    // 100 × 1.45 = 145 → arrondi multiple de 5
    expect(r).toBe(145);
  });

  it("majore selon l'état min exigé", () => {
    const base = calculerRecompense([{ templateId: "x" }], new Map([["x", tpl(100)]]));
    const exigeant = calculerRecompense([{ templateId: "x", etatMin: "Pristin état" }], new Map([["x", tpl(100)]]));
    expect(exigeant).toBeGreaterThan(base);
  });

  it("bonus pour objets multiples", () => {
    const map = new Map([["x", tpl(100)]]);
    const un = calculerRecompense([{ templateId: "x" }], map);
    const deux = calculerRecompense([{ templateId: "x" }, { templateId: "x" }], map);
    expect(deux).toBeGreaterThan(un * 2 * 0.9); // ~ 2× + bonus
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/recompense.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/recompense.ts` :

```ts
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { EtatObjet, MissionCible } from "@/types/game";

/** Prime fixe appliquée à la valeur de marché (réglable). Dans [1,3 ; 1,6]. */
const PRIME = 1.45;

const MULT_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.8,
  Bon: 1.0,
  "Très bon": 1.2,
  "Pristin état": 1.4,
};

function arrondi5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Récompense d'une quête : Σ(valeur marché des cibles, pondérée par etatMin)
 * × prime + bonus multi-objets (+10 % par cible au-delà de la première).
 */
export function calculerRecompense(
  cibles: MissionCible[],
  templates: Map<string, ObjetTemplate>,
): number {
  const base = cibles.reduce((acc, c) => {
    const prix = templates.get(c.templateId)?.prixRefBase ?? 0;
    const mult = c.etatMin ? MULT_ETAT[c.etatMin] : 1;
    return acc + prix * mult;
  }, 0);
  const bonusMulti = 1 + 0.1 * Math.max(0, cibles.length - 1);
  return arrondi5(base * PRIME * bonusMulti);
}
```

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/recompense.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/recompense.ts src/lib/quetes/recompense.test.ts
git commit -m "feat(quetes): calculerRecompense (valeur + prime + bonus)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 : Exposer l'évaluateur de conditions

**Files:**
- Modify: `src/lib/deblocage.ts`
- Test: `src/lib/deblocage.test.ts` (ajouter)

`debloquerQuetesPrincipales` (Task 9) doit évaluer une `ConditionDeblocage` brute. La fonction `evaluerCondition` existe déjà dans `deblocage.ts` mais n'est pas exportée.

- [ ] **Step 1: Écrire le test**

Ajouter dans `src/lib/deblocage.test.ts` :

```ts
import { evaluerCondition } from "./deblocage";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("evaluerCondition (exporté)", () => {
  it("retourne true pour la condition depart", () => {
    expect(evaluerCondition({ type: "depart" }, createMockGameState())).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/deblocage.test.ts 2>&1 | tail -8`
Expected: FAIL (`evaluerCondition` non exporté).

- [ ] **Step 3: Exporter**

Dans `src/lib/deblocage.ts`, ajouter le mot-clé `export` devant la déclaration `function evaluerCondition(` (chercher `function evaluerCondition`). Ne rien changer d'autre.

- [ ] **Step 4: Lancer (succès) + suite deblocage**

Run: `npm run test:run -- src/lib/deblocage.test.ts 2>&1 | tail -6`
Expected: PASS (y compris les tests existants).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deblocage.ts src/lib/deblocage.test.ts
git commit -m "refactor(deblocage): exporte evaluerCondition

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 : Gabarits de texte des secondaires

**Files:**
- Create: `src/lib/quetes/textes.ts`
- Test: `src/lib/quetes/textes.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/textes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { genererTexte } from "./textes";

describe("genererTexte", () => {
  it("insère le nom de l'objet et renvoie titre + corps", () => {
    const t = genererTexte("mode", ["Veste en jean délavée"], undefined, () => 0);
    expect(t.titre.length).toBeGreaterThan(0);
    expect(t.corps.join(" ")).toContain("Veste en jean délavée");
  });

  it("gère un commanditaire inconnu via le gabarit générique", () => {
    const t = genererTexte("inconnu", ["Lampe"], undefined, () => 0);
    expect(t.corps.join(" ")).toContain("Lampe");
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/textes.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/textes.ts` :

```ts
import type { EtatObjet } from "@/types/game";

interface Gabarit {
  titre: string;
  corps: string[];
}

/** `{objets}` = liste des objets, `{etat}` = mention d'état min (ou ""). */
const GENERIQUE: Gabarit[] = [
  { titre: "Recherche : {objets}", corps: ["Bonjour,", "Je cherche {objets}{etat}. Si tu mets la main dessus, fais-moi signe — je paie bien."] },
];

const PAR_COMMANDITAIRE: Record<string, Gabarit[]> = {
  "jeux-video": [
    { titre: "Pièce manquante", corps: ["Salut !", "Il me manque {objets}{etat} pour compléter ma collec'. Tu peux dégoter ça ?"] },
    { titre: "Pour la vitrine rétro", corps: ["Hello,", "Je monte une vitrine et j'ai besoin de {objets}{etat}. Compte sur toi !"] },
  ],
  "set-designer": [
    { titre: "Besoin déco", corps: ["Bonjour,", "Pour un décor, il me faut {objets}{etat}. Le détail qui fait vrai."] },
  ],
  mode: [
    { titre: "Pièce vintage", corps: ["Cher chineur,", "Ma collection réclame {objets}{etat}. Le bon vêtement raconte une histoire."] },
  ],
  art: [
    { titre: "Pour la galerie", corps: ["Cher ami,", "J'aimerais accrocher {objets}{etat}. Une belle pièce, naturellement."] },
  ],
};

export function genererTexte(
  commanditaireId: string,
  nomsObjets: string[],
  etatMin: EtatObjet | undefined,
  rng: () => number = Math.random,
): Gabarit {
  const gabarits = PAR_COMMANDITAIRE[commanditaireId] ?? GENERIQUE;
  const g = gabarits[Math.floor(rng() * gabarits.length)] ?? gabarits[0];
  const objets =
    nomsObjets.length === 1
      ? `« ${nomsObjets[0]} »`
      : nomsObjets.map((n) => `« ${n} »`).join(", ");
  const etat = etatMin ? ` (état min : ${etatMin})` : "";
  const fill = (s: string) => s.replaceAll("{objets}", objets).replaceAll("{etat}", etat);
  return { titre: fill(g.titre), corps: g.corps.map(fill) };
}
```

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/textes.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/textes.ts src/lib/quetes/textes.test.ts
git commit -m "feat(quetes): gabarits de texte des quêtes secondaires

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 : Générateur de quêtes secondaires

**Files:**
- Create: `src/lib/quetes/generateurSecondaire.ts`
- Test: `src/lib/quetes/generateurSecondaire.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/generateurSecondaire.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { genererQueteSecondaire } from "./generateurSecondaire";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

// rng déterministe : 0 → tous les tirages "bas"
const rng0 = () => 0;

describe("genererQueteSecondaire", () => {
  it("génère une quête secondaire valide au départ (rng favorable)", () => {
    const c = genererQueteSecondaire(createMockGameState(), 5, rng0);
    expect(c).not.toBeNull();
    expect(c!.payload.type).toBe("mission");
    if (c!.payload.type !== "mission") return;
    expect(c!.payload.categorie).toBe("secondaire");
    expect(c!.payload.cibles.length).toBeGreaterThanOrEqual(1);
    expect(c!.payload.jourLimite! - 5).toBeGreaterThanOrEqual(14);
    expect(c!.payload.jourLimite! - 5).toBeLessThanOrEqual(21);
    expect(c!.payload.recompense.argent).toBeGreaterThan(0);
    expect(c!.lu).toBe(true);
  });

  it("renvoie null si le tirage probabiliste échoue (rng élevé)", () => {
    expect(genererQueteSecondaire(createMockGameState(), 5, () => 0.99)).toBeNull();
  });

  it("ne demande pas un objet déjà ciblé par une quête active", () => {
    const state = createMockGameState();
    const c1 = genererQueteSecondaire(state, 5, rng0);
    expect(c1).not.toBeNull();
    // injecte c1 comme active, regénère : la nouvelle ne doit pas répéter le même templateId
    const tid = c1!.payload.type === "mission" ? c1!.payload.cibles[0].templateId : "";
    const state2 = {
      ...state,
      courriers: [...state.courriers, c1!],
      missions: [...state.missions, { courrierId: c1!.id, statut: "active" as const }],
    };
    const c2 = genererQueteSecondaire(state2, 6, rng0);
    if (c2 && c2.payload.type === "mission") {
      expect(c2.payload.cibles.map((x) => x.templateId)).not.toContain(tid);
    }
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/generateurSecondaire.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/generateurSecondaire.ts` :

```ts
import { creerCourrierMission } from "@/lib/courrier";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { Courrier, GameState, MissionCible, ObjetTemplate } from "@/types/game";
import { objetsAtteignables } from "./atteignables";
import { capSecondaires, niveauProgression } from "./progression";
import { calculerRecompense } from "./recompense";
import { genererTexte } from "./textes";

/** Probabilité de générer une quête un jour donné (sous le cap). */
const P_GEN = 0.3;

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** templateId déjà demandés par une quête active (pour éviter les doublons). */
function templateIdsActifs(state: GameState): Set<string> {
  const ids = new Set<string>();
  const actifs = new Set(state.missions.filter((m) => m.statut === "active").map((m) => m.courrierId));
  for (const c of state.courriers) {
    if (!actifs.has(c.id) || c.payload.type !== "mission") continue;
    for (const cible of c.payload.cibles) ids.add(cible.templateId);
  }
  return ids;
}

export function genererQueteSecondaire(
  state: GameState,
  jour: number,
  rng: () => number = Math.random,
): Courrier | null {
  const actives = state.missions.filter((m) => {
    if (m.statut !== "active") return false;
    const c = state.courriers.find((x) => x.id === m.courrierId);
    return c?.payload.type === "mission" && c.payload.categorie === "secondaire";
  });
  if (actives.length >= capSecondaires(state)) return null;
  if (rng() >= P_GEN) return null;

  const dejaDemandes = templateIdsActifs(state);
  const pool = objetsAtteignables(state).filter((t) => !dejaDemandes.has(t.templateId));
  if (pool.length === 0) return null;

  // Commanditaire : un dont le domaine a des objets dans le pool (hors maman/grand-pere).
  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const candidats = commanditaires.filter((e) => pool.some((t) => t.categorie === e.domaine));
  const exp = candidats.length > 0 ? pick(candidats, rng) : pick(commanditaires, rng);

  const poolDomaine = pool.filter((t) => t.categorie === exp.domaine);
  const poolCible = poolDomaine.length > 0 ? poolDomaine : pool;

  // Difficulté progressive.
  const { tierMax } = niveauProgression(state);
  const nbCibles = tierMax >= 3 ? 1 + Math.floor(rng() * 3) : 1; // 1 (tier 1-2) ; 1-3 (tier 3-4)
  const choisis: ObjetTemplate[] = [];
  const restant = [...poolCible];
  for (let i = 0; i < nbCibles && restant.length > 0; i++) {
    const idx = Math.floor(rng() * restant.length);
    choisis.push(restant.splice(idx, 1)[0]);
  }
  const etatMin = tierMax >= 3 && rng() < 0.4 ? ("Très bon" as const) : undefined;
  const cibles: MissionCible[] = choisis.map((t) => ({
    templateId: t.templateId,
    ...(etatMin ? { etatMin } : {}),
  }));

  const templates = new Map(choisis.map((t) => [t.templateId, t]));
  const recompense = { argent: calculerRecompense(cibles, templates) };
  const jourLimite = jour + 14 + Math.floor(rng() * 8); // 14-21

  const texte = genererTexte(exp.id, choisis.map((t) => t.nom), etatMin, rng);
  const id = `sec_${jour}_${state.courriers.length}`;

  return {
    ...creerCourrierMission({
      id,
      jour,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: "secondaire",
      cibles,
      jourLimite,
      recompense,
    }),
    lu: true,
  };
}
```

> ⚠️ Vérifie que `MissionCible` est exporté par `@/types/game` et `ObjetTemplate` par `@/data/objetTemplates` (le type `ObjetTemplate` vit dans `objetTemplates.ts`, pas dans `game.ts`) ; ajuste les imports en conséquence.

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/generateurSecondaire.test.ts 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/generateurSecondaire.ts src/lib/quetes/generateurSecondaire.test.ts
git commit -m "feat(quetes): générateur de quêtes secondaires (probabiliste, réalisable)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 : Commanditaire « grand-père » + registre des chapitres

**Files:**
- Modify: `src/data/expediteursCourrier.ts`
- Create: `src/data/quetesPrincipales.ts`
- Test: `src/data/quetesPrincipales.test.ts`

- [ ] **Step 1: Ajouter l'expéditeur grand-père**

Dans `src/data/expediteursCourrier.ts`, ajouter dans `EXPEDITEURS` (après `maman`) :

```ts
  "grand-pere": {
    id: "grand-pere",
    nom: "Grand-père",
    personnalite: "Antiquaire disparu",
    relation: "Grand-père",
    avatar: "/personas/commanditaires/grand-pere.webp",
    signature: "À toi de jouer, petit.\nGrand-père",
  },
```

- [ ] **Step 2: Écrire le test du registre**

Créer `src/data/quetesPrincipales.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { QUETES_PRINCIPALES } from "./quetesPrincipales";
import { getTemplate } from "@/data/objetTemplates";

describe("QUETES_PRINCIPALES", () => {
  it("a des ordres uniques et croissants à partir de 1", () => {
    const ordres = QUETES_PRINCIPALES.map((q) => q.ordre);
    expect(ordres).toEqual([...ordres].sort((a, b) => a - b));
    expect(new Set(ordres).size).toBe(ordres.length);
    expect(ordres[0]).toBe(1);
  });

  it("le premier chapitre se débloque au départ", () => {
    expect(QUETES_PRINCIPALES[0].condition).toEqual({ type: "depart" });
  });

  it("le dernier chapitre cible l'unique des bijoux de la reine", () => {
    const last = QUETES_PRINCIPALES[QUETES_PRINCIPALES.length - 1];
    expect(last.payload.cibles.some((c) => c.templateId === "uniq.mo.bijou_marie_antoinette")).toBe(true);
  });

  it("toutes les cibles référencent des templates existants", () => {
    for (const q of QUETES_PRINCIPALES) {
      for (const c of q.payload.cibles) {
        expect(getTemplate(c.templateId), `${q.id}:${c.templateId}`).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 3: Lancer (échec attendu)**

Run: `npm run test:run -- src/data/quetesPrincipales.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 4: Implémenter le registre**

Créer `src/data/quetesPrincipales.ts` :

```ts
import type { ConditionDeblocage, MissionCible } from "@/types/game";

export interface ChapitrePrincipal {
  id: string;
  ordre: number;
  condition: ConditionDeblocage;
  payload: {
    titre: string;
    corps: string[];
    cibles: MissionCible[];
    recompense: { argent: number };
    /** Échéance = jour d'injection + offset. Absent ⇒ pas d'échéance. */
    jourLimiteOffset?: number;
  };
}

/**
 * Arc principal : lettres écrites à l'avance par le grand-père antiquaire, avant
 * sa disparition, adressées au joueur. Ton : nostalgie + comédie sarcastique +
 * mystère. Débloquées par la progression ; la finale acquiert l'unique.
 */
export const QUETES_PRINCIPALES: ChapitrePrincipal[] = [
  {
    id: "principale_ch1",
    ordre: 1,
    condition: { type: "depart" },
    payload: {
      titre: "La dernière page du carnet",
      corps: [
        "Mon petit,",
        "Si tu lis ces lignes, c'est que la boutique est à toi — et moi, ailleurs. Ne fais pas cette tête : un antiquaire ne meurt pas, il se déplace, voilà tout.",
        "Avant de partir, j'ai une dernière lubie : retrouve ma vieille **lampe d'atelier**. Elle a éclairé quarante ans de trouvailles. Rapporte-la-moi, façon de parler.",
      ],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 60 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch2",
    ordre: 2,
    condition: { type: "brocantesDebloquees", tier: 2, nombre: 1 },
    payload: {
      titre: "Te faire un nom",
      corps: [
        "Déjà reçu chez les grands ? Pas mal, pour un débutant.",
        "Le milieu ne respecte que ceux qui ont l'œil. Dégote-moi une **belle pièce de faïence** — qu'on voie que tu sais reconnaître la qualité.",
        "(Et non, je ne te dirai pas encore où je suis. Patience.)",
      ],
      cibles: [{ templateId: "ma.pichet_faience_emaillee" }],
      recompense: { argent: 110 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch3",
    ordre: 3,
    condition: { type: "brocantesDebloquees", tier: 3, nombre: 1 },
    payload: {
      titre: "Les portes du beau monde",
      corps: [
        "Tiens, tiens. Les salons feutrés t'ouvrent leurs portes.",
        "Là-haut, on ne pardonne pas l'à-peu-près. Trouve-moi une **gravure en très bel état** — impeccable, tu m'entends.",
        "Ce que je cherchais se cache tout en haut de cette échelle. Comme par hasard.",
      ],
      cibles: [{ templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }],
      recompense: { argent: 220 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch4",
    ordre: 4,
    condition: { type: "brocantesDebloquees", tier: 3, nombre: 5 },
    payload: {
      titre: "L'invitation",
      corps: [
        "Le Grand Salon des Antiquaires t'a invité. Évidemment qu'il t'a invité — je l'avais prévu, petit.",
        "Tout ça, ce carnet, ces commandes… ce n'était pas pour la lampe ni la faïence. C'était pour t'amener ici. Là où tout a commencé. Là où tout s'est arrêté.",
        "Une dernière chose t'attend dans ce salon. Tu sais laquelle.",
      ],
      cibles: [],
      recompense: { argent: 150 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch5",
    ordre: 5,
    condition: { type: "brocantesDebloquees", tier: 3, nombre: 5 },
    payload: {
      titre: "Les bijoux de la reine",
      corps: [
        "Les voilà. **Les bijoux de la reine.** Ce pour quoi j'ai tout quitté, un soir, sans un mot.",
        "Mets la main dessus, et tu comprendras pourquoi je suis parti — et peut-être où me trouver.",
        "Le reste t'appartient, maintenant. Comme tout le reste.",
      ],
      cibles: [{ templateId: "uniq.mo.bijou_marie_antoinette" }],
      recompense: { argent: 500 },
      jourLimiteOffset: undefined,
    },
  },
];
```

- [ ] **Step 5: Lancer (succès)**

Run: `npm run test:run -- src/data/quetesPrincipales.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/quetesPrincipales.ts src/data/quetesPrincipales.test.ts src/data/expediteursCourrier.ts
git commit -m "feat(quetes): registre de l'arc principal + commanditaire grand-père

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 : Déblocage des chapitres principaux

**Files:**
- Create: `src/lib/quetes/principales.ts`
- Test: `src/lib/quetes/principales.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/principales.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { debloquerQuetesPrincipales } from "./principales";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("debloquerQuetesPrincipales", () => {
  it("injecte le chapitre 1 (depart) si absent", () => {
    const out = debloquerQuetesPrincipales(createMockGameState(), 1);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("principale_ch1");
    expect(out[0].payload.type).toBe("mission");
  });

  it("n'injecte pas le chapitre 2 tant que le chapitre 1 n'est pas livré", () => {
    const state = createMockGameState();
    const ch1 = debloquerQuetesPrincipales(state, 1)[0];
    const avecCh1 = {
      ...state,
      courriers: [...state.courriers, ch1],
      missions: [...state.missions, { courrierId: "principale_ch1", statut: "active" as const }],
    };
    expect(debloquerQuetesPrincipales(avecCh1, 2)).toEqual([]);
  });

  it("n'injecte rien si le chapitre 1 est déjà présent et actif", () => {
    const state = createMockGameState();
    const ch1 = debloquerQuetesPrincipales(state, 1)[0];
    const avecCh1 = { ...state, courriers: [...state.courriers, ch1] };
    expect(debloquerQuetesPrincipales(avecCh1, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/principales.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/principales.ts` :

```ts
import { creerCourrierMission } from "@/lib/courrier";
import { evaluerCondition } from "@/lib/deblocage";
import { QUETES_PRINCIPALES, type ChapitrePrincipal } from "@/data/quetesPrincipales";
import type { Courrier, GameState } from "@/types/game";

function enCourrier(ch: ChapitrePrincipal, jour: number): Courrier {
  return {
    ...creerCourrierMission({
      id: ch.id,
      jour,
      expediteurId: "grand-pere",
      titre: ch.payload.titre,
      corps: ch.payload.corps,
      categorie: "principale",
      cibles: ch.payload.cibles,
      recompense: ch.payload.recompense,
      ...(ch.payload.jourLimiteOffset !== undefined
        ? { jourLimite: jour + ch.payload.jourLimiteOffset }
        : {}),
    }),
    lu: true,
  };
}

/**
 * Injecte le prochain chapitre principal si sa condition est remplie et que le
 * chapitre précédent est livré. Retourne les courriers à ajouter (0 ou 1).
 * Idempotent : ne réinjecte jamais un chapitre déjà présent.
 */
export function debloquerQuetesPrincipales(state: GameState, jour: number): Courrier[] {
  const presents = new Set(state.courriers.map((c) => c.id));
  const livrees = new Set(
    state.missions.filter((m) => m.statut === "livree").map((m) => m.courrierId),
  );
  const chapitres = [...QUETES_PRINCIPALES].sort((a, b) => a.ordre - b.ordre);

  for (const ch of chapitres) {
    if (presents.has(ch.id)) continue; // déjà injecté → on s'arrête à la première lacune
    const precedent = chapitres.find((c) => c.ordre === ch.ordre - 1);
    if (precedent && !livrees.has(precedent.id)) return []; // précédent pas encore livré
    if (!evaluerCondition(ch.condition, state)) return []; // condition non remplie
    return [enCourrier(ch, jour)];
  }
  return [];
}
```

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/principales.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/principales.ts src/lib/quetes/principales.test.ts
git commit -m "feat(quetes): déblocage progressif des chapitres principaux

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 : Orchestrateur `tickQuetes`

**Files:**
- Create: `src/lib/quetes/tick.ts`
- Test: `src/lib/quetes/tick.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `src/lib/quetes/tick.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { tickQuetes } from "./tick";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("tickQuetes", () => {
  it("ajoute le chapitre 1 et crée sa résolution active", () => {
    const state = createMockGameState();
    const out = tickQuetes(state, 1, () => 0.99); // rng élevé → pas de secondaire
    expect(out.courriers.some((c) => c.id === "principale_ch1")).toBe(true);
    expect(out.missions.some((m) => m.courrierId === "principale_ch1" && m.statut === "active")).toBe(true);
  });

  it("ajoute une secondaire avec rng favorable et crée sa résolution", () => {
    const state = createMockGameState();
    const out = tickQuetes(state, 5, () => 0);
    const sec = out.courriers.find((c) => c.id.startsWith("sec_"));
    expect(sec).toBeDefined();
    expect(out.missions.some((m) => m.courrierId === sec!.id && m.statut === "active")).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer (échec attendu)**

Run: `npm run test:run -- src/lib/quetes/tick.test.ts 2>&1 | tail -8`
Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter**

Créer `src/lib/quetes/tick.ts` :

```ts
import type { Courrier, GameState, MissionResolution } from "@/types/game";
import { debloquerQuetesPrincipales } from "./principales";
import { genererQueteSecondaire } from "./generateurSecondaire";

/**
 * Tick quotidien des quêtes : débloque le chapitre principal dû puis tente une
 * génération secondaire. Retourne les nouvelles listes courriers + missions
 * (résolutions actives ajoutées pour chaque mission créée).
 */
export function tickQuetes(
  state: GameState,
  jour: number,
  rng: () => number = Math.random,
): { courriers: Courrier[]; missions: MissionResolution[] } {
  let courriers = state.courriers;
  let missions = state.missions;

  const ajouter = (nouveaux: Courrier[]) => {
    if (nouveaux.length === 0) return;
    courriers = [...courriers, ...nouveaux];
    missions = [
      ...missions,
      ...nouveaux.map((c) => ({ courrierId: c.id, statut: "active" as const })),
    ];
  };

  ajouter(debloquerQuetesPrincipales({ ...state, courriers, missions }, jour));
  const sec = genererQueteSecondaire({ ...state, courriers, missions }, jour, rng);
  if (sec) ajouter([sec]);

  return { courriers, missions };
}
```

- [ ] **Step 4: Lancer (succès)**

Run: `npm run test:run -- src/lib/quetes/tick.test.ts 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quetes/tick.ts src/lib/quetes/tick.test.ts
git commit -m "feat(quetes): orchestrateur tickQuetes (principal + secondaire)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 : Brancher dans le jeu + amorce + retrait des démos

**Files:**
- Modify: `src/context/GameContext.tsx` (`avancerJour` ~321-339 ; `nouvellePartie`)
- Modify: `src/lib/migrations.ts` (amorce au chargement, retrait injection démo)
- Modify: `src/lib/courrier.ts` (vider `creerMissionsTest`)
- Test: `src/lib/migrations.test.ts` (mettre à jour)

- [ ] **Step 1: Brancher `tickQuetes` dans `avancerJour`**

Dans `src/context/GameContext.tsx`, ajouter en haut l'import :
```ts
import { tickQuetes } from "@/lib/quetes/tick";
```
Puis dans `avancerJour`, juste après le bloc `baseAvecMissions` (≈ ligne 327), insérer :
```ts
      const tick = tickQuetes(baseAvecMissions, nouveauJour);
      const baseAvecQuetes: GameState = {
        ...baseAvecMissions,
        courriers: tick.courriers,
        missions: tick.missions,
      };
```
Et remplacer les `return` suivants pour partir de `baseAvecQuetes` au lieu de `baseAvecMissions` :
```ts
      if (tierStockage) {
        return appendLedger(baseAvecQuetes, {
          jour: nouveauJour,
          kind: "loyer",
          designation: `Loyer · ${tierStockage.nom}`,
          recette: 0,
          depense: tierStockage.loyerHebdo,
        });
      }
      return baseAvecQuetes;
```

- [ ] **Step 2: Amorce dans `nouvellePartie`**

Dans `nouvellePartie` (`GameContext.tsx`), repérer la construction de l'état initial (`setState({ … })`). Après avoir l'objet initial, injecter le chapitre 1. Le plus simple : remplacer `missions: []` et la liste `courriers` initiale par un post-traitement `tickQuetes`. Concrètement, extraire l'état initial dans une const `initial`, puis :
```ts
    const initial: GameState = { /* …champs existants, dont version, budget, courriers:[...], missions:[] … */ };
    const tick = tickQuetes(initial, initial.jourActuel, () => 0.99); // amorce principale seule (pas de secondaire)
    setState({ ...initial, courriers: tick.courriers, missions: tick.missions });
```
(le `rng` 0,99 garantit qu'aucune secondaire n'est générée à la création ; seule l'amorce `principale_ch1` est ajoutée.)

- [ ] **Step 3: Amorce au chargement (migration)**

Dans `src/lib/migrations.ts`, dans `appliquerMigrations`, là où les `courriers`/`missions` finaux sont construits (chercher l'usage de `injecterMissionsTestSiAbsentes`), **remplacer** l'injection des missions de test par l'injection de l'amorce principale. Ajouter l'import :
```ts
import { debloquerQuetesPrincipales } from "@/lib/quetes/principales";
```
Puis, après avoir reconstruit `courriers` et `missions`, appliquer :
```ts
  const amorce = debloquerQuetesPrincipales(
    { ...loadedComplet, courriers, missions } as GameState,
    loadedComplet.jourActuel ?? INITIAL_JOUR,
  );
  const courriersFinaux = [...courriers, ...amorce];
  const missionsFinales = [
    ...missions,
    ...amorce.map((c) => ({ courrierId: c.id, statut: "active" as const })),
  ];
```
et utiliser `courriersFinaux`/`missionsFinales` dans l'objet retourné (à la place de `courriers`/`missions`). Retirer l'appel à `injecterMissionsTestSiAbsentes` et son import s'il devient inutilisé.

> Adapter aux noms de variables réels du fichier (les missions de test sont aujourd'hui injectées via `injecterMissionsTestSiAbsentes` ; c'est exactement ce bloc qu'on remplace par l'amorce principale).

- [ ] **Step 4: Vider `creerMissionsTest`**

Dans `src/lib/courrier.ts`, remplacer le corps de `creerMissionsTest` par un tableau vide et vider `ID_MISSIONS_TEST` (garder les exports pour ne pas casser les imports) :
```ts
export const ID_MISSIONS_TEST = [] as const;

/** Plus de missions de démo : les quêtes proviennent du générateur + de l'arc
 *  principal (cf. src/lib/quetes/). Conservé vide pour compat d'API. */
export function creerMissionsTest(_jour: number): Courrier[] {
  return [];
}
```

- [ ] **Step 5: Mettre à jour le test des migrations**

Dans `src/lib/migrations.test.ts`, le test « ajoute grandLivre vide si historique est vide » attend `ID_MISSIONS_TEST.length` missions injectées. Le remplacer pour vérifier l'amorce principale :
```ts
    expect(migrated.grandLivre).toEqual([]);
    // L'amorce de l'arc principal (chapitre 1) est injectée au chargement.
    expect(migrated.courriers.some((c) => c.id === "principale_ch1")).toBe(true);
    expect(migrated.missions.some((m) => m.courrierId === "principale_ch1" && m.statut === "active")).toBe(true);
```
Retirer l'import `ID_MISSIONS_TEST` s'il n'est plus utilisé ailleurs dans le fichier.

- [ ] **Step 6: Suite complète + build**

Run: `npm run test:run 2>&1 | grep -E "Test Files|Tests |FAIL"`
Expected: tous verts (aucun FAIL).
Run: `npm run build 2>&1 | grep -iE "Compiled|error" | head -2`
Expected: « Compiled successfully », aucune erreur de type.

- [ ] **Step 7: Commit**

```bash
git add src/context/GameContext.tsx src/lib/migrations.ts src/lib/migrations.test.ts src/lib/courrier.ts
git commit -m "feat(quetes): branche la génération dans avancerJour + amorce, retire les démos

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 : Vérification en jeu

**Files:** aucun (validation manuelle)

- [ ] **Step 1: Lancer et observer**

Run: `npm run dev`. Nouvelle partie → le carnet montre **« La dernière page du carnet »** (grand-père) en principale. Avancer plusieurs jours → des **quêtes secondaires** apparaissent (commanditaires variés, objets trouvables dans les brocantes débloquées, échéances ≥ 14 j). Débloquer des brocantes tier 2/3 → chapitres 2/3 du grand-père.

- [ ] **Step 2: Commit éventuel d'ajustements d'équilibrage**

```bash
git add -A && git commit -m "tune(quetes): ajustements d'équilibrage après test en jeu

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes finales

- **Portrait** `public/personas/commanditaires/grand-pere.webp` à fournir (sinon pastille à initiale « G »).
- Le portrait de **Maman** reste à fournir aussi.
- Valeurs d'équilibrage à ajuster après test : `P_GEN` (0,3), `PRIME` (1,45), courbe `capSecondaires`, seuils de difficulté.
- Les **textes** des 5 chapitres sont fournis ici ; à relire/affiner avec l'auteur pour le ton (mystère).
- Si une save contient encore des `demo_*`, elles vivent leur vie / expirent — inoffensives.
