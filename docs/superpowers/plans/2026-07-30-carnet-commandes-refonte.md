# Refonte du carnet de commandes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les commandes donnent argent + XP + énergie, affichés partout via un module pur unique, avec une carte refondue (bandeau récompense, progression pleine largeur) et une cérémonie d'envol XP → énergie → argent à la livraison.

**Architecture:** Un module pur `lib/recompenses.ts` est la source unique de vérité des gains (défauts XP par catégorie) ; l'énergie peut déborder (`ENERGIE_PLAFOND = 10`) ; l'UI partage un composant `RecompenseJetons` ; la cérémonie suit un plan daté produit par `lib/quetes/ceremonieLivraison.ts` (modèle `lib/bilan/ceremonie.ts`) et gèle l'affichage du header via `lib/affichageGele.ts` (étendu à l'énergie).

**Tech Stack:** Next.js/React (styles inline CSSProperties, pattern maison), TypeScript, vitest + @testing-library/react (env jsdom par directive `// @vitest-environment jsdom`), lucide-react pour les icônes, i18n maison 4 langues (`src/lib/i18n/ui/{fr,en,es,el}.ts`).

**Spec:** `docs/superpowers/specs/2026-07-30-carnet-commandes-refonte-design.md`

## Global Constraints

- **vitest : TOUJOURS `npx vitest run --maxWorkers=4 [chemins]`** — sans le drapeau, ~41 faux échecs par famine de workers sur ce Mac Intel.
- Lint : `npx eslint src` (PAS `npm run lint`, cassé sous Next 16). Filet hooks : `npm run lint:hooks`.
- Jamais de chaîne localisée dans la sauvegarde (les `params` du ledger sont des nombres/ids).
- Champs de types **additifs uniquement** sur les structures sérialisées (`CourrierPayloadMission`, `LedgerParams`) : aucune migration de save pour ce chantier, sauf le plafond énergie (Task 2).
- La pub récompensée reste plafonnée à `ENERGIE_MAX = 5` — ne PAS toucher `regarderPubEnergie` (`GameContext.tsx` ~l.412).
- Palette existante : crème `#f4e9cd`, brun `#3a2f1e`, bordeaux `#6e1f1f`, laiton `#c8a24a`/`#8a6d2e`, vert `#2c5e3f`, vermillon `#a31f1f`, or pâle `#e3d7b6`.
- Commits fréquents, messages en français, style `feat(carnet): …` / `test(...): …`, signés `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Exécution en worktree isolé (skill superpowers:using-git-worktrees), branche `feat/carnet-recompenses` depuis `feat/pipeline-reels` (le commit de spec y vit ; NE PAS baser sur main).

---

### Task 1: Modèle de récompense + `recompenseEffective`

**Files:**
- Modify: `src/types/game.ts` (~l.180, champ `recompense` de `CourrierPayloadMission`)
- Create: `src/lib/recompenses.ts`
- Test: `src/lib/recompenses.test.ts`

**Interfaces:**
- Consumes: `XP_QUETE_QUOTIDIENNE|HEBDO|PRINCIPALE` (`@/lib/xp`), types `CourrierPayloadMission`, `MissionCategorie` (`@/types/game`).
- Produces: `interface RecompenseEffective { argent: number; xp: number; energie: number }`, `recompenseEffective(payload: CourrierPayloadMission): RecompenseEffective`, `xpParDefaut(categorie: MissionCategorie): number`. Toutes les tâches UI (5, 6, 8) et la Task 3 en dépendent.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// src/lib/recompenses.test.ts
import { describe, expect, it } from "vitest";
import { recompenseEffective, xpParDefaut } from "./recompenses";
import { XP_QUETE_HEBDO, XP_QUETE_PRINCIPALE, XP_QUETE_QUOTIDIENNE } from "@/lib/xp";
import type { CourrierPayloadMission } from "@/types/game";

function mission(patch: Partial<CourrierPayloadMission> = {}): CourrierPayloadMission {
  return {
    type: "mission", categorie: "quotidienne", expediteurId: "maman",
    titre: "T", corps: [], cibles: [], recompense: { argent: 30 },
    ...patch,
  };
}

describe("xpParDefaut", () => {
  it("suit les constantes de catégorie", () => {
    expect(xpParDefaut("quotidienne")).toBe(XP_QUETE_QUOTIDIENNE);
    expect(xpParDefaut("hebdomadaire")).toBe(XP_QUETE_HEBDO);
    expect(xpParDefaut("principale")).toBe(XP_QUETE_PRINCIPALE);
  });
});

describe("recompenseEffective", () => {
  it("applique le défaut XP de la catégorie quand xp est absent", () => {
    const r = recompenseEffective(mission({ categorie: "principale", recompense: { argent: 200 } }));
    expect(r).toEqual({ argent: 200, xp: XP_QUETE_PRINCIPALE, energie: 0 });
  });

  it("respecte un xp explicite, y compris 0", () => {
    expect(recompenseEffective(mission({ recompense: { argent: 30, xp: 300 } })).xp).toBe(300);
    expect(recompenseEffective(mission({ recompense: { argent: 30, xp: 0 } })).xp).toBe(0);
  });

  it("énergie absente → 0, explicite → conservée", () => {
    expect(recompenseEffective(mission()).energie).toBe(0);
    expect(recompenseEffective(mission({ recompense: { argent: 30, energie: 2 } })).energie).toBe(2);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts`
Expected: FAIL — `Cannot find module './recompenses'`.

- [ ] **Step 3: Implémenter**

Dans `src/types/game.ts`, remplacer `recompense: { argent: number };` (payload mission, ~l.180) par :

```ts
  /** Récompense de livraison. `xp` absent → constante de catégorie
   *  (XP_QUETE_*, cf. lib/recompenses). `energie` absent → 0 ; peut faire
   *  déborder la jauge au-delà d'ENERGIE_MAX (borné par ENERGIE_PLAFOND). */
  recompense: { argent: number; xp?: number; energie?: number };
```

Créer `src/lib/recompenses.ts` :

```ts
import {
  XP_QUETE_HEBDO,
  XP_QUETE_PRINCIPALE,
  XP_QUETE_QUOTIDIENNE,
} from "@/lib/xp";
import type { CourrierPayloadMission, MissionCategorie } from "@/types/game";

/** Récompense totale d'une commande, défauts appliqués — source unique de
 *  vérité pour les 4 surfaces d'affichage ET le versement à la livraison. */
export interface RecompenseEffective {
  argent: number;
  xp: number;
  energie: number;
}

/** XP versée à défaut de `recompense.xp` explicite (comportement historique). */
export function xpParDefaut(categorie: MissionCategorie): number {
  switch (categorie) {
    case "principale":
      return XP_QUETE_PRINCIPALE;
    case "hebdomadaire":
      return XP_QUETE_HEBDO;
    case "quotidienne":
      return XP_QUETE_QUOTIDIENNE;
  }
}

export function recompenseEffective(
  payload: CourrierPayloadMission,
): RecompenseEffective {
  return {
    argent: payload.recompense.argent,
    xp: payload.recompense.xp ?? xpParDefaut(payload.categorie),
    energie: payload.recompense.energie ?? 0,
  };
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/lib/recompenses.ts src/lib/recompenses.test.ts
git commit -m "feat(carnet): modèle de récompense xp/énergie + recompenseEffective"
```

---

### Task 2: Débordement d'énergie

**Files:**
- Modify: `src/lib/energie.ts` (l.4-6 constantes, l.31-32 settle)
- Modify: `src/lib/migrations.ts` (~l.771, plafond de chargement)
- Test: `src/lib/energie.test.ts` (étendre), `src/lib/migrations.test.ts` (étendre — repérer le describe du chargement d'énergie existant et ajouter à côté)

**Interfaces:**
- Produces: `export const ENERGIE_PLAFOND = 10` (`@/lib/energie`) ; `settleEnergie` préserve désormais toute valeur > max. Consommé par Task 3 (versement) et Task 2 elle-même (migrations).

- [ ] **Step 1: Tests qui échouent — `energie.test.ts`**

Ajouter au fichier existant (respecter ses helpers/style, le lire d'abord) :

```ts
describe("débordement (récompenses de commandes)", () => {
  it("settleEnergie préserve une énergie au-dessus du max sans la rabattre", () => {
    const r = settleEnergie({ energie: 7, energieDerniereMaj: 1000 }, 10 * 60 * 60 * 1000);
    expect(r.energie).toBe(7);
  });

  it("au-dessus du max : pas de recharge, l'ancre suit now", () => {
    const now = 5 * RECHARGE_INTERVAL_MS;
    const r = settleEnergie({ energie: 6, energieDerniereMaj: 0 }, now);
    expect(r.energie).toBe(6);
    expect(r.energieDerniereMaj).toBe(now);
  });

  it("exactement au max : comportement inchangé (ancre suit now, valeur = max)", () => {
    const now = 3 * RECHARGE_INTERVAL_MS;
    const r = settleEnergie({ energie: 5, energieDerniereMaj: 0 }, now);
    expect(r).toEqual({ energie: 5, energieDerniereMaj: now });
  });

  it("ENERGIE_PLAFOND vaut 10", () => {
    expect(ENERGIE_PLAFOND).toBe(10);
  });
});
```

(Compléter les imports du fichier : `ENERGIE_PLAFOND`, `RECHARGE_INTERVAL_MS` si absents.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/energie.test.ts`
Expected: FAIL — `ENERGIE_PLAFOND` non exporté + rabat à 5 sur le premier test.

- [ ] **Step 3: Implémenter `energie.ts`**

Après `export const ENERGIE_MAX = 5;` ajouter :

```ts
/** Plafond ABSOLU de la jauge : les récompenses de commandes peuvent faire
 *  déborder au-delà d'ENERGIE_MAX (ex. 7/5), jamais au-delà de ce plafond.
 *  La recharge par le temps et la pub restent bornées à ENERGIE_MAX. */
export const ENERGIE_PLAFOND = 10;
```

Dans `settleEnergie`, remplacer :

```ts
  // Déjà plein : pas de banque de temps, l'ancre suit `now`.
  if (energie >= energieMax) {
    return { energie: energieMax, energieDerniereMaj: now };
  }
```

par :

```ts
  // Déjà plein (ou en débordement de récompense) : pas de banque de temps ni
  // de recharge, l'ancre suit `now`. On PRÉSERVE la valeur : la rabattre à
  // `max` effacerait un débordement gagné en livrant une commande.
  if (energie >= energieMax) {
    return { energie, energieDerniereMaj: now };
  }
```

- [ ] **Step 4: Vérifier le passage + non-régression du module**

Run: `npx vitest run --maxWorkers=4 src/lib/energie.test.ts`
Expected: PASS, aucun test existant cassé.

- [ ] **Step 5: Tests migrations qui échouent**

Dans `src/lib/migrations.test.ts`, repérer comment les tests existants chargent une save (helper de fixture du fichier) et ajouter, dans le même style :

```ts
it("énergie 7 (débordement de récompense) : préservée au chargement", () => {
  // construire une save valide avec energie: 7 via le helper du fichier
  // puis charger et vérifier :
  expect(chargee.energie).toBe(7);
});

it("énergie 12 (au-delà du plafond) : rabattue à ENERGIE_PLAFOND", () => {
  expect(chargee.energie).toBe(10);
});
```

Run: `npx vitest run --maxWorkers=4 src/lib/migrations.test.ts`
Expected: FAIL — le premier attend 7 mais reçoit 5.

- [ ] **Step 6: Implémenter `migrations.ts`**

À ~l.771, dans le bloc `energie:` : remplacer `const max = ENERGIE_MAX;` par `const max = ENERGIE_PLAFOND;`, ajuster l'import (`import { ENERGIE_PLAFOND } from "@/lib/energie";` — retirer `ENERGIE_MAX` s'il n'est plus utilisé ailleurs dans le fichier) et mettre à jour le commentaire :

```ts
    energie: (() => {
      // Plafond de chargement = ENERGIE_PLAFOND (10) : depuis 2026-07-30 les
      // commandes peuvent faire déborder la jauge au-delà d'ENERGIE_MAX (5),
      // un débordement sauvé la veille doit survivre à la réouverture.
      const max = ENERGIE_PLAFOND;
```

- [ ] **Step 7: Vérifier le passage**

Run: `npx vitest run --maxWorkers=4 src/lib/migrations.test.ts src/lib/energie.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/energie.ts src/lib/energie.test.ts src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(énergie): débordement au-delà du max (plafond 10), settle et chargement préservants"
```

---

### Task 3: `appliquerRecompense` + branchement dans `livrerMission` + params ledger

**Files:**
- Modify: `src/lib/recompenses.ts` (ajouter `appliquerRecompense`)
- Modify: `src/types/game.ts` (`LedgerParams`, ~l.245 : champs `xp?`, `energie?`)
- Modify: `src/context/GameContext.tsx` (`livrerMission`, ~l.1654-1770)
- Test: `src/lib/recompenses.test.ts` (étendre)

**Interfaces:**
- Consumes: `appendLedger(state, partial, opts?)` (`@/lib/grandLivre`), `appliquerGainXPBrocanteur(b, gain, pointsDepenses)` (`@/lib/xp`), `pointsDepensesCompetences` (`@/lib/competences` — vérifier le chemin d'import réel dans GameContext.tsx l.~100), `settleEnergie`, `ENERGIE_MAX`, `ENERGIE_PLAFOND` (`@/lib/energie`), `RecompenseEffective` (Task 1).
- Produces:

```ts
export interface ContexteLedgerMission {
  designation: string;      // `Mission · ${titre}` (compat designation FR)
  courrierId: string;
  gabaritId?: string;
  etatMin?: EtatObjet;
  templateIds?: string[];
}
export function appliquerRecompense(
  state: GameState,
  r: RecompenseEffective,
  ledger: ContexteLedgerMission,
  now: number,
): GameState;
```

- [ ] **Step 1: Tests qui échouent**

Ajouter à `src/lib/recompenses.test.ts` (le fixture `createMockGameState` vient de `@/lib/__test-fixtures__/gameState`) :

```ts
import { appliquerRecompense } from "./recompenses";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

const LEDGER = { designation: "Mission · T", courrierId: "m1" };

describe("appliquerRecompense", () => {
  it("crédite l'argent au grand livre avec params xp/énergie", () => {
    const s = createMockGameState({ budget: 100 });
    const next = appliquerRecompense(s, { argent: 50, xp: 25, energie: 2 }, LEDGER, 0);
    expect(next.budget).toBe(150);
    const e = next.grandLivre.at(-1)!;
    expect(e.kind).toBe("mission_recompense");
    expect(e.recette).toBe(50);
    expect(e.params).toMatchObject({ courrierId: "m1", xp: 25, energie: 2 });
  });

  it("verse l'XP au brocanteur", () => {
    const s = createMockGameState();
    const next = appliquerRecompense(s, { argent: 0, xp: 40, energie: 0 }, LEDGER, 0);
    expect(next.brocanteur.xp).toBe(s.brocanteur.xp + 40);
  });

  it("énergie : settle d'abord, puis gain avec débordement (4 + 2 → 6)", () => {
    const s = createMockGameState({ energie: 4, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 0, xp: 0, energie: 2 }, LEDGER, 0);
    expect(next.energie).toBe(6);
  });

  it("énergie bornée par ENERGIE_PLAFOND (9 + 5 → 10)", () => {
    const s = createMockGameState({ energie: 9, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 0, xp: 0, energie: 5 }, LEDGER, 0);
    expect(next.energie).toBe(10);
  });

  it("gain d'énergie nul : la jauge settle mais ne bouge pas", () => {
    const s = createMockGameState({ energie: 3, energieDerniereMaj: 0 });
    const next = appliquerRecompense(s, { argent: 10, xp: 10, energie: 0 }, LEDGER, 0);
    expect(next.energie).toBe(3);
  });
});
```

NOTE : `createMockGameState` doit fournir `energie`/`energieDerniereMaj` — vérifier dans le fixture ; s'ils manquent au patch de base, les passer via le patch comme ci-dessus (le type les accepte, `GameState` les contient).

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts`
Expected: FAIL — `appliquerRecompense` non exporté.

- [ ] **Step 3: Implémenter**

Dans `src/types/game.ts`, `LedgerParams` (~l.245), après `templateIds?: string[];` ajouter :

```ts
  /** mission_recompense : gains non monétaires versés à la livraison, pour le
   *  rendu du grand livre (suffixe « +25 XP · +2 ⚡ »). ADDITIF. */
  xp?: number;
  energie?: number;
```

Dans `src/lib/recompenses.ts` :

```ts
import { appendLedger } from "@/lib/grandLivre";
import { appliquerGainXPBrocanteur } from "@/lib/xp";
import { pointsDepensesCompetences } from "@/lib/competences";
import { ENERGIE_MAX, ENERGIE_PLAFOND, settleEnergie } from "@/lib/energie";
import type { EtatObjet, GameState } from "@/types/game";

/** Contexte d'écriture au grand livre (repris du payload mission au moment
 *  de la livraison — cf. commentaire params dans livrerMission). */
export interface ContexteLedgerMission {
  designation: string;
  courrierId: string;
  gabaritId?: string;
  etatMin?: EtatObjet;
  templateIds?: string[];
}

/**
 * Verse une récompense effective : argent au grand livre (mission_recompense),
 * XP au brocanteur, énergie APRÈS settle (temps de confiance `now`) avec
 * débordement possible au-delà d'ENERGIE_MAX, borné par ENERGIE_PLAFOND.
 * Fonction pure (retourne le nouveau state).
 */
export function appliquerRecompense(
  state: GameState,
  r: RecompenseEffective,
  ledger: ContexteLedgerMission,
  now: number,
): GameState {
  let next = appendLedger(state, {
    jour: state.jourActuel,
    kind: "mission_recompense",
    designation: ledger.designation,
    recette: r.argent,
    depense: 0,
    courrierId: ledger.courrierId,
    params: {
      courrierId: ledger.courrierId,
      gabaritId: ledger.gabaritId,
      etatMin: ledger.etatMin,
      templateIds: ledger.templateIds,
      xp: r.xp,
      energie: r.energie,
    },
  });
  next = {
    ...next,
    brocanteur: appliquerGainXPBrocanteur(
      next.brocanteur,
      r.xp,
      pointsDepensesCompetences(next.competencesDebloquees),
    ),
  };
  if (r.energie > 0) {
    const settled = settleEnergie(next, now, ENERGIE_MAX);
    next = {
      ...next,
      energie: Math.min(ENERGIE_PLAFOND, settled.energie + r.energie),
      energieDerniereMaj: settled.energieDerniereMaj,
    };
  }
  return next;
}
```

(Si `pointsDepensesCompetences` vit ailleurs que `@/lib/competences`, reprendre l'import exact de `GameContext.tsx`.)

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts`
Expected: PASS.

- [ ] **Step 5: Brancher dans `livrerMission` (GameContext.tsx)**

Dans le `useCallback` de `livrerMission` :

1. Avant `setState`, ajouter `const now = tempsConfiance() ?? Date.now();` et `const rEff = recompenseEffective(payloadMission);` ; ajouter `tempsConfiance` aux deps du `useCallback` (actuellement `[]`). Supprimer le calcul `xpMission` (le `switch` sur `categorieMission` avec `XP_QUETE_*`) — c'est `recompenseEffective` qui porte le défaut désormais. Retirer les imports `XP_QUETE_*` de GameContext s'ils n'y servent plus.
2. Dans l'updater, remplacer le bloc `const credited = appendLedger(...)` + `const avecXP = appliquerGainXPBrocanteur(...)` par :

```ts
        const credited = appliquerRecompense(
          prev,
          rEff,
          {
            designation: `Mission · ${titreMission}`,
            courrierId,
            gabaritId: gabaritIdMission,
            etatMin: etatMinMission,
            templateIds: templateIdsMission,
          },
          now,
        );
        const avecXP = credited.brocanteur;
```

3. Le bloc `POINTS_BONUS_CHAPITRE` suit inchangé (il lit `avecXP` — désormais le brocanteur déjà crédité — et `credited.competencesDebloquees`). Le `return` final reste `{ ...credited, courriers, inventaireJoueur: invMaj, missions: missionsMaj, brocanteur }`.
4. Imports : `import { appliquerRecompense, recompenseEffective } from "@/lib/recompenses";`.

- [ ] **Step 6: Non-régression GameContext + typecheck**

Run: `npx tsc --noEmit && npx vitest run --maxWorkers=4 src/context src/lib`
Expected: PASS (les tests de livraison existants passent, l'XP versée est identique — même constante, via le défaut).

- [ ] **Step 7: Commit**

```bash
git add src/lib/recompenses.ts src/lib/recompenses.test.ts src/types/game.ts src/context/GameContext.tsx
git commit -m "feat(carnet): appliquerRecompense — versement unifié argent/xp/énergie à la livraison"
```

---

### Task 4: Clés i18n (4 langues)

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts` (bloc `carnet`, l.556-585), `en.ts`, `es.ts`, `el.ts` (mêmes blocs)

**Interfaces:**
- Produces: `d.carnet.jetonArgent`, `d.carnet.jetonXp`, `d.carnet.jetonEnergie`, `d.carnet.recompenseAria`. `DictionnaireUI` est dérivé de `fr` (`DeepStrings<typeof fr>`) : ajouter dans `fr.ts` étend le type, et TOUT dictionnaire qui ne suit pas casse `npx tsc --noEmit` — c'est le filet.

- [ ] **Step 1: Ajouter les clés**

Dans le bloc `carnet` de `fr.ts`, après `recompenseLabel: "Récompense",` :

```ts
    // Jetons de gains (bandeau récompense, lettre, grand livre).
    jetonArgent: "+{n} €",
    jetonXp: "+{n} XP",
    jetonEnergie: "+{n} ⚡",
    recompenseAria: "Récompense : {argent} €, {xp} XP, {energie} énergie",
```

`en.ts` : `jetonArgent: "+{n} €"`, `jetonXp: "+{n} XP"`, `jetonEnergie: "+{n} ⚡"`, `recompenseAria: "Reward: {argent} €, {xp} XP, {energie} energy"`.
`es.ts` : idem jetons, `recompenseAria: "Recompensa: {argent} €, {xp} XP, {energie} energía"`.
`el.ts` : idem jetons, `recompenseAria: "Ανταμοιβή: {argent} €, {xp} XP, {energie} ενέργεια"`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (les 4 dictionnaires alignés).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "feat(i18n): jetons de récompense du carnet (fr/en/es/el)"
```

---

### Task 5: Composant `RecompenseJetons`

**Files:**
- Create: `src/components/mobile/qg/RecompenseJetons.tsx`
- Test: `src/components/mobile/qg/RecompenseJetons.test.tsx`

**Interfaces:**
- Consumes: `RecompenseEffective` (Task 1), `useLangue` (`@/lib/i18n/LangueContext`), clés Task 4.
- Produces:

```ts
export function RecompenseJetons(props: {
  recompense: RecompenseEffective;
  variante: "bandeau" | "ligne";
  /** Libellé de tête du bandeau (ex. d.carnet.recompenseLabel ou d.carnet.pret). */
  label?: string;
  /** Bandeau « allumé » (commande livrable) : bordure laiton, libellé vert. */
  allume?: boolean;
}): JSX.Element;
```

Chaque jeton porte `data-testid="jeton-{argent|xp|energie}"` ET `data-jeton="{argent|xp|energie}"` (rect source des vols, Task 10). Le jeton énergie est omis si `energie === 0` ; le jeton XP est omis si `xp === 0` ; l'argent est toujours rendu (une commande à 0 € n'existe pas, mais s'il vaut 0 on l'omet aussi — règle uniforme : jeton rendu ssi montant > 0).

- [ ] **Step 1: Tests qui échouent**

```tsx
// src/components/mobile/qg/RecompenseJetons.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RecompenseJetons } from "./RecompenseJetons";

afterEach(cleanup);

describe("RecompenseJetons", () => {
  it("rend un jeton par gain non nul", () => {
    render(<RecompenseJetons recompense={{ argent: 200, xp: 300, energie: 2 }} variante="bandeau" label="Récompense" />);
    expect(screen.getByTestId("jeton-argent").textContent).toContain("+200 €");
    expect(screen.getByTestId("jeton-xp").textContent).toContain("+300 XP");
    expect(screen.getByTestId("jeton-energie").textContent).toContain("+2 ⚡");
  });

  it("omet les jetons à 0", () => {
    render(<RecompenseJetons recompense={{ argent: 30, xp: 25, energie: 0 }} variante="ligne" />);
    expect(screen.queryByTestId("jeton-energie")).toBeNull();
    expect(screen.getByTestId("jeton-argent")).toBeTruthy();
  });

  it("bandeau : affiche le label de tête", () => {
    render(<RecompenseJetons recompense={{ argent: 30, xp: 25, energie: 0 }} variante="bandeau" label="Récompense" />);
    expect(screen.getByText("Récompense")).toBeTruthy();
  });
});
```

NOTE : les tests du dépôt rendent les composants i18n sans provider (fallback FR par défaut, cf. `CommandeRow.test.tsx` qui matche « Récompense »). Vérifier que `useLangue` retombe bien sur FR hors provider ; sinon envelopper avec le provider comme le font les tests voisins.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/RecompenseJetons.test.tsx`
Expected: FAIL — module inexistant.

- [ ] **Step 3: Implémenter**

```tsx
// src/components/mobile/qg/RecompenseJetons.tsx
"use client";

import { type CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { RecompenseEffective } from "@/lib/recompenses";

interface Props {
  recompense: RecompenseEffective;
  variante: "bandeau" | "ligne";
  label?: string;
  allume?: boolean;
}

const bandeau = (allume: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  padding: "8px 12px",
  borderTop: allume ? "1px solid #c8a24a" : "1px dashed rgba(110,31,31,0.25)",
  background: allume ? "rgba(200,162,74,0.14)" : "rgba(234,223,192,0.5)",
});

const ligne: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
};

const labelStyle = (allume: boolean): CSSProperties => ({
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: allume ? "#2c5e3f" : "#6e1f1f", marginRight: "auto",
});

/** Teintes par type de gain : cire (argent), laiton (xp), vert (énergie). */
const JETON_STYLES: Record<"argent" | "xp" | "energie", CSSProperties> = {
  argent: { background: "#6e1f1f", color: "#f4e9cd", border: "1px solid #b03030" },
  xp: { background: "#e3d7b6", color: "#5a4210", border: "1px solid #c8a24a" },
  energie: { background: "#2c5e3f", color: "#f4e9cd", border: "1px solid #4a8a63" },
};

const jetonBase: CSSProperties = {
  display: "inline-block", padding: "3px 9px", borderRadius: 11,
  fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
  whiteSpace: "nowrap",
};

export function RecompenseJetons({ recompense, variante, label, allume = false }: Props) {
  const { d, tr } = useLangue();
  const jetons: Array<{ type: "argent" | "xp" | "energie"; texte: string }> = [];
  if (recompense.argent > 0)
    jetons.push({ type: "argent", texte: tr(d.carnet.jetonArgent, { n: recompense.argent }) });
  if (recompense.xp > 0)
    jetons.push({ type: "xp", texte: tr(d.carnet.jetonXp, { n: recompense.xp }) });
  if (recompense.energie > 0)
    jetons.push({ type: "energie", texte: tr(d.carnet.jetonEnergie, { n: recompense.energie }) });

  const aria = tr(d.carnet.recompenseAria, {
    argent: recompense.argent, xp: recompense.xp, energie: recompense.energie,
  });

  return (
    <span
      style={variante === "bandeau" ? bandeau(allume) : ligne}
      role="group"
      aria-label={aria}
    >
      {variante === "bandeau" && label ? (
        <span style={labelStyle(allume)}>{label}</span>
      ) : null}
      {jetons.map((j) => (
        <span key={j.type} data-testid={`jeton-${j.type}`} data-jeton={j.type}
          style={{ ...jetonBase, ...JETON_STYLES[j.type] }}>
          {j.texte}
        </span>
      ))}
    </span>
  );
}
```

NOTE : `bandeau` rendu comme `<span>` avec styles flex — valide en HTML (le composant peut vivre dans un `<button>` parent, un `<div>` y serait invalide ; cf. `CommandeRow` où la carte est un bouton).

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/RecompenseJetons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/qg/RecompenseJetons.tsx src/components/mobile/qg/RecompenseJetons.test.tsx
git commit -m "feat(carnet): composant RecompenseJetons (bandeau/ligne, jetons argent/xp/énergie)"
```

---

### Task 6: Refonte de la carte `CommandeRow`

**Files:**
- Modify: `src/components/mobile/qg/overlays/CommandeRow.tsx` (réécriture du rendu fermé + bandeau ; le détail déplié garde sa structure)
- Test: `src/components/mobile/qg/overlays/CommandeRow.test.tsx` (reprendre)

**Interfaces:**
- Consumes: `recompenseEffective` (Task 1), `RecompenseJetons` (Task 5), tout l'existant (`progressionMission`, `objectifsDeMission`, `progressionObjectif`, `missionLivrable`, `ItemImage`, i18n).
- Produces: la carte expose `data-testid="progression-compteur"` (texte `k/n` ou `a/b €`), `data-testid="progression-barre"` (remplissage en `%`), le bandeau `RecompenseJetons` en pied de carte (aussi rect source des vols, Task 10). Nouvelle prop optionnelle `enCeremonie?: boolean` (état livré affiché pendant la cérémonie, Task 10). AUCUN autre changement d'API (`courrier`, `state`, `ouvert`, `onToggle`, `onLivrer` inchangés).

**Cible visuelle (carte fermée) :**

```
┌────────────────────────────────────────────┐
│ ┌──────┐  LE FLAIR                   J−4   │  ← titre display + pastille échéance
│ │ 👤   │  Grand-père                       │  ← serif 11px
│ │92×92 │  Meilleur profit sur une vente    │  ← 1er objectif OU vignettes cibles
│ └──────┘  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░    95 / 100 €  │  ← barre pleine largeur + compteur
│────────────────────────────────────────────│
│ RÉCOMPENSE      +200 €   +300 XP   +2 ⚡   │  ← bandeau (PRÊT ✓ vert si livrable)
└────────────────────────────────────────────┘
```

- [ ] **Step 1: Réviser les tests (rouge d'abord)**

Dans `CommandeRow.test.tsx` :

1. Remplacer le test `en-tête replié : agrège la progression…` (l.103-123) — les assertions `getByText("0/1")` et le sélecteur par style inline — par :

```tsx
  it("en-tête replié : progression agrégée via data-testid, sans 0/0 ni NaN", () => {
    const courrier: Courrier = {
      id: "m3", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Vendre, c'est vivre", corps: ["Cumuler des ventes."],
        cibles: [],
        objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 80 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m3", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByTestId("progression-compteur").textContent).toBe("0/1");
    expect((screen.getByTestId("progression-barre") as HTMLElement).style.width).not.toContain("NaN");
  });
```

2. Ajouter :

```tsx
  it("bandeau récompense : jetons argent + xp (défaut de catégorie) sur carte fermée", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m1", statut: "active" }] });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByTestId("jeton-argent").textContent).toContain("+90 €");
    expect(screen.getByTestId("jeton-xp").textContent).toContain("+100 XP"); // principale
    expect(screen.queryByTestId("jeton-energie")).toBeNull();
  });

  it("commande livrable : le bandeau passe en PRÊT ✓ (plus de badge isolé)", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("Prêt ✓")).toBeTruthy();
  });

  it("échéance : pastille J−n", () => {
    const c = courrierMission();
    (c.payload as Extract<Courrier["payload"], { type: "mission" }>).jourLimite = 5;
    const state = createMockGameState({ jourActuel: 1, missions: [{ courrierId: "m1", statut: "active" }] });
    render(<CommandeRow courrier={c} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("J−4")).toBeTruthy();
  });
```

Les tests existants qui restent valides : titre/commanditaire, Livrer actif/grisé, vignettes plafond 4 + `+n`, aperçu objectif sans cible, `0/300` du détail. NE PAS les toucher.

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays/CommandeRow.test.tsx`
Expected: FAIL sur les nouveaux tests (testids absents, « Prêt ✓ » présent seulement en badge droit... vérifier que le nouveau test livrable échoue bien parce que le badge actuel N'EST PAS dans un bandeau — si `Prêt ✓` matche déjà via l'ancien badge, resserrer l'assertion : `expect(screen.getByTestId("jeton-argent")).toBeTruthy()` dans le même test ancre la nouvelle structure).

- [ ] **Step 2: Implémenter la refonte**

Réécrire la partie « carte fermée » de `CommandeRow.tsx` :

```tsx
// — styles remaniés (remplacent row/blocCentral/apercuRecompense actuels) —
const row: CSSProperties = {
  position: "relative",
  display: "flex", alignItems: "stretch", gap: 12, width: "100%",
  padding: "12px 12px 10px", background: "transparent", border: "none",
  cursor: "pointer", textAlign: "left",
};
const avatar: CSSProperties = { /* inchangé (92×92) */ };
const blocCentral: CSSProperties = {
  flex: 1, minWidth: 0, minHeight: 92,
  display: "flex", flexDirection: "column",
};
const pastilleEcheance = (urgent: boolean): CSSProperties => ({
  position: "absolute", top: 10, right: 12,
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  color: urgent ? "#f4e9cd" : "#8a7a52",
  background: urgent ? "#a31f1f" : "transparent",
  border: urgent ? "none" : "1px solid rgba(138,122,82,0.5)",
  borderRadius: 9, padding: "1px 7px",
});
const barreWrap: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8,
};
const barreFond: CSSProperties = {
  flex: 1, height: 7, background: "#e3d7b6", borderRadius: 4, overflow: "hidden",
  boxShadow: "inset 0 1px 2px rgba(110,31,31,0.18)",
};
const barreRemplissage = (pct: number): CSSProperties => ({
  display: "block", width: `${pct}%`, height: "100%",
  background: "linear-gradient(180deg, #d9b45e, #c8a24a)",
  transition: "width 300ms ease",
});
const compteurStyle: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
  color: "#8a6d2e", whiteSpace: "nowrap",
};
```

Corps du composant — calculs de progression (remplacent l'existant à structure égale) :

```tsx
  const rEff = recompenseEffective(p);
  // Progression affichée : objectif chiffré unique → « actuel / cible € » ;
  // sinon agrégat « remplies / total » (mêmes garde-fous 0/0-NaN qu'avant).
  const objectifChiffre =
    p.cibles.length === 0 && objectifsTous.length === 1 ? premierObjectifNonObjet : null;
  const pct = objectifChiffre && progPremierObjectif
    ? Math.min(100, (progPremierObjectif.actuel / Math.max(1, progPremierObjectif.cible)) * 100)
    : totalObjectifs > 0 ? (rempliesObjectifs / totalObjectifs) * 100 : 0;
  const compteur = objectifChiffre && progPremierObjectif
    ? `${progPremierObjectif.actuel} / ${progPremierObjectif.cible}${objectifChiffre.type !== "niveau" && objectifChiffre.type !== "restauration" ? " €" : ""}`
    : `${rempliesObjectifs}/${totalObjectifs}`;
```

Rendu fermé :

```tsx
    <div style={carte}>
      <button type="button" style={row} onClick={onToggle} aria-expanded={ouvert}>
        {/* avatar inchangé */}
        <span style={blocCentral}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 15, color: "#1a1308", lineHeight: 1.25, paddingRight: jRestants !== null ? 44 : 0 }}>
            {titreCourrier(courrier, locale)}
          </span>
          <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: 11, color: "#7a6a44" }}>{nomExp ?? ""}</span>
          {/* vignettes cibles (bloc existant, inchangé) OU libellé du 1er objectif
              (bloc apercuObjectif existant SANS le compteur — il part dans la barre) */}
          <span style={barreWrap}>
            <span style={barreFond}>
              <span data-testid="progression-barre" style={barreRemplissage(pct)} />
            </span>
            <span data-testid="progression-compteur" style={compteurStyle}>{compteur}</span>
          </span>
        </span>
        {jRestants !== null && (
          <span style={pastilleEcheance(jRestants <= 3)}>J−{jRestants}</span>
        )}
      </button>
      <RecompenseJetons
        recompense={rEff}
        variante="bandeau"
        label={livrable ? d.carnet.pret : d.carnet.recompenseLabel}
        allume={livrable || enCeremonie}
      />
      {ouvert && ( /* détail déplié, voir ci-dessous */ )}
    </div>
```

Suppressions : la colonne droite entière (`rempliesObjectifs/totalObjectifs` + mini-barre 46px + badge `pret` + `J−{jRestants}` sous le compteur), le style `apercuRecompense` et son span. L'aperçu objectif (`apercuObjectif`) perd son ` · {actuel}/{cible}` (le compteur vit dans la barre).

Détail déplié : remplacer la ligne `<div style={{ display: "flex", ... }}>` du bas (récompense + bouton Livrer) par :

```tsx
          <RecompenseJetons recompense={rEff} variante="bandeau"
            label={d.carnet.recompenseLabel} allume={livrable} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            {/* bouton Livrer inchangé */}
          </div>
```

Prop : `enCeremonie` ajoutée à `Props` (`enCeremonie?: boolean`, défaut `false` au destructuring).

- [ ] **Step 3: Vérifier le passage complet du fichier de test**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays/CommandeRow.test.tsx`
Expected: PASS (anciens + nouveaux).

- [ ] **Step 4: Non-régression des voisins**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg`
Expected: PASS (`OngletCommandes.test.tsx` et `RegistreOverlay.test.tsx` ne testent pas la structure interne de la carte ; s'ils cassent, corriger les sélecteurs).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/qg/overlays/CommandeRow.tsx src/components/mobile/qg/overlays/CommandeRow.test.tsx
git commit -m "feat(carnet): carte de commande refondue — bandeau récompense, barre pleine largeur, pastille J−n"
```

---

### Task 7: En-têtes de section (`OngletCommandes`)

**Files:**
- Modify: `src/components/mobile/qg/overlays/OngletCommandes.tsx` (styles `sectionLabel`/`sectionToggle`/`sectionSousLabel`, fonction `renderSection`)
- Test: `src/components/mobile/qg/overlays/OngletCommandes.test.tsx` (étendre)

**Interfaces:**
- Consumes: lucide-react (`FolderOpen`, `CalendarDays`, `CalendarRange`), l'existant.
- Produces: en-têtes alignés à gauche `⟨icône⟩ LIBELLÉ (n) ⟨chevron⟩`, sous-libellé de renouvellement aligné à gauche. `renderSection` gagne un paramètre `icone: ReactNode`. Comportement repli/dépli inchangé (`aria-expanded` conservé — les tests existants s'appuient dessus).

- [ ] **Step 1: Test qui échoue**

Ajouter à `OngletCommandes.test.tsx` (reprendre les fixtures du fichier — il construit déjà state + courriers) :

```tsx
  it("en-tête de section : libellé + compte (n)", () => {
    // avec 1 mission principale active dans le state du fixture existant
    render(<OngletCommandes state={state} onLivrerMission={() => ({ ok: true })} />);
    expect(screen.getByRole("button", { name: /Commandes principales \(1\)/ })).toBeTruthy();
  });
```

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays/OngletCommandes.test.tsx`
Expected: FAIL — le libellé actuel n'a pas de `(n)`.

- [ ] **Step 2: Implémenter**

Styles remaniés :

```tsx
const sectionToggle: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase", color: "#6e1f1f",
  textAlign: "left", padding: "14px 2px 6px", marginTop: 6,
  background: "none", border: "none",
  borderTop: "1px dotted rgba(110,31,31,0.35)", cursor: "pointer",
};
const sectionChevron: CSSProperties = { marginLeft: "auto", fontSize: 12, color: "#8a6d2e" };
const sectionSousLabel: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em",
  textTransform: "uppercase", color: "#7a6438", textAlign: "left",
  padding: "0 2px 6px",
};
```

`renderSection` :

```tsx
  const renderSection = (
    cle: string, icone: ReactNode, label: string,
    liste: MissionResolution[], sousLabel?: string,
  ) => {
    if (liste.length === 0) return null;
    const repliee = sectionsRepliees.has(cle);
    return (
      <>
        <button type="button" style={sectionToggle} onClick={() => toggleSection(cle)} aria-expanded={!repliee}>
          {icone}
          <span>{label} ({liste.length})</span>
          <span style={sectionChevron} aria-hidden>{repliee ? "▸" : "▾"}</span>
        </button>
        {/* suite inchangée */}
      </>
    );
  };
```

Appels : `renderSection("principales", <FolderOpen size={15} aria-hidden />, d.carnet.sectionPrincipales, principales)`, `<CalendarDays size={15} aria-hidden />` pour quotidiennes, `<CalendarRange size={15} aria-hidden />` pour hebdomadaires. Import : `import { CalendarDays, CalendarRange, FolderOpen } from "lucide-react";` + `type ReactNode` depuis react. Le bouton « Terminées » garde `sectionToggle` (sans icône : passer un `<span aria-hidden>✔</span>` discret ou rien — `renderSection` ne le gère pas, il a son propre bouton : lui appliquer le nouveau style avec chevron à droite pour l'uniformité). Supprimer `sectionLabel` s'il n'a plus d'usage.

- [ ] **Step 3: Vérifier**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/qg/overlays/OngletCommandes.tsx src/components/mobile/qg/overlays/OngletCommandes.test.tsx
git commit -m "feat(carnet): en-têtes de section alignés à gauche avec icône et compte"
```

---

### Task 8: Lettre (`CourrierSheet`) + suffixe grand livre

**Files:**
- Modify: `src/components/mobile/qg/sheets/CourrierSheet.tsx` (~l.256, ligne récompense)
- Modify: `src/lib/i18n/libelles.ts` (`libelleLedger`, cas `mission_recompense`)
- Test: `src/components/mobile/qg/sheets/CourrierSheet.test.tsx` (étendre), `src/lib/i18n/libelles.test.ts` (étendre ; si ce fichier n'existe pas, le créer avec le seul describe ci-dessous)

**Interfaces:**
- Consumes: `recompenseEffective`, `RecompenseJetons`, clés i18n Task 4.
- Produces: rien de nouveau (surfaces d'affichage).

- [ ] **Step 1: Tests qui échouent**

`CourrierSheet.test.tsx` — repérer le test existant qui rend une mission (le fichier en a, cf. `CourrierSheet.test.tsx` dans le repo) et ajouter dans le même style :

```tsx
  it("mission : la ligne récompense affiche les jetons xp/énergie", () => {
    // courrier mission catégorie "principale", recompense { argent: 90, energie: 1 }
    // rendu via le même harnais que les tests voisins
    expect(screen.getByTestId("jeton-argent").textContent).toContain("+90 €");
    expect(screen.getByTestId("jeton-xp").textContent).toContain("+100 XP");
    expect(screen.getByTestId("jeton-energie").textContent).toContain("+1 ⚡");
  });
```

`libelles.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { libelleLedger } from "./libelles";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import type { LedgerEntry } from "@/types/game";

const d = DICTIONNAIRES.fr;

function entree(params?: LedgerEntry["params"]): LedgerEntry {
  return {
    id: "e1", jour: 3, timestamp: 0, kind: "mission_recompense",
    designation: "Mission · Le coffre rétro", recette: 90, depense: 0,
    soldeApres: 100, params,
  };
}

describe("libelleLedger — mission_recompense", () => {
  it("suffixe +XP/+⚡ quand les params portent les gains", () => {
    const l = libelleLedger(entree({ courrierId: "x", xp: 100, energie: 2 }), d, "fr", []);
    expect(l).toContain("+100 XP");
    expect(l).toContain("+2 ⚡");
  });

  it("écriture historique sans gains : libellé inchangé, sans suffixe", () => {
    const l = libelleLedger(entree({ courrierId: "x" }), d, "fr", []);
    expect(l).not.toContain("XP");
  });
});
```

NOTE : lire d'abord le cas `mission_recompense` existant dans `libelles.ts` (l.~180-200) pour caler `entree()` sur ce qu'il attend réellement (résolution du titre via `courriers` / `gabaritId`) ; ajuster l'assertion du libellé de base si besoin. `libelleLedger(e, d, locale, courriers)`.

Run: `npx vitest run --maxWorkers=4 src/lib/i18n/libelles.test.ts src/components/mobile/qg/sheets/CourrierSheet.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implémenter**

`CourrierSheet.tsx` — remplacer :

```tsx
        <div>
          <strong>{d.sheets.recompenseLabel}</strong> +{p.recompense.argent} €
        </div>
```

par :

```tsx
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong>{d.sheets.recompenseLabel}</strong>
          <RecompenseJetons recompense={recompenseEffective(p)} variante="ligne" />
        </div>
```

avec les imports `recompenseEffective` et `RecompenseJetons`.

`libelles.ts` — dans le cas `mission_recompense` de `libelleLedger`, envelopper le retour existant :

```ts
    case "mission_recompense": {
      const base = /* résolution du titre existante, inchangée */;
      const suffixes: string[] = [];
      if (p.xp) suffixes.push(tr(d.carnet.jetonXp, { n: p.xp }));
      if (p.energie) suffixes.push(tr(d.carnet.jetonEnergie, { n: p.energie }));
      return suffixes.length > 0 ? `${base} · ${suffixes.join(" · ")}` : base;
    }
```

(`tr` est déjà importé/utilisé dans ce fichier ; sinon `import { tr } from "@/lib/i18n/ui";`.)

- [ ] **Step 3: Vérifier**

Run: `npx vitest run --maxWorkers=4 src/lib/i18n src/components/mobile/qg/sheets`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/qg/sheets/CourrierSheet.tsx src/lib/i18n/libelles.ts src/lib/i18n/libelles.test.ts src/components/mobile/qg/sheets/CourrierSheet.test.tsx
git commit -m "feat(carnet): jetons de récompense dans la lettre et suffixe xp/⚡ au grand livre"
```

---

### Task 9: Frise de cérémonie (`ceremonieLivraison.ts`) + gel énergie

**Files:**
- Create: `src/lib/quetes/ceremonieLivraison.ts`
- Modify: `src/lib/affichageGele.ts` (volet énergie)
- Modify: `src/components/mobile/MobileHeader.tsx` (cible + gel énergie)
- Test: `src/lib/quetes/ceremonieLivraison.test.ts`, `src/lib/affichageGele.test.ts` (créer si absent)

**Interfaces:**
- Consumes: `RecompenseEffective` (Task 1).
- Produces:

```ts
// ceremonieLivraison.ts
export const DECALAGE_VOL_MS = 260;
export const VOL_MS = 620;                 // aligné sur flyToTab (durée défaut)
export const SORTIE_APRES_DERNIER_MS = 450;
export type JetonVol = "xp" | "energie" | "argent";
export const CIBLES_VOL: Record<JetonVol, string> = {
  xp: '[data-fly-target="xp-header"]',
  energie: '[data-fly-target="energie-header"]',
  argent: '[data-fly-target="caisse-header"]',
};
export type EtapeLivraison =
  | { type: "envol"; jeton: JetonVol }
  | { type: "atterrissage"; jeton: JetonVol }
  | { type: "sortie" };
export interface EtapeLivraisonDatee { at: number; etape: EtapeLivraison }
export function phasesLivraison(r: RecompenseEffective): EtapeLivraisonDatee[];

// affichageGele.ts (ajouts)
export function gelerEnergieAffichage(valeur: number): void;
export function degelerEnergieAffichage(): void;
export function useEnergieAffiche(reel: number): number;
```

- [ ] **Step 1: Tests qui échouent — frise**

```ts
// src/lib/quetes/ceremonieLivraison.test.ts
import { describe, expect, it } from "vitest";
import {
  DECALAGE_VOL_MS, SORTIE_APRES_DERNIER_MS, VOL_MS, phasesLivraison,
} from "./ceremonieLivraison";

describe("phasesLivraison", () => {
  it("ordre XP → énergie → argent quand les trois gains sont présents", () => {
    const envols = phasesLivraison({ argent: 200, xp: 300, energie: 2 })
      .filter((e) => e.etape.type === "envol")
      .map((e) => (e.etape.type === "envol" ? e.etape.jeton : ""));
    expect(envols).toEqual(["xp", "energie", "argent"]);
  });

  it("omet les jetons à 0 (pas d'énergie → deux vols)", () => {
    const plan = phasesLivraison({ argent: 30, xp: 25, energie: 0 });
    expect(plan.filter((e) => e.etape.type === "envol").length).toBe(2);
    expect(plan.some((e) => e.etape.type === "envol" && e.etape.jeton === "energie")).toBe(false);
  });

  it("envols espacés de DECALAGE_VOL_MS, atterrissage à envol+VOL_MS, dates croissantes", () => {
    const plan = phasesLivraison({ argent: 10, xp: 25, energie: 1 });
    const envolXp = plan.find((e) => e.etape.type === "envol" && e.etape.jeton === "xp")!;
    const envolEnergie = plan.find((e) => e.etape.type === "envol" && e.etape.jeton === "energie")!;
    const atterXp = plan.find((e) => e.etape.type === "atterrissage" && e.etape.jeton === "xp")!;
    expect(envolXp.at).toBe(0);
    expect(envolEnergie.at).toBe(DECALAGE_VOL_MS);
    expect(atterXp.at).toBe(VOL_MS);
    for (let i = 1; i < plan.length; i++) expect(plan[i].at).toBeGreaterThanOrEqual(plan[i - 1].at);
  });

  it("sortie après le dernier atterrissage", () => {
    const plan = phasesLivraison({ argent: 10, xp: 25, energie: 0 });
    const sortie = plan.at(-1)!;
    expect(sortie.etape.type).toBe("sortie");
    expect(sortie.at).toBe(DECALAGE_VOL_MS + VOL_MS + SORTIE_APRES_DERNIER_MS);
  });

  it("aucun gain : frise réduite à la sortie immédiate", () => {
    const plan = phasesLivraison({ argent: 0, xp: 0, energie: 0 });
    expect(plan).toEqual([{ at: 0, etape: { type: "sortie" } }]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec, puis implémenter**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/ceremonieLivraison.test.ts` → FAIL (module absent).

```ts
// src/lib/quetes/ceremonieLivraison.ts
import type { RecompenseEffective } from "@/lib/recompenses";

/** Écart entre deux départs de jetons. */
export const DECALAGE_VOL_MS = 260;
/** Durée d'un vol — alignée sur la durée par défaut de flyToTab. */
export const VOL_MS = 620;
/** Respiration après le dernier atterrissage avant le retrait de la carte. */
export const SORTIE_APRES_DERNIER_MS = 450;

export type JetonVol = "xp" | "energie" | "argent";

/** Sélecteurs des cibles du header, par jeton. */
export const CIBLES_VOL: Record<JetonVol, string> = {
  xp: '[data-fly-target="xp-header"]',
  energie: '[data-fly-target="energie-header"]',
  argent: '[data-fly-target="caisse-header"]',
};

export type EtapeLivraison =
  /** Le jeton quitte le bandeau de la carte. */
  | { type: "envol"; jeton: JetonVol }
  /** Le jeton atteint sa cible : dégel du compteur correspondant. */
  | { type: "atterrissage"; jeton: JetonVol }
  /** Fin : la carte livrée quitte la liste des actives. */
  | { type: "sortie" };

export interface EtapeLivraisonDatee {
  at: number;
  etape: EtapeLivraison;
}

/**
 * Frise de la cérémonie de livraison. Ordre FIXE : XP puis énergie puis
 * argent (décision 2026-07-29), chaque jeton n'apparaissant que si son gain
 * est non nul. Les vols se chevauchent (départs espacés de DECALAGE_VOL_MS).
 */
export function phasesLivraison(r: RecompenseEffective): EtapeLivraisonDatee[] {
  const jetons: JetonVol[] = [];
  if (r.xp > 0) jetons.push("xp");
  if (r.energie > 0) jetons.push("energie");
  if (r.argent > 0) jetons.push("argent");

  const plan: EtapeLivraisonDatee[] = [];
  jetons.forEach((jeton, i) => {
    const depart = i * DECALAGE_VOL_MS;
    plan.push({ at: depart, etape: { type: "envol", jeton } });
    plan.push({ at: depart + VOL_MS, etape: { type: "atterrissage", jeton } });
  });
  const dernier = plan.length > 0 ? plan[plan.length - 1].at : -SORTIE_APRES_DERNIER_MS;
  plan.sort((a, b) => a.at - b.at);
  plan.push({ at: dernier + SORTIE_APRES_DERNIER_MS, etape: { type: "sortie" } });
  return plan;
}
```

ATTENTION au tri : `dernier` doit être lu comme le max des `at` AVANT le sort (le dernier atterrissage est déjà le plus grand `at` puisque VOL_MS > DECALAGE_VOL_MS×2 n'est pas garanti — avec 3 jetons, dernier atterrissage = 2×260+620 = 1140, toujours le max car les atterrissages croissent avec les départs ; le sort reste par sécurité pour les dates entrelacées envol/atterrissage).

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/ceremonieLivraison.test.ts` → PASS.

- [ ] **Step 3: Tests qui échouent — gel énergie**

```ts
// src/lib/affichageGele.test.ts  (créer ; si un test existe déjà, étendre)
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import {
  degelerEnergieAffichage, gelerEnergieAffichage, useEnergieAffiche,
} from "./affichageGele";

afterEach(() => {
  degelerEnergieAffichage();
  cleanup();
});

describe("gel d'affichage — énergie", () => {
  it("sans gel : renvoie la valeur réelle", () => {
    const { result } = renderHook(() => useEnergieAffiche(4));
    expect(result.current).toBe(4);
  });

  it("gelé : renvoie l'instantané, puis la valeur réelle au dégel", () => {
    gelerEnergieAffichage(2);
    const { result, rerender } = renderHook(() => useEnergieAffiche(4));
    expect(result.current).toBe(2);
    degelerEnergieAffichage();
    rerender();
    expect(result.current).toBe(4);
  });
});
```

Run: `npx vitest run --maxWorkers=4 src/lib/affichageGele.test.ts` → FAIL.

- [ ] **Step 4: Implémenter le gel énergie**

Dans `src/lib/affichageGele.ts`, sur le modèle exact du volet XP (store module, `useSyncExternalStore`, mêmes `abonnes`/`notifier`) :

```ts
/** Énergie affichée figée pendant la cérémonie de livraison (jeton ⚡ en vol). */
let energieGelee: number | null = null;

function lireEnergie(): number | null {
  return energieGelee;
}
function lireEnergieServeur(): number | null {
  return null;
}

/** Fige l'affichage de l'énergie du header sur cette valeur. Idempotent. */
export function gelerEnergieAffichage(valeur: number): void {
  energieGelee = valeur;
  notifier();
}

/** Rend l'énergie affichée à sa valeur réelle. Sans effet si rien n'est gelé. */
export function degelerEnergieAffichage(): void {
  if (energieGelee === null) return;
  energieGelee = null;
  notifier();
}

/** Renvoie l'énergie figée tant que le gel dure, la valeur réelle sinon. */
export function useEnergieAffiche(reel: number): number {
  const gele = useSyncExternalStore(souscrire, lireEnergie, lireEnergieServeur);
  return gele ?? reel;
}
```

- [ ] **Step 5: Brancher le header**

`MobileHeader.tsx` :

1. `const energieAffichee = useEnergieAffiche(energie);` (import depuis `@/lib/affichageGele`) — remplacer les usages d'AFFICHAGE (`{energie}` l.~218 et le `aria`/labels associés) par `energieAffichee`. `peutRecharger` reste sur `energie` (la vraie valeur).
2. Sur le `<strong>` (ou le conteneur direct) du bloc ⚡ (l.~217 `Zap … {energie}/{energieMax}`) : ajouter `data-fly-target="energie-header"`.

Vérifier visuellement le JSX : la structure exacte autour de `Zap` (l.190-221) contient un bouton « + » conditionnel — poser le `data-fly-target` sur l'élément qui englobe icône+valeur, pas sur le bouton.

- [ ] **Step 6: Vérifier**

Run: `npx vitest run --maxWorkers=4 src/lib/affichageGele.test.ts src/lib/quetes/ceremonieLivraison.test.ts src/components/mobile/MobileHeader.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/quetes/ceremonieLivraison.ts src/lib/quetes/ceremonieLivraison.test.ts src/lib/affichageGele.ts src/lib/affichageGele.test.ts src/components/mobile/MobileHeader.tsx
git commit -m "feat(carnet): frise de cérémonie de livraison + gel d'affichage énergie + cible energie-header"
```

---

### Task 10: Orchestration de la cérémonie dans `OngletCommandes`

**Files:**
- Modify: `src/components/mobile/qg/overlays/OngletCommandes.tsx`
- Test: `src/components/mobile/qg/overlays/OngletCommandes.test.tsx` (étendre)

**Interfaces:**
- Consumes: `phasesLivraison`, `CIBLES_VOL`, types (Task 9) ; `flyToTab` (`@/lib/flyAnimation`) ; `gelerXpAffichage`/`degelerXpAffichage`/`gelerBudgetAffichage`/`degelerBudgetAffichage`/`gelerEnergieAffichage`/`degelerEnergieAffichage` (`@/lib/affichageGele`) ; `energieCourante` (`@/lib/energie`) ; `recompenseEffective` (Task 1) ; prop `enCeremonie` de `CommandeRow` (Task 6).
- Produces: rien de nouveau vers l'extérieur — la signature d'`OngletCommandes` est INCHANGÉE (`onLivrerMission` reste `(id) => { ok, raison? }`).

**Déroulé implémenté :**

```
tap Livrer (dans CommandeRow, bouton du détail déplié)
  → OngletCommandes.lancerLivraison(courrierId)
     1. capture AVANT : brocanteur, budget, énergie courante (state + tempsConfiance)
     2. res = onLivrerMission(id) ; si !res.ok → ne rien geler, sortir
     3. gel des 3 compteurs sur les valeurs d'AVANT
     4. setCeremonieId(id) — la carte reste rendue (état livré) bien que la
        mission soit passée "livree" dans le state
     5. timers sur phasesLivraison(rEff) :
        envol(jeton)        → flyToTab(rect du jeton → CIBLES_VOL[jeton])
        atterrissage(jeton) → dégel du compteur correspondant
        sortie              → setCeremonieId(null) (la carte quitte la liste)
```

- [ ] **Step 1: Tests qui échouent**

Ajouter à `OngletCommandes.test.tsx` (fake timers ; en jsdom `flyToTab` trouve `document` mais pas les cibles header → il dégrade en jouant le son, exactement la branche « cible absente » : la cérémonie suit ses timers quand même) :

```tsx
  it("livraison : la carte reste affichée pendant la cérémonie puis disparaît", () => {
    vi.useFakeTimers();
    // state avec 1 mission principale livrable (fixtures du fichier) ; le
    // harnais du test contrôle onLivrerMission : il fait passer la mission à
    // "livree" dans un state re-rendu, comme le vrai GameContext.
    // 1. déplier la carte, taper « Livrer »
    // 2. re-rendre avec le state post-livraison (mission statut "livree")
    // 3. la carte est TOUJOURS dans le DOM (cérémonie en cours)
    expect(screen.getByText("Le coffre rétro")).toBeTruthy();
    // 4. avancer au-delà de la frise complète
    act(() => { vi.runAllTimers(); });
    // 5. la carte a quitté la liste des actives
    expect(screen.queryByText("Le coffre rétro")).toBeNull();
    vi.useRealTimers();
  });

  it("échec de livraison : pas de cérémonie, la carte reste active", () => {
    // onLivrerMission renvoie { ok: false } : aucun gel, la carte reste
  });
```

Écrire ces deux tests en entier en s'appuyant sur les fixtures réelles du fichier (courriers/missions déjà construits pour les tests d'accordéon) ; le squelette ci-dessus fixe les assertions clés. Ajouter les imports `vi`, `act`.

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays/OngletCommandes.test.tsx`
Expected: FAIL — la carte disparaît immédiatement aujourd'hui (statut ≠ active → filtrée).

- [ ] **Step 2: Implémenter**

Dans `OngletCommandes.tsx` :

1. État + refs :

```tsx
  const [ceremonieId, setCeremonieId] = useState<string | null>(null);
  /** Timers de la cérémonie en cours (annulés au démontage). */
  const timersRef = useRef<number[]>([]);
  useEffect(() => () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    // Démontage en pleine cérémonie : rendre leurs vraies valeurs aux compteurs.
    degelerXpAffichage(); degelerBudgetAffichage(); degelerEnergieAffichage();
  }, []);
```

2. `actives` garde la mission en cérémonie :

```tsx
  const actives = useMemo(
    () => state.missions.filter((m) => m.statut === "active" || m.courrierId === ceremonieId),
    [state.missions, ceremonieId],
  );
```

3. Orchestration (dans le composant ; `flyToTab` importé statiquement) :

```tsx
  const lancerLivraison = (courrierId: string) => {
    const courrier = byId.get(courrierId);
    if (!courrier || courrier.payload.type !== "mission" || ceremonieId) return;
    const rEff = recompenseEffective(courrier.payload);
    const now = tempsConfiance?.() ?? Date.now();
    // Valeurs d'AVANT versement, pour geler l'affichage du header.
    const avant = {
      brocanteur: state.brocanteur,
      budget: state.budget,
      energie: energieCourante(state, now),
    };
    const res = onLivrerMission(courrierId);
    if (!res.ok) return;
    gelerXpAffichage(avant.brocanteur);
    gelerBudgetAffichage(avant.budget);
    gelerEnergieAffichage(avant.energie);
    setCeremonieId(courrierId);
    const racine = document.querySelector(`[data-commande-id="${courrierId}"]`);
    for (const { at, etape } of phasesLivraison(rEff)) {
      const t = window.setTimeout(() => {
        if (etape.type === "envol") {
          const jeton = racine?.querySelector<HTMLElement>(`[data-jeton="${etape.jeton}"]`) ?? null;
          if (jeton) jeton.style.visibility = "hidden";
          flyToTab({
            fromRect: (jeton ?? racine ?? document.body).getBoundingClientRect(),
            imageUrl: null,
            fallbackBg: FONDS_JETON[etape.jeton],
            borderColor: "#c8a24a",
            targetSelector: CIBLES_VOL[etape.jeton],
          });
        } else if (etape.type === "atterrissage") {
          if (etape.jeton === "xp") degelerXpAffichage();
          else if (etape.jeton === "energie") degelerEnergieAffichage();
          else degelerBudgetAffichage();
        } else {
          // Fondu avant retrait (spec §10 : « la carte se fond/se rétracte »).
          const el = document.querySelector<HTMLElement>(`[data-commande-id="${courrierId}"]`);
          if (el) {
            el.style.transition = "opacity 300ms ease, max-height 300ms ease";
            el.style.overflow = "hidden";
            el.style.maxHeight = `${el.offsetHeight}px`;
            requestAnimationFrame(() => {
              el.style.opacity = "0";
              el.style.maxHeight = "0";
            });
          }
          const tFin = window.setTimeout(() => setCeremonieId(null), 320);
          timersRef.current.push(tFin);
        }
      }, at);
      timersRef.current.push(t);
    }
  };
```

NOTE test : le retrait effectif arrive donc ~320 ms après l'étape `sortie` — `vi.runAllTimers()` couvre le timer imbriqué (il draine récursivement) ; `requestAnimationFrame` peut ne pas exister en fake timers, garder le bloc dans un `if (el)` et ne rien asserter sur les styles.

avec, en tête de fichier :

```tsx
/** Fond du clone en vol, au teint du jeton (cf. JETON_STYLES de RecompenseJetons). */
const FONDS_JETON: Record<JetonVol, string> = {
  argent: "radial-gradient(circle at 35% 30%, #b03030, #6e1f1f)",
  xp: "radial-gradient(circle at 35% 30%, #efe3c0, #c8a24a)",
  energie: "radial-gradient(circle at 35% 30%, #4a8a63, #2c5e3f)",
};
```

et le clone arrondi : `flyToTab` ne pose pas de `borderRadius` — passer par le rect du jeton (déjà arrondi 11px, taille ~60×22) suffit visuellement ; ne pas modifier `flyToTab`.

4. Brancher : `onLivrer={() => lancerLivraison(m.courrierId)}` à la place de `onLivrer={() => onLivrerMission(m.courrierId)}`, et `enCeremonie={ceremonieId === m.courrierId}` passé à `CommandeRow`.

5. IMPORTANT — déclenchement dans le handler du tap uniquement (pas d'effet) : pas de double vol StrictMode.

- [ ] **Step 3: Vérifier**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays`
Expected: PASS.

- [ ] **Step 4: Lint hooks**

Run: `npm run lint:hooks`
Expected: PASS (le `useEffect` de cleanup et le `useMemo` élargi sont les seuls hooks touchés).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/qg/overlays/OngletCommandes.tsx src/components/mobile/qg/overlays/OngletCommandes.test.tsx
git commit -m "feat(carnet): cérémonie de livraison — envol xp/énergie/argent vers le header, compteurs gelés"
```

---

### Task 11: Passe finale

**Files:**
- Aucun nouveau — vérification globale + retouches éventuelles.

- [ ] **Step 1: Suite complète**

Run: `npx vitest run --maxWorkers=4`
Expected: 0 échec. Corriger toute casse résiduelle (chercher d'abord si le test cassé teste un comportement volontairement changé → adapter le test ; sinon corriger le code).

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src && npm run lint:hooks`
Expected: 0 erreur.

- [ ] **Step 3: Vérification visuelle (optionnelle mais recommandée)**

`npm run dev` (ou le port du worktree) → QG → ouvrir le carnet : carte refondue, bandeau, sections ; livrer une commande livrable : cérémonie XP → (énergie) → argent, compteurs du header qui rattrapent à l'atterrissage, carte qui rejoint « Terminées ». La recette device (simulateur iOS, `scripts/ios-sim.sh`) reste à faire par Guillaume.

- [ ] **Step 4: Commit final éventuel + point d'étape**

Signaler : branche prête pour PR vers `feat/pipeline-reels` (ou main selon l'état des reels — demander à Guillaume), recette device restante.
