# Vendeurs nommés + 4 nouvelles personnalités — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner un nom fixe aux 6 vendeurs du chinage, ajouter 4 nouveaux archétypes (pipelette, videcave, bonimenteur, disquaire), une mécanique d'affinité de catégorie et la surcote du bonimenteur.

**Architecture:** Tout le modèle vit dans `src/lib/personas.ts` (stats, noms, poids, affinités) ; `src/lib/chine.ts` consomme le persona au moment d'instancier un objet (ordre inversé : persona d'abord, prix ensuite) ; `ChineNegoDrawer` affiche le nom. Spec : `docs/superpowers/specs/2026-07-03-vendeurs-nommes-design.md`.

**Tech Stack:** TypeScript strict, Next.js (App Router), vitest (`npm run test:run`).

## Global Constraints

- Code et commentaires en français, style existant (JSDoc `/** … */`).
- Les 6 archétypes existants gardent leurs stats — seuls des noms s'ajoutent.
- Noms exacts : P'tit Lucien, Dédé la Bretelle, Mamie Odette, Anatole la Combine, Père Anselme, Madame Vasseur, Tata Monique, Jeannot Vide-Cave, Oscar la Tchatche, Barnabé 33-Tours.
- Surcote bonimenteur : ×1.35. Affinité disquaire : Musique, boostPoids 25, facteurCoteMin 0.95.
- Illustrations : fallback `/personas/vendeur-mystere.webp` pour les 4 nouveaux (fichiers réels générés plus tard par Guillaume).
- Vérification : `npm run test:run` + `npx tsc --noEmit` doivent passer à la fin de chaque tâche.

---

### Task 1: Nouveaux archétypes, noms fixes, illustrations placeholder

**Files:**
- Modify: `src/types/game.ts:419-425` (union `VendeurArchetypeId`)
- Modify: `src/lib/personas.ts` (stats, noms, poids, biais d'ambiance)
- Modify: `src/lib/personaIllustrations.ts` (4 entrées placeholder par map)
- Test: `src/lib/personas.test.ts`

**Interfaces:**
- Consumes: rien (base du projet).
- Produces: `VendeurArchetypeId` étendu (+`"pipelette" | "videcave" | "bonimenteur" | "disquaire"`), `export const NOM_VENDEUR: Record<VendeurArchetypeId, string>`, `export function getNomVendeur(archetype: string): string` (fallback `"Un vendeur"`).

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/lib/personas.test.ts` (et compléter l'import en tête de fichier avec `NOM_VENDEUR`, `getNomVendeur`) :

```ts
describe("NOM_VENDEUR", () => {
  const archetypes = [
    "naif", "bonhomme", "mamie", "malin", "grincheux", "antiquaire",
    "pipelette", "videcave", "bonimenteur", "disquaire",
  ] as const;

  it("a un nom pour chacun des 10 archétypes", () => {
    for (const a of archetypes) {
      expect(NOM_VENDEUR[a]).toBeTruthy();
    }
  });

  it("tous les noms sont distincts", () => {
    const noms = new Set(Object.values(NOM_VENDEUR));
    expect(noms.size).toBe(Object.keys(NOM_VENDEUR).length);
  });

  it("les noms validés par la spec", () => {
    expect(NOM_VENDEUR.naif).toBe("P'tit Lucien");
    expect(NOM_VENDEUR.bonhomme).toBe("Dédé la Bretelle");
    expect(NOM_VENDEUR.mamie).toBe("Mamie Odette");
    expect(NOM_VENDEUR.malin).toBe("Anatole la Combine");
    expect(NOM_VENDEUR.grincheux).toBe("Père Anselme");
    expect(NOM_VENDEUR.antiquaire).toBe("Madame Vasseur");
    expect(NOM_VENDEUR.pipelette).toBe("Tata Monique");
    expect(NOM_VENDEUR.videcave).toBe("Jeannot Vide-Cave");
    expect(NOM_VENDEUR.bonimenteur).toBe("Oscar la Tchatche");
    expect(NOM_VENDEUR.disquaire).toBe("Barnabé 33-Tours");
  });
});

describe("getNomVendeur", () => {
  it("retourne le nom du personnage", () => {
    expect(getNomVendeur("grincheux")).toBe("Père Anselme");
  });

  it("retombe sur « Un vendeur » pour un archétype inconnu", () => {
    expect(getNomVendeur("inconnu")).toBe("Un vendeur");
  });
});

describe("tirerPersonaVendeur — nouveaux archétypes", () => {
  it("les nouveaux archétypes courants sortent en tier 1", () => {
    const broc = createMockBrocante({ tier: 1, etoiles: 1, ambiance: "" });
    const counts: Record<string, number> = {};
    for (let i = 0; i < 300; i++) {
      const p = tirerPersonaVendeur(broc);
      counts[p.archetype] = (counts[p.archetype] ?? 0) + 1;
    }
    // pipelette poids 14 et videcave poids 10 sur ~148 : quasi impossible de ne jamais sortir en 300 tirages.
    expect(counts.pipelette ?? 0).toBeGreaterThan(0);
    expect(counts.videcave ?? 0).toBeGreaterThan(0);
  });

  it("le disquaire ne sort jamais sans catégorie (poids 0 partout)", () => {
    for (const tier of [1, 2, 3, 4] as const) {
      const broc = createMockBrocante({ tier, etoiles: tier, ambiance: "" });
      for (let i = 0; i < 100; i++) {
        expect(tirerPersonaVendeur(broc).archetype).not.toBe("disquaire");
      }
    }
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npm run test:run -- src/lib/personas.test.ts`
Expected: FAIL — `NOM_VENDEUR` et `getNomVendeur` ne sont pas exportés.

- [ ] **Step 3: Étendre le type `VendeurArchetypeId`**

Dans `src/types/game.ts` (ligne ~419), remplacer :

```ts
export type VendeurArchetypeId =
  | "naif"
  | "grincheux"
  | "bonhomme"
  | "malin"
  | "mamie"
  | "antiquaire";
```

par :

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
  | "disquaire";
```

- [ ] **Step 4: Compléter `src/lib/personas.ts`**

4a. Ajouter les 4 stats dans `PERSONAS_VENDEUR_BASE` (après la ligne `antiquaire:`) :

```ts
  pipelette:   { margePct: 0.55, elanPct: 0.30, patience: 6, tolerancePct: 0.85, sangFroid: 0.98 },
  videcave:    { margePct: 0.70, elanPct: 0.80, patience: 2, tolerancePct: 0.85, sangFroid: 0.70 },
  bonimenteur: { margePct: 0.65, elanPct: 0.40, patience: 4, tolerancePct: 0.60, sangFroid: 0.75 },
  disquaire:   { margePct: 0.15, elanPct: 0.35, patience: 5, tolerancePct: 0.40, sangFroid: 0.90 },
```

4b. Compléter `NOM_ARCHETYPE` (rôles) :

```ts
  pipelette: "La Pipelette",
  videcave: "Le Vide-Cave",
  bonimenteur: "Le Bonimenteur",
  disquaire: "Le Disquaire",
```

4c. Ajouter après `NOM_ARCHETYPE` :

```ts
/** Nom propre fixe de chaque personnage vendeur (affiché sur la plaque de négo). */
export const NOM_VENDEUR: Record<VendeurArchetypeId, string> = {
  naif: "P'tit Lucien",
  bonhomme: "Dédé la Bretelle",
  mamie: "Mamie Odette",
  malin: "Anatole la Combine",
  grincheux: "Père Anselme",
  antiquaire: "Madame Vasseur",
  pipelette: "Tata Monique",
  videcave: "Jeannot Vide-Cave",
  bonimenteur: "Oscar la Tchatche",
  disquaire: "Barnabé 33-Tours",
};

/** Nom affichable d'un vendeur, avec repli générique si l'archétype est inconnu. */
export function getNomVendeur(archetype: string): string {
  return NOM_VENDEUR[archetype as VendeurArchetypeId] ?? "Un vendeur";
}
```

4d. Remplacer `POIDS_PAR_TIER` (les 6 colonnes existantes ne changent pas, on ajoute les 4 nouvelles) :

```ts
const POIDS_PAR_TIER: Record<1 | 2 | 3 | 4, Record<VendeurArchetypeId, number>> = {
  1: { naif: 4,  bonhomme: 28, mamie: 22, malin: 8,  grincheux: 26, antiquaire: 0,  pipelette: 14, videcave: 10, bonimenteur: 6,  disquaire: 0 },
  2: { naif: 1,  bonhomme: 20, mamie: 12, malin: 30, grincheux: 17, antiquaire: 20, pipelette: 8,  videcave: 8,  bonimenteur: 10, disquaire: 0 },
  3: { naif: 0,  bonhomme: 8,  mamie: 4,  malin: 30, grincheux: 13, antiquaire: 45, pipelette: 3,  videcave: 3,  bonimenteur: 8,  disquaire: 0 },
  4: { naif: 0,  bonhomme: 4,  mamie: 2,  malin: 24, grincheux: 10, antiquaire: 60, pipelette: 1,  videcave: 0,  bonimenteur: 4,  disquaire: 0 },
};
```

4e. Dans `BIAIS_AMBIANCE`, modifier deux lignes :

```ts
  Familial: { bonhomme: 10, mamie: 8, pipelette: 6 },
  Vinyle: { malin: 12, disquaire: 10 },
```

- [ ] **Step 5: Illustrations placeholder dans `src/lib/personaIllustrations.ts`**

Ajouter en haut du fichier (après l'import) :

```ts
/** Placeholder tant que les illustrations des nouveaux vendeurs ne sont pas générées. */
const ILLUSTRATION_PLACEHOLDER = "/personas/vendeur-mystere.webp";
```

Compléter `VENDEUR_ILLUSTRATION_MAP` :

```ts
  pipelette: ILLUSTRATION_PLACEHOLDER,
  videcave: ILLUSTRATION_PLACEHOLDER,
  bonimenteur: ILLUSTRATION_PLACEHOLDER,
  disquaire: ILLUSTRATION_PLACEHOLDER,
```

Compléter `VENDEUR_ILLUSTRATION_FACHE_MAP` avec les 4 mêmes lignes.

- [ ] **Step 6: Vérifier que tout passe**

Run: `npm run test:run -- src/lib/personas.test.ts && npx tsc --noEmit`
Expected: PASS (tous les tests, 0 erreur de type).

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/personas.ts src/lib/personaIllustrations.ts src/lib/personas.test.ts
git commit -m "feat(chinage): 4 nouveaux archétypes vendeurs + noms fixes des 10 personnages"
```

---

### Task 2: Affinité de catégorie (spawn du disquaire)

**Files:**
- Modify: `src/lib/personas.ts` (structure `AFFINITE_CATEGORIE`, signature `tirerPersonaVendeur`)
- Test: `src/lib/personas.test.ts`

**Interfaces:**
- Consumes: `VendeurArchetypeId` étendu (Task 1).
- Produces: `export interface AffiniteCategorie { categorie: CategorieObjet; boostPoids: number; facteurCoteMin: number }`, `export function getAffiniteCategorie(archetype: string): AffiniteCategorie | undefined`, `tirerPersonaVendeur(brocante: Brocante | undefined, categorie?: CategorieObjet): NegoPersona` (2e paramètre optionnel — les appels existants restent valides).

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/lib/personas.test.ts` (compléter l'import avec `getAffiniteCategorie`) :

```ts
describe("affinité de catégorie", () => {
  it("getAffiniteCategorie décrit le disquaire et rien pour les autres", () => {
    expect(getAffiniteCategorie("disquaire")).toEqual({
      categorie: "Musique",
      boostPoids: 25,
      facteurCoteMin: 0.95,
    });
    expect(getAffiniteCategorie("naif")).toBeUndefined();
    expect(getAffiniteCategorie("inconnu")).toBeUndefined();
  });

  it("le disquaire ne sort jamais sur une catégorie ≠ Musique", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    for (let i = 0; i < 200; i++) {
      const p = tirerPersonaVendeur(broc, "Maison");
      expect(p.archetype).not.toBe("disquaire");
    }
  });

  it("le disquaire sort régulièrement sur Musique", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    let disquaire = 0;
    for (let i = 0; i < 300; i++) {
      if (tirerPersonaVendeur(broc, "Musique").archetype === "disquaire") disquaire++;
    }
    // boost 25 sur ~168 de poids total tier 2 → ~15 % attendu ; ≥ 5 est très conservateur.
    expect(disquaire).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npm run test:run -- src/lib/personas.test.ts`
Expected: FAIL — `getAffiniteCategorie` n'existe pas.

- [ ] **Step 3: Implémenter l'affinité dans `src/lib/personas.ts`**

3a. Étendre l'import de types en tête de fichier :

```ts
import type { Brocante, CategorieObjet, NegoPersona, VendeurArchetypeId } from "@/types/game";
```

3b. Ajouter après `BIAIS_AMBIANCE` :

```ts
/** Spécialisation d'un archétype vendeur pour une catégorie d'objets. */
export interface AffiniteCategorie {
  categorie: CategorieObjet;
  /** Bonus additif de poids de tirage quand l'objet est de cette catégorie. */
  boostPoids: number;
  /** Plancher du facteur prix aléatoire : le spécialiste connaît la cote, il ne brade jamais. */
  facteurCoteMin: number;
}

const AFFINITE_CATEGORIE: Partial<Record<VendeurArchetypeId, AffiniteCategorie>> = {
  disquaire: { categorie: "Musique", boostPoids: 25, facteurCoteMin: 0.95 },
};

/** Affinité de catégorie d'un archétype, ou undefined s'il est généraliste. */
export function getAffiniteCategorie(archetype: string): AffiniteCategorie | undefined {
  return AFFINITE_CATEGORIE[archetype as VendeurArchetypeId];
}
```

3c. Modifier `tirerPersonaVendeur` — nouvelle signature et bloc d'affinité après le bloc `biais` :

```ts
/** Tire un persona vendeur pour un item d'une brocante donnée. */
export function tirerPersonaVendeur(
  brocante: Brocante | undefined,
  categorie?: CategorieObjet,
): NegoPersona {
  const tier = brocante?.tier ?? 1;
  const base = { ...POIDS_PAR_TIER[tier] };
  const biais = brocante ? BIAIS_AMBIANCE[brocante.ambiance] : undefined;
  if (biais) {
    for (const [arch, bonus] of Object.entries(biais) as [VendeurArchetypeId, number][]) {
      base[arch] = (base[arch] ?? 0) + bonus;
    }
  }
  if (categorie) {
    for (const [arch, aff] of Object.entries(AFFINITE_CATEGORIE) as [VendeurArchetypeId, AffiniteCategorie][]) {
      if (aff.categorie === categorie) base[arch] = (base[arch] ?? 0) + aff.boostPoids;
    }
  }
  const archetype = pickPondere(base);
  // … suite inchangée (jitter des 5 axes)
```

- [ ] **Step 4: Vérifier que tout passe**

Run: `npm run test:run -- src/lib/personas.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/personas.ts src/lib/personas.test.ts
git commit -m "feat(chinage): affinité de catégorie — le disquaire ne chine que la Musique"
```

---

### Task 3: Surcote bonimenteur + connaissance de la cote dans chine.ts

**Files:**
- Modify: `src/lib/chine.ts:60-101` (fonction `instancier`)
- Test: `src/lib/chine.test.ts`

**Interfaces:**
- Consumes: `tirerPersonaVendeur(brocante, categorie)` et `getAffiniteCategorie(archetype)` (Task 2).
- Produces: `export const SURCOTE_BONIMENTEUR = 1.35` dans `src/lib/chine.ts`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/lib/chine.test.ts` (compléter l'import depuis `./chine` avec `SURCOTE_BONIMENTEUR`) :

```ts
describe("genererSession — surcote bonimenteur", () => {
  it("SURCOTE_BONIMENTEUR vaut 1.35", () => {
    expect(SURCOTE_BONIMENTEUR).toBe(1.35);
  });

  it("les objets du bonimenteur sont surcotés (jamais de prix bradé)", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 30; s++) items.push(...genererSession(12, [], broc));
    const duBonimenteur = items.filter((it) => it.persona.archetype === "bonimenteur");
    expect(duBonimenteur.length).toBeGreaterThan(0);
    for (const it of duBonimenteur) {
      // facteur min 0.6 × surcote 1.35 = 0.81 ; tolérance de 1 € pour l'arrondi.
      expect(it.prixVendeur).toBeGreaterThanOrEqual(
        Math.round(it.objet.prixReferenceReel * 0.81) - 1,
      );
    }
  });
});

describe("genererSession — disquaire connaît la cote", () => {
  it("le disquaire n'apparaît que sur des objets Musique, jamais bradés", () => {
    const broc = createMockBrocante({ tier: 2, etoiles: 2, ambiance: "" });
    const items = [];
    for (let s = 0; s < 40; s++) items.push(...genererSession(12, [], broc));
    const duDisquaire = items.filter((it) => it.persona.archetype === "disquaire");
    expect(duDisquaire.length).toBeGreaterThan(0);
    for (const it of duDisquaire) {
      expect(it.objet.categorie).toBe("Musique");
      // facteurCoteMin 0.95 ; tolérance de 1 € pour l'arrondi.
      expect(it.prixVendeur).toBeGreaterThanOrEqual(
        Math.round(it.objet.prixReferenceReel * 0.95) - 1,
      );
    }
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npm run test:run -- src/lib/chine.test.ts`
Expected: FAIL — `SURCOTE_BONIMENTEUR` n'est pas exporté (et les items disquaire n'existent pas encore).

- [ ] **Step 3: Réordonner `instancier` dans `src/lib/chine.ts`**

3a. Compléter l'import de personas :

```ts
import {
  tirerPersonaVendeur,
  calculerPrixMinAcceptDepuisPersona,
  getAffiniteCategorie,
} from "@/lib/personas";
```

3b. Ajouter après `BONUS_SPECIALISATION` (ligne ~58) :

```ts
/** Surcote du bonimenteur : son prix affiché est gonflé, sa vraie cote est en dessous. */
export const SURCOTE_BONIMENTEUR = 1.35;
```

3c. Dans `instancier`, remplacer le bloc lignes 71-80 :

```ts
  const facteurVendeur = 0.6 + Math.random() * 0.8;
  const modTend = modificateurTendance(template.categorie, tendances);
  const modSpec =
    brocante?.specialisation === template.categorie ? BONUS_SPECIALISATION : 1;
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend * modSpec),
  );
  const persona = tirerPersonaVendeur(brocante);
  const prixMinAccept = calculerPrixMinAcceptDepuisPersona(persona, prixVendeur);
```

par (persona tiré AVANT le prix : l'affinité et la surcote en dépendent) :

```ts
  const persona = tirerPersonaVendeur(brocante, template.categorie);
  const affinite = getAffiniteCategorie(persona.archetype);
  // Un spécialiste connaît la cote de sa catégorie : il ne brade jamais.
  const facteurCoteMin =
    affinite && affinite.categorie === template.categorie
      ? affinite.facteurCoteMin
      : 0;
  const facteurVendeur = Math.max(facteurCoteMin, 0.6 + Math.random() * 0.8);
  const modTend = modificateurTendance(template.categorie, tendances);
  const modSpec =
    brocante?.specialisation === template.categorie ? BONUS_SPECIALISATION : 1;
  const surcote = persona.archetype === "bonimenteur" ? SURCOTE_BONIMENTEUR : 1;
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend * modSpec * surcote),
  );
  const prixMinAccept = calculerPrixMinAcceptDepuisPersona(persona, prixVendeur);
```

- [ ] **Step 4: Vérifier que tout passe (y compris non-régression)**

Run: `npm run test:run -- src/lib/chine.test.ts src/lib/personas.test.ts && npx tsc --noEmit`
Expected: PASS — nouveaux tests verts, anciens tests de `genererSession` inchangés.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chine.ts src/lib/chine.test.ts
git commit -m "feat(chinage): surcote bonimenteur ×1.35 + le disquaire ne brade jamais la Musique"
```

---

### Task 4: Affichage du nom sur la plaque de négo

**Files:**
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx:110`

**Interfaces:**
- Consumes: `getNomVendeur(archetype: string): string` (Task 1).
- Produces: rien (feuille de l'arbre).

- [ ] **Step 1: Brancher le nom**

Dans `ChineNegoDrawer.tsx`, ajouter l'import :

```ts
import { getNomVendeur } from "@/lib/personas";
```

et remplacer la ligne 110 :

```tsx
      <div style={namePlate}>Un vendeur</div>
```

par :

```tsx
      <div style={namePlate}>{getNomVendeur(persona.archetype)}</div>
```

- [ ] **Step 2: Vérifier types, lint et suite complète**

Run: `npx tsc --noEmit && npm run test:run`
Expected: PASS — 0 erreur, toute la suite verte.

- [ ] **Step 3: Vérification visuelle (simulateur ou dev)**

Lancer `npm run dev`, ouvrir une brocante en chinage, taper un objet : la plaque du tiroir affiche le nom du personnage (ex. « Dédé la Bretelle »). Les nouveaux archétypes montrent l'illustration mystère en attendant leurs visuels.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/chine/ChineNegoDrawer.tsx
git commit -m "feat(chinage): la plaque de négo affiche le nom du vendeur"
```
