# Vente — Coffre de camion · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la liste "Ajouter à l'étal" actuelle par un mini-jeu de packing drag-and-drop dans le coffre carré d'une camionnette (4 niveaux upgradables), avec hitbox pixel-perfect, rotation 90°, et tarification en 2e étape.

**Architecture:** Wizard 2 étapes dans `/vitrine/[brocanteId]` (packing → pricing). Drag & drop natif via pointer events. Alpha-mask par template caché en `Map<string, Uint8Array>`. Le système `STAND_LEVELS` est supprimé au profit de 4 niveaux de camion stockés dans `GameState.niveauCamion`. Frais d'entrée unifiés chinage + vente.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest, CSS-in-JS inline (style projet).

**Spec source :** `docs/superpowers/specs/2026-06-08-vente-coffre-camion-design.md`

---

## File structure overview

**Modified**
- `src/types/game.ts` — `TailleObjet`, `NiveauCamion`, `GameState.niveauCamion`, `ObjetEnVitrine.posX/Y/rotation`, suppression `StandLevel/StandConfig`.
- `src/data/brocantes.ts` — rename `COUT_ENTREE_PAR_TIER` → `FRAIS_ENTREE` (nouveau barème).
- `src/data/objetTemplates.ts` — champ `taille?: TailleObjet` optionnel par template + table par défaut.
- `src/context/GameContext.tsx` — `niveauCamion`, action `acheterCamion`, signature `mettreEnVitrine(id, prix, posX, posY, rot)`.
- `src/app/vitrine/[brocanteId]/ClientPage.tsx` — réécriture en wizard.
- `src/app/chiner/[brocanteId]/ClientPage.tsx` — `coutEntree` → `fraisEntree`.
- `src/components/BrocanteCard.tsx` — idem.
- `src/components/mobile/BrocanteCarousel.tsx` — idem.

**Created**
- `src/data/camion.ts` — `CAMIONS`, `getCamion`, `getProchainCamion`, `PLACES_PAR_TAILLE`, `getScaleCoffre`.
- `src/lib/coffre.ts` — alpha-mask + collision pixel-perfect.
- `src/lib/coffre.test.ts` — tests collision/places.
- `src/components/vente/CamionIcon.tsx` — SVG du camion selon niveau.
- `src/components/vente/ChargementHeader.tsx` — bandeau visuel + progress + upgrade.
- `src/components/vente/ItemDansCoffre.tsx` — sprite draggable + rotation tap long.
- `src/components/vente/ItemEnCarrousel.tsx` — vignette draggable depuis carrousel.
- `src/components/vente/CoffreCanvas.tsx` — zone carrée + coordination drag.
- `src/components/vente/CarrouselStock.tsx` — scroll horizontal du stock dispo.
- `src/components/vente/CoffreChargement.tsx` — étape 1 (packing).
- `src/components/vente/CoffrePricing.tsx` — étape 2 (prix).

**Deleted**
- `src/data/standLevels.ts`.

---

## Task 1: Frais d'entrée unifiés (chinage + vente)

**Files**
- Modify: `src/data/brocantes.ts`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`
- Modify: `src/components/BrocanteCard.tsx`
- Modify: `src/components/mobile/BrocanteCarousel.tsx`

- [ ] **Step 1.1 — Mettre à jour le barème et renommer la constante/fonction.**

Dans `src/data/brocantes.ts`, remplacer en tête de fichier :

```ts
/**
 * Droit d'entrée payé à chaque session (chinage OU vente), par tier.
 */
export const FRAIS_ENTREE: Record<BrocanteTier, number> = {
  1: 5,
  2: 10,
  3: 25,
  4: 50,
};

export function fraisEntree(brocante: Brocante): number {
  if (brocante.id === "vide-grenier-quartier") return 0;
  return FRAIS_ENTREE[brocante.tier];
}
```

Supprimer `COUT_ENTREE_PAR_TIER` et `coutEntree`.

- [ ] **Step 1.2 — Mettre à jour les 3 importeurs.**

Dans chacun des fichiers ci-dessous, remplacer `coutEntree` par `fraisEntree` (imports + appels) :
- `src/app/chiner/[brocanteId]/ClientPage.tsx`
- `src/components/BrocanteCard.tsx`
- `src/components/mobile/BrocanteCarousel.tsx`

- [ ] **Step 1.3 — Vérifier la compilation.**

Run: `npx tsc -p . --noEmit`
Expected: 0 erreurs liées à `coutEntree` ou `COUT_ENTREE_PAR_TIER`.

- [ ] **Step 1.4 — Commit.**

```bash
git add src/data/brocantes.ts src/app/chiner src/components/BrocanteCard.tsx src/components/mobile/BrocanteCarousel.tsx
git commit -m "refactor(brocantes): unifie frais d'entrée chinage + vente (5/10/25/50)"
```

---

## Task 2: Type `TailleObjet` + `PLACES_PAR_TAILLE`

**Files**
- Modify: `src/types/game.ts`

- [ ] **Step 2.1 — Ajouter le type et la table.**

À la fin de `src/types/game.ts`, ajouter :

```ts
export type TailleObjet = "XS" | "S" | "M" | "L" | "XL";

export const PLACES_PAR_TAILLE: Record<TailleObjet, number> = {
  XS: 1,
  S:  2,
  M:  4,
  L:  6,
  XL: 9,
};

export type NiveauCamion = 1 | 2 | 3 | 4;
```

- [ ] **Step 2.2 — Ajouter `posX/posY/rotation` à `ObjetEnVitrine`.**

Remplacer la déclaration existante par :

```ts
export interface ObjetEnVitrine {
  objet: Objet;
  prixVente: number;
  /** Position du centre dans le coffre, en pourcentage du côté (0..1). Optionnel pour rétro-compat. */
  posX?: number;
  posY?: number;
  /** Rotation, en multiples de 90°. Optionnel pour rétro-compat. */
  rotation?: 0 | 90 | 180 | 270;
}
```

- [ ] **Step 2.3 — Ajouter `niveauCamion` à `GameState`.**

Dans `GameState`, ajouter (à côté de `niveauStockage`) :

```ts
/** Niveau du camion (1 à 4). Détermine la capacité du coffre. Défaut 1. */
niveauCamion: NiveauCamion;
```

- [ ] **Step 2.4 — Commit.**

```bash
git add src/types/game.ts
git commit -m "feat(types): TailleObjet, NiveauCamion, position dans ObjetEnVitrine"
```

---

## Task 3: Data — `src/data/camion.ts`

**Files**
- Create: `src/data/camion.ts`
- Test: `src/data/camion.test.ts`

- [ ] **Step 3.1 — Écrire le test (TDD).**

Créer `src/data/camion.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  CAMIONS,
  getCamion,
  getProchainCamion,
  getScaleCoffre,
} from "@/data/camion";

describe("camion", () => {
  it("CAMIONS contient 4 niveaux dans l'ordre", () => {
    expect(CAMIONS.map((c) => c.niveau)).toEqual([1, 2, 3, 4]);
  });

  it("getCamion(2) retourne le Break", () => {
    expect(getCamion(2).nom).toBe("Break");
  });

  it("getProchainCamion(4) retourne null", () => {
    expect(getProchainCamion(4)).toBeNull();
  });

  it("getProchainCamion(1) retourne le Break", () => {
    expect(getProchainCamion(1)?.nom).toBe("Break");
  });

  it("getScaleCoffre: XL en N1 = 1.0", () => {
    expect(getScaleCoffre("XL", 9)).toBeCloseTo(1.0, 3);
  });

  it("getScaleCoffre: XS en N4 ≈ 0.167", () => {
    expect(getScaleCoffre("XS", 36)).toBeCloseTo(0.167, 2);
  });
});
```

- [ ] **Step 3.2 — Lancer le test, attendre échec.**

Run: `npx vitest run src/data/camion.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3.3 — Écrire l'implémentation.**

Créer `src/data/camion.ts` :

```ts
import type { NiveauCamion, TailleObjet } from "@/types/game";
import { PLACES_PAR_TAILLE } from "@/types/game";

export interface CamionConfig {
  niveau: NiveauCamion;
  nom: string;
  cotePixels: number;
  capacitePlaces: number;
  prixUpgradeVersCeNiveau: number | null;
}

export const CAMIONS: readonly CamionConfig[] = [
  { niveau: 1, nom: "4L",         cotePixels: 280, capacitePlaces: 9,  prixUpgradeVersCeNiveau: null },
  { niveau: 2, nom: "Break",      cotePixels: 280, capacitePlaces: 16, prixUpgradeVersCeNiveau: 150 },
  { niveau: 3, nom: "Utilitaire", cotePixels: 280, capacitePlaces: 25, prixUpgradeVersCeNiveau: 500 },
  { niveau: 4, nom: "Fourgon",    cotePixels: 280, capacitePlaces: 36, prixUpgradeVersCeNiveau: 1500 },
] as const;

export function getCamion(niveau: NiveauCamion): CamionConfig {
  return CAMIONS[niveau - 1];
}

export function getProchainCamion(niveau: NiveauCamion): CamionConfig | null {
  return niveau < 4 ? CAMIONS[niveau] : null;
}

/**
 * Échelle visuelle d'un objet en fonction de la taille et de la capacité totale du coffre.
 * Hypothèse : 1 XL en N1 (9 places) = tout le coffre (scale = 1).
 */
export function getScaleCoffre(
  taille: TailleObjet,
  capacitePlaces: number,
): number {
  return Math.sqrt(PLACES_PAR_TAILLE[taille] / capacitePlaces);
}
```

- [ ] **Step 3.4 — Vérifier les tests.**

Run: `npx vitest run src/data/camion.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3.5 — Commit.**

```bash
git add src/data/camion.ts src/data/camion.test.ts
git commit -m "feat(camion): config 4 niveaux + helper d'échelle"
```

---

## Task 4: Tailles dans `objetTemplates.ts`

**Files**
- Modify: `src/data/objetTemplates.ts`
- Modify: `src/types/game.ts` (helper `tailleDe`)

- [ ] **Step 4.1 — Ajouter `taille?` au type `ObjetTemplate`.**

Dans `src/data/objetTemplates.ts`, étendre :

```ts
export interface ObjetTemplate {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  prixRefBase: number;
  unique?: boolean;
  /** Taille (XS→XL). Si omis, default par catégorie via `tailleDe()`. */
  taille?: TailleObjet;
}
```

Mettre à jour l'import : `import type { CategorieObjet, Rarete, TailleObjet } from "@/types/game";`

- [ ] **Step 4.2 — Helper `tailleDe()` avec défaut par catégorie.**

À la fin de `src/data/objetTemplates.ts`, ajouter :

```ts
import { PLACES_PAR_TAILLE } from "@/types/game";

const TAILLE_DEFAUT: Record<CategorieObjet, TailleObjet> = {
  "Musique": "S",
  "Jeux & Loisirs": "S",
  "Livres & Papeterie": "S",
  "Mode": "S",
  "Maison": "M",
  "Objets d'art": "M",
  "Bricolage": "S",
};

export function tailleDe(t: ObjetTemplate): TailleObjet {
  return t.taille ?? TAILLE_DEFAUT[t.categorie];
}
```

- [ ] **Step 4.3 — Annoter les templates "évidemment" plus gros ou plus petits.**

Pour la phase initiale, repérer ~20 templates où le défaut ne colle pas et leur ajouter une taille explicite (en passant par la `Row` étendue ou en post-pass). Approche minimale : créer un fichier `src/data/objetTemplatesTailles.ts` :

```ts
import type { TailleObjet } from "@/types/game";

/**
 * Overrides explicites. Tout ce qui n'est pas listé tombe sur le défaut par catégorie.
 * À enrichir progressivement à mesure que des items "sentent faux" en jeu.
 */
export const TAILLES_OVERRIDE: Record<string, TailleObjet> = {
  // Musique
  "mus.harmonica_hohner": "XS",
  "mus.guitare_acoustique": "L",     // si template existe
  "mus.piano_droit": "XL",            // si template existe
  // Maison
  "mai.lampe_tiffany": "M",
  "mai.fauteuil_voltaire": "L",
  "mai.armoire_normande": "XL",
  // Bricolage
  "bri.cle_outil": "XS",
  "bri.vis": "XS",
  // Mode
  "mod.casquette_titi": "XS",
  "mod.veste_cuir": "M",
  // Livres
  "liv.stylo_plume": "XS",
  "liv.dictionnaire_larousse": "M",
};
```

Puis adapter `tailleDe` :

```ts
import { TAILLES_OVERRIDE } from "@/data/objetTemplatesTailles";

export function tailleDe(t: ObjetTemplate): TailleObjet {
  return t.taille ?? TAILLES_OVERRIDE[t.templateId] ?? TAILLE_DEFAUT[t.categorie];
}
```

> **Note exécution** : ne pas inventer les `templateId` — vérifier dans `objetTemplates.ts` avant d'ajouter une entrée. Les IDs ci-dessus sont indicatifs ; ne garde que ceux qui existent réellement, et ajoute-en d'autres en cohérence avec le catalogue.

- [ ] **Step 4.4 — Test de couverture des défauts.**

Créer `src/data/objetTemplates.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { ALL_TEMPLATES, tailleDe } from "@/data/objetTemplates";

describe("tailleDe", () => {
  it("toutes les catégories ont un défaut", () => {
    for (const t of ALL_TEMPLATES) {
      expect(tailleDe(t)).toMatch(/^(XS|S|M|L|XL)$/);
    }
  });
});
```

Run: `npx vitest run src/data/objetTemplates.test.ts`
Expected: PASS.

> **Adapte le nom `ALL_TEMPLATES`** : si l'export se nomme autrement dans `objetTemplates.ts`, utilise l'export existant qui liste tous les templates.

- [ ] **Step 4.5 — Commit.**

```bash
git add src/data/objetTemplates.ts src/data/objetTemplatesTailles.ts src/data/objetTemplates.test.ts
git commit -m "feat(templates): taille par défaut + overrides explicites"
```

---

## Task 5: Suppression de `STAND_LEVELS`

**Files**
- Delete: `src/data/standLevels.ts`
- Modify: `src/types/game.ts` (supprimer `StandLevel`, `StandConfig`)
- Modify: `src/app/vitrine/[brocanteId]/ClientPage.tsx` (sera réécrit Task 14, on désimporte juste)
- Modify: tout fichier importeur de `@/data/standLevels`

- [ ] **Step 5.1 — Lister les importeurs.**

Run: `grep -rn "standLevels\|StandLevel\|StandConfig\|COUTS_STAND\|niveauStand\|CAPACITE_MAX_GLOBALE" src/`

Noter chaque fichier. Le ClientPage vitrine, fixtures de tests, le GameContext et `SessionVente` (dans `game.ts`) sont les candidats principaux.

- [ ] **Step 5.2 — Renommer `SessionVente.niveauStand` → `niveauCamion`.**

Dans `src/types/game.ts`, mettre à jour :

```ts
export interface SessionVente {
  id: string;
  type: "vente";
  jour: number;
  timestamp: number;
  niveauCamion: NiveauCamion;
  loyer: number;
  ventes: VenteHistorique[];
  invendus: number;
}
```

Et supprimer `StandLevel`, `StandConfig`.

- [ ] **Step 5.3 — Mettre à jour le GameContext.**

Dans `src/context/GameContext.tsx`, partout où on crée une `SessionVente`, remplacer `niveauStand: state.vitrine.niveauStand` (ou équivalent) par `niveauCamion: state.niveauCamion`. Si la création se base sur `niveauRequis(...)` ou `coutStand`, supprimer ces calculs : le loyer est maintenant le `fraisEntree(brocante)` (déjà débité à `ouvrirVitrine` / fin du wizard, voir Task 14-16).

- [ ] **Step 5.4 — Supprimer le fichier.**

```bash
git rm src/data/standLevels.ts
```

- [ ] **Step 5.5 — Réparer les fixtures et tests qui cassent.**

Pour chaque test rouge, mettre à jour le mock de `SessionVente` (remplacer `niveauStand` par `niveauCamion`).

- [ ] **Step 5.6 — Compiler et lancer tous les tests.**

Run: `npx tsc -p . --noEmit && npx vitest run`
Expected: 0 erreur TS. Tous les tests passent (sauf ceux qui touchent au ClientPage vitrine — à ignorer pour l'instant car il sera réécrit).

- [ ] **Step 5.7 — Commit.**

```bash
git add -A
git commit -m "refactor: supprime STAND_LEVELS au profit du système camion"
```

---

## Task 6: GameState — `niveauCamion` + action `acheterCamion`

**Files**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 6.1 — Initialiser `niveauCamion` dans l'état initial.**

Dans la définition de l'état initial (`INITIAL_STATE` ou équivalent), ajouter `niveauCamion: 1`.

- [ ] **Step 6.2 — Migration des saves.**

Dans la fonction de hydration / parse, si `niveauCamion` est absent (ancienne save), l'initialiser à 1 :

```ts
state.niveauCamion ??= 1;
```

- [ ] **Step 6.3 — Action `acheterCamion`.**

Ajouter à l'interface du contexte :

```ts
acheterCamion: (niveau: NiveauCamion) => void;
```

Implémentation :

```ts
const acheterCamion = (niveau: NiveauCamion) => {
  setState((s) => {
    if (niveau !== s.niveauCamion + 1) return s;
    const camion = getCamion(niveau);
    const prix = camion.prixUpgradeVersCeNiveau ?? 0;
    if (s.budget < prix) return s;
    return { ...s, niveauCamion: niveau, budget: s.budget - prix };
  });
};
```

(Adapter à la forme exacte du contexte : reducer, useReducer, etc.)

- [ ] **Step 6.4 — Étendre `mettreEnVitrine` pour accepter la position et la rotation.**

Nouvelle signature :

```ts
mettreEnVitrine: (
  objetId: string,
  prixVente: number,
  posX?: number,
  posY?: number,
  rotation?: 0 | 90 | 180 | 270,
) => void;
```

À l'implémentation, persister ces champs dans l'`ObjetEnVitrine` créé. Les anciens callers (s'il y en a) continuent à passer 2 args, on stocke alors `posX = 0.5, posY = 0.5, rotation = 0`.

- [ ] **Step 6.5 — Action `ajusterPositionVitrine`.**

Quand le joueur déplace un objet déjà posé dans le coffre :

```ts
ajusterPositionVitrine: (
  objetId: string,
  posX: number,
  posY: number,
  rotation: 0 | 90 | 180 | 270,
) => void;
```

Implémentation : map sur `state.vitrine.objets`, met à jour l'entrée matchante.

- [ ] **Step 6.6 — Exposer dans le `value` du Provider.**

Ajouter `acheterCamion`, `ajusterPositionVitrine` au `value` du `<GameContext.Provider>`.

- [ ] **Step 6.7 — Compiler.**

Run: `npx tsc -p . --noEmit`
Expected: 0 erreur (sauf ClientPage vitrine encore non réécrit).

- [ ] **Step 6.8 — Commit.**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(context): niveauCamion + acheterCamion + position vitrine"
```

---

## Task 7: Lib coffre — alpha-mask et collision

**Files**
- Create: `src/lib/coffre.ts`
- Test: `src/lib/coffre.test.ts`

- [ ] **Step 7.1 — Écrire les tests (TDD).**

```ts
// src/lib/coffre.test.ts
import { describe, it, expect } from "vitest";
import {
  bboxOverlap,
  capaciteSuffit,
  placesUtilisees,
} from "@/lib/coffre";
import type { ObjetEnVitrine } from "@/types/game";

describe("bboxOverlap", () => {
  it("rectangles disjoints", () => {
    expect(bboxOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 5, h: 5 },
    )).toBe(false);
  });

  it("rectangles qui se touchent (bord à bord)", () => {
    expect(bboxOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 10, y: 0, w: 5, h: 5 },
    )).toBe(false);
  });

  it("rectangles qui se chevauchent", () => {
    expect(bboxOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 },
    )).toBe(true);
  });
});

describe("placesUtilisees", () => {
  const items = [
    { taille: "XS" }, { taille: "S" }, { taille: "M" },
  ] as Array<Pick<{ taille: import("@/types/game").TailleObjet }, "taille">>;

  it("somme correctement les places", () => {
    expect(placesUtilisees(items)).toBe(1 + 2 + 4);
  });
});

describe("capaciteSuffit", () => {
  it("9 places dispo, ajout 4 → ok", () => {
    expect(capaciteSuffit(5, 4, 9)).toBe(true);
  });
  it("9 places dispo, déjà 6 utilisées + 4 → refus", () => {
    expect(capaciteSuffit(6, 4, 9)).toBe(false);
  });
});
```

- [ ] **Step 7.2 — Lancer, attendre échec.**

Run: `npx vitest run src/lib/coffre.test.ts`
Expected: FAIL (module manquant).

- [ ] **Step 7.3 — Implémenter.**

```ts
// src/lib/coffre.ts
import { PLACES_PAR_TAILLE } from "@/types/game";
import type { TailleObjet } from "@/types/game";

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function bboxOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function placesUtilisees(items: ReadonlyArray<{ taille: TailleObjet }>): number {
  return items.reduce((acc, it) => acc + PLACES_PAR_TAILLE[it.taille], 0);
}

export function capaciteSuffit(
  placesActuelles: number,
  placesAjoutees: number,
  capaciteMax: number,
): boolean {
  return placesActuelles + placesAjoutees <= capaciteMax;
}

/* --- Alpha mask --------------------------------------------------- */

/**
 * Cache des masques alpha : key = `${src}:${size}:${rotation}`.
 * Valeur = Uint8Array de longueur size*size (1 = opaque, 0 = transparent).
 */
const MASK_CACHE = new Map<string, Uint8Array>();

export interface Mask {
  bits: Uint8Array;
  size: number;
}

export function maskKey(src: string, size: number, rotation: number): string {
  return `${src}:${size}:${rotation}`;
}

export function getCachedMask(key: string): Uint8Array | undefined {
  return MASK_CACHE.get(key);
}

export function cacheMask(key: string, bits: Uint8Array): void {
  MASK_CACHE.set(key, bits);
}

/**
 * Calcule le masque alpha d'une image rendue à `size × size` avec rotation.
 * Renvoie une Uint8Array indexée [y*size + x].
 */
export async function buildAlphaMask(
  src: string,
  size: number,
  rotation: 0 | 90 | 180 | 270,
): Promise<Uint8Array> {
  const key = maskKey(src, size, rotation);
  const cached = getCachedMask(key);
  if (cached) return cached;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(size / 2, size / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const bits = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    bits[i] = data[i * 4 + 3] > 16 ? 1 : 0; // alpha > 16/255 = opaque
  }
  cacheMask(key, bits);
  return bits;
}

/**
 * Teste si deux masques se chevauchent au moins sur un pixel.
 * `a` et `b` sont positionnés respectivement à (ax, ay) et (bx, by) dans
 * un référentiel commun, et de tailles `size`.
 */
export function masksCollide(
  a: Mask,
  ax: number,
  ay: number,
  b: Mask,
  bx: number,
  by: number,
): boolean {
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + a.size, bx + b.size);
  const y2 = Math.min(ay + a.size, by + b.size);
  if (x2 <= x1 || y2 <= y1) return false;

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const ai = (y - ay) * a.size + (x - ax);
      const bi = (y - by) * b.size + (x - bx);
      if (a.bits[ai] && b.bits[bi]) return true;
    }
  }
  return false;
}

/**
 * Teste si un masque sort des bornes [0, side) × [0, side).
 * `x`, `y` = coin haut-gauche du masque.
 */
export function maskOutOfBounds(
  mask: Mask,
  x: number,
  y: number,
  side: number,
): boolean {
  for (let py = 0; py < mask.size; py++) {
    for (let px = 0; px < mask.size; px++) {
      if (!mask.bits[py * mask.size + px]) continue;
      const wx = x + px;
      const wy = y + py;
      if (wx < 0 || wx >= side || wy < 0 || wy >= side) return true;
    }
  }
  return false;
}
```

- [ ] **Step 7.4 — Vérifier les tests.**

Run: `npx vitest run src/lib/coffre.test.ts`
Expected: PASS.

> **Note** : les fonctions `buildAlphaMask`, `masksCollide`, `maskOutOfBounds` ne sont pas testées unitairement (elles dépendent du DOM/canvas). Elles sont testées indirectement via les composants en Task 12.

- [ ] **Step 7.5 — Commit.**

```bash
git add src/lib/coffre.ts src/lib/coffre.test.ts
git commit -m "feat(lib): collision pixel-perfect coffre + capacité places"
```

---

## Task 8: `CamionIcon` (SVG)

**Files**
- Create: `src/components/vente/CamionIcon.tsx`

- [ ] **Step 8.1 — Implémenter.**

```tsx
import type { NiveauCamion } from "@/types/game";

interface Props {
  niveau: NiveauCamion;
  size?: number;
}

export function CamionIcon({ niveau, size = 40 }: Props) {
  // SVG simple : carrosserie + 2 roues. Le niveau modifie la longueur du caisson.
  const boxLen = 24 + (niveau - 1) * 6; // 24 / 30 / 36 / 42
  return (
    <svg viewBox="0 0 60 36" width={size} height={(size * 36) / 60} aria-label={`Camion niveau ${niveau}`}>
      <rect x="4" y="6" width={boxLen} height="18" fill="var(--forest-800)" stroke="var(--ink-700)" strokeWidth="2" rx="2" />
      <rect x={boxLen + 4} y="12" width="14" height="12" fill="var(--brass-500)" stroke="var(--ink-700)" strokeWidth="2" />
      <circle cx="12" cy="28" r="4" fill="var(--ink-700)" />
      <circle cx={boxLen + 12} cy="28" r="4" fill="var(--ink-700)" />
    </svg>
  );
}
```

- [ ] **Step 8.2 — Vérifier rendu local.**

Run: `npm run dev` puis ouvrir une page de debug ou la storybook si dispo. Sinon, valider visuellement au Task 14.

- [ ] **Step 8.3 — Commit.**

```bash
git add src/components/vente/CamionIcon.tsx
git commit -m "feat(vente): CamionIcon SVG paramétré par niveau"
```

---

## Task 9: `ChargementHeader`

**Files**
- Create: `src/components/vente/ChargementHeader.tsx`

- [ ] **Step 9.1 — Implémenter.**

```tsx
import { useState } from "react";
import type { NiveauCamion } from "@/types/game";
import { getCamion, getProchainCamion } from "@/data/camion";
import { CamionIcon } from "./CamionIcon";

interface Props {
  niveau: NiveauCamion;
  placesUtilisees: number;
  budget: number;
  onUpgrade: (niveau: NiveauCamion) => void;
}

export function ChargementHeader({ niveau, placesUtilisees, budget, onUpgrade }: Props) {
  const camion = getCamion(niveau);
  const prochain = getProchainCamion(niveau);
  const pct = Math.min(100, (placesUtilisees / camion.capacitePlaces) * 100);
  const peutUpgrade = !!prochain && budget >= (prochain.prixUpgradeVersCeNiveau ?? 0);
  const [confirm, setConfirm] = useState<boolean>(false);

  return (
    <div
      style={{
        background: "var(--paper-200)",
        borderBottom: "1px solid var(--brass-500)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <CamionIcon niveau={niveau} size={42} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Chargement — {camion.nom}
        </div>
        <div
          style={{
            height: 8,
            background: "var(--paper-300)",
            border: "1px solid var(--brass-500)",
            margin: "3px 0 2px",
          }}
        >
          <div style={{ height: "100%", background: "var(--forest-800)", width: `${pct}%` }} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            color: "var(--forest-800)",
            fontWeight: 700,
          }}
        >
          {placesUtilisees} / {camion.capacitePlaces} places
        </div>
      </div>
      {prochain && (
        <button
          type="button"
          disabled={!peutUpgrade}
          onClick={() => (confirm ? onUpgrade(prochain.niveau) : setConfirm(true))}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--brass-700)",
            background: peutUpgrade ? "var(--brass-500)" : "var(--paper-300)",
            color: peutUpgrade ? "#fff" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: peutUpgrade ? "pointer" : "not-allowed",
            lineHeight: 1.3,
          }}
        >
          {confirm ? `Confirmer · ${prochain.prixUpgradeVersCeNiveau} €` : `↑ ${prochain.nom}\n${prochain.prixUpgradeVersCeNiveau} €`.replace("\n", " · ")}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 9.2 — Commit.**

```bash
git add src/components/vente/ChargementHeader.tsx
git commit -m "feat(vente): ChargementHeader (camion + barre + upgrade)"
```

---

## Task 10: `ItemDansCoffre`

**Files**
- Create: `src/components/vente/ItemDansCoffre.tsx`

- [ ] **Step 10.1 — Implémenter.**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { Objet, ObjetEnVitrine } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate } from "@/data/objetTemplates";
import { tailleDe } from "@/data/objetTemplates";
import { getScaleCoffre } from "@/data/camion";

interface Props {
  ov: ObjetEnVitrine;
  capacitePlaces: number;
  cotePixels: number;
  onMove: (posX: number, posY: number) => void; // 0..1
  onRotate: () => void;
  onDragOut: () => void;          // tiré hors du coffre = retour au stock
  containerRef: React.RefObject<HTMLDivElement | null>;
  overlap?: boolean;              // si l'objet collide actuellement → contour rouge
}

const LONG_PRESS_MS = 300;
const LONG_PRESS_MAX_MOVE = 5;

export function ItemDansCoffre({ ov, capacitePlaces, cotePixels, onMove, onRotate, onDragOut, containerRef, overlap }: Props) {
  const tpl = getTemplate(ov.objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const scale = getScaleCoffre(taille, capacitePlaces);
  const sizePx = scale * cotePixels;

  const elRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MAX_MOVE) startRef.current.moved = true;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    onMove(Math.max(0, Math.min(1, px)), Math.max(0, Math.min(1, py)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const s = startRef.current;
    startRef.current = null;
    setDragging(false);
    if (!s) return;
    const heldMs = Date.now() - s.t;
    if (!s.moved && heldMs >= LONG_PRESS_MS) {
      onRotate();
      navigator.vibrate?.(20);
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const insideX = e.clientX >= rect.left && e.clientX <= rect.right;
    const insideY = e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!insideX || !insideY) onDragOut();
  };

  const posX = (ov.posX ?? 0.5) * cotePixels;
  const posY = (ov.posY ?? 0.5) * cotePixels;
  const rot = ov.rotation ?? 0;

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "absolute",
        left: posX - sizePx / 2,
        top: posY - sizePx / 2,
        width: sizePx,
        height: sizePx,
        transform: `rotate(${rot}deg)`,
        transition: dragging ? "none" : "transform 120ms",
        outline: overlap ? "2px solid var(--vermillion-600)" : "none",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      <ItemImage
        templateId={ov.objet.templateId}
        categorie={ov.objet.categorie}
        fit="contain"
        alt={ov.objet.nom}
      />
    </div>
  );
}
```

- [ ] **Step 10.2 — Commit.**

```bash
git add src/components/vente/ItemDansCoffre.tsx
git commit -m "feat(vente): ItemDansCoffre (drag, tap long rotation)"
```

---

## Task 11: `ItemEnCarrousel`

**Files**
- Create: `src/components/vente/ItemEnCarrousel.tsx`

- [ ] **Step 11.1 — Implémenter.**

```tsx
"use client";

import { useRef } from "react";
import type { Objet } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate, tailleDe } from "@/data/objetTemplates";

interface Props {
  objet: Objet;
  onDragToCoffre: (objetId: string, clientX: number, clientY: number) => void;
}

export function ItemEnCarrousel({ objet, onDragToCoffre }: Props) {
  const tpl = getTemplate(objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!startRef.current) return;
    const moved = Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y);
    startRef.current = null;
    if (moved < 8) return; // tap court : ignorer
    onDragToCoffre(objet.id, e.clientX, e.clientY);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: 60,
        height: 60,
        background: "var(--paper-100)",
        border: "2px solid var(--brass-500)",
        borderRadius: 4,
        touchAction: "none",
        cursor: "grab",
      }}
    >
      <ItemImage
        templateId={objet.templateId}
        categorie={objet.categorie}
        fit="contain"
        alt={objet.nom}
      />
      <span
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          background: "var(--brass-700)",
          color: "#fff",
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          padding: "1px 3px",
          borderRadius: 2,
        }}
      >
        {taille}
      </span>
    </div>
  );
}
```

- [ ] **Step 11.2 — Commit.**

```bash
git add src/components/vente/ItemEnCarrousel.tsx
git commit -m "feat(vente): ItemEnCarrousel (vignette stock draggable)"
```

---

## Task 12: `CoffreCanvas`

**Files**
- Create: `src/components/vente/CoffreCanvas.tsx`

- [ ] **Step 12.1 — Implémenter.**

```tsx
"use client";

import { useRef } from "react";
import type { ObjetEnVitrine } from "@/types/game";
import { getCamion } from "@/data/camion";
import { ItemDansCoffre } from "./ItemDansCoffre";

interface Props {
  niveauCamion: import("@/types/game").NiveauCamion;
  objets: ObjetEnVitrine[];
  overlaps: Set<string>;                                // objetId en collision
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string) => void;
  onRetour: (objetId: string) => void;
}

export function CoffreCanvas({ niveauCamion, objets, overlaps, onMove, onRotate, onRetour }: Props) {
  const camion = getCamion(niveauCamion);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div style={{ padding: 14, background: "var(--paper-200)" }}>
      <div
        ref={ref}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          position: "relative",
          background:
            "repeating-linear-gradient(45deg, var(--ink-700), var(--ink-700) 6px, var(--ink-500) 6px, var(--ink-500) 12px)",
          border: "4px solid var(--ink-700)",
          borderRadius: 6,
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          — coffre ouvert —
        </div>
        {objets.map((ov) => {
          const w = ref.current?.getBoundingClientRect().width ?? camion.cotePixels;
          return (
            <ItemDansCoffre
              key={ov.objet.id}
              ov={ov}
              capacitePlaces={camion.capacitePlaces}
              cotePixels={w}
              containerRef={ref}
              overlap={overlaps.has(ov.objet.id)}
              onMove={(x, y) => onMove(ov.objet.id, x, y)}
              onRotate={() => onRotate(ov.objet.id)}
              onDragOut={() => onRetour(ov.objet.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 12.2 — Commit.**

```bash
git add src/components/vente/CoffreCanvas.tsx
git commit -m "feat(vente): CoffreCanvas (zone carrée + items)"
```

---

## Task 13: `CarrouselStock`

**Files**
- Create: `src/components/vente/CarrouselStock.tsx`

- [ ] **Step 13.1 — Implémenter.**

```tsx
"use client";

import type { Objet } from "@/types/game";
import { ItemEnCarrousel } from "./ItemEnCarrousel";

interface Props {
  stock: Objet[];
  onPickUp: (objetId: string, clientX: number, clientY: number) => void;
}

export function CarrouselStock({ stock, onPickUp }: Props) {
  if (stock.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12.5,
          color: "var(--ink-500)",
          textAlign: "center",
          padding: 12,
        }}
      >
        Aucun objet à charger. Allez chiner !
      </p>
    );
  }

  const tri = [...stock].sort(
    (a, b) => a.categorie.localeCompare(b.categorie) || a.nom.localeCompare(b.nom),
  );

  return (
    <>
      <div
        style={{
          padding: "10px 14px 4px",
          fontFamily: "var(--font-display)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
        }}
      >
        — Stock disponible ({stock.length}) —
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "0 14px 14px",
          overflowX: "auto",
        }}
      >
        {tri.map((o) => (
          <ItemEnCarrousel key={o.id} objet={o} onDragToCoffre={onPickUp} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 13.2 — Commit.**

```bash
git add src/components/vente/CarrouselStock.tsx
git commit -m "feat(vente): CarrouselStock (scroll horizontal trié)"
```

---

## Task 14: `CoffreChargement` (étape 1)

**Files**
- Create: `src/components/vente/CoffreChargement.tsx`

- [ ] **Step 14.1 — Implémenter.**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { NiveauCamion, Objet, ObjetEnVitrine } from "@/types/game";
import { getCamion } from "@/data/camion";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { capaciteSuffit, placesUtilisees } from "@/lib/coffre";
import { ChargementHeader } from "./ChargementHeader";
import { CoffreCanvas } from "./CoffreCanvas";
import { CarrouselStock } from "./CarrouselStock";

interface Props {
  niveauCamion: NiveauCamion;
  budget: number;
  stock: Objet[];
  coffre: ObjetEnVitrine[];
  onAjouter: (objetId: string, posX: number, posY: number) => void;
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string) => void;
  onRetirer: (objetId: string) => void;
  onUpgrade: (n: NiveauCamion) => void;
  onValider: () => void;
  onAnnuler: () => void;
}

export function CoffreChargement(p: Props) {
  const camion = getCamion(p.niveauCamion);
  const places = useMemo(
    () =>
      placesUtilisees(
        p.coffre
          .map((ov) => getTemplate(ov.objet.templateId))
          .filter((t): t is NonNullable<typeof t> => !!t)
          .map((t) => ({ taille: tailleDe(t) })),
      ),
    [p.coffre],
  );

  // MVP : pas de detection live d'overlap (alpha-mask coûte en perf à chaque move) ;
  // on s'appuie sur la contrainte places à l'ajout, et l'overlap sera détecté à la validation.
  const overlaps = new Set<string>();

  const handlePickUp = (objetId: string, clientX: number, clientY: number) => {
    const obj = p.stock.find((o) => o.id === objetId);
    if (!obj) return;
    const tpl = getTemplate(obj.templateId);
    if (!tpl) return;
    const t = tailleDe(tpl);
    const placesItem = { XS: 1, S: 2, M: 4, L: 6, XL: 9 }[t];
    if (!capaciteSuffit(places, placesItem, camion.capacitePlaces)) return;
    p.onAjouter(objetId, 0.5, 0.5); // pose au centre, le joueur ajuste après
  };

  const peutValider = p.coffre.length > 0;

  return (
    <>
      <ChargementHeader
        niveau={p.niveauCamion}
        placesUtilisees={places}
        budget={p.budget}
        onUpgrade={p.onUpgrade}
      />
      <CoffreCanvas
        niveauCamion={p.niveauCamion}
        objets={p.coffre}
        overlaps={overlaps}
        onMove={p.onMove}
        onRotate={p.onRotate}
        onRetour={p.onRetirer}
      />
      <CarrouselStock stock={p.stock} onPickUp={handlePickUp} />
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 14px calc(10px + var(--safe-bottom))",
          background: "var(--paper-100)",
          borderTop: "1px solid var(--brass-500)",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={p.onAnnuler}
          style={{
            flex: 1,
            padding: "10px",
            border: "1px solid var(--brass-500)",
            background: "var(--paper-100)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!peutValider}
          onClick={p.onValider}
          style={{
            flex: 2,
            padding: "10px",
            border: "1px solid var(--brass-500)",
            background: peutValider ? "var(--forest-800)" : "var(--paper-300)",
            color: peutValider ? "var(--brass-300)" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Valider le chargement
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 14.2 — Commit.**

```bash
git add src/components/vente/CoffreChargement.tsx
git commit -m "feat(vente): CoffreChargement (étape 1 du wizard)"
```

---

## Task 15: `CoffrePricing` (étape 2)

**Files**
- Create: `src/components/vente/CoffrePricing.tsx`

- [ ] **Step 15.1 — Implémenter.**

```tsx
"use client";

import type { Brocante, ObjetEnVitrine } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { ItemImage } from "@/components/ui/ItemImage";

interface Props {
  brocante: Brocante;
  budget: number;
  coffre: ObjetEnVitrine[];
  onAjusterPrix: (objetId: string, prix: number) => void;
  onRetour: () => void;
  onOuvrir: () => void;
}

export function CoffrePricing({ brocante, budget, coffre, onAjusterPrix, onRetour, onOuvrir }: Props) {
  const frais = fraisEntree(brocante);
  const peut = budget >= frais && coffre.length > 0;

  return (
    <>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          margin: "10px 14px 6px",
        }}
      >
        — Tarification —
      </h2>
      <section
        style={{
          margin: "0 12px 12px",
          border: "1px solid var(--brass-500)",
          background: "var(--paper-100)",
          padding: "10px 12px",
        }}
      >
        {coffre.map((ov, i) => {
          const c = getRarityColors(
            ov.objet.rarete,
            !!getTemplate(ov.objet.templateId)?.unique,
          );
          return (
            <div
              key={ov.objet.id}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                gap: 8,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: i === coffre.length - 1 ? "none" : "1px dotted var(--paper-500)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: c.thumbBg,
                  border: `1px solid ${c.outer}`,
                  overflow: "hidden",
                }}
              >
                <ItemImage templateId={ov.objet.templateId} categorie={ov.objet.categorie} fit="cover" alt={ov.objet.nom} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10.5, color: "var(--forest-800)" }}>{ov.objet.nom}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-500)" }}>
                  {ov.objet.etat} · {ov.objet.rarete}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  min={1}
                  value={ov.prixVente}
                  onChange={(e) => onAjusterPrix(ov.objet.id, Number(e.target.value))}
                  style={{
                    width: 56,
                    padding: "4px 6px",
                    border: "1px solid var(--brass-700)",
                    background: "var(--paper-100)",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    textAlign: "right",
                  }}
                />
                <span style={{ fontFamily: "var(--font-display)", color: "var(--brass-700)" }}>€</span>
              </div>
            </div>
          );
        })}
      </section>
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 14px calc(10px + var(--safe-bottom))",
          background: "var(--paper-100)",
          borderTop: "1px solid var(--brass-500)",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onRetour}
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid var(--brass-500)",
            background: "var(--paper-100)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          ← Coffre
        </button>
        <button
          type="button"
          disabled={!peut}
          onClick={onOuvrir}
          style={{
            flex: 2,
            padding: 10,
            border: "1px solid var(--brass-500)",
            background: peut ? "var(--forest-800)" : "var(--paper-300)",
            color: peut ? "var(--brass-300)" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Ouvrir l'étal · {frais} €
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 15.2 — Commit.**

```bash
git add src/components/vente/CoffrePricing.tsx
git commit -m "feat(vente): CoffrePricing (étape 2 — tarification)"
```

---

## Task 16: Réécriture de `ClientPage.tsx` (wizard)

**Files**
- Modify: `src/app/vitrine/[brocanteId]/ClientPage.tsx`

- [ ] **Step 16.1 — Réécrire.**

Remplacer intégralement le contenu de `src/app/vitrine/[brocanteId]/ClientPage.tsx` par :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { useGame } from "@/context/GameContext";
import { getBrocanteById, fraisEntree } from "@/data/brocantes";
import { CoffreChargement } from "@/components/vente/CoffreChargement";
import { CoffrePricing } from "@/components/vente/CoffrePricing";
import { estDebloquee } from "@/lib/deblocage";
import { brocantesParTier } from "@/data/brocantes";
import type { NiveauCamion, ObjetEnVitrine } from "@/types/game";

const SUGGESTION_FACTEUR = 1.4;

export default function VitrineBrocantePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    ajusterPositionVitrine,
    viderVitrine,
    ajusterBudget,
    acheterCamion,
  } = useGame();

  const brocante = useMemo(() => getBrocanteById(params.brocanteId), [params.brocanteId]);
  const [etape, setEtape] = useState<"packing" | "pricing">("packing");

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) return router.replace("/");
    if (!brocante) return router.replace("/vitrine");

    const deb = new Map<1 | 2 | 3 | 4, Set<string>>([
      [1, new Set()], [2, new Set()], [3, new Set()], [4, new Set()],
    ]);
    for (const tier of [1, 2, 3, 4] as const) {
      for (const b of brocantesParTier(tier)) {
        if (estDebloquee(b, state, deb)) deb.get(tier)!.add(b.id);
      }
    }
    if (!deb.get(brocante.tier)!.has(brocante.id)) {
      router.replace("/vitrine");
      return;
    }
    if (!state.vitrine || state.vitrine.brocanteId !== brocante.id) {
      ouvrirVitrine(brocante.id);
    }
  }, [isHydrated, state, brocante, router, ouvrirVitrine]);

  const coffre: ObjetEnVitrine[] = state?.vitrine?.objets ?? [];
  const stock = useMemo(() => {
    if (!state) return [];
    const ids = new Set(coffre.map((o) => o.objet.id));
    return state.inventaireJoueur.filter((o) => !ids.has(o.id) && !o.enRestauration);
  }, [state, coffre]);

  if (!isHydrated || !state || !brocante) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — préparation de l'étal…
      </main>
    );
  }

  const handleAjouter = (objetId: string, posX: number, posY: number) => {
    const obj = state.inventaireJoueur.find((o) => o.id === objetId);
    if (!obj) return;
    const prix = obj.prixVenteSouhaite ?? Math.max(1, Math.round(obj.prixReferenceReel * SUGGESTION_FACTEUR));
    mettreEnVitrine(objetId, prix, posX, posY, 0);
  };

  const handleRotate = (objetId: string) => {
    const ov = coffre.find((o) => o.objet.id === objetId);
    if (!ov) return;
    const next = (((ov.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
    ajusterPositionVitrine(objetId, ov.posX ?? 0.5, ov.posY ?? 0.5, next);
  };

  const handleOuvrir = () => {
    const frais = fraisEntree(brocante);
    if (state.budget < frais) return;
    ajusterBudget(-frais);
    router.push(`/vitrine/${brocante.id}/journee`);
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper-100)" }}>
      <ContextualHeader
        titre={etape === "packing" ? "Chargement" : "Tarification"}
        sousTitre={`${brocante.nom} · ${"★".repeat(brocante.tier)}`}
        budget={state.budget}
        onBack={() => (etape === "pricing" ? setEtape("packing") : router.push("/vitrine"))}
      />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {etape === "packing" ? (
          <CoffreChargement
            niveauCamion={state.niveauCamion as NiveauCamion}
            budget={state.budget}
            stock={stock}
            coffre={coffre}
            onAjouter={handleAjouter}
            onMove={(id, x, y) => {
              const ov = coffre.find((o) => o.objet.id === id);
              if (!ov) return;
              ajusterPositionVitrine(id, x, y, ov.rotation ?? 0);
            }}
            onRotate={handleRotate}
            onRetirer={retirerDeVitrine}
            onUpgrade={acheterCamion}
            onValider={() => setEtape("pricing")}
            onAnnuler={() => { viderVitrine(); router.push("/vitrine"); }}
          />
        ) : (
          <CoffrePricing
            brocante={brocante}
            budget={state.budget}
            coffre={coffre}
            onAjusterPrix={ajusterPrixVitrine}
            onRetour={() => setEtape("packing")}
            onOuvrir={handleOuvrir}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 16.2 — Compiler.**

Run: `npx tsc -p . --noEmit`
Expected: 0 erreur.

- [ ] **Step 16.3 — Lancer tous les tests.**

Run: `npx vitest run`
Expected: tous verts.

- [ ] **Step 16.4 — Commit.**

```bash
git add src/app/vitrine/[brocanteId]/ClientPage.tsx
git commit -m "feat(vitrine): wizard packing → pricing"
```

---

## Task 17: Validation manuelle + polish

- [ ] **Step 17.1 — Lancer le dev.**

Run: `npm run dev`

- [ ] **Step 17.2 — Tester le flux complet.**

Checklist navigateur (au minimum sur Chrome desktop + simulateur mobile DevTools) :
1. Ouvrir une brocante débloquée via le QG / bureau.
2. Glisser un objet du carrousel vers le coffre → l'objet apparaît au centre, peut être déplacé.
3. Glisser un autre objet → la barre `X / Y places` s'incrémente.
4. Tap long (~300 ms) sur un objet posé → rotation visible.
5. Glisser un objet hors du coffre → retour au carrousel.
6. Cliquer "↑ Break · 150 €" (avec budget suffisant) → confirmation puis upgrade ; les objets rétrécissent.
7. Cliquer "Valider le chargement" → étape 2, liste des objets avec prix éditables.
8. Modifier un prix, retour coffre, repasser pricing → prix conservé.
9. Cliquer "Ouvrir l'étal" → débit du frais d'entrée + route vers `/vitrine/[id]/journee`.
10. Cliquer "Annuler" → coffre vidé, retour `/vitrine`.

- [ ] **Step 17.3 — Régressions à vérifier.**

1. Chinage : les frais d'entrée affichent les nouvelles valeurs (5/10/25/50 €) dans `BrocanteCard` et `BrocanteCarousel`.
2. Historique : une `SessionVente` créée avant le refactor s'affiche sans crash.
3. Carte brocante "vide-grenier-quartier" : reste à 0 €.

- [ ] **Step 17.4 — Commit final si polish nécessaire.**

```bash
git add -A
git commit -m "polish(vente): ajustements visuels après test manuel"
```

---

## Critères d'acceptation (rappel spec)

- Le joueur peut placer 5 objets de tailles variées dans un coffre N1 en < 30 s.
- Pour MVP : la contrainte places est appliquée à l'ajout. La détection d'overlap pixel-perfect est posée (Task 7) mais le contrôle live "rouge si débord" n'est pas activé : il est branchable plus tard via le set `overlaps` dans `CoffreChargement` (cf. commentaire dans la Task 14).
- La barre `X / Y places` est cohérente à tout moment.
- L'upgrade du camion est visible immédiatement.
- Étape 1 → étape 2 → "journée" sans perte de données.
- Aucune référence à `STAND_LEVELS` ne subsiste.
- Tests verts (`npx vitest run`) et TS sans erreur (`npx tsc -p . --noEmit`).

## Notes pour l'implémenteur

- **Approche TDD** : tâches 3, 4, 7 sont strictement TDD. Les composants UI (8-15) sont en plain TS, vérifiés par le flux manuel Task 17.
- **Pas de lib externe** : drag & drop natif (`pointer events`). Pas de `react-dnd`, pas de `react-spring`, pas de `framer-motion` pour MVP.
- **Performance** : l'alpha-mask n'est pas branché dans le rendu en MVP. Si le détecteur d'overlap live devient nécessaire, le passer dans un `useEffect` debounced sur `state.vitrine.objets` (pas à chaque pointermove).
- **Save migration** : la séquence Task 5 → Task 6 doit être appliquée dans cet ordre, sinon les saves existantes peuvent crasher à l'hydratation.
- **Mocks de fixtures** : si des tests fixturent un `GameState` complet, ajouter `niveauCamion: 1`.
