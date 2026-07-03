# Niveau de Brocanteur — Plan 2/4 : compétences sur pool global + rebranchement des effets morts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les 96 compétences se paient désormais avec les points du Niveau de Brocanteur (gating : prérequis + affinité 20/50 + niveau Brocanteur N5/N12), les arbres perdent leurs XP/niveaux propres, et les 6 effets morts ou bypassés identifiés par l'audit sont rebranchés (colère de négociation, valeur re-gatée, Influence, Passion perce-bourse, libellés Réparer).

**Architecture:** Prérequis : plan 1 mergé (branche `feat/niveau-brocanteur`, champs `brocanteur`/`affinites`, SAVE_VERSION 8). Le gating passe de « niveau d'arbre » à un contexte global (`etatCompetence` v2). La dépense de points passe de `competenceTrees[treeId].pointsDisponibles` à `brocanteur.pointsDisponibles`. Les crédits d'XP d'arbres sont supprimés (fin de la double écriture) ; `competenceTrees` reste dans le state mais gelé (suppression au plan 4 avec la refonte UI). Migration v9 : refund du pool global = niveau + 2×chapitres livrés − points déjà dépensés (clampé ≥ 0), compétences débloquées conservées (IDs stables). UI minimale pour rester cohérent (l'écran Compétences affiche le pool global et les nouvelles conditions) — la refonte complète de l'UI reste au plan 4.

**Tech Stack:** identique plan 1 (React Context, TypeScript, vitest, localStorage + migrations).

**Référence design :** rapport « Refonte du système de niveau » §03 (correctifs 1-6), §04, §06 (couche 2) ; décisions D2/D4 validées.

## Global Constraints

- Valeurs d'équilibrage = constantes nommées exportées. Nommage français.
- Gating des paliers (rapport, validé) : palier 1 → 1 pt, aucune autre condition ; palier 2 → 2 pts + palier 1 + **affinité ≥ 20** (arbres thématiques) ou **Brocanteur N5** (arbre général) ; palier 3 → 3 pts + palier 2 + **affinité ≥ 50 + Brocanteur N12** (thématiques) ou **Brocanteur N12** (général).
- Bonus de tolérance de négociation (remplace le « seuil de colère » mort) : Verbe haut +20 %, Verbe d'or +40 % (le plus haut écrase) ; catégoriels +10/20/30 % ; cumulatifs général + catégorie.
- Les IDs de compétences (`cat.Musique.reparer.1`…) ne changent JAMAIS (sinon `migrations.ts` reset les acquis).
- `SAVE_VERSION` 8 → **9** ; migration pure et idempotente.
- Chaque tâche : `npx tsc --noEmit` 0 erreur ; suite `npx vitest run` verte avant commit ; commits `feat(niveau):` / `fix(niveau):`.

---

### Task 1: Données de compétences — nouveaux champs de gating + libellés corrigés

**Files:**
- Modify: `src/types/game.ts` (`PalierDef` ligne ~301, `CompetenceDef` ligne ~288)
- Modify: `src/data/competences.ts` (`PALIER_DEFAULTS` ligne 36, `definirPaliers`, `expandTree` ligne 254, libellés)
- Test: `src/data/competences.test.ts` (créer)

**Interfaces:**
- Consumes: rien.
- Produces: `PalierDef`/`CompetenceDef` avec `niveauBrocanteurRequis: number` et `affiniteRequise: number` (remplacent `niveauArbreRequis`/`niveauRequis`) ; constantes exportées `AFFINITE_PALIER_2 = 20`, `AFFINITE_PALIER_3 = 50`, `NIVEAU_BROCANTEUR_PALIER_2_GENERAL = 5`, `NIVEAU_BROCANTEUR_PALIER_3 = 12` (dans `src/data/competences.ts`).

- [ ] **Step 1: Tests qui échouent** — créer `src/data/competences.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  AFFINITE_PALIER_2,
  AFFINITE_PALIER_3,
  COMPETENCES,
  NIVEAU_BROCANTEUR_PALIER_2_GENERAL,
  NIVEAU_BROCANTEUR_PALIER_3,
  TREE_GENERAL,
} from "./competences";

describe("gating des paliers (pool global)", () => {
  it("96 compétences, IDs stables", () => {
    expect(COMPETENCES).toHaveLength(96);
    expect(COMPETENCES.some((c) => c.id === "cat.Musique.reparer.1")).toBe(true);
  });

  it("paliers thématiques : affinité 0/20/50, Brocanteur 0/0/12", () => {
    const musique = COMPETENCES.filter((c) => c.treeId === "cat.Musique");
    for (const c of musique) {
      const attendu = [
        { affiniteRequise: 0, niveauBrocanteurRequis: 0, coutPoints: 1 },
        { affiniteRequise: AFFINITE_PALIER_2, niveauBrocanteurRequis: 0, coutPoints: 2 },
        { affiniteRequise: AFFINITE_PALIER_3, niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_3, coutPoints: 3 },
      ][c.palierNumero - 1];
      expect({ affiniteRequise: c.affiniteRequise, niveauBrocanteurRequis: c.niveauBrocanteurRequis, coutPoints: c.coutPoints }).toEqual(attendu);
    }
  });

  it("paliers du général : affinité 0 partout, Brocanteur 0/5/12", () => {
    const general = COMPETENCES.filter((c) => c.treeId === TREE_GENERAL);
    expect(general).toHaveLength(12);
    for (const c of general) {
      expect(c.affiniteRequise).toBe(0);
      expect(c.niveauBrocanteurRequis).toBe(
        [0, NIVEAU_BROCANTEUR_PALIER_2_GENERAL, NIVEAU_BROCANTEUR_PALIER_3][c.palierNumero - 1],
      );
    }
  });

  it("prérequis en chaîne conservés", () => {
    const c = COMPETENCES.find((x) => x.id === "cat.Mode.passion.3")!;
    expect(c.prerequis).toEqual(["cat.Mode.passion.2"]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/data/competences.test.ts` → FAIL (constantes inexistantes).

- [ ] **Step 3: Implémenter.**

`src/types/game.ts` — `PalierDef` et `CompetenceDef` : supprimer `niveauArbreRequis`/`niveauRequis`, ajouter :

```ts
  /** Niveau de Brocanteur minimal pour acheter ce palier. */
  niveauBrocanteurRequis: number;
  /** Transactions (achats + ventes) requises dans la catégorie de l'arbre. 0 pour l'arbre général. */
  affiniteRequise: number;
```

`src/data/competences.ts` :

```ts
export const AFFINITE_PALIER_2 = 20;
export const AFFINITE_PALIER_3 = 50;
export const NIVEAU_BROCANTEUR_PALIER_2_GENERAL = 5;
export const NIVEAU_BROCANTEUR_PALIER_3 = 12;

/** Coût, niveau de Brocanteur et affinité par défaut pour les paliers 1/2/3 (arbres thématiques). */
const PALIER_DEFAULTS = [
  { coutPoints: 1, niveauBrocanteurRequis: 0, affiniteRequise: 0 },
  { coutPoints: 2, niveauBrocanteurRequis: 0, affiniteRequise: AFFINITE_PALIER_2 },
  { coutPoints: 3, niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_3, affiniteRequise: AFFINITE_PALIER_3 },
] as const;
```

`definirPaliers` : remplacer les fallbacks `coutPoints`/`niveauArbreRequis` par `coutPoints`/`niveauBrocanteurRequis`/`affiniteRequise` (mêmes `?? PALIER_DEFAULTS[i]?...` patterns).

`expandTree` : l'arbre général n'a pas d'affinité et a ses propres seuils de niveau —

```ts
function expandTree(tree: CompetenceTreeDef): CompetenceDef[] {
  const estGeneral = tree.type === "general";
  return tree.branches.flatMap((b) =>
    b.paliers.map((p) => ({
      id: `${tree.id}.${b.id}.${p.numero}`,
      treeId: tree.id,
      brancheId: b.id,
      palierNumero: p.numero,
      nom: p.nom,
      description: p.description,
      coutPoints: p.coutPoints,
      niveauBrocanteurRequis: estGeneral
        ? [0, NIVEAU_BROCANTEUR_PALIER_2_GENERAL, NIVEAU_BROCANTEUR_PALIER_3][p.numero - 1] ?? 0
        : p.niveauBrocanteurRequis,
      affiniteRequise: estGeneral ? 0 : p.affiniteRequise,
      prerequis: p.numero === 1 ? [] : [`${tree.id}.${b.id}.${p.numero - 1}`],
      placeholder: p.placeholder,
    })),
  );
}
```

Libellés à corriger dans le même commit (rapport correctifs 1 et 6) :
- Négociation 1 « Verbe haut » : `"Les clients tolèrent des contre-offres 20 % plus gourmandes avant de s'agacer."`
- Négociation 2 « Verbe d'or » : `"Les clients tolèrent des contre-offres 40 % plus gourmandes avant de s'agacer."`
- Œil aiguisé cat. 1/2/3 (`brancheOeilAiguise`) : `"Quand un client négocie un objet « ${cat} », il tolère des contre-offres +10 % plus gourmandes."` (puis `+20 %` « remplace Verbe agile », `+30 %` « remplace Verbe haut »).
- Réparer (`brancheReparer`) : remplacer « 5 jours » par `"quelques heures"` (paliers 1-2) et pour Maître : `"…élever les pièces au pristin état et réduisez toutes les durées de restauration « ${cat} » de 40 %."`

- [ ] **Step 4: tsc en cascade** — `npx tsc --noEmit` va signaler tous les lecteurs de `niveauRequis`/`niveauArbreRequis` (`lib/competences.ts` `etatCompetence`, `GameContext.debloquerCompetence`, `bibliotheque/page.tsx`, tests). **Correction minimale provisoire** pour garder le vert à la fin de CETTE tâche (les tâches 2-3-5 réécrivent ces sites) : y remplacer `comp.niveauRequis` par `comp.niveauBrocanteurRequis` et les comparaisons `tree.niveau < …` par `0 < …` est INTERDIT — à la place, remplacer temporairement la comparaison par `comp.niveauBrocanteurRequis > Number.MAX_SAFE_INTEGER` est aussi interdit. La règle : si un site ne peut pas être adapté proprement sans le redesign des tâches 2-3, adapter le MINIMUM pour compiler en conservant le comportement le plus proche (ex. dans `etatCompetence`, comparer `tree.niveau < comp.niveauBrocanteurRequis` en attendant la v2) et le signaler dans le rapport. `npx vitest run` : adapter les tests existants de `competences.test.ts` (lib) qui référencent `niveauRequis`.

- [ ] **Step 5: Vérifier** — `npx vitest run` complet vert, tsc 0.

- [ ] **Step 6: Commit** — `git add -A src && git commit -m "feat(niveau): gating des paliers par affinité + niveau Brocanteur (données) et libellés corrigés"`

---

### Task 2: `etatCompetence` v2 (contexte global)

**Files:**
- Modify: `src/lib/competences.ts` (`etatCompetence` lignes 18-32)
- Test: `src/lib/competences.test.ts`

**Interfaces:**
- Consumes: champs Task 1.
- Produces:
```ts
export interface ContexteCompetences {
  pointsDisponibles: number;                    // state.brocanteur.pointsDisponibles
  niveauBrocanteur: number;                     // state.brocanteur.niveau
  affinites: Record<CategorieObjet, number>;    // state.affinites
}
export function contexteDepuisState(state: Pick<GameState, "brocanteur" | "affinites">): ContexteCompetences;
export function etatCompetence(comp: CompetenceDef, debloquees: readonly CompetenceId[], ctx: ContexteCompetences): EtatCompetence;
export function affiniteRequisePourComp(comp: CompetenceDef): { categorie: CategorieObjet | null; requise: number };
```

- [ ] **Step 1: Tests qui échouent** — ajouter à `src/lib/competences.test.ts` (adapter les tests existants d'`etatCompetence` à la nouvelle signature dans le même commit) :

```ts
import { contexteDepuisState, etatCompetence } from "./competences";
import { getCompetence } from "@/data/competences";
import { emptyAffinites } from "@/lib/xp";

const ctx = (over: Partial<ReturnType<typeof contexteDepuisState>> = {}) => ({
  pointsDisponibles: 10,
  niveauBrocanteur: 20,
  affinites: { ...emptyAffinites(), Musique: 60 },
  ...over,
});

describe("etatCompetence v2 — pool global", () => {
  const p1 = getCompetence("cat.Musique.reparer.1")!;
  const p2 = getCompetence("cat.Musique.reparer.2")!;
  const p3 = getCompetence("cat.Musique.reparer.3")!;
  const gen3 = getCompetence("general.negociation.3")!;

  it("palier 1 : disponible avec 1 point, sans autre condition", () => {
    expect(etatCompetence(p1, [], ctx({ niveauBrocanteur: 0, affinites: emptyAffinites() }))).toBe("disponible");
    expect(etatCompetence(p1, [], ctx({ pointsDisponibles: 0, niveauBrocanteur: 0, affinites: emptyAffinites() }))).toBe("verrouillee");
  });

  it("palier 2 : exige palier 1 + affinité 20", () => {
    expect(etatCompetence(p2, [], ctx())).toBe("verrouillee"); // prérequis manquant
    expect(etatCompetence(p2, [p1.id], ctx({ affinites: { ...emptyAffinites(), Musique: 19 } }))).toBe("verrouillee");
    expect(etatCompetence(p2, [p1.id], ctx({ affinites: { ...emptyAffinites(), Musique: 20 } }))).toBe("disponible");
  });

  it("palier 3 : exige palier 2 + affinité 50 + Brocanteur N12", () => {
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ niveauBrocanteur: 11 }))).toBe("verrouillee");
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ niveauBrocanteur: 12 }))).toBe("disponible");
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ affinites: { ...emptyAffinites(), Musique: 49 } }))).toBe("verrouillee");
  });

  it("général palier 3 : Brocanteur N12, jamais d'affinité", () => {
    const base = ctx({ affinites: emptyAffinites() });
    expect(etatCompetence(gen3, ["general.negociation.1", "general.negociation.2"], { ...base, niveauBrocanteur: 12 })).toBe("disponible");
    expect(etatCompetence(gen3, ["general.negociation.1", "general.negociation.2"], { ...base, niveauBrocanteur: 11 })).toBe("verrouillee");
  });

  it("déjà débloquée prime sur tout", () => {
    expect(etatCompetence(p3, [p1.id, p2.id, p3.id], ctx({ pointsDisponibles: 0, niveauBrocanteur: 0 }))).toBe("debloquee");
  });
});
```

- [ ] **Step 2: RED** — `npx vitest run src/lib/competences.test.ts`.

- [ ] **Step 3: Implémenter** dans `src/lib/competences.ts` (remplace l'ancienne `etatCompetence`) :

```ts
import { getTreeDef } from "@/data/competences";

export interface ContexteCompetences {
  pointsDisponibles: number;
  niveauBrocanteur: number;
  affinites: Record<CategorieObjet, number>;
}

export function contexteDepuisState(
  state: Pick<GameState, "brocanteur" | "affinites">,
): ContexteCompetences {
  return {
    pointsDisponibles: state.brocanteur.pointsDisponibles,
    niveauBrocanteur: state.brocanteur.niveau,
    affinites: state.affinites,
  };
}

/** Catégorie d'affinité d'une compétence (null pour l'arbre général). */
export function affiniteRequisePourComp(
  comp: CompetenceDef,
): { categorie: CategorieObjet | null; requise: number } {
  const cat = getTreeDef(comp.treeId)?.categorie ?? null;
  return { categorie: cat, requise: cat ? comp.affiniteRequise : 0 };
}

export function etatCompetence(
  comp: CompetenceDef,
  debloquees: readonly CompetenceId[],
  ctx: ContexteCompetences,
): EtatCompetence {
  if (debloquees.includes(comp.id)) return "debloquee";
  if (!comp.prerequis.every((p) => debloquees.includes(p))) return "verrouillee";
  if (ctx.niveauBrocanteur < comp.niveauBrocanteurRequis) return "verrouillee";
  const { categorie, requise } = affiniteRequisePourComp(comp);
  if (categorie && (ctx.affinites[categorie] ?? 0) < requise) return "verrouillee";
  if (ctx.pointsDisponibles < comp.coutPoints) return "verrouillee";
  return "disponible";
}
```

Adapter les appels existants d'`etatCompetence` (bibliotheque/page.tsx passe `treeState` — remplacer par `contexteDepuisState(state)` ; retouche visuelle complète en Task 5, ici seulement la compilation et la logique).

- [ ] **Step 4: GREEN + suite** — `npx vitest run src/lib/competences.test.ts` puis `npx vitest run` ; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): etatCompetence v2 — points globaux, affinité et niveau de Brocanteur"`

---

### Task 3: Dépense sur le pool global + fin de la double écriture

**Files:**
- Modify: `src/context/GameContext.tsx` (`debloquerCompetence` ligne ~986, `gagnerXP` — suppression, interface + values)
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`, `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (helpers XP)
- Modify: `src/data/competences.ts` (suppression `XP_ACHAT_OBJET`, `XP_VENTE_OBJET`, `XP_NEGOCIATION_REUSSIE_GENERAL`)

**Interfaces:**
- Consumes: `etatCompetence` v2, `contexteDepuisState`.
- Produces: `debloquerCompetence` dépense `brocanteur.pointsDisponibles` ; l'action `gagnerXP` (arbres) N'EXISTE PLUS ; les ClientPages ne créditent plus que le Brocanteur (`gagnerXPLocal(montantBrocanteur, categorie?)` — nouvelle signature simplifiée) ; les archives de session écrivent `xpGagne: {}` (champ conservé pour les vieilles saves/replay).

- [ ] **Step 1: `debloquerCompetence` v2** — remplacer les pré-checks « arbre » par `etatCompetence` et sécuriser l'updater (re-check atomique, leçon du plan 1) :

```ts
  const debloquerCompetence = useCallback(
    (id: CompetenceId): { ok: boolean; raison?: string } => {
      const comp = getCompetence(id);
      if (!comp) return { ok: false, raison: "Compétence introuvable." };
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie en cours." };
      const etat = etatCompetence(comp, current.competencesDebloquees, contexteDepuisState(current));
      if (etat === "debloquee") return { ok: false, raison: "Déjà débloquée." };
      if (etat === "verrouillee") {
        if (current.brocanteur.niveau < comp.niveauBrocanteurRequis)
          return { ok: false, raison: `Niveau de Brocanteur ${comp.niveauBrocanteurRequis} requis.` };
        const { categorie, requise } = affiniteRequisePourComp(comp);
        if (categorie && (current.affinites[categorie] ?? 0) < requise)
          return { ok: false, raison: `Affinité ${categorie} insuffisante (${current.affinites[categorie] ?? 0}/${requise}).` };
        if (current.brocanteur.pointsDisponibles < comp.coutPoints)
          return { ok: false, raison: "Pas assez de points." };
        return { ok: false, raison: "Prérequis non remplis." };
      }
      setState((prev) => {
        if (!prev) return prev;
        if (prev.competencesDebloquees.includes(id)) return prev;
        if (prev.brocanteur.pointsDisponibles < comp.coutPoints) return prev;
        return {
          ...prev,
          brocanteur: {
            ...prev.brocanteur,
            pointsDisponibles: prev.brocanteur.pointsDisponibles - comp.coutPoints,
          },
          competencesDebloquees: [...prev.competencesDebloquees, id],
        };
      });
      return { ok: true };
    },
    [],
  );
```

Imports : `etatCompetence`, `contexteDepuisState`, `affiniteRequisePourComp` depuis `@/lib/competences`.

- [ ] **Step 2: Supprimer `gagnerXP`** (action arbres) du GameContext : la fonction, sa ligne d'interface, ses 2 expositions. `appliquerGainXP`/`emptyTreeState` restent importés uniquement si encore utilisés (sinon purger les imports).

- [ ] **Step 3: ClientPages** — simplifier les helpers : supprimer `xpSession` (par arbre) et l'appel `gagnerXP` ; nouvelle forme dans les DEUX pages :

```ts
  const [xpBrocanteurSession, setXpBrocanteurSession] = useState(0);
  const gagnerXPLocal = (montant: number, categorie?: CategorieObjet) => {
    gagnerXPBrocanteur(montant, categorie);
    setXpBrocanteurSession((prev) => prev + montant);
  };
```

Appels : chinage achat `gagnerXPLocal(XP_ACHAT_BROCANTEUR, it.objet.categorie)` ; chinage négo `gagnerXPLocal(XP_NEGO_BROCANTEUR)` ; vitrine vente `gagnerXPLocal(XP_VENTE_BROCANTEUR, p.objet.categorie)` ; vitrine négos ×2 `gagnerXPLocal(XP_NEGO_BROCANTEUR)` ; le juste-prix garde son appel existant. Archives : `xpGagne: {}` + `xpBrocanteur: xpBrocanteurSession` (inchangé). Purger les imports morts (`TREE_GENERAL`, `catTreeId`, `XP_ACHAT_OBJET`…) et supprimer les 3 constantes d'XP d'arbres de `src/data/competences.ts`.

- [ ] **Step 4: SessionSummary minimal** — `src/components/SessionSummary.tsx` : le panneau « expérience gagnée » titre `+{total} XP` où `total = xpBrocanteur ?? somme des valeurs de xpGagne` (compat replay des vieilles sessions) ; la liste par arbre ne s'affiche que si `xpGagne` est non vide (vieilles sessions). Vérifier les 3 sites d'appel (`chiner`, `journee`, `CahierDeCompteOverlay`) : passer `xpBrocanteur` (les props existantes portent déjà `xpGagne`).

- [ ] **Step 5: Vérifier** — `npx tsc --noEmit` 0 (chasser tous les usages restants de `gagnerXP`/`xpSession`) ; `npx vitest run` vert.
- [ ] **Step 6: Commit** — `git commit -m "feat(niveau): dépense des points sur le pool global et fin de la double écriture d'XP"`

---

### Task 4: Migration v9 — refund du pool global

**Files:**
- Modify: `src/lib/migrations.ts` (SAVE_VERSION, bloc `brocanteur`)
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consumes: `getCompetence` (coûts), `POINTS_BONUS_CHAPITRE`.
- Produces: toute save < v9 reçoit `brocanteur.pointsDisponibles = max(0, niveau + 2×chapitresPrincipauxLivrés − Σ coutPoints des compétences débloquées)` ; saves v9 intactes ; `competencesDebloquees` toujours conservées.

- [ ] **Step 1: Tests qui échouent** (à la suite des tests v8, réutiliser `fabriqueSaveV7`) :

```ts
describe("migration v9 — refund du pool global", () => {
  it("pool = niveau + 2×chapitres livrés − points dépensés, clampé à 0", () => {
    const save = fabriqueSaveV7();
    // 1100 XP d'arbres → niveau Brocanteur 5 (seuil 1100)
    save.competenceTrees = { ...save.competenceTrees, general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    // 2 paliers achetés : reparer.1 (1 pt) + reparer.2 (2 pts) = 3 pts dépensés
    save.competencesDebloquees = ["cat.Musique.reparer.1", "cat.Musique.reparer.2"];
    const migre = migrerSauvegarde(save);
    expect(migre.version).toBe(9);
    expect(migre.brocanteur.niveau).toBe(5);
    expect(migre.brocanteur.pointsDisponibles).toBe(2); // 5 + 0 − 3
    expect(migre.competencesDebloquees).toEqual(["cat.Musique.reparer.1", "cat.Musique.reparer.2"]);
  });

  it("clamp à 0 si plus dépensé que gagné", () => {
    const save = fabriqueSaveV7();
    save.competenceTrees = { ...save.competenceTrees, general: { xp: 100, niveau: 1, pointsDisponibles: 0 } }; // niveau global 1
    save.competencesDebloquees = ["cat.Musique.reparer.1", "cat.Musique.reparer.2"]; // 3 pts dépensés
    const migre = migrerSauvegarde(save);
    expect(migre.brocanteur.pointsDisponibles).toBe(0);
  });

  it("idempotence : une save v9 garde son pool", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const pool = m1.brocanteur.pointsDisponibles;
    const m2 = migrerSauvegarde(m1);
    expect(m2.brocanteur.pointsDisponibles).toBe(pool);
  });
});
```

Note : si `fabriqueSaveV7` ne pose pas de missions, `chapitresPrincipauxLivrés = 0` — le premier test le couvre. Ajouter un 4ᵉ test si la fabrique permet facilement une mission principale livrée (`missions: [{ courrierId, statut: "livree" }]` + courrier payload `categorie: "principale"`) : pool attendu +2.

- [ ] **Step 2: RED.** — `npx vitest run src/lib/migrations.test.ts`.

- [ ] **Step 3: Implémenter** — `SAVE_VERSION = 9`. Dans `appliquerMigrations`, le bloc `brocanteur` devient (en gardant la sanitation v8 de xp/niveau) :

```ts
    brocanteur: (() => {
      const dejaV9 = typeof loaded.version === "number" && loaded.version >= 9;
      const b = (loaded as Partial<GameState>).brocanteur;
      const bienForme =
        b && Number.isFinite(b.xp) && b.xp >= 0 &&
        Number.isFinite(b.niveau) && b.niveau >= 0 &&
        Number.isFinite(b.pointsDisponibles) && b.pointsDisponibles >= 0;
      if (dejaV9 && bienForme) {
        return { xp: Math.max(0, b!.xp), niveau: Math.max(0, Math.floor(b!.niveau)), pointsDisponibles: Math.max(0, Math.floor(b!.pointsDisponibles)) };
      }
      // < v9 : (re)calcul du niveau depuis l'XP (somme des arbres si absent),
      // puis refund du pool : niveaux + bonus chapitres − points déjà dépensés.
      const totalXP = bienForme
        ? b!.xp
        : Object.values(loaded.competenceTrees ?? {}).reduce(
            (acc, t) => acc + (Number.isFinite(t?.xp) && t!.xp > 0 ? t!.xp : 0),
            0,
          );
      const converti = appliquerGainXPBrocanteur(emptyBrocanteur(), totalXP);
      const chapitresLivres = missionsFinales.filter((m) => {
        if (m.statut !== "livree") return false;
        const c = courriersFinaux.find((cc) => cc.id === m.courrierId);
        return c?.payload.type === "mission" && c.payload.categorie === "principale";
      }).length;
      const pointsDepenses = competencesDebloquees.reduce(
        (acc, id) => acc + (getCompetence(id)?.coutPoints ?? 0),
        0,
      );
      return {
        ...converti,
        pointsDisponibles: Math.max(
          0,
          converti.niveau + POINTS_BONUS_CHAPITRE * chapitresLivres - pointsDepenses,
        ),
      };
    })(),
```

Imports : `getCompetence` depuis `@/data/competences`, `POINTS_BONUS_CHAPITRE` depuis `@/lib/xp`. ⚠ Utiliser les variables locales `missionsFinales`, `courriersFinaux`, `competencesDebloquees` déjà calculées dans la fonction. ⚠ Mettre à jour les tests v8 existants qui assertaient `pointsDisponibles: 0` après conversion (ils doivent maintenant attendre le refund : ex. 500 XP sans compétence débloquée → niveau 3, pool 3).

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): migration v9 — refund du pool de points global (niveau + chapitres − dépensés)"`

---

### Task 5: UI minimale de l'écran Compétences

**Files:**
- Modify: `src/app/bibliotheque/page.tsx` (en-tête lignes ~78-145, `PalierTile` ~251, `PalierDetail` ~339)
- Modify: `src/components/mobile/TreePicker.tsx` (badge/niveau)
- Modify: `src/components/mobile/TabBar.tsx` (pastille de points, ligne ~46)

**Interfaces:**
- Consumes: `state.brocanteur`, `state.affinites`, `contexteDepuisState`, `progressionNiveauBrocanteur`, `affiniteRequisePourComp`.
- Produces: écran cohérent avec les nouvelles règles — pas de refonte visuelle (plan 4), seulement les données affichées.

- [ ] **Step 1: En-tête** (`bibliotheque/page.tsx`) : remplacer `treeState.niveau`/`progressionNiveau(treeState)`/`treeState.pointsDisponibles` par le Brocanteur global : `N{state.brocanteur.niveau}`, barre `progressionNiveauBrocanteur(state.brocanteur)`, `{state.brocanteur.pointsDisponibles} Pts`. Le même en-tête pour tous les arbres (le picker ne change plus ces valeurs).
- [ ] **Step 2: Appels `etatCompetence`** : passer `contexteDepuisState(state)` partout (déjà compilable depuis Task 2 — vérifier qu'aucun `treeState` n'y transite encore).
- [ ] **Step 3: `PalierTile`** : le petit libellé `N{comp.niveauRequis}` devient `N{comp.niveauBrocanteurRequis}` (masqué si 0).
- [ ] **Step 4: `PalierDetail`** : props `niveauActuel`/`pointsDisponibles` alimentées par `state.brocanteur` ; la grille d'infos affiche « Niveau requis N{comp.niveauBrocanteurRequis} / Actuel N{brocanteur.niveau} » (ligne masquée si requis = 0), « Coût {coutPoints} pts / Dispo {pointsDisponibles} pts », et — pour les paliers thématiques 2-3 — une ligne « Affinité {categorie} : {state.affinites[categorie]}/{requise} » via `affiniteRequisePourComp(comp)` (masquée si requise = 0).
- [ ] **Step 5: `TreePicker`** : supprimer l'affichage `N{niveau}` par arbre ; à la place, afficher `{nbDebloquees}/12` (calculé par le parent : `competencesParTree(t.id).filter((c) => state.competencesDebloquees.includes(c.id)).length`). Le Badge rouge de points par arbre disparaît (les points sont globaux) — la prop correspondante est retirée.
- [ ] **Step 6: `TabBar`** : la pastille de l'onglet Compétences = `state.brocanteur.pointsDisponibles` (au lieu de la somme des arbres).
- [ ] **Step 7: Vérifier** — tsc 0, suite verte, puis smoke visuel : `npm run dev`, ouvrir `/bibliotheque`, acheter un palier 1 avec un point global, vérifier le décrément de la pastille TabBar.
- [ ] **Step 8: Commit** — `git commit -m "feat(niveau): écran Compétences sur le pool global (en-tête Brocanteur, affinités, TreePicker)"`

---

### Task 6: Correctif 1 — la négociation écoute enfin les compétences (tolérance)

**Files:**
- Modify: `src/lib/vitrine.ts` (`VitrineModifiers` 19-53, `seuilColereEffectif` 175-186 — SUPPRIMÉ, `genererClientEvent` 244-265, `proposerOffreVente` 295-322)
- Modify: `src/lib/competences.ts` (`bonusSeuilColereCategorie` → `bonusToleranceCategorie` avec nouvelles valeurs ; nouveau `bonusToleranceNegoGeneral`)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (construction des modifiers ~104-130, appels `proposerOffreVente`)
- Test: `src/lib/vitrine.test.ts`, `src/lib/competences.test.ts`

**Interfaces:**
- Consumes: getters `aGenVerbeHaut`/`aGenVerbeDOr` (inchangés).
- Produces: `VitrineModifiers.bonusToleranceNego: number` et `.bonusToleranceParCategorie: Map<CategorieObjet, number>` (remplacent `seuilColere` et `bonusSeuilColereParCategorie`) ; `ClientEvent.toleranceBoost: number` ; `proposerOffreVente(..., options: { revelationDejaFaite?: boolean; toleranceBoost?: number })` ; constantes `BONUS_TOLERANCE_VERBE_HAUT = 0.20`, `BONUS_TOLERANCE_VERBE_DOR = 0.40`, `BONUS_TOLERANCE_CATEGORIE = [0.10, 0.20, 0.30]` (lib/competences.ts).

- [ ] **Step 1: Tests qui échouent** — `src/lib/vitrine.test.ts` :

```ts
describe("proposerOffreVente — boost de tolérance (Verbe haut/d'or)", () => {
  // client avec tolerancePct connu via personaDepuisClient ; on construit une négo
  // en cours : prixAdverseCourant 100, tolérance persona 0.2 → seuil d'insulte 80.
  it("une contre-offre insultante sans boost passe avec +40 %", () => {
    const nego = { mode: "vente", tour: 1, humeur: 0, prixAdverseCourant: 100, cibleSecrete: 120, derniereOffreJoueur: null, statut: "en_cours", message: "" } as NegociationState;
    const client = fabriqueClient({ tolerancePct: 0.2, sangFroid: 1, patience: 9 }); // adapter à la fabrique/helper du fichier
    // offre à 125 : delta 25 % > 20 % → insultante sans boost
    const sans = proposerOffreVente(nego, client, 125, DEFAULT_MODIFIERS, {});
    expect(sans.statut).toBe("fache");
    // avec boost 0.4 : tolérance effective 0.28 → 125 (25 %) n'est plus insultante
    const avec = proposerOffreVente(nego, client, 125, DEFAULT_MODIFIERS, { toleranceBoost: 0.4 });
    expect(avec.statut).not.toBe("fache");
  });
});
```

(Adapter `fabriqueClient` au helper existant du fichier de test — il en existe pour `genererClientEvent`. `sangFroid: 1` réduit `chanceFin` de moitié mais pas à 0 : pour un test déterministe, mocker `Math.random` à 0.99 via `vi.spyOn(Math, "random")` pendant l'appel, ce qui garantit qu'aucune fin probabiliste ne se déclenche.)

`src/lib/competences.test.ts` : `bonusToleranceCategorie` retourne 0.10/0.20/0.30 selon le palier (remplace le test de `bonusSeuilColereCategorie`) ; `bonusToleranceNegoGeneral` retourne 0/0.20/0.40.

- [ ] **Step 2: RED.**
- [ ] **Step 3: Implémenter.**

`src/lib/competences.ts` :

```ts
export const BONUS_TOLERANCE_VERBE_HAUT = 0.20;
export const BONUS_TOLERANCE_VERBE_DOR = 0.40;
export const BONUS_TOLERANCE_CATEGORIE = [0.10, 0.20, 0.30] as const;

/** Bonus général de tolérance de négociation (Verbe d'or écrase Verbe haut). */
export function bonusToleranceNegoGeneral(state: GameState): number {
  if (aGenVerbeDOr(state)) return BONUS_TOLERANCE_VERBE_DOR;
  if (aGenVerbeHaut(state)) return BONUS_TOLERANCE_VERBE_HAUT;
  return 0;
}

/** Bonus catégoriel de tolérance (Œil aiguisé 1/2/3 — le plus haut écrase). */
export function bonusToleranceCategorie(state: GameState, cat: CategorieObjet): number {
  const t = catTreeId(cat);
  if (aCompetence(`${t}.oeil_aiguise.3`, state.competencesDebloquees)) return BONUS_TOLERANCE_CATEGORIE[2];
  if (aCompetence(`${t}.oeil_aiguise.2`, state.competencesDebloquees)) return BONUS_TOLERANCE_CATEGORIE[1];
  if (aCompetence(`${t}.oeil_aiguise.1`, state.competencesDebloquees)) return BONUS_TOLERANCE_CATEGORIE[0];
  return 0;
}
```

Supprimer `bonusSeuilColereCategorie`. `catTreeId` et `aCompetence` sont déjà là.

`src/lib/vitrine.ts` :
- `VitrineModifiers` : retirer `seuilColere` et `bonusSeuilColereParCategorie` ; ajouter `bonusToleranceNego: number` et `bonusToleranceParCategorie: Map<CategorieObjet, number>` (défauts : 0 et Map vide).
- Supprimer `seuilColereEffectif` ; dans `genererClientEvent`, la branche médiane utilise la constante existante par défaut : `prixDemande <= prixMax * SEUIL_NEGO_NORMALE` avec `export const SEUIL_NEGO_NORMALE = 1.2` (comportement de base inchangé pour tous).
- `ClientEvent` gagne `toleranceBoost: number`, calculé à la génération :

```ts
  let boostCat = 0;
  for (const it of panier) {
    const b = modifiers.bonusToleranceParCategorie.get(it.objet.categorie) ?? 0;
    if (b > boostCat) boostCat = b;
  }
  const toleranceBoost = modifiers.bonusToleranceNego + boostCat;
```

- `proposerOffreVente` : appliquer le boost au persona avant `proposerOffre` :

```ts
  const base = personaDepuisClient(client);
  const boost = options.toleranceBoost ?? 0;
  const persona = boost > 0 ? { ...base, tolerancePct: base.tolerancePct * (1 + boost) } : base;
  const next = proposerOffre(nego, persona, contreOffre);
```

`ClientPage.tsx` (vitrine) : construire `bonusToleranceNego: bonusToleranceNegoGeneral(state)` et `bonusToleranceParCategorie` (map sur CATEGORIES via `bonusToleranceCategorie`) à la place des anciens champs ; passer `ev.toleranceBoost` aux appels `proposerOffreVente`.

- [ ] **Step 4: GREEN + suite + tsc** (chasser les usages restants de `seuilColere`).
- [ ] **Step 5: Commit** — `git commit -m "fix(niveau): Verbe haut/d'or et Œil aiguisé boostent la vraie tolérance de négociation"`

---

### Task 7: Correctifs 2-3 — la valeur redevient une connaissance

**Files:**
- Modify: `src/components/vente/PrixSlider.tsx` (prop `marcheConnu`, pastille ~83)
- Modify: `src/components/vente/CoffrePricing.tsx` (prop `categoriesConnues`, passage par ligne) + TOUS ses sites d'appel (`grep -rn "CoffrePricing" src/app` — construire le Set comme `stockage/gerer/page.tsx:72-77` avec `aConnaisseurVitrine`)
- Modify: `src/app/atelier/gerer/page.tsx` (lignes ~603-617 et ~693-704)
- Modify: `src/components/mobile/chine/ChineSlide.tsx` (type `ChineSlide` ligne 74, `ChineSlideVue`) + `src/app/chiner/[brocanteId]/ClientPage.tsx` (construction des slides ~165-177)

**Interfaces:**
- Consumes: `aConnaisseurVitrine`, `aConnaisseurChinage` (getters existants — `aConnaisseurChinage` gagne enfin un appelant).
- Produces: `PrixSlider` accepte `marcheConnu?: boolean` (défaut `true`) ; `CoffrePricing` accepte `categoriesConnues: ReadonlySet<CategorieObjet>` ; le type slide item devient `{ kind: "item"; item: ObjetEnVente; estRareOuPlus: boolean; coteConnue: boolean }`.

- [ ] **Step 1: PrixSlider** — quand `marcheConnu === false` : ne pas rendre la pastille « valeur » (lignes 83-85) ni aucun texte affichant `ref` ; l'échelle reste ancrée sur `marche` en interne (compromis assumé : la géométrie ne fuit pas de valeur lisible). Défaut `true` pour ne pas casser d'autres usages.
- [ ] **Step 2: CoffrePricing** — nouvelle prop `categoriesConnues: ReadonlySet<CategorieObjet>` ; par ligne : `marcheConnu={categoriesConnues.has(ov.objet.categorie)}` ; si `!marcheConnu`, le libellé texte « valeur/marché » éventuel de la ligne affiche `?` au lieu du montant. Mettre à jour chaque site d'appel : construire `categoriesConnuesVitrine` exactement comme `stockage/gerer/page.tsx:72-77`.
- [ ] **Step 3: Atelier** — les deux `metaLigne` : si `aConnaisseurVitrine(state, o.categorie)` afficher comme aujourd'hui, sinon `"{duree} · valeur ? → ?"` (restauration — le gain reste masqué) et `"valeur ? €"` → `"valeur ?"` (démantèlement). Import du getter.
- [ ] **Step 4: Chinage (Connaisseur 3 prend vie)** — `ClientPage.tsx` : `liste.push({ kind: "item", item: it, estRareOuPlus: estRareOuPlus(it), coteConnue: aConnaisseurChinage(state, it.objet.categorie) })` (+ dépendance `state` du useMemo si absente). `ChineSlideVue` : sous la ligne prix vendeur (`prixLigne`, ~149), quand `slide.coteConnue` :

```tsx
{slide.coteConnue && (
  <div style={coteLigne}>cote {objet.prixReferenceReel} €</div>
)}
```

avec `coteLigne` : même famille mono que `prixLigne`, taille ~10, couleur `var(--brass-700)` (s'inspirer des styles voisins du fichier).
- [ ] **Step 5: Vérifier** — tsc 0, suite verte ; smoke : `/bibliotheque` → sans Connaisseur 2, l'écran de tarification n'affiche plus la pastille valeur ; débloquer `cat.X.connaisseur.2` (points de test via une save modifiée) la fait réapparaître pour X.
- [ ] **Step 6: Commit** — `git commit -m "fix(niveau): la valeur de référence est re-gatée par Connaisseur 2-3 (tarification, atelier, chinage)"`

---

### Task 8: Correctifs 4-5 + hygiène — Influence branchée, Passion perce la bourse, livrerMission blindé

**Files:**
- Modify: `src/components/mobile/GazetteSheet.tsx` (props 26-43, sections météo ~438 et célébrité ~317)
- Modify: `src/app/(panorama)/layout.tsx` (rendu GazetteSheet ~725-744)
- Modify: `src/lib/vitrine.ts` (`calculerPrixMax` ~133-173)
- Modify: `src/context/GameContext.tsx` (`livrerMission`)
- Test: `src/lib/vitrine.test.ts`

**Interfaces:**
- Consumes: `rerollMeteo`/`rerollCelebrite` (exposés par le contexte, jamais appelés jusqu'ici), `aGenInfluence`, `state.influenceUtilisee`.
- Produces: `GazetteSheetProps` += `influenceDisponible: boolean; onRerollMeteo: () => void; onRerollCelebrite: () => void;`.

- [ ] **Step 1: Test Passion perce-bourse (RED)** — `src/lib/vitrine.test.ts` : un client bourse moyenne (plafond 300) avec `appetitMin = appetitMax = 1` face à un objet de cote 400 et `bonusPassionParCategorie` à 0.30 → `prixMax` = 390 (min(400×1.3=520… attention : le bonus Passion multiplie aussi le brut) — poser les chiffres : brut = 400×1×1.3 = 520 ; plafond percé = 300×1.3 = 390 ; attendu 390. Sans passion : brut 400, plafond 300 → 300. Utiliser le helper existant du fichier pour construire persona/panier (il y en a pour `calculerPrixMax`/`genererClientEvent` — sinon tester via `genererClientEvent` avec `Math.random` mocké).
- [ ] **Step 2: Implémenter perce-bourse** — dans `calculerPrixMax`, remplacer la dernière ligne :

```ts
  const modBundle = panier.length > 1 ? 1 + BONUS_BUNDLE : 1;
  // La Passion fait craquer la tirelire : le plafond de bourse est étendu
  // du même bonus que le prix (min(brut, bourse × (1 + passion max du panier))).
  let passionMax = 0;
  for (const x of panier) {
    const b = modifiers.bonusPassionParCategorie.get(x.objet.categorie) ?? 0;
    if (b > passionMax) passionMax = b;
  }
  const plafond = Math.round(bourseDe(persona) * (1 + passionMax));
  return Math.max(1, Math.min(Math.round(brut * modBundle), plafond));
```

- [ ] **Step 3: Influence dans la Gazette** — `GazetteSheet` : 3 nouvelles props (ci-dessus). Dans la section « Météo de la semaine » (branche révélée) et « Carnet mondain » (branche révélée), ajouter un petit bouton texte `↻ Influence` (visible seulement si `influenceDisponible`), style discret cohérent avec `sectionTitle`/liens du fichier, `onClick={onRerollMeteo}` / `onRerollCelebrite`. Layout : passer `influenceDisponible={aGenInfluence(state) && !state.influenceUtilisee && state.gazetteAchetee}`, `onRerollMeteo={() => rerollMeteo()}`, `onRerollCelebrite={() => rerollCelebrite()}` (récupérer les deux actions du `useGame()` existant du layout).
- [ ] **Step 4: livrerMission blindé** — dans l'updater, avant de construire le résultat : `const resoPrev = prev.missions.find((m) => m.courrierId === courrierId); if (!resoPrev || resoPrev.statut !== "active") return prev;` (supprime le re-crédit argent+XP au double-tap extrême).
- [ ] **Step 5: GREEN + suite + tsc ; smoke Gazette** (dev : avec Influence débloquée via save modifiée, le bouton reroll change la météo du jour et disparaît).
- [ ] **Step 6: Commit** — `git commit -m "fix(niveau): Influence branchée à la Gazette, Passion perce la bourse, livrerMission idempotent"`

---

### Task 9: Vérification de bout en bout

- [ ] **Step 1:** `npx vitest run` → 0 échec ; `npx tsc --noEmit` → 0 erreur.
- [ ] **Step 2: Parcours réel** (`npm run dev`, viewport mobile) :
  1. Nouvelle partie → 1er niveau de Brocanteur → 1 point → acheter `reparer.1` d'une catégorie (palier 1, aucune condition) → OK ; tenter le palier 2 → refusé « Affinité … (n/20) ».
  2. Save v8 simulée (localStorage : `version: 8`, brocanteur `{xp: 1100, niveau: 5, pointsDisponibles: 0}`, 2 compétences débloquées coût 3 pts) → reload → pool = 2, compétences conservées, version 9.
  3. Négociation vente avec Verbe d'or (save modifiée) : pousser une contre-offre ~25 % au-dessus de l'offre client → pas de départ fâché immédiat (sans le skill, même offre → fâché fréquent).
  4. Tarification sans Connaisseur 2 : pastille valeur absente ; chinage avec Connaisseur 3 : « cote X € » visible.
  5. Gazette avec Influence : reroll météo fonctionne, 1 seule fois par édition.
- [ ] **Step 3: Ledger + commit final éventuel.**

---

## Notes pour l'exécuteur

- Les numéros de ligne datent de l'état post-plan 1 (commit 952324f) et glissent à chaque tâche : se repérer aux noms de fonctions.
- `competenceTrees` reste dans `GameState` (gelé, plus jamais crédité ni lu pour le gating). Sa suppression + celle de `CompetenceTreeState`/`emptyAllTrees`/`appliquerGainXP` est réservée au plan 4 (avec la refonte UI et une migration v10) pour limiter le rayon de souffle de ce plan.
- Suites : plan 3 (type de condition `niveau` + double gate brocantes + table de déblocages + `lib/actives.ts` + les 6 actives), plan 4 (UI complète : barre persistante, écran de level-up + son, previews, onboarding).
