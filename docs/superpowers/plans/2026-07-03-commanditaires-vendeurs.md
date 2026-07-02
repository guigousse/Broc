# Commanditaires vendeurs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les 4 commanditaires de quêtes à domaine (Le Joueur du Vide-grenier, Clara, Arianne, Paul-Henry) deviennent des vendeurs spécialistes du chinage, noms et avatars dérivés de `expediteursCourrier.ts`.

**Architecture:** Tout passe par la mécanique d'affinité existante (`AFFINITE_CATEGORIE` dans `src/lib/personas.ts`, consommée par `instancier()` dans `src/lib/chine.ts` — **aucun changement dans chine.ts**). `personas.ts` et `personaIllustrations.ts` importent `EXPEDITEURS` (source unique des noms/avatars). Spec : `docs/superpowers/specs/2026-07-03-commanditaires-vendeurs-design.md`.

**Tech Stack:** TypeScript strict, Next.js, vitest (`npm run test:run`).

## Global Constraints

- Code et commentaires en français, style existant (JSDoc `/** … */`).
- Noms et avatars référencés depuis `EXPEDITEURS` (`src/data/expediteursCourrier.ts`), jamais copiés en dur : joueur ← `jeux-video`, setdesigner ← `set-designer`, modeuse ← `mode`, esthete ← `art`.
- Affinités exactes : joueur = Jeux & Loisirs / boost 25 / cote min 0.85 ; setdesigner = Maison / 25 / 0.80 ; modeuse = Mode / 25 / 0.95 ; esthete = Objets d'art / 25 / 0.95.
- Poids `POIDS_PAR_TIER` : 0 partout pour les 4 (spawn uniquement via affinité).
- Biais d'ambiance : Geek → joueur +8 ; Mondain → esthete +6.
- Vérification : `npm run test:run` + `npx tsc --noEmit` passent à la fin de chaque tâche.

---

### Task 1: Archétypes commanditaires — types, stats, noms dérivés, affinités, illustrations

**Files:**
- Modify: `src/types/game.ts:419-429` (union `VendeurArchetypeId`)
- Modify: `src/lib/personas.ts` (stats, noms, poids, biais, affinités)
- Modify: `src/lib/personaIllustrations.ts` (4 entrées avatar par map)
- Create: `src/lib/personaIllustrations.test.ts`
- Test: `src/lib/personas.test.ts`

**Interfaces:**
- Consumes: `EXPEDITEURS` (`src/data/expediteursCourrier.ts`, `Record<string, ExpediteurDef>` avec `nom: string` et `avatar?: string`) ; structures existantes de `personas.ts` (`AFFINITE_CATEGORIE`, `NOM_VENDEUR`, `POIDS_PAR_TIER`, `BIAIS_AMBIANCE`).
- Produces: `VendeurArchetypeId` étendu (+`"joueur" | "setdesigner" | "modeuse" | "esthete"`). Aucun nouvel export — Task 2 n'utilise que le comportement de `genererSession`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/personas.test.ts`, ajouter en tête de fichier l'import :

```ts
import { EXPEDITEURS } from "@/data/expediteursCourrier";
```

puis à la fin du fichier :

```ts
describe("commanditaires vendeurs", () => {
  const CAS = [
    { arch: "joueur", expediteur: "jeux-video", cat: "Jeux & Loisirs", mauvaise: "Maison" },
    { arch: "setdesigner", expediteur: "set-designer", cat: "Maison", mauvaise: "Mode" },
    { arch: "modeuse", expediteur: "mode", cat: "Mode", mauvaise: "Jeux & Loisirs" },
    { arch: "esthete", expediteur: "art", cat: "Objets d'art", mauvaise: "Musique" },
  ] as const;

  it("les noms sont dérivés des expéditeurs de courrier", () => {
    for (const { arch, expediteur } of CAS) {
      expect(NOM_VENDEUR[arch]).toBe(EXPEDITEURS[expediteur].nom);
    }
  });

  it("getAffiniteCategorie décrit les 4 commanditaires", () => {
    expect(getAffiniteCategorie("joueur")).toEqual({ categorie: "Jeux & Loisirs", boostPoids: 25, facteurCoteMin: 0.85 });
    expect(getAffiniteCategorie("setdesigner")).toEqual({ categorie: "Maison", boostPoids: 25, facteurCoteMin: 0.80 });
    expect(getAffiniteCategorie("modeuse")).toEqual({ categorie: "Mode", boostPoids: 25, facteurCoteMin: 0.95 });
    expect(getAffiniteCategorie("esthete")).toEqual({ categorie: "Objets d'art", boostPoids: 25, facteurCoteMin: 0.95 });
  });

  it("un commanditaire ne sort jamais hors de sa catégorie", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    for (const { arch, mauvaise } of CAS) {
      for (let i = 0; i < 150; i++) {
        expect(tirerPersonaVendeur(broc, mauvaise).archetype).not.toBe(arch);
      }
    }
  });

  it("les biais Geek et Mondain ne font pas fuiter joueur/esthete hors catégorie", () => {
    const geek = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "Geek" });
    const mondain = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "Mondain" });
    for (let i = 0; i < 150; i++) {
      expect(tirerPersonaVendeur(geek, "Musique").archetype).not.toBe("joueur");
      expect(tirerPersonaVendeur(mondain, "Mode").archetype).not.toBe("esthete");
    }
  });

  it("chaque commanditaire sort régulièrement sur sa catégorie", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    for (const { arch, cat } of CAS) {
      let n = 0;
      for (let i = 0; i < 300; i++) {
        if (tirerPersonaVendeur(broc, cat).archetype === arch) n++;
      }
      // boost 25 sur 126 de poids total tier 2 (151 avec le boost) → ~16,6 % attendu ; ≥ 5 est très conservateur.
      expect(n).toBeGreaterThanOrEqual(5);
    }
  });
});
```

Créer `src/lib/personaIllustrations.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  getVendeurIllustration,
  getVendeurIllustrationFache,
} from "./personaIllustrations";
import { EXPEDITEURS } from "@/data/expediteursCourrier";

describe("illustrations des commanditaires vendeurs", () => {
  const CAS = [
    { arch: "joueur", expediteur: "jeux-video" },
    { arch: "setdesigner", expediteur: "set-designer" },
    { arch: "modeuse", expediteur: "mode" },
    { arch: "esthete", expediteur: "art" },
  ] as const;

  it("calme et fâché pointent sur l'avatar du commanditaire (pas le placeholder)", () => {
    for (const { arch, expediteur } of CAS) {
      const avatar = EXPEDITEURS[expediteur].avatar;
      expect(avatar).toBeTruthy();
      expect(getVendeurIllustration(arch)).toBe(avatar);
      expect(getVendeurIllustrationFache(arch)).toBe(avatar);
      expect(getVendeurIllustration(arch)).not.toBe("/personas/vendeur-mystere.webp");
    }
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npm run test:run -- src/lib/personas.test.ts src/lib/personaIllustrations.test.ts`
Expected: FAIL — les archétypes `joueur`/`setdesigner`/`modeuse`/`esthete` n'existent pas (erreurs TS sur `NOM_VENDEUR[arch]` et affinités undefined).

- [ ] **Step 3: Étendre `VendeurArchetypeId` dans `src/types/game.ts`**

Ajouter 4 membres à la fin de l'union existante :

```ts
export type VendeurArchetypeId =
  | "naif"
  | "grincheux"
  | "bonhomme"
  | "malin"
  | "mamie"
  | "antiquaire"
  | "pipelette"
  | "videcave"
  | "bonimenteur"
  | "disquaire"
  | "joueur"
  | "setdesigner"
  | "modeuse"
  | "esthete";
```

- [ ] **Step 4: Compléter `src/lib/personas.ts`**

4a. Ajouter l'import en tête :

```ts
import { EXPEDITEURS } from "@/data/expediteursCourrier";
```

4b. `PERSONAS_VENDEUR_BASE` — ajouter après la ligne `disquaire:` :

```ts
  joueur:      { margePct: 0.35, elanPct: 0.50, patience: 4, tolerancePct: 0.65, sangFroid: 0.75 },
  setdesigner: { margePct: 0.50, elanPct: 0.65, patience: 3, tolerancePct: 0.70, sangFroid: 0.80 },
  modeuse:     { margePct: 0.20, elanPct: 0.30, patience: 4, tolerancePct: 0.45, sangFroid: 0.85 },
  esthete:     { margePct: 0.10, elanPct: 0.30, patience: 3, tolerancePct: 0.30, sangFroid: 0.45 },
```

4c. `NOM_ARCHETYPE` — ajouter :

```ts
  joueur: "Le Joueur",
  setdesigner: "La Set Designer",
  modeuse: "La Designeuse",
  esthete: "L'Esthète",
```

4d. `NOM_VENDEUR` — ajouter (référence directe, pas de copie de chaîne) :

```ts
  // Commanditaires de quêtes — noms dérivés du courrier (source unique).
  joueur: EXPEDITEURS["jeux-video"].nom,
  setdesigner: EXPEDITEURS["set-designer"].nom,
  modeuse: EXPEDITEURS.mode.nom,
  esthete: EXPEDITEURS.art.nom,
```

4e. `POIDS_PAR_TIER` — ajouter `joueur: 0, setdesigner: 0, modeuse: 0, esthete: 0` dans chacune des 4 lignes de tiers (mêmes colonnes, après `disquaire`) :

```ts
const POIDS_PAR_TIER: Record<1 | 2 | 3 | 4, Record<VendeurArchetypeId, number>> = {
  1: { naif: 4,  bonhomme: 28, mamie: 22, malin: 8,  grincheux: 26, antiquaire: 0,  pipelette: 14, videcave: 10, bonimenteur: 6,  disquaire: 0, joueur: 0, setdesigner: 0, modeuse: 0, esthete: 0 },
  2: { naif: 1,  bonhomme: 20, mamie: 12, malin: 30, grincheux: 17, antiquaire: 20, pipelette: 8,  videcave: 8,  bonimenteur: 10, disquaire: 0, joueur: 0, setdesigner: 0, modeuse: 0, esthete: 0 },
  3: { naif: 0,  bonhomme: 8,  mamie: 4,  malin: 30, grincheux: 13, antiquaire: 45, pipelette: 3,  videcave: 3,  bonimenteur: 8,  disquaire: 0, joueur: 0, setdesigner: 0, modeuse: 0, esthete: 0 },
  4: { naif: 0,  bonhomme: 4,  mamie: 2,  malin: 24, grincheux: 10, antiquaire: 60, pipelette: 1,  videcave: 0,  bonimenteur: 4,  disquaire: 0, joueur: 0, setdesigner: 0, modeuse: 0, esthete: 0 },
};
```

4f. `BIAIS_AMBIANCE` — modifier deux lignes :

```ts
  Mondain: { antiquaire: 15, malin: 5, esthete: 6 },
  Geek: { malin: 12, joueur: 8 },
```

4g. `AFFINITE_CATEGORIE` — ajouter après la ligne `disquaire:` :

```ts
  joueur:      { categorie: "Jeux & Loisirs", boostPoids: 25, facteurCoteMin: 0.85 },
  setdesigner: { categorie: "Maison",         boostPoids: 25, facteurCoteMin: 0.80 },
  modeuse:     { categorie: "Mode",           boostPoids: 25, facteurCoteMin: 0.95 },
  esthete:     { categorie: "Objets d'art",   boostPoids: 25, facteurCoteMin: 0.95 },
```

- [ ] **Step 5: Compléter `src/lib/personaIllustrations.ts`**

5a. Ajouter l'import en tête :

```ts
import { EXPEDITEURS } from "@/data/expediteursCourrier";
```

5b. Dans `VENDEUR_ILLUSTRATION_MAP`, ajouter après `disquaire:` (l'avatar est optionnel dans `ExpediteurDef`, d'où le repli — les 4 concernés en ont un) :

```ts
  // Commanditaires de quêtes — avatar du courrier (pas encore de variante fâchée).
  joueur: EXPEDITEURS["jeux-video"].avatar ?? ILLUSTRATION_PLACEHOLDER,
  setdesigner: EXPEDITEURS["set-designer"].avatar ?? ILLUSTRATION_PLACEHOLDER,
  modeuse: EXPEDITEURS.mode.avatar ?? ILLUSTRATION_PLACEHOLDER,
  esthete: EXPEDITEURS.art.avatar ?? ILLUSTRATION_PLACEHOLDER,
```

5c. Dans `VENDEUR_ILLUSTRATION_FACHE_MAP`, ajouter les 4 mêmes lignes (sans le commentaire).

- [ ] **Step 6: Vérifier que tout passe**

Run: `npm run test:run -- src/lib/personas.test.ts src/lib/personaIllustrations.test.ts && npx tsc --noEmit`
Expected: PASS (tous les tests, 0 erreur de type).

- [ ] **Step 7: Suite complète puis commit**

Run: `npm run test:run`
Expected: PASS (aucune régression).

```bash
git add src/types/game.ts src/lib/personas.ts src/lib/personaIllustrations.ts src/lib/personas.test.ts src/lib/personaIllustrations.test.ts
git commit -m "feat(chinage): les commanditaires de quêtes chinent — 4 vendeurs spécialistes dérivés du courrier"
```

---

### Task 2: Tests d'intégration — plancher de cote et catégorie en session de chine

**Files:**
- Test: `src/lib/chine.test.ts` (aucun changement de source — `instancier()` applique déjà `facteurCoteMin` génériquement)

**Interfaces:**
- Consumes: `genererSession(taille, tendances, brocante)` (`src/lib/chine.ts`) et les 4 archétypes de la Task 1.
- Produces: rien (feuille de l'arbre).

- [ ] **Step 1: Écrire les tests**

Ajouter à la fin de `src/lib/chine.test.ts` :

```ts
describe("genererSession — commanditaires connaissent leur cote", () => {
  it("chaque commanditaire n'apparaît que sur sa catégorie, au-dessus de son plancher", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 40; s++) items.push(...genererSession(12, [], broc));
    const CAS = [
      { arch: "joueur", cat: "Jeux & Loisirs", min: 0.85 },
      { arch: "setdesigner", cat: "Maison", min: 0.8 },
      { arch: "modeuse", cat: "Mode", min: 0.95 },
      { arch: "esthete", cat: "Objets d'art", min: 0.95 },
    ] as const;
    for (const { arch, cat, min } of CAS) {
      const duSpe = items.filter((it) => it.persona.archetype === arch);
      expect(duSpe.length).toBeGreaterThan(0);
      for (const it of duSpe) {
        expect(it.objet.categorie).toBe(cat);
        // facteurCoteMin ; tolérance de 1 € pour l'arrondi.
        expect(it.prixVendeur).toBeGreaterThanOrEqual(
          Math.round(it.objet.prixReferenceReel * min) - 1,
        );
      }
    }
  });
});
```

(Contexte statistique : ~480 items, 7 catégories équilibrées à 40 communs + 12 rares → ~68 items par catégorie, dont ~16,6 % par spécialiste → ~11 items par cas. `expect(duSpe.length).toBeGreaterThan(0)` est très conservateur.)

- [ ] **Step 2: Lancer le test**

Run: `npm run test:run -- src/lib/chine.test.ts`
Expected: PASS directement — la Task 1 a fourni les archétypes et `instancier()` applique déjà l'affinité génériquement. (Si FAIL, c'est un vrai bug d'intégration à remonter, pas un test à ajuster.)

- [ ] **Step 3: Suite complète + types puis commit**

Run: `npm run test:run && npx tsc --noEmit`
Expected: PASS.

```bash
git add src/lib/chine.test.ts
git commit -m "test(chinage): les commanditaires ne bradent jamais leur catégorie en session"
```
