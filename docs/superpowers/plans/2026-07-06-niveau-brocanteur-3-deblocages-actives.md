# Niveau de Brocanteur — Plan 3/4 : déblocages par niveau + compétences actives + hygiène valeur

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le Niveau de Brocanteur débloque du contenu réel — double gate des brocantes (T2=N4, T3=N10, T4=N20), énergie max +1 à N8/N14, et 6 compétences actives à quota journalier (3 chine + 3 vente) sur une infra `lib/actives.ts` persistante — plus le rebranchement du flux de négociation vente réel (mort depuis le plan 2) et le lot « hygiène valeur » de la revue finale.

**Architecture:** Prérequis : plans 1-2 mergés sur `feat/niveau-brocanteur` (SAVE_VERSION 9, `state.brocanteur`, `etatCompetence` v2). Le gating passe par un nouveau variant `{type:"niveau"}` de `ConditionDeblocage` (pas de système parallèle). Les actives sont des capacités déclenchées, gatées par `brocanteur.niveau` (jalons N5/N7/N9/N13/N15/N17), avec quotas journaliers persistés dans `GameState.activesUtilisees` (champ optionnel, clé = `jourActuel` — pas de bump de SAVE_VERSION, pattern `pubsEnergie`/`boiteMystere`). La table `DEBLOCAGES_PAR_NIVEAU` est la source de vérité data (consommée par les gates réels maintenant, par l'écran de level-up au plan 4). ⚠ Découverte d'exploration : `NegociationSheet` appelle `proposerOffre` brut — `proposerOffreVente` (toleranceBoost + Diplomate, plan 2 Task 6) n'est **jamais exécuté en jeu réel** (`handleProposerVente` et `ClientModal` sont du code mort) ; la Task 4 rebranche ce flux AVANT les actives de vente qui s'y greffent.

**Tech Stack:** identique plans 1-2 (Next.js, React Context, TypeScript, vitest + jsdom + @testing-library/react, localStorage + migrations).

**Références design :** rapport « Refonte du système de niveau » §04 (actives), §08 (table de déblocage), D1/D3 validées ; revue finale plan 2 (findings F1-F2 + minors) ; décision utilisateur 2026-07-06 : gates enforced = brocantes + énergie + actives SEULEMENT (les autres lignes de la table §08 restent informatives), re-simulation d'équilibrage hors périmètre (passe séparée après plan 3).

## Global Constraints

- Valeurs d'équilibrage = constantes nommées exportées. Nommage français.
- Gates de niveau validés : brocantes T2 → **N4**, T3 → **N10**, T4 → **N20** (double gate : ET avec les conditions économiques existantes, qui ne changent pas) ; énergie max **5→6 à N8, 6→7 à N14** ; actives : Flair **N5**, Lot garni **N7**, Fouille **N9**, Boniment **N13**, Tchatche **N15**, Criée **N17**.
- Quotas journaliers (clé = `state.jourActuel`, jour de jeu) : Flair 1, Lot garni 1, Fouille 3, Boniment 1, Tchatche 1, Criée 1, Diplomate 1 (migré).
- Boniment : le client accepte si l'offre du joueur ≤ **115 %** de son prix max (`BONIMENT_MARGE = 1.15`) ; sinon il abat sa meilleure contre-offre = son plafond (`cibleSecrete`).
- Les IDs de compétences ne changent JAMAIS. `SAVE_VERSION` reste **9** (nouveau champ `activesUtilisees` optionnel avec sanitation de migration, pattern `pubsEnergie`).
- `competenceTrees` reste gelé (suppression au plan 4). Pas de refonte UI (plan 4) : boutons d'actives minimaux mais fonctionnels, style cohérent avec les fichiers touchés.
- Chaque tâche : `npx tsc --noEmit` 0 erreur ; suite `npx vitest run` verte avant commit ; commits `feat(niveau):` / `fix(niveau):`.
- Les numéros de ligne datent du commit 1f6b3b1 et glissent — se repérer aux noms de fonctions/composants.

---

### Task 1: Condition `niveau` + double gate des brocantes

**Files:**
- Modify: `src/types/game.ts` (`ConditionDeblocage` ~397)
- Modify: `src/lib/deblocage.ts` (`descriptionCondition`, `descriptionConditionCourte`, `evaluerCondition`, types `Pick`)
- Modify: `src/data/brocantes.ts` (conditions T2/T3/T4)
- Test: `src/lib/deblocage.test.ts` (étendre le fichier existant, ou le créer s'il n'existe pas)

**Interfaces:**
- Consumes: `state.brocanteur.niveau` (plan 1).
- Produces: variant `{ type: "niveau"; niveau: number }` dans `ConditionDeblocage` ; constantes `NIVEAU_BROCANTES_T2 = 4`, `NIVEAU_BROCANTES_T3 = 10`, `NIVEAU_BROCANTES_T4 = 20` exportées de `src/data/brocantes.ts` ; les `Pick<GameState,...>` de `deblocage.ts` incluent `"brocanteur"`.

- [ ] **Step 1: Tests qui échouent** — dans `src/lib/deblocage.test.ts` (réutiliser/adapter la fabrique de state du fichier s'il existe ; sinon un `stateMinimal` local avec `brocanteur: {xp:0, niveau:0, pointsDisponibles:0}` et les champs déjà exigés par les `Pick`) :

```ts
import { NIVEAU_BROCANTES_T2, NIVEAU_BROCANTES_T3, NIVEAU_BROCANTES_T4, BROCANTES } from "@/data/brocantes";
import { evaluerCondition, descriptionCondition, listerConditionsAvecEtat } from "./deblocage";

describe("condition niveau (double gate)", () => {
  it("évalue le niveau de Brocanteur", () => {
    const cond = { type: "niveau", niveau: 4 } as const;
    expect(evaluerCondition(cond, fabriqueState({ niveau: 3 }))).toBe(false);
    expect(evaluerCondition(cond, fabriqueState({ niveau: 4 }))).toBe(true);
  });

  it("décrit la condition", () => {
    expect(descriptionCondition({ type: "niveau", niveau: 10 })).toContain("Niveau de Brocanteur 10");
  });

  it("toutes les brocantes T2/T3/T4 exigent le niveau du tier", () => {
    for (const b of BROCANTES) {
      if (b.tier === 1) continue;
      const attendu = { 2: NIVEAU_BROCANTES_T2, 3: NIVEAU_BROCANTES_T3, 4: NIVEAU_BROCANTES_T4 }[b.tier];
      const c = b.conditionDeblocage;
      expect(c.type).toBe("ET");
      const niveaux = (c.type === "ET" ? c.conditions : []).filter((x) => x.type === "niveau");
      expect(niveaux).toEqual([{ type: "niveau", niveau: attendu }]);
    }
  });
});
```

`fabriqueState({ niveau })` doit produire un objet satisfaisant le `Pick` élargi (Step 3) avec `brocanteur.niveau` réglable.

- [ ] **Step 2: RED** — `npx vitest run src/lib/deblocage.test.ts` (échec : variant inexistant, constantes inexistantes).

- [ ] **Step 3: Implémenter.**

`src/types/game.ts` — ajouter le variant dans `ConditionDeblocage` :

```ts
  | { type: "niveau"; niveau: number }
```

`src/data/brocantes.ts` — en tête de fichier :

```ts
/** Double gate (D1) : niveau de Brocanteur requis en plus des conditions économiques. */
export const NIVEAU_BROCANTES_T2 = 4;
export const NIVEAU_BROCANTES_T3 = 10;
export const NIVEAU_BROCANTES_T4 = 20;
```

Pour chaque brocante T2/T3/T4 (toutes déjà en `ET` de 2 conditions), préfixer le tableau `conditions` par la condition de niveau, ex. pour `deballage-collectionneurs` :

```ts
conditionDeblocage: {
  type: "ET",
  conditions: [
    { type: "niveau", niveau: NIVEAU_BROCANTES_T2 },
    { type: "valeurCollection", montant: 150 },
    { type: "brocantesDebloquees", tier: 1, nombre: 3 },
  ],
},
```

(5 brocantes T2 → `NIVEAU_BROCANTES_T2`, 6 brocantes T3 → `NIVEAU_BROCANTES_T3`, 1 brocante T4 → `NIVEAU_BROCANTES_T4`. Les brocantes T1 ne changent pas.)

`src/lib/deblocage.ts` :
- `descriptionCondition` : nouveau cas `case "niveau": return \`Niveau de Brocanteur ${c.niveau} requis\`;`
- `descriptionConditionCourte` : cas `niveau` → `` `Niveau ${c.niveau} (vous : N${state.brocanteur.niveau})` `` ; élargir le `Pick` de `state` à `Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">` (et propager aux fonctions qui le réutilisent : `decrireConditionsCourtes`, `listerConditionsAvecEtat`).
- `evaluerCondition` : cas `case "niveau": return state.brocanteur.niveau >= c.niveau;` (élargir son `Pick` de même).
- Vérifier `calculerBrocantesDebloqueesParTier` et `estDebloquee` : ils passent `state` entier, rien à changer sauf les types.

- [ ] **Step 4: tsc en cascade** — `npx tsc --noEmit` : les appelants (`BrocantePanorama.tsx`, `BrocanteCarousel.tsx`, pages vitrine/chiner, `lib/quetes/*`) passent déjà le `state` complet — corriger uniquement les types/`Pick` si nécessaire. ⚠ `lib/quetes/principales.ts` évalue des conditions de chapitres : le nouveau variant ne doit PAS y être utilisé par les données existantes (vérifier qu'aucun chapitre n'a besoin d'un défaut).

- [ ] **Step 5: GREEN + suite complète.** Attention aux tests existants de quêtes/deblocage qui fabriquent des states partiels : leur ajouter `brocanteur` si le `Pick` élargi l'exige. Des tests de progression (quêtes atteignables, E2E déblocage T2) peuvent casser si leurs fixtures ont un niveau 0 — leur donner `brocanteur.niveau` suffisant est la correction attendue, PAS de retirer la condition.

- [ ] **Step 6: Commit** — `git add -A src && git commit -m "feat(niveau): double gate des brocantes T2/T3/T4 par le Niveau de Brocanteur (condition niveau)"`

---

### Task 2: Table `DEBLOCAGES_PAR_NIVEAU` + énergie max dynamique (N8/N14)

**Files:**
- Create: `src/data/deblocagesNiveau.ts`
- Modify: `src/lib/energie.ts` (`settleEnergie`, nouvelle `energieMaxPourNiveau`)
- Modify: `src/context/GameContext.tsx` (crédit pub ~307, check plein ~388, init ~504)
- Modify: `src/components/mobile/MobileHeader.tsx`, `src/components/mobile/EnergieRecharge.tsx` (affichage `/max`)
- Modify: `src/lib/migrations.ts` (clamp énergie ~518)
- Test: `src/data/deblocagesNiveau.test.ts` (créer), `src/lib/energie.test.ts` (étendre)

**Interfaces:**
- Consumes: constantes Task 1, `NIVEAU_ACTIVE` (défini ici, consommé par Task 3).
- Produces:
```ts
// src/data/deblocagesNiveau.ts
export type FamilleDeblocage = "jalon" | "contenu" | "economie" | "confort" | "active";
export interface DeblocageNiveau { niveau: number; titre: string; famille: FamilleDeblocage; /** true si le gate est réellement appliqué par le code (sinon ligne informative pour l'UI). */ effectif: boolean; }
export const DEBLOCAGES_PAR_NIVEAU: readonly DeblocageNiveau[];
export function deblocagesPourNiveau(niveau: number): DeblocageNiveau[];
export function prochainDeblocage(niveau: number): DeblocageNiveau | null;
// src/lib/energie.ts
export const NIVEAU_ENERGIE_BONUS_1 = 8;
export const NIVEAU_ENERGIE_BONUS_2 = 14;
export function energieMaxPourNiveau(niveau: number): number; // 5 / 6 / 7
export function settleEnergie(state: EnergieState, now: number, energieMax?: number): {...}; // défaut ENERGIE_MAX
```

- [ ] **Step 1: Tests qui échouent.**

`src/data/deblocagesNiveau.test.ts` :

```ts
import { DEBLOCAGES_PAR_NIVEAU, deblocagesPourNiveau, prochainDeblocage } from "./deblocagesNiveau";

describe("table des déblocages par niveau", () => {
  it("les jalons validés sont effectifs", () => {
    const effectifs = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.effectif).map((d) => d.niveau).sort((a, b) => a - b);
    expect(effectifs).toEqual([4, 5, 7, 8, 9, 10, 13, 14, 15, 17, 20]);
  });
  it("chaque niveau 1..20 a au moins une ligne (déblocage nommé)", () => {
    for (let n = 1; n <= 20; n++) expect(deblocagesPourNiveau(n).length).toBeGreaterThan(0);
  });
  it("prochainDeblocage retourne la première ligne strictement au-dessus", () => {
    expect(prochainDeblocage(4)!.niveau).toBe(5);
    expect(prochainDeblocage(99)).toBeNull();
  });
});
```

`src/lib/energie.test.ts` (à la suite des tests existants) :

```ts
describe("energieMaxPourNiveau", () => {
  it("5 avant N8, 6 de N8 à N13, 7 dès N14", () => {
    expect(energieMaxPourNiveau(0)).toBe(5);
    expect(energieMaxPourNiveau(7)).toBe(5);
    expect(energieMaxPourNiveau(8)).toBe(6);
    expect(energieMaxPourNiveau(13)).toBe(6);
    expect(energieMaxPourNiveau(14)).toBe(7);
  });
});

describe("settleEnergie avec max étendu", () => {
  it("régénère jusqu'au max passé en paramètre", () => {
    const base = { energie: 5, energieDerniereMaj: 0 };
    const r = settleEnergie(base, RECHARGE_INTERVAL_MS * 3, 7);
    expect(r.energie).toBe(7); // plafonne à 7, pas 5
  });
  it("défaut inchangé (ENERGIE_MAX)", () => {
    const r = settleEnergie({ energie: 4, energieDerniereMaj: 0 }, RECHARGE_INTERVAL_MS * 10);
    expect(r.energie).toBe(5);
  });
});
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter.**

`src/data/deblocagesNiveau.ts` (fichier complet) :

```ts
import { NIVEAU_BROCANTES_T2, NIVEAU_BROCANTES_T3, NIVEAU_BROCANTES_T4 } from "@/data/brocantes";
import { NIVEAU_ENERGIE_BONUS_1, NIVEAU_ENERGIE_BONUS_2 } from "@/lib/energie";

export type FamilleDeblocage = "jalon" | "contenu" | "economie" | "confort" | "active";

export interface DeblocageNiveau {
  niveau: number;
  titre: string;
  famille: FamilleDeblocage;
  /** true si le gate est réellement appliqué par le code (sinon ligne informative pour l'UI du plan 4). */
  effectif: boolean;
}

/** Source de vérité du plan de déblocage (rapport §08). Seuls les jalons validés (D1/D3/actives) sont effectifs. */
export const DEBLOCAGES_PAR_NIVEAU: readonly DeblocageNiveau[] = [
  { niveau: 1, titre: "Premier point de compétence", famille: "jalon", effectif: false },
  { niveau: 2, titre: "L'Atelier vous tend les bras", famille: "contenu", effectif: false },
  { niveau: 3, titre: "Quêtes quotidiennes", famille: "contenu", effectif: false },
  { niveau: NIVEAU_BROCANTES_T2, titre: "Accès aux brocantes de quartier (T2)", famille: "economie", effectif: true },
  { niveau: 5, titre: "Active 🔍 Le Flair", famille: "active", effectif: true },
  { niveau: 6, titre: "Boîte mystère", famille: "contenu", effectif: false },
  { niveau: 7, titre: "Active 🧺 Le Lot garni", famille: "active", effectif: true },
  { niveau: NIVEAU_ENERGIE_BONUS_1, titre: "Énergie max +1 (= 6)", famille: "confort", effectif: true },
  { niveau: 9, titre: "Active 🧹 La Fouille", famille: "active", effectif: true },
  { niveau: NIVEAU_BROCANTES_T3, titre: "Accès aux belles foires (T3)", famille: "jalon", effectif: true },
  { niveau: 11, titre: "Camion niveau 2 à l'achat", famille: "economie", effectif: false },
  { niveau: 12, titre: "Paliers 3 des compétences", famille: "jalon", effectif: false },
  { niveau: 13, titre: "Active 🎩 Le Boniment", famille: "active", effectif: true },
  { niveau: NIVEAU_ENERGIE_BONUS_2, titre: "Énergie max +1 (= 7)", famille: "confort", effectif: true },
  { niveau: 15, titre: "Active 💬 La Tchatche", famille: "active", effectif: true },
  { niveau: 16, titre: "Hangar (stockage 50) à l'achat", famille: "economie", effectif: false },
  { niveau: 17, titre: "Active 📣 La Criée", famille: "active", effectif: true },
  { niveau: 18, titre: "Atelier 3ᵉ établi à l'achat", famille: "economie", effectif: false },
  { niveau: 19, titre: "Derniers vendeurs nommés", famille: "contenu", effectif: false },
  { niveau: NIVEAU_BROCANTES_T4, titre: "Accès au Grand Salon (T4)", famille: "jalon", effectif: true },
];

export function deblocagesPourNiveau(niveau: number): DeblocageNiveau[] {
  return DEBLOCAGES_PAR_NIVEAU.filter((d) => d.niveau === niveau);
}

export function prochainDeblocage(niveau: number): DeblocageNiveau | null {
  return DEBLOCAGES_PAR_NIVEAU.find((d) => d.niveau > niveau) ?? null;
}
```

(Note : le niveau 12 « Paliers 3 » reflète `NIVEAU_BROCANTEUR_PALIER_3` déjà effectif au plan 2 — marqué `effectif: false` ici car ce gate-là vit dans `competences.ts`, la ligne n'est qu'informative pour l'UI. Les libellés non validés restent modifiables sans code.)

`src/lib/energie.ts` :

```ts
/** Jalons du Niveau de Brocanteur qui étendent l'énergie max (D3). */
export const NIVEAU_ENERGIE_BONUS_1 = 8;
export const NIVEAU_ENERGIE_BONUS_2 = 14;

export function energieMaxPourNiveau(niveau: number): number {
  return ENERGIE_MAX + (niveau >= NIVEAU_ENERGIE_BONUS_1 ? 1 : 0) + (niveau >= NIVEAU_ENERGIE_BONUS_2 ? 1 : 0);
}
```

`settleEnergie(state, now, energieMax: number = ENERGIE_MAX)` : remplacer chaque usage interne de `ENERGIE_MAX` par le paramètre (plafond de régén, court-circuit « déjà plein »). Faire de même pour `secondesAvantProchaine`/`secondesAvantPlein` si elles comparent au max (même paramètre optionnel).

Sites d'appel — passer `energieMaxPourNiveau(state.brocanteur.niveau)` partout où le state est disponible :
- `GameContext.tsx` : crédit pub (`Math.min(max, settled.energie + ENERGIE_PAR_PUB)` → `max` dynamique), check « déjà plein », settle périodique s'il existe. L'init nouvelle partie reste `ENERGIE_MAX` (niveau 0).
- `MobileHeader.tsx` / `EnergieRecharge.tsx` : afficher `/{energieMaxPourNiveau(state.brocanteur.niveau)}` et le calcul `peutRecharger`.
- `energieCourante` : si elle délègue à `settleEnergie`, propager le paramètre ; vérifier ses 5 sites d'appel (pages chiner/vitrine, panorama) — le gate « ≥ 1 » ne dépend pas du max, ne changer que ce qui compare au plafond.
- `migrations.ts` (~518) : le clamp devient `Math.min(energieMaxPourNiveau(niveauMigre), ...)` où `niveauMigre` est le niveau du bloc `brocanteur` déjà calculé plus haut dans la fonction — ⚠ le bloc énergie doit être évalué APRÈS le bloc brocanteur ou recalculer localement ; si l'ordre des blocs l'empêche proprement, clamp à `energieMaxPourNiveau(Infinity)` (= 7, borne large) avec un commentaire — on ne perd jamais d'énergie légitime.

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): table DEBLOCAGES_PAR_NIVEAU + énergie max 6/7 aux jalons N8/N14"`

---

### Task 3: Infra des actives — `lib/actives.ts` + champ persistant

**Files:**
- Create: `src/lib/actives.ts`
- Modify: `src/types/game.ts` (champ `activesUtilisees?`)
- Modify: `src/context/GameContext.tsx` (action `utiliserActive`)
- Modify: `src/lib/migrations.ts` (sanitation du champ optionnel)
- Test: `src/lib/actives.test.ts` (créer)

**Interfaces:**
- Consumes: `state.jourActuel`, `state.brocanteur.niveau`, `aGenDiplomate` (lib/competences.ts).
- Produces:
```ts
// src/lib/actives.ts
export type ActiveId = "flair" | "lotGarni" | "fouille" | "boniment" | "tchatche" | "criee" | "diplomate";
export const QUOTA_ACTIVES: Record<ActiveId, number>; // {flair:1, lotGarni:1, fouille:3, boniment:1, tchatche:1, criee:1, diplomate:1}
export const NIVEAU_ACTIVES: Record<Exclude<ActiveId, "diplomate">, number>; // {flair:5, lotGarni:7, fouille:9, boniment:13, tchatche:15, criee:17}
export type ActivesUtilisees = Partial<Record<ActiveId, { jour: number; usages: number }>>;
export function activeDebloquee(state: Pick<GameState, "brocanteur" | "competencesDebloquees">, id: ActiveId): boolean;
export function usagesRestants(actives: ActivesUtilisees | undefined, id: ActiveId, jour: number): number;
export function consommerActive(actives: ActivesUtilisees | undefined, id: ActiveId, jour: number): ActivesUtilisees | null; // null si épuisé
// GameContext
utiliserActive: (id: ActiveId) => boolean; // atomique ; false si verrouillée/épuisée
```
- `GameState.activesUtilisees?: ActivesUtilisees` (`src/types/game.ts`, à côté de `pubsEnergie?`).

- [ ] **Step 1: Tests qui échouent** — `src/lib/actives.test.ts` :

```ts
import { QUOTA_ACTIVES, NIVEAU_ACTIVES, activeDebloquee, usagesRestants, consommerActive } from "./actives";

describe("infra des actives", () => {
  it("quotas et niveaux du design", () => {
    expect(QUOTA_ACTIVES).toEqual({ flair: 1, lotGarni: 1, fouille: 3, boniment: 1, tchatche: 1, criee: 1, diplomate: 1 });
    expect(NIVEAU_ACTIVES).toEqual({ flair: 5, lotGarni: 7, fouille: 9, boniment: 13, tchatche: 15, criee: 17 });
  });

  it("déblocage par niveau (et Diplomate par compétence)", () => {
    const st = (niveau: number, comps: string[] = []) => ({ brocanteur: { xp: 0, niveau, pointsDisponibles: 0 }, competencesDebloquees: comps });
    expect(activeDebloquee(st(4), "flair")).toBe(false);
    expect(activeDebloquee(st(5), "flair")).toBe(true);
    expect(activeDebloquee(st(30), "diplomate")).toBe(false);
    expect(activeDebloquee(st(0, ["general.negociation.1", "general.negociation.2", "general.negociation.3"]), "diplomate")).toBe(true);
  });

  it("quota journalier : consommation, épuisement, reset au jour suivant", () => {
    let a = consommerActive(undefined, "fouille", 3)!;
    expect(usagesRestants(a, "fouille", 3)).toBe(2);
    a = consommerActive(consommerActive(a, "fouille", 3)!, "fouille", 3)!;
    expect(usagesRestants(a, "fouille", 3)).toBe(0);
    expect(consommerActive(a, "fouille", 3)).toBeNull();      // épuisé
    expect(usagesRestants(a, "fouille", 4)).toBe(3);          // nouveau jour
    expect(usagesRestants(a, "flair", 3)).toBe(1);            // indépendance des clés
  });
});
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter** `src/lib/actives.ts` :

```ts
import type { GameState } from "@/types/game";
import { aGenDiplomate } from "@/lib/competences";

export type ActiveId = "flair" | "lotGarni" | "fouille" | "boniment" | "tchatche" | "criee" | "diplomate";

/** Usages par jour de jeu (rapport §04). */
export const QUOTA_ACTIVES: Record<ActiveId, number> = {
  flair: 1, lotGarni: 1, fouille: 3, boniment: 1, tchatche: 1, criee: 1, diplomate: 1,
};

/** Jalons de Niveau de Brocanteur qui offrent chaque active (Diplomate reste une compétence). */
export const NIVEAU_ACTIVES: Record<Exclude<ActiveId, "diplomate">, number> = {
  flair: 5, lotGarni: 7, fouille: 9, boniment: 13, tchatche: 15, criee: 17,
};

export type ActivesUtilisees = Partial<Record<ActiveId, { jour: number; usages: number }>>;

export function activeDebloquee(
  state: Pick<GameState, "brocanteur" | "competencesDebloquees">,
  id: ActiveId,
): boolean {
  if (id === "diplomate") return aGenDiplomate(state as GameState);
  return state.brocanteur.niveau >= NIVEAU_ACTIVES[id];
}

export function usagesRestants(actives: ActivesUtilisees | undefined, id: ActiveId, jour: number): number {
  const e = actives?.[id];
  const consommes = e && e.jour === jour ? e.usages : 0;
  return Math.max(0, QUOTA_ACTIVES[id] - consommes);
}

/** Retourne le nouveau record, ou null si le quota du jour est épuisé. Pure. */
export function consommerActive(
  actives: ActivesUtilisees | undefined,
  id: ActiveId,
  jour: number,
): ActivesUtilisees | null {
  if (usagesRestants(actives, id, jour) <= 0) return null;
  const e = actives?.[id];
  const usages = e && e.jour === jour ? e.usages + 1 : 1;
  return { ...(actives ?? {}), [id]: { jour, usages } };
}
```

(Si `aGenDiplomate` exige un `GameState` complet, assouplir SA signature en `Pick<GameState, "competencesDebloquees">` plutôt que de caster — préférer ça au `as GameState` ci-dessus si le tsc le permet sans cascade.)

`src/types/game.ts` — à côté de `pubsEnergie?` :

```ts
  /** Usages du jour des compétences actives (clé = jourActuel). Absent tant qu'aucune active n'a servi. */
  activesUtilisees?: ActivesUtilisees;
```

(import type depuis `@/lib/actives` — vérifier l'absence de cycle : `actives.ts` importe déjà `types/game` en type-only, c'est sain.)

`GameContext.tsx` — action atomique (leçon des plans 1-2 : re-check dans l'updater) :

```ts
const utiliserActive = useCallback((id: ActiveId): boolean => {
  const current = stateRef.current;
  if (!current) return false;
  if (!activeDebloquee(current, id)) return false;
  if (usagesRestants(current.activesUtilisees, id, current.jourActuel) <= 0) return false;
  setState((prev) => {
    if (!prev) return prev;
    const next = consommerActive(prev.activesUtilisees, id, prev.jourActuel);
    if (!next) return prev;
    return { ...prev, activesUtilisees: next };
  });
  return true;
}, []);
```

Exposer dans l'interface + values + deps. ⚠ Le pré-check et l'updater peuvent diverger au même tick (comme `debloquerCompetence`) : documenter que le retour `true` garantit l'intention, l'updater garantit l'état — les quotas à 1 usage rendent le double-tap sans effet d'état.

`src/lib/migrations.ts` — bloc de sanitation (pattern `pubsEnergie`) :

```ts
    activesUtilisees: (() => {
      const a = (loaded as Partial<GameState>).activesUtilisees;
      if (!a || typeof a !== "object") return undefined;
      const propre: ActivesUtilisees = {};
      for (const [k, v] of Object.entries(a)) {
        if (!(k in QUOTA_ACTIVES)) continue;
        if (!v || !Number.isFinite(v.jour) || !Number.isFinite(v.usages) || v.usages < 0) continue;
        propre[k as ActiveId] = { jour: Math.floor(v.jour), usages: Math.floor(v.usages) };
      }
      return Object.keys(propre).length ? propre : undefined;
    })(),
```

+ test de migration : une save avec `activesUtilisees: { flair: { jour: 2, usages: 1 }, zombie: {...}, fouille: { jour: NaN, usages: 1 } }` ne conserve que `flair`.

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): infra des compétences actives (quotas journaliers persistants, action utiliserActive)"`

---

### Task 4: Rebrancher la négociation de vente réelle (correctif critique) + Diplomate persistant

**Files:**
- Modify: `src/components/vente/NegociationSheet.tsx` (`handleProposer` ~103)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (suppression code mort, câblage)
- Test: `src/lib/vitrine.test.ts` (compléter si besoin), vérification manuelle par grep

**Interfaces:**
- Consumes: `proposerOffreVente` (vitrine.ts, inchangé), `utiliserActive`/`usagesRestants` (Task 3), `ev.toleranceBoost`.
- Produces: `NegociationSheet` reçoit une prop `onProposerOffre: (nego: NegociationState, offre: number) => NegociationState` et l'utilise à la place de l'appel direct à `proposerOffre` ; le code mort `handleProposerVente` + `ClientModal` est supprimé.

**Contexte (découverte d'exploration, à re-vérifier au Step 1) :** `proposerOffreVente` — qui porte le `toleranceBoost` (plan 2 Task 6) ET la mécanique Diplomate — n'est appelé que par `ClientPage.handleProposerVente`, lequel n'est appelé nulle part ; la vraie UI (`NegociationSheet.handleProposer`) appelle `proposerOffre` brut avec le persona non boosté. `ClientModal` (~360 lignes dans ClientPage) n'est jamais rendu. Conséquence : Verbe haut/d'or, Œil aiguisé (tolérance) et Diplomate sont inertes en jeu réel.

- [ ] **Step 1: Vérifier le diagnostic** — `grep -n "handleProposerVente\|proposerOffreVente\|ClientModal" src/app/vitrine/[brocanteId]/journee/ClientPage.tsx src/components/vente/NegociationSheet.tsx src/lib/vitrine.ts`. Attendu : `handleProposerVente` défini mais jamais invoqué ; `<ClientModal` jamais rendu ; `NegociationSheet` appelle `proposerOffre(`. Si le diagnostic est faux, STOP et remonter (NEEDS_CONTEXT).

- [ ] **Step 2: Câbler.** Dans `ClientPage.tsx` (journée), créer le callback (près des modifiers existants) :

```ts
const handleOffreVente = useCallback(
  (nego: NegociationState, offre: number): NegociationState => {
    const ev = clientActuelRef.current;
    const mods = modifiersRef.current ?? DEFAULT_MODIFIERS;
    if (!ev) return nego;
    const diplomatieDispo =
      mods.diplomate && usagesRestants(state?.activesUtilisees, "diplomate", state?.jourActuel ?? 0) > 0;
    const next = proposerOffreVente(nego, ev.persona, offre, mods, {
      revelationDejaFaite: !diplomatieDispo,
      toleranceBoost: ev.toleranceBoost,
    });
    // Le sauvetage Diplomate a eu lieu si un "fache" est ressorti "en_cours" avec le plafond lâché.
    if (nego.statut !== "conclu" && next.statut === "en_cours" && next.humeur >= 0.9 && diplomatieDispo && next.message.includes("plafond")) {
      utiliserActive("diplomate");
      setRevelationFaite(true);
    }
    return next;
  },
  [state, utiliserActive],
);
```

⚠ Adapter le détecteur de sauvetage à ce que `proposerOffreVente` permet de mieux : si l'heuristique `message.includes` est fragile, MODIFIER `proposerOffreVente` pour retourner un champ dédié (`{ ...next, diplomatieDeclenchee: true }` via un type de retour élargi `NegociationState & { diplomatieDeclenchee?: boolean }`) — c'est la voie propre, faire ça plutôt que le sniff de message, et tester ce champ dans `vitrine.test.ts` (le Diplomate existant a déjà un test ? sinon en ajouter un : fâché + diplomate + non utilisé → `diplomatieDeclenchee: true` et statut `en_cours`).

`NegociationSheet.tsx` : nouvelle prop `onProposerOffre` ; `handleProposer` remplace `proposerOffre(localNego, persona, offreJoueur)` par `onProposerOffre(localNego, offreJoueur)`. La prop `persona` peut rester pour l'affichage si elle sert ailleurs. Passer la prop depuis le rendu de `NegociationSheet` dans ClientPage.

- [ ] **Step 3: Purger le code mort** — supprimer `handleProposerVente`, `ClientModal`, et les états/refs devenus orphelins (`diplomatieUtiliseeAujourdhuiRef`, `revelationDejaFaite` si plus lu — ⚠ `revelationFaite` reste : il pilote le badge UI). `npx tsc --noEmit` + grep final : `proposerOffreVente` doit avoir exactement 1 appelant réel (le callback ci-dessus) + les tests.

- [ ] **Step 4: GREEN + suite + tsc.** Vérification comportementale ciblée : test RTL léger OU test unitaire du callback si extractible ; a minima le test `diplomatieDeclenchee` du Step 2 et la suite existante.

- [ ] **Step 5: Commit** — `git commit -m "fix(niveau): la négociation de vente réelle passe par proposerOffreVente (tolérance + Diplomate enfin actifs, quota persistant)"`

---

### Task 5: Actives de chine — 🔍 Le Flair (N5) + 🧹 La Fouille (N9)

**Files:**
- Modify: `src/lib/chine.ts` (export `genererRemplacement`)
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (états, boutons, slides memo)
- Modify: `src/components/mobile/chine/ItemSwipeDeck.tsx` OU `ChineSlide.tsx` (emplacement du bouton Fouille par carte — choisir le composant qui rend les contrôles par slide)
- Test: `src/lib/chine.test.ts` (étendre)

**Interfaces:**
- Consumes: `utiliserActive`, `usagesRestants`, `activeDebloquee` (Task 3) ; `genererSession` internals.
- Produces:
```ts
// src/lib/chine.ts
export function genererRemplacement(
  aRemplacer: ObjetEnVente,
  itemsCourants: readonly ObjetEnVente[],
  tendances: readonly Tendance[],
  brocante: Brocante | undefined,
  celebrite: CelebriteEvenement | null | undefined,
  exclus: ReadonlySet<string> | undefined,
): ObjetEnVente;
```

- [ ] **Step 1: Tests qui échouent** — `src/lib/chine.test.ts` :

```ts
describe("genererRemplacement (La Fouille)", () => {
  // réutiliser les helpers/fixtures existants du fichier (brocante T1/T2, tendances vides)
  it("retourne un objet différent, jamais un template non-commun déjà sur l'étal", () => {
    const session = genererSession(6, [], brocanteT2);
    const cible = session[0];
    for (let i = 0; i < 50; i++) {
      const r = genererRemplacement(cible, session, [], brocanteT2, null, undefined);
      expect(r.id).not.toBe(cible.id);
      if (r.objet.rarete !== "commun") {
        const autresTemplates = session.filter((s) => s.id !== cible.id).map((s) => s.objet.templateId);
        expect(autresTemplates).not.toContain(r.objet.templateId);
      }
      expect(r.statut).toBe("disponible");
      expect(r.negociation).toBeNull();
    }
  });

  it("ne pioche jamais dans le poolExclusif (pas de 2e pièce d'exception via la Fouille)", () => {
    const exclusifs = new Set((brocanteT3.poolExclusif ?? []).map((t) => t.templateId));
    const session = genererSession(6, [], brocanteT3);
    for (let i = 0; i < 100; i++) {
      const r = genererRemplacement(session[0], session, [], brocanteT3, null, undefined);
      expect(exclusifs.has(r.objet.templateId)).toBe(false);
    }
  });

  it("respecte l'exclusion des uniques", () => {
    const exclus = new Set([unTemplateUniqueDuPoolGenerique]); // adapter à un id réel des fixtures
    const session = genererSession(6, [], brocanteT4);
    for (let i = 0; i < 100; i++) {
      const r = genererRemplacement(session[0], session, [], brocanteT4, null, exclus);
      expect(exclus.has(r.objet.templateId)).toBe(false);
    }
  });
});
```

(Adapter les noms de fixtures aux helpers réels du fichier de test existant ; s'il n'y a pas de fixture T3/T4 avec `poolExclusif`, en construire une minimale locale.)

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter `genererRemplacement`** dans `chine.ts`, en réutilisant les internes existants (`tirerTemplatePondere`, `instancier`, `poidsRarete`) — extraire du corps de `genererSession` ce qui doit être partagé plutôt que dupliquer :

```ts
/**
 * La Fouille : retire un nouvel objet pour remplacer `aRemplacer`, avec les règles de la session
 * (mix de rareté du tier, pas de doublon non-commun avec l'étal courant, exclusion des uniques),
 * SANS jamais piocher dans le poolExclusif (garde-fou : pas de 2e pièce d'exception).
 */
export function genererRemplacement(
  aRemplacer: ObjetEnVente,
  itemsCourants: readonly ObjetEnVente[],
  tendances: readonly Tendance[] = [],
  brocante?: Brocante,
  celebrite?: CelebriteEvenement | null,
  exclus?: ReadonlySet<string>,
): ObjetEnVente {
  const tier = brocante?.tier ?? 1;
  const dejaTires = new Set(
    itemsCourants.filter((it) => it.id !== aRemplacer.id && it.objet.rarete !== "commun").map((it) => it.objet.templateId),
  );
  const pool = poolGeneriquePour(brocante).filter((t) => !exclus?.has(t.templateId)); // extraire/réutiliser la sélection de pool de genererSession, SANS poolExclusif
  const boostRares = celebrite ? CELEBRITE_BOOST_RARES : 1;
  for (let essai = 0; essai < 50; essai++) {
    const t = tirerTemplatePondere(pool, boostRares, tier);
    if (t.rarete !== "commun" && dejaTires.has(t.templateId)) continue;
    if (exclus?.has(t.templateId)) continue;
    return instancier(t, tendances, tier, brocante);
  }
  // Filet : un commun quelconque du pool (le pool contient toujours des communs).
  const communs = pool.filter((t) => t.rarete === "commun");
  return instancier(communs[Math.floor(Math.random() * communs.length)], tendances, tier, brocante);
}
```

`poolGeneriquePour(brocante)` : factoriser la construction du pool générique (+ spécialisation éventuelle) depuis `genererSession` — même source, un seul endroit. L'objet retourné doit être un `ObjetEnVente` complet (`statut: "disponible"`, `negociation: null`, persona vendeur retiré comme dans `genererSession` — reprendre le même post-traitement qu'`instancier` + l'enrobage session).

- [ ] **Step 4: UI chinage** dans `ClientPage.tsx` (chiner) :

```ts
const [flairActif, setFlairActif] = useState(false);
const jouerFlair = () => { if (utiliserActive("flair")) setFlairActif(true); };
const jouerFouille = (it: ObjetEnVente) => {
  if (!items || !state) return;
  if (!utiliserActive("fouille")) return;
  const remplacement = genererRemplacement(it, items, state.tendances, brocante, state.celebriteActuelle, uniquesExclusDuChinage(state));
  setItems((prev) => prev ? prev.map((x) => (x.id === it.id ? remplacement : x)) : prev);
};
```

- slides memo : `coteConnue: flairActif || (state ? aConnaisseurChinage(state, it.objet.categorie) : false)` + dep `flairActif`. `flairActif` est de portée session (reset naturel au démontage) — le quota, lui, est persistant.
- Boutons : une petite barre d'actives au-dessus du deck (même zone que l'en-tête existant de la page), visible seulement si débloquées :
  - `🔍 Flair ({usagesRestants(state.activesUtilisees, "flair", state.jourActuel)})` — désactivé si 0 restant ou `flairActif`.
  - Fouille : bouton par carte (dans `ChineSlideVue` ou la zone de contrôles du deck, à côté des actions existantes de la slide) `🧹 Fouille (n)` — visible si `activeDebloquee(state, "fouille")`, désactivé si 0 restant, masqué si `it.statut === "achete"` ou négo en cours sur l'objet (`it.negociation?.statut === "en_cours"`).
- Style : reprendre la famille mono/tailles des boutons voisins du fichier (pas d'invention visuelle — plan 4).

- [ ] **Step 5: GREEN + suite + tsc.**
- [ ] **Step 6: Commit** — `git commit -m "feat(niveau): actives de chine — Le Flair (N5) et La Fouille (N9)"`

---

### Task 6: Active de chine — 💬 La Tchatche (N15)

**Files:**
- Modify: `src/lib/negociation.ts` (export `relancerNegociation`)
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx` (bouton + branchement)
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (props du drawer)
- Test: `src/lib/negociation.test.ts` (étendre)

**Interfaces:**
- Consumes: `NegociationState` (types), `utiliserActive`.
- Produces:
```ts
// src/lib/negociation.ts
export const HUMEUR_RELANCE = 0.2;
export function relancerNegociation(nego: NegociationState): NegociationState; // fache|refus_poli → en_cours, humeur HUMEUR_RELANCE
```
- `ChineNegoDrawer` reçoit `tchatche?: { restantes: number; onRelancer: () => void }`.

- [ ] **Step 1: Tests qui échouent** — `src/lib/negociation.test.ts` :

```ts
describe("relancerNegociation (La Tchatche)", () => {
  const base: NegociationState = { mode: "achat", tour: 3, humeur: 1, prixAdverseCourant: 80, cibleSecrete: 60, derniereOffreJoueur: 50, statut: "fache", message: "…" };
  it("rouvre une négo fâchée avec humeur neutre", () => {
    const r = relancerNegociation(base);
    expect(r.statut).toBe("en_cours");
    expect(r.humeur).toBe(HUMEUR_RELANCE);
    expect(r.prixAdverseCourant).toBe(80);   // le prix courant ne bouge pas
    expect(r.message).toContain("écoute");
  });
  it("rouvre aussi un refus poli", () => {
    expect(relancerNegociation({ ...base, statut: "refus_poli" }).statut).toBe("en_cours");
  });
  it("ne touche pas une négo en cours ou conclue", () => {
    expect(relancerNegociation({ ...base, statut: "en_cours" })).toEqual({ ...base, statut: "en_cours" });
    expect(relancerNegociation({ ...base, statut: "conclu" })).toEqual({ ...base, statut: "conclu" });
  });
});
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter** dans `negociation.ts` :

```ts
/** La Tchatche : le vendeur se ravise — négociation rouverte, humeur remise à neutre. Pure. */
export const HUMEUR_RELANCE = 0.2;

export function relancerNegociation(nego: NegociationState): NegociationState {
  if (nego.statut !== "fache" && nego.statut !== "refus_poli") return nego;
  return {
    ...nego,
    statut: "en_cours",
    humeur: HUMEUR_RELANCE,
    message: "« Bon… allez, je vous écoute une dernière fois. »",
  };
}
```

- [ ] **Step 4: UI** — `ChineNegoDrawer.tsx` : dans la rangée de boutons quand `!enCours` (statuts `fache`/`refus_poli`), avant « Fermer », si `tchatche && tchatche.restantes > 0` :

```tsx
<button style={btnSecondaire} onClick={() => { tchatche.onRelancer(); }}>
  💬 La Tchatche ({tchatche.restantes})
</button>
```

`ClientPage.tsx` (chiner) passe la prop au drawer :

```ts
tchatche: activeDebloquee(state, "tchatche") && it.negociation && (it.negociation.statut === "fache" || it.negociation.statut === "refus_poli")
  ? {
      restantes: usagesRestants(state.activesUtilisees, "tchatche", state.jourActuel),
      onRelancer: () => {
        if (!utiliserActive("tchatche")) return;
        setItem(it.id, { negociation: relancerNegociation(it.negociation!) });
      },
    }
  : undefined,
```

⚠ Le drawer garde une copie locale `localNego` seedée à l'ouverture : après `onRelancer`, s'assurer que la vue se resynchronise (soit le drawer écoute `item.negociation` par un `useEffect` de resync quand la prop change de statut, soit `onRelancer` est géré DANS le drawer via `setLocalNego(relancerNegociation(localNego))` + `onUpdateNego` — choisir cette 2ᵉ voie, plus simple : le drawer appelle `relancerNegociation` lui-même et remonte par `onUpdateNego`, le parent ne fournit que `restantes` et `consommer: () => boolean`).

- [ ] **Step 5: GREEN + suite + tsc.**
- [ ] **Step 6: Commit** — `git commit -m "feat(niveau): active de chine — La Tchatche (N15) relance une négo d'achat refusée"`

---

### Task 7: Actives de vente — 🧺 Le Lot garni (N7) + 🎩 Le Boniment (N13)

**Files:**
- Modify: `src/lib/vitrine.ts` (export `calculerPrixMax`, nouveaux `ajouterAuPanier` + `appliquerBoniment` + constantes)
- Modify: `src/components/vente/NegociationSheet.tsx` (boutons d'actives)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (picker Lot garni, câblage)
- Test: `src/lib/vitrine.test.ts` (étendre)

**Interfaces:**
- Consumes: `calculerPrixMax` (devient exporté), `NegociationState`, `ClientEvent`, `utiliserActive`, Task 4 (`onProposerOffre` déjà en place).
- Produces:
```ts
// src/lib/vitrine.ts
export const BONIMENT_MARGE = 1.15;
export function appliquerBoniment(nego: NegociationState, offreJoueur: number): NegociationState;
export function ajouterAuPanier(
  ev: ClientEvent, ajout: ObjetEnVitrine, nego: NegociationState,
  tendances: readonly Tendance[], modifiers: VitrineModifiers, brocante?: Brocante,
): { ev: ClientEvent; nego: NegociationState };
```
- `NegociationSheet` props += `boniment?: { restantes: number; onJouer: () => void }`, `lotGarni?: { restantes: number; onOuvrir: () => void }`.

- [ ] **Step 1: Tests qui échouent** — `src/lib/vitrine.test.ts` :

```ts
describe("appliquerBoniment (Le Boniment)", () => {
  const nego: NegociationState = { mode: "vente", tour: 2, humeur: 0.4, prixAdverseCourant: 90, cibleSecrete: 100, derniereOffreJoueur: null, statut: "en_cours", message: "" };
  it("conclut si l'offre ≤ 115 % du prix max", () => {
    const r = appliquerBoniment(nego, 115);
    expect(r.statut).toBe("conclu");
    expect(r.prixAdverseCourant).toBe(115); // le montant conclu = l'offre du joueur
  });
  it("sinon le client abat sa meilleure contre-offre (son plafond)", () => {
    const r = appliquerBoniment(nego, 116);
    expect(r.statut).toBe("en_cours");
    expect(r.prixAdverseCourant).toBe(100); // = cibleSecrete
  });
  it("ne s'applique qu'à une négo de vente en cours", () => {
    expect(appliquerBoniment({ ...nego, statut: "fache" }, 100)).toEqual({ ...nego, statut: "fache" });
  });
});

describe("ajouterAuPanier (Le Lot garni)", () => {
  it("ajoute l'objet, recalcule prixDemande/prixMax et remet la cible de négo à l'échelle", () => {
    // Construire via les fixtures du fichier : un ClientEvent mono-objet (genererClientEvent mocké Math.random
    // ou fabrique directe), un 2e ObjetEnVitrine prixVente 50.
    const { ev: ev2, nego: nego2 } = ajouterAuPanier(ev1, objet2, nego1, [], DEFAULT_MODIFIERS);
    expect(ev2.panier).toHaveLength(2);
    expect(ev2.prixDemande).toBe(ev1.prixDemande + 50);
    expect(ev2.prixMax).toBeGreaterThan(ev1.prixMax);        // le panier vaut plus
    expect(nego2.cibleSecrete).toBe(ev2.prixMax);
    // prixAdverseCourant remis à l'échelle proportionnellement
    expect(nego2.prixAdverseCourant).toBe(Math.round(nego1.prixAdverseCourant * ev2.prixMax / ev1.prixMax));
    expect(nego2.statut).toBe("en_cours");
  });
});
```

(⚠ `calculerPrixMax` tire un facteur aléatoire — mocker `Math.random` (`vi.spyOn`) pour rendre `prixMax` déterministe dans ce test, comme les tests voisins de `genererClientEvent`.)

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter** dans `vitrine.ts` :

Exporter `calculerPrixMax` (mot-clé `export` sur la fonction existante, aucune modification de corps).

```ts
/** Le Boniment : closing — le client accepte jusqu'à 115 % de son plafond, sinon il abat son plafond. */
export const BONIMENT_MARGE = 1.15;

export function appliquerBoniment(nego: NegociationState, offreJoueur: number): NegociationState {
  if (nego.mode !== "vente" || nego.statut !== "en_cours") return nego;
  if (offreJoueur <= Math.round(nego.cibleSecrete * BONIMENT_MARGE)) {
    return { ...nego, statut: "conclu", prixAdverseCourant: offreJoueur, humeur: Math.min(nego.humeur, 0.3), message: "« Marché conclu ! Vous savez y faire… »" };
  }
  return { ...nego, prixAdverseCourant: nego.cibleSecrete, message: "« Voilà mon dernier mot : c'est ça ou rien. »" };
}

/** Le Lot garni : ajoute un 2e objet au panier en pleine négociation et remet la négo à l'échelle. */
export function ajouterAuPanier(
  ev: ClientEvent,
  ajout: ObjetEnVitrine,
  nego: NegociationState,
  tendances: readonly Tendance[],
  modifiers: VitrineModifiers,
  brocante?: Brocante,
): { ev: ClientEvent; nego: NegociationState } {
  const panier = [...ev.panier, ajout];
  const prixMax = calculerPrixMax(panier, ev.persona, tendances, modifiers, brocante);
  const evNext: ClientEvent = { ...ev, panier, prixDemande: ev.prixDemande + ajout.prixVente, prixMax };
  const negoNext: NegociationState = {
    ...nego,
    cibleSecrete: prixMax,
    prixAdverseCourant: Math.max(1, Math.round(nego.prixAdverseCourant * (prixMax / Math.max(1, ev.prixMax)))),
    message: "« Hmm, les deux ensemble ? Faites-moi un prix… »",
  };
  return { ev: evNext, nego: negoNext };
}
```

(⚠ Vérifier le nom réel du champ persona sur `ClientEvent` — l'explorateur indique `ev.persona` de type `ClientPersonnage` ; `calculerPrixMax` prend bien ce type. Si le champ s'appelle autrement, adapter.)

- [ ] **Step 4: UI vente.**

`NegociationSheet.tsx` — dans la zone des contrôles de négo en cours (près du slider/bouton proposer), quand les props sont fournies :

```tsx
{lotGarni && lotGarni.restantes > 0 && (
  <button style={btnActive} onClick={lotGarni.onOuvrir}>🧺 Lot garni ({lotGarni.restantes})</button>
)}
{boniment && boniment.restantes > 0 && (
  <button style={btnActive} onClick={boniment.onJouer}>🎩 Le Boniment ({boniment.restantes})</button>
)}
```

`ClientPage.tsx` (journée) :
- Boniment : `onJouer` = `if (!utiliserActive("boniment")) return;` puis appliquer `appliquerBoniment(negoCourante, offreJoueurCourante)` par le même canal que `onProposerOffre` (le sheet connaît `localNego` et l'offre du slider → la voie simple : la prop devient `onJouer: (nego, offre) => NegociationState`, symétrique d'`onProposerOffre`, et le sheet fait `setLocalNego(boniment.onJouer(localNego, offreJoueur))` + `onUpdateNego`). Si le boniment conclut, le flux existant de conclusion (`statut === "conclu"` → vente) s'applique tel quel.
- Lot garni : `onOuvrir` ouvre un mini-picker (overlay simple dans ClientPage, liste des `state.vitrine.objets` dont l'objet n'est pas déjà dans `clientActuel.panier`, bouton par ligne). À la sélection : `if (!utiliserActive("lotGarni")) return;` puis `const { ev, nego } = ajouterAuPanier(clientActuel, choix, negoCourante, state.tendances, modifiersRef.current ?? DEFAULT_MODIFIERS, brocante);` → `setClientActuel(ev)` + propagation de `nego` au sheet (même canal `onUpdateNego`/state que le boniment) + mise à jour de `echelleMax` (elle dérive de `clientActuel.prixDemande` — vérifier que la prop du sheet est bien recalculée depuis le `ev` mis à jour). Gate d'ouverture : `activeDebloquee(state, "lotGarni")` ET `clientActuel.panier.length < 2` ET au moins 1 objet ajoutable.
- À la vente conclue, vérifier que le flux de conclusion vend TOUT le panier (il gère déjà les paniers de 2 générés par `chanceMulti` — aucun changement attendu, juste vérifier).

- [ ] **Step 5: GREEN + suite + tsc.**
- [ ] **Step 6: Commit** — `git commit -m "feat(niveau): actives de vente — Le Lot garni (N7) et Le Boniment (N13)"`

---

### Task 8: Active de vente — 📣 La Criée (N17)

**Files:**
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (compteur criée dans la boucle de tick)
- Test: vérification comportementale ciblée (voir Step 3)

**Interfaces:**
- Consumes: `utiliserActive`, `activeDebloquee`, `usagesRestants`, boucle de tick existante (`prochainClient`, spawn ~317-368).
- Produces: `const CRIEE_NB_CLIENTS = 3;` et `const CRIEE_INTERVALLE_SEC = 1;` exportés du fichier ou d'un module partagé si testé.

- [ ] **Step 1: Implémenter.** Dans ClientPage (journée) :

```ts
const crieeRestantsRef = useRef(0);
const jouerCriee = () => {
  if (!utiliserActive("criee")) return;
  crieeRestantsRef.current = CRIEE_NB_CLIENTS;
  setProchainClient(0.1); // déclenche le spawn au prochain tick, sans attendre l'intervalle
};
```

Dans le bloc de spawn (quand `prochainClient` atteint ≤ 0) : après avoir posé `clientActuel`, le ré-armement devient :

```ts
if (crieeRestantsRef.current > 0) {
  crieeRestantsRef.current -= 1;
  setProchainClient(CRIEE_INTERVALLE_SEC); // fixe : ignore l'intervalle ET le multiplicateur météo
} else {
  setProchainClient(prochainIntervalleClient(mods?.intervalleMultiplier ?? 1));
}
```

(Le tick est déjà en pause tant qu'un client est présent — les 3 clients de la Criée arrivent donc « coup sur coup » : ~1 s après chaque résolution, ce qui est l'esprit du design. Décrémenter au spawn, pas à l'activation.)

Bouton dans la barre d'état de la journée (près du temps restant / à côté des contrôles existants) : `📣 La Criée ({restantes})`, visible si `activeDebloquee(state, "criee")`, désactivé si 0 restant, si un client est présent, ou si `tempsRestant < CRIEE_INTERVALLE_SEC * CRIEE_NB_CLIENTS` (inutile en toute fin de journée).

- [ ] **Step 2: tsc + suite.**
- [ ] **Step 3: Vérification ciblée** — pas de test unitaire raisonnable sur la boucle de tick React : vérifier via un test RTL minimal si le fichier en a déjà (sinon, consigner au rapport que la vérification est E2E en Task 10, point 4).
- [ ] **Step 4: Commit** — `git commit -m "feat(niveau): active de vente — La Criée (N17), 3 clients immédiats hors météo"`

---

### Task 9: Hygiène valeur + finitions de la revue finale du plan 2

**Files:**
- Create: `src/lib/prixSuggere.ts` (+ test `src/lib/prixSuggere.test.ts`)
- Modify: `src/app/vitrine/prep/page.tsx`, `src/app/vitrine/[brocanteId]/ClientPage.tsx` (seed du prix)
- Modify: `src/components/mobile/DonationPickerSheet.tsx` + ses appelants
- Modify: `src/app/collection/grille/page.tsx`, `src/app/stockage/gerer/page.tsx` (masquage valeur)
- Modify: `src/app/bibliotheque/page.tsx` (bannière Verrouillée)
- Modify: `src/context/GameContext.tsx` (ordre des raisons), `src/lib/migrations.ts` (fallback totalXP), `src/lib/competences.ts` (docstring)
- Test: `src/lib/vitrine.test.ts` (formule toleranceBoost), `src/lib/migrations.test.ts` (v9 malformée + non-mutation)

**Interfaces:**
- Produces: `export const SUGGESTION_MARGE_ACHAT = 1.5;` et `export function prixSuggere(objet: Pick<Objet, "prixReferenceReel" | "prixAchat" | "prixVenteSouhaite">, marcheConnu: boolean, facteurRef: number): number` (`src/lib/prixSuggere.ts`).

- [ ] **Step 1: `prixSuggere` (TDD).** Test :

```ts
describe("prixSuggere", () => {
  const obj = { prixReferenceReel: 200, prixAchat: 60, prixVenteSouhaite: undefined };
  it("marché connu : ancré sur la référence × facteur", () => {
    expect(prixSuggere(obj, true, 1)).toBe(200);
    expect(prixSuggere(obj, true, 1.4)).toBe(280);
  });
  it("marché inconnu : ancré sur le prix d'achat × 1.5, arrondi à la dizaine — la référence ne fuit pas", () => {
    expect(prixSuggere(obj, false, 1)).toBe(90);
    expect(prixSuggere(obj, false, 1.4)).toBe(90); // le facteur ref ne s'applique qu'au marché connu
  });
  it("marché inconnu sans prix d'achat : référence grossièrement arrondie à la dizaine", () => {
    expect(prixSuggere({ ...obj, prixAchat: undefined }, false, 1)).toBe(200); // 200 déjà rond
    expect(prixSuggere({ prixReferenceReel: 187, prixAchat: undefined }, false, 1)).toBe(190);
  });
  it("prixVenteSouhaite prime toujours", () => {
    expect(prixSuggere({ ...obj, prixVenteSouhaite: 42 }, false, 1)).toBe(42);
  });
});
```

Implémentation (`src/lib/prixSuggere.ts`) :

```ts
import type { Objet } from "@/types/game";

/** Marge par défaut sur le prix d'achat quand la valeur de marché n'est pas connue (Connaisseur 2 absent). */
export const SUGGESTION_MARGE_ACHAT = 1.5;

const dizaine = (n: number) => Math.max(1, Math.round(n / 10) * 10);

export function prixSuggere(
  objet: Pick<Objet, "prixReferenceReel" | "prixAchat" | "prixVenteSouhaite">,
  marcheConnu: boolean,
  facteurRef: number,
): number {
  if (objet.prixVenteSouhaite != null) return objet.prixVenteSouhaite;
  if (marcheConnu) return Math.max(1, Math.round(objet.prixReferenceReel * facteurRef));
  if (objet.prixAchat != null) return dizaine(objet.prixAchat * SUGGESTION_MARGE_ACHAT);
  return dizaine(objet.prixReferenceReel); // la dizaine floute la valeur exacte
}
```

Brancher les deux `handleAjouter` : `prixSuggere(obj, categoriesConnuesVitrine.has(obj.categorie), SUGGESTION_FACTEUR)` (les Sets `categoriesConnuesVitrine` existent déjà dans les deux pages). Supprimer les seeds `prixReferenceReel * SUGGESTION_FACTEUR` directs.

- [ ] **Step 2: Surfaces secondaires.**
- `DonationPickerSheet.tsx` : prop `categoriesConnues: ReadonlySet<CategorieObjet>` ; la ligne meta devient `{o.etat} · {o.rarete}` + ` · {Math.round(o.prixReferenceReel)} €` seulement si `categoriesConnues.has(o.categorie)`. Mettre à jour tous les appelants (`grep -rn "DonationPickerSheet" src/app`) avec le Set du pattern existant.
- `collection/grille/page.tsx` : dans le texte de confirmation ET le toast, afficher le montant seulement si `aConnaisseurVitrine(state, objetADonner.categorie)` ; sinon « … rejoindra la collection. » et toast « Donné à la collection. » (la valeur créditée, elle, ne change pas).
- `stockage/gerer/page.tsx` `ConfirmReplaceModal` : passer `valeur: categoriesConnuesVitrine.has(askReplace.objet.categorie) ? askReplace.objet.prixReferenceReel : null` et faire afficher `?` pour `null` dans le modal (adapter le type de la prop `valeur: number | null`).

- [ ] **Step 3: Bannière « Verrouillée » honnête** (`bibliotheque/page.tsx`, `PalierDetail`) — remplacer le texte fixe par la cause réelle, dans l'ordre d'`etatCompetence` :

```tsx
⊘ Verrouillée — {
  !prerequisRemplis ? "palier précédent requis"
  : niveauActuel < comp.niveauBrocanteurRequis ? `N${comp.niveauBrocanteurRequis} requis (vous avez N${niveauActuel})`
  : affiniteRequise > 0 && affiniteActuelle < affiniteRequise ? `affinité ${affiniteCategorie} ${affiniteActuelle}/${affiniteRequise}`
  : "pas assez de points"
}
```

(`prerequisRemplis` = `comp.prerequis.every((p) => competencesDebloquees.includes(p))` — passer `competencesDebloquees` en prop si absent ; `affiniteActuelle`/`affiniteRequise` sont déjà calculés dans le composant.)

- [ ] **Step 4: Ordre des raisons `debloquerCompetence`** (`GameContext.tsx`) — dans la branche `verrouillee`, déplacer le check prérequis EN PREMIER (avant niveau/affinité/points), pour aligner sur `etatCompetence` :

```ts
if (!comp.prerequis.every((p) => current.competencesDebloquees.includes(p)))
  return { ok: false, raison: "Prérequis non remplis." };
```

(et le fallback final devient `"Conditions non remplies."`). Adapter le test de régression Task 3 plan 2 s'il pinne un message.

- [ ] **Step 5: Migration durcie + tests.** `migrations.ts`, bloc `brocanteur` : le fallback `totalXP` ne doit plus dépendre de `bienForme` entier mais de la validité de `xp` seule :

```ts
const xpValide = b && Number.isFinite(b.xp) && b.xp >= 0;
const totalXP = xpValide ? b!.xp : Object.values(loaded.competenceTrees ?? {}).reduce(...);
```

Tests (`migrations.test.ts`) :

```ts
it("v9 malformée (pointsDisponibles NaN) : l'XP valide est préservée", () => {
  const save = { ...migrerSauvegarde(fabriqueSaveV7()), brocanteur: { xp: 1100, niveau: 5, pointsDisponibles: NaN } };
  const m = migrerSauvegarde(save);
  expect(m.brocanteur.xp).toBe(1100);
  expect(m.brocanteur.niveau).toBe(5);
});
it("la migration ne mute pas son argument", () => {
  const save = fabriqueSaveV7();
  const copie = structuredClone(save);
  migrerSauvegarde(save);
  expect(save).toEqual(copie);
});
```

- [ ] **Step 6: Test de la formule `toleranceBoost` à la génération** (`vitrine.test.ts`) — appeler `genererClientEvent` (Math.random mocké, panier multi-catégories) avec `modifiers.bonusToleranceNego = 0.2` et `bonusToleranceParCategorie = Map{Musique: 0.1, Mode: 0.3}` sur un panier Musique+Mode → `ev.toleranceBoost` = `0.2 + 0.3` (additif général + MAX catégoriel, pas la somme des catégories).

- [ ] **Step 7: Docstring** `aMaitreReparer` : `/** Réparer palier 3 (Maître) : accès au Pristin et durées de restauration réduites de 40 %. */`

- [ ] **Step 8: GREEN + suite + tsc.**
- [ ] **Step 9: Commit** — `git commit -m "fix(niveau): hygiène valeur (prix suggéré, surfaces secondaires, bannière), migration durcie et tests manquants"`

---

### Task 10: Vérification de bout en bout

- [ ] **Step 1:** `npx vitest run` → 0 échec ; `npx tsc --noEmit` → 0 erreur.
- [ ] **Step 2: Parcours réel** (dev server + Playwright, viewport 375×812, seeding localStorage comme au plan 2 Task 9) :
  1. **Double gate** : save N3 avec conditions éco T2 remplies → brocante T2 verrouillée, condition « Niveau 4 (vous : N3) » affichée dans le panorama ; passer à N4 (seed) → déverrouillée.
  2. **Énergie** : save N8 → l'en-tête affiche « x/6 » ; N14 → « x/7 » ; régén jusqu'à 6/7 OK (seed `energieDerniereMaj` ancien).
  3. **Négociation réelle rebranchée** : save avec Verbe d'or (`general.negociation.2` + prérequis), négo de vente réelle via la sheet : contre-offre à ~25 % au-dessus → pas de départ fâché (c'était mort avant la Task 4). Diplomate : sur un fâché, le plafond est lâché 1 fois, compteur persistant après reload.
  4. **Actives** : save N17+ → en chinage : Flair révèle les cotes de l'étal (compteur 1→0), Fouille remplace un objet (3 usages), Tchatche relance une négo fâchée ; en vente : Lot garni ajoute un 2ᵉ objet (prix demandé recalculé), Boniment conclut à ≤115 % du plafond, Criée fait défiler 3 clients sous l'orage. Chaque bouton disparaît/se désactive à quota épuisé et réapparaît le jour suivant.
  5. **Hygiène** : sans Connaisseur 2, ajout en vitrine d'un objet acheté 60 € → prix suggéré 90 € (pas la référence) ; DonationPicker sans « X € » ; bannière compétence verrouillée par affinité → texte « affinité … », plus jamais « N0 requis ».
  6. 0 pageerror sur tout le parcours.
- [ ] **Step 3: Ledger + commit final éventuel.**

---

## Notes pour l'exécuteur

- **Ordre imposé** : Task 3 avant 4-8 (infra) ; Task 4 avant 7 (le sheet doit déjà être câblé sur `onProposerOffre`). Tasks 1, 2, 9 sont indépendantes.
- La découverte « `proposerOffreVente` mort » (Task 4) doit être re-vérifiée par grep avant d'agir — si l'état du code a changé, remonter au contrôleur au lieu d'improviser.
- `competenceTrees` reste gelé ; aucune retouche aux migrations v8/v9 hors Task 9 Step 5.
- Les boutons d'actives sont volontairement minimaux (style des boutons voisins) — la vraie UI (barre d'XP persistante, écran de level-up, previews depuis `DEBLOCAGES_PAR_NIVEAU`) est le plan 4.
- Suites : plan 4 (UI complète + suppression `competenceTrees`/migration v10 + onboarding), passe d'équilibrage séparée (simulateur : courbe niveau/jour, impact énergie N8/N14, farm de rares via la Fouille).
