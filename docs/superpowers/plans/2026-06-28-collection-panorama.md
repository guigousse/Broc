# Collection — 3ᵉ scène du panorama — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une 3ᵉ section panoramique « Collection » (le cabinet du grand-père antiquaire) à gauche du bureau, dont la vitrine centrale ouvre la grille Collection existante (désormais en overlay).

**Architecture:** Le panorama unifié (`UnifiedPanorama`) passe de 2 à 3 sections (900vw, 9 zones). La section Collection est insérée **à gauche** (offsets 0–200) ; les sections bureau/atelier existantes sont décalées d'une section dans le swipe. Pour **ne pas re-baker** les ~21 coordonnées d'objets déjà tunées (QG, atelier, slots, cartons, chats), les objets existants sont enveloppés dans un wrapper `transform: translateX(300vw)` ; seules les **images de fond** (positionnées par `left` explicite) et les **offsets de zones** changent de valeur. La grille Collection (page autonome actuelle) devient un overlay ouvert au tap de la vitrine.

**Tech Stack:** Next.js (app router, route group `(panorama)`), React 18, TypeScript, CSS-in-JS inline, Vitest + Testing Library (jsdom).

## Global Constraints

- Aspect des images de fond : **2752×1536** (ratio ~1.791:1), `object-fit: cover`, `object-position: top center`. Asset déjà en place : `public/collection/fond-collection.webp`.
- Une **section** = 300vw, **3 zones** swipables. Coordonnées objets : `left`/`width` en vw (depuis la gauche du panorama), `bottom` en % (depuis le bas de la scène).
- Le décalage d'une section vaut **300vw** (`COLLECTION_X_SHIFT_VW`).
- **Ne pas modifier** les valeurs de coordonnées dans `qg/layout.ts`, `atelier-pano/slotsLayout.ts`, `qg/stockageBoxesLayout.ts`, `qg/chatBaladeurLayout.ts` (le décalage est absorbé par le wrapper).
- Production n'utilise que `UnifiedPanorama` (les composants `QgScene`/`AtelierPanoramaView` standalone ne sont pas routés ; `useQgObjetStyle` reste exporté depuis `QgScene.tsx` et n'est pas touché).
- La vitrine est le **seul** hotspot de la section ; bibliothèque et escalier sont du décor (aucune action).

---

### Task 1: Modèle de zones du panorama unifié (9 zones, Collection à gauche)

**Files:**
- Modify: `src/components/mobile/panorama/UnifiedPanorama.tsx:20-52` (types, offsets, ordre, largeur, constantes) et `:239-244` (`zoneIndexToTab`)
- Modify: `src/lib/panoramaActiveStore.ts:10` (étendre `ActiveTab` — sinon `panoramaActiveStore.set(zoneIndexToTab(...))` casse dès que `zoneIndexToTab` peut renvoyer `"collection"`)
- Test: `src/components/mobile/panorama/unifiedZones.test.ts` (create)

**Interfaces:**
- Produces:
  - `type UnifiedZoneKey = "lecture" | "vitrine" | "escalier" | "bureau" | "porte" | "repos" | "stockage" | "etabli" | "coinL"`
  - `UNIFIED_ZONE_OFFSETS: Record<UnifiedZoneKey, number>`
  - `UNIFIED_ZONE_ORDER: UnifiedZoneKey[]` (longueur 9, ordre gauche→droite)
  - `UNIFIED_PANORAMA_WIDTH_VW = 900`
  - `COLLECTION_X_SHIFT_VW = 300`
  - `zoneIndexToTab(idx: number): "collection" | "bureau" | "stockage" | "atelier"`

- [ ] **Step 1: Écrire le test (échoue)**

Créer `src/components/mobile/panorama/unifiedZones.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  UNIFIED_ZONE_ORDER,
  UNIFIED_ZONE_OFFSETS,
  UNIFIED_PANORAMA_WIDTH_VW,
  zoneIndexToTab,
  type UnifiedZoneKey,
} from "./UnifiedPanorama";

describe("modèle de zones unifié", () => {
  it("ordonne les 9 zones gauche→droite, Collection en tête", () => {
    expect(UNIFIED_ZONE_ORDER).toEqual([
      "lecture",
      "vitrine",
      "escalier",
      "bureau",
      "porte",
      "repos",
      "stockage",
      "etabli",
      "coinL",
    ]);
  });

  it("a des offsets strictement croissants dans la largeur 900vw", () => {
    const offs = UNIFIED_ZONE_ORDER.map((z) => UNIFIED_ZONE_OFFSETS[z]);
    for (let i = 1; i < offs.length; i++) {
      expect(offs[i]).toBeGreaterThan(offs[i - 1]);
    }
    expect(offs[0]).toBeGreaterThanOrEqual(0);
    expect(offs[offs.length - 1]).toBeLessThan(UNIFIED_PANORAMA_WIDTH_VW);
  });

  it("place la section Collection (offsets < 300) avant le bureau (>= 300)", () => {
    for (const z of ["lecture", "vitrine", "escalier"] as UnifiedZoneKey[]) {
      expect(UNIFIED_ZONE_OFFSETS[z]).toBeLessThan(300);
    }
    for (const z of ["bureau", "porte", "repos"] as UnifiedZoneKey[]) {
      expect(UNIFIED_ZONE_OFFSETS[z]).toBeGreaterThanOrEqual(300);
    }
  });

  it("mappe l'index de zone vers le bon onglet", () => {
    // 0,1,2 = collection ; 3,4,5 = bureau ; 6 = stockage ; 7,8 = atelier
    expect([0, 1, 2].map(zoneIndexToTab)).toEqual([
      "collection",
      "collection",
      "collection",
    ]);
    expect([3, 4, 5].map(zoneIndexToTab)).toEqual([
      "bureau",
      "bureau",
      "bureau",
    ]);
    expect(zoneIndexToTab(6)).toBe("stockage");
    expect([7, 8].map(zoneIndexToTab)).toEqual(["atelier", "atelier"]);
  });
});
```

- [ ] **Step 2: Lancer le test (doit échouer)**

Run: `npx vitest run src/components/mobile/panorama/unifiedZones.test.ts`
Expected: FAIL (l'ordre ne contient pas encore "lecture"/"vitrine"/"escalier", `zoneIndexToTab` ne renvoie pas "collection").

- [ ] **Step 3: Modifier `UnifiedPanorama.tsx` — types, offsets, ordre, largeur, constantes**

Remplacer le bloc `:20-52` (du `export type UnifiedZoneKey` jusqu'à `export const ATELIER_X_SHIFT_VW = 300;` inclus) par :

```ts
export type UnifiedZoneKey =
  | "lecture"
  | "vitrine"
  | "escalier"
  | "bureau"
  | "porte"
  | "repos"
  | "stockage"
  | "etabli"
  | "coinL";

/**
 * Offsets en vw dans le panorama unifié (largeur totale 900vw).
 * Section Collection à gauche (0–200) ; bureau (+300) ; atelier (+600).
 * Les offsets Collection (lecture/vitrine/escalier) cadrent respectivement
 * la bibliothèque (gauche), la vitrine (centre) et l'escalier (droite).
 * À affiner contre l'art en Task 9.
 */
export const UNIFIED_ZONE_OFFSETS: Record<UnifiedZoneKey, number> = {
  lecture: 15,
  vitrine: 135,
  escalier: 250,
  bureau: 0 + 300, // 300
  porte: 100 + 300, // 400
  repos: 200 + 300, // 500
  stockage: 18 + 600, // 618
  etabli: 108 + 600, // 708
  coinL: 195 + 600, // 795
};

export const UNIFIED_ZONE_ORDER: UnifiedZoneKey[] = [
  "lecture",
  "vitrine",
  "escalier",
  "bureau",
  "porte",
  "repos",
  "stockage",
  "etabli",
  "coinL",
];

export const UNIFIED_PANORAMA_WIDTH_VW = 900;
/** Largeur d'une section (vw). Les objets QG/atelier existants sont décalés
 *  de +300vw via un wrapper translateX dans le rendu (cf. Task 4) — leurs
 *  coordonnées baked NE changent PAS. */
export const COLLECTION_X_SHIFT_VW = 300;
```

> Note : l'export `ATELIER_X_SHIFT_VW` n'était utilisé que dans un commentaire (`chatBaladeurLayout.ts`). On le supprime ; remplacer la mention par `COLLECTION_X_SHIFT_VW` n'est pas nécessaire (commentaire seul).

- [ ] **Step 4: Modifier `zoneIndexToTab` (`:239-244`)**

Remplacer la fonction par :

```ts
/** Mappe un index de zone (0-8) vers le tab URL associé. */
export function zoneIndexToTab(
  idx: number,
): "collection" | "bureau" | "stockage" | "atelier" {
  if (idx <= 2) return "collection";
  if (idx <= 5) return "bureau";
  if (idx === 6) return "stockage";
  return "atelier";
}
```

- [ ] **Step 5: Étendre `ActiveTab` dans `panoramaActiveStore.ts`**

Ligne 10 de `src/lib/panoramaActiveStore.ts` :

```ts
type ActiveTab = "collection" | "bureau" | "stockage" | "atelier" | null;
```

(Nécessaire dès maintenant : `handleZoneIndex` appelle `panoramaActiveStore.set(zoneIndexToTab(snapIdx))`, qui peut renvoyer `"collection"`.)

- [ ] **Step 6: Lancer le test (doit passer)**

Run: `npx vitest run src/components/mobile/panorama/unifiedZones.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Vérifier qu'aucun import cassé ne subsiste**

Run: `grep -rn "ATELIER_X_SHIFT_VW" src/` — Expected : aucune occurrence. Puis `npx tsc --noEmit` (peut encore signaler des erreurs dans `layout.tsx`/`TabBar.tsx` — cible URL `/collection` et highlight live — traitées aux Tasks 7 & 8 ; aucune nouvelle erreur dans `UnifiedPanorama.tsx` ni `panoramaActiveStore.ts`).

- [ ] **Step 8: Commit**

```bash
git add src/components/mobile/panorama/UnifiedPanorama.tsx src/components/mobile/panorama/unifiedZones.test.ts src/lib/panoramaActiveStore.ts
git commit -m "feat(collection): modèle de zones panorama 9 zones (Collection à gauche)"
```

---

### Task 2: Module de courbes audio (extraction + décalage Collection)

Les fonctions de volume vinyle/cheminée sont indexées par l'index de zone fractionnaire. L'insertion de la Collection décale les zones bureau/atelier de +3. On extrait ces fonctions pures dans un module testable et on les recale.

**Files:**
- Create: `src/components/mobile/panorama/audioCurves.ts`
- Test: `src/components/mobile/panorama/audioCurves.test.ts`
- Modify (Task 7) : `src/app/(panorama)/layout.tsx` importera ces fonctions (suppression des versions locales).

**Interfaces:**
- Produces:
  - `volumeVinylForPos(pos: number): number`
  - `fireplaceVolumeForPos(pos: number): number`
  (toutes deux prenant l'index de zone fractionnaire 0..8 du panorama 9 zones)

- [ ] **Step 1: Écrire le test (échoue)**

Créer `src/components/mobile/panorama/audioCurves.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { volumeVinylForPos, fireplaceVolumeForPos } from "./audioCurves";

describe("audioCurves (panorama 9 zones)", () => {
  it("vinyle : faible dans la Collection (0..2), pic au repos (idx 5)", () => {
    expect(volumeVinylForPos(0)).toBeCloseTo(0.3); // lecture
    expect(volumeVinylForPos(1)).toBeCloseTo(0.3); // vitrine
    expect(volumeVinylForPos(3)).toBeCloseTo(0.3); // bureau
    expect(volumeVinylForPos(5)).toBeCloseTo(0.8); // repos (gramophone)
    expect(volumeVinylForPos(6)).toBeCloseTo(0.4); // stockage
    expect(volumeVinylForPos(8)).toBeGreaterThanOrEqual(0.2); // coinL plancher
  });

  it("cheminée : nulle hors bureau, pic au repos (idx 5)", () => {
    expect(fireplaceVolumeForPos(0)).toBe(0); // collection
    expect(fireplaceVolumeForPos(3)).toBeCloseTo(0); // bureau gauche
    expect(fireplaceVolumeForPos(5)).toBeCloseTo(0.6); // repos
    expect(fireplaceVolumeForPos(8)).toBe(0); // atelier
  });
});
```

- [ ] **Step 2: Lancer le test (doit échouer)**

Run: `npx vitest run src/components/mobile/panorama/audioCurves.test.ts`
Expected: FAIL (`audioCurves.ts` n'existe pas).

- [ ] **Step 3: Créer `audioCurves.ts`**

```ts
/**
 * Courbes de volume audio pilotées par l'index de zone fractionnaire du
 * panorama unifié 9 zones (0 = lecture … 8 = coinL).
 *
 * Repère des zones :
 *   0 lecture · 1 vitrine · 2 escalier   (Collection)
 *   3 bureau  · 4 porte   · 5 repos      (Bureau — gramophone+cheminée au repos)
 *   6 stockage · 7 etabli · 8 coinL      (Atelier)
 */

/** Volume vinyle : faible dans la Collection, ramp dans le bureau (pic au
 *  repos = gramophone), décroissance douce vers l'atelier. */
export function volumeVinylForPos(pos: number): number {
  if (pos <= 3) return 0.3; // collection + bureau gauche
  if (pos <= 4) return 0.3 + 0.2 * (pos - 3); // 0.3 → 0.5 (porte)
  if (pos <= 5) return 0.5 + 0.3 * (pos - 4); // 0.5 → 0.8 (repos)
  if (pos <= 6) return 0.8 - 0.4 * (pos - 5); // 0.8 → 0.4 (stockage)
  if (pos <= 7) return 0.4 - 0.1 * (pos - 6); // 0.4 → 0.3 (etabli)
  return Math.max(0.2, 0.3 - 0.1 * (pos - 7)); // 0.3 → 0.2 (coinL)
}

/** Volume cheminée : triangulaire, nul hors bureau, pic au repos (idx 5). */
export function fireplaceVolumeForPos(pos: number): number {
  if (pos <= 3) return 0; // collection + bureau gauche : pas de feu visible
  if (pos <= 5) return 0.3 * (pos - 3); // 0 → 0.6 (repos)
  return Math.max(0, 0.6 - 0.2 * (pos - 5)); // 0.6 → 0 (atelier)
}
```

- [ ] **Step 4: Lancer le test (doit passer)**

Run: `npx vitest run src/components/mobile/panorama/audioCurves.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/panorama/audioCurves.ts src/components/mobile/panorama/audioCurves.test.ts
git commit -m "feat(collection): courbes audio panorama recalées sur 9 zones"
```

---

### Task 3: Données + hotspot de la section Collection

**Files:**
- Create: `src/components/mobile/collection-pano/layout.ts`
- Create: `src/components/mobile/collection-pano/CollectionVitrine.tsx`

**Interfaces:**
- Produces:
  - `COLLECTION_LAYOUT` (`panoramaWidth`, `panoramaAspect`, `zones`, `objets.vitrine`)
  - `type CollectionObjetKey = "vitrine"`
  - `collectionObjetStyle(key: CollectionObjetKey): CSSProperties`
  - `<CollectionVitrine onTap={() => void} />`

- [ ] **Step 1: Créer `collection-pano/layout.ts`**

```ts
import type { CSSProperties } from "react";

/**
 * Coordonnées de la section Collection (cabinet du grand-père).
 *
 * Section de 300vw, posée à GAUCHE du bureau dans le panorama unifié (offsets
 * 0–300). La vitrine est rendue NON décalée (left absolu 0–300vw) — contrairement
 * aux objets QG/atelier qui sont décalés de +300vw par un wrapper (cf. Task 4).
 *
 * `left`/`width` en vw, `bottom` en % depuis le bas de la scène.
 * Valeurs initiales estimées sur l'image — à affiner en Task 9 (npm run dev).
 */
export const COLLECTION_LAYOUT = {
  panoramaWidth: 300, // vw
  panoramaAspect: { w: 2752, h: 1536 },
  objets: {
    // Grande vitrine vitrée centrale (le hotspot).
    vitrine: { left: 118, bottom: 40, width: 64, aspectRatio: "1 / 0.95" },
  },
} as const;

export type CollectionObjetKey = keyof typeof COLLECTION_LAYOUT.objets;

/** Style absolu d'un objet de la section Collection (pas de surcouche d'édition). */
export function collectionObjetStyle(key: CollectionObjetKey): CSSProperties {
  const o = COLLECTION_LAYOUT.objets[key];
  return {
    position: "absolute",
    left: `${o.left}vw`,
    bottom: `${o.bottom}%`,
    width: `${o.width}vw`,
    aspectRatio: o.aspectRatio,
    pointerEvents: "auto",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    padding: 0,
  };
}
```

- [ ] **Step 2: Créer `collection-pano/CollectionVitrine.tsx`**

```tsx
"use client";

import { collectionObjetStyle } from "./layout";

interface CollectionVitrineProps {
  onTap: () => void;
}

/**
 * Hotspot de la vitrine du cabinet : ouvre la grille Collection (overlay).
 * Décor statique — la vitrine dessinée ne reflète pas les objets possédés.
 */
export function CollectionVitrine({ onTap }: CollectionVitrineProps) {
  return (
    <button
      type="button"
      aria-label="Ouvrir la collection"
      onClick={onTap}
      style={collectionObjetStyle("vitrine")}
    />
  );
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "collection-pano" || echo "OK collection-pano"`
Expected: `OK collection-pano` (aucune erreur dans ces fichiers).

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/collection-pano/
git commit -m "feat(collection): layout + hotspot vitrine de la section panorama"
```

---

### Task 4: Rendu `UnifiedPanorama` — 3 fonds + wrapper de décalage + slot Collection

On rend 3 images de fond (collection@0, qg@300, atelier@600), on enveloppe les objets QG/atelier existants (+ l'overlay d'édition) dans un wrapper `translateX(300vw)`, et on ajoute un prop `collectionChildren` rendu NON décalé (la vitrine).

**Files:**
- Modify: `src/components/mobile/panorama/UnifiedPanorama.tsx` (styles de fond `:88-112`, props `:121-135`, rendu `:194-221`)

**Interfaces:**
- Consumes: `COLLECTION_X_SHIFT_VW`, `UNIFIED_PANORAMA_WIDTH_VW` (Task 1)
- Produces: prop `collectionChildren?: ReactNode` sur `UnifiedPanorama` (rendu à gauche, offsets 0–300, non décalé).

- [ ] **Step 1: Remplacer les styles de fond (`bgQgStyle`/`bgAtelierStyle`, `:88-112`) par trois fonds + le wrapper**

Remplacer les deux constantes `bgQgStyle` et `bgAtelierStyle` par :

```ts
const bgSectionStyle = (leftVw: number): CSSProperties => ({
  position: "absolute",
  left: `${leftVw}vw`,
  top: 0,
  width: "300vw",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  pointerEvents: "none",
  userSelect: "none",
  display: "block",
});

/** Wrapper des objets QG/atelier : décalés de +300vw (section Collection
 *  insérée à gauche) sans toucher à leurs coordonnées baked. */
const shiftedObjectsLayer: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  transform: `translateX(${COLLECTION_X_SHIFT_VW}vw)`,
  pointerEvents: "none",
};
```

- [ ] **Step 2: Ajouter le prop `collectionChildren` à l'interface et à la signature (`:121-135`)**

Dans `interface UnifiedPanoramaProps`, ajouter :

```ts
  /** Objets de la section Collection (gauche, offsets 0–300, NON décalés). */
  collectionChildren?: ReactNode;
```

Dans la signature de `UnifiedPanorama`, ajouter `collectionChildren,` à la déstructuration des props.

- [ ] **Step 3: Remplacer le bloc de rendu de la scène (`:201-221`)**

Remplacer le `<div style={sceneStyle} data-unified-scene="1"> … </div>` par :

```tsx
      <div style={sceneStyle} data-unified-scene="1">
        {/* Fonds stitchés : collection (0) · bureau (300) · atelier (600) */}
        <img
          src="/collection/fond-collection.webp"
          alt=""
          style={bgSectionStyle(0)}
          draggable={false}
        />
        <img
          src="/qg/fond-cabinet.webp"
          alt=""
          style={bgSectionStyle(300)}
          draggable={false}
        />
        <img
          src="/atelier/fond-atelier.png"
          alt=""
          style={bgSectionStyle(600)}
          draggable={false}
        />
        {/* Objets interactifs positionnés au-dessus */}
        <div style={objectsLayer}>
          {/* Section Collection : NON décalée (left absolu 0–300vw). */}
          {collectionChildren}
          {/* QG + atelier : décalés de +300vw (wrapper), coords baked inchangées. */}
          <div style={shiftedObjectsLayer}>
            {children}
            {/* L'overlay s'auto-gate via le contexte d'édition (enabled + active).
                Dans le wrapper → ses cadres restent alignés sur les objets QG/atelier. */}
            <QgEditOverlay />
          </div>
        </div>
      </div>
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "UnifiedPanorama" || echo "OK UnifiedPanorama"`
Expected: `OK UnifiedPanorama`.

- [ ] **Step 5: Lancer la suite de tests panorama (non-régression)**

Run: `npx vitest run src/components/mobile/panorama/`
Expected: PASS (Tasks 1 & 2).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/panorama/UnifiedPanorama.tsx
git commit -m "feat(collection): rendu panorama 3 fonds + wrapper de décalage objets"
```

---

### Task 5: Overlay de la grille Collection (refonte de la page autonome)

La page `/collection` actuelle devient un overlay `CollectionGridOverlay` (mêmes fonctionnalités : filtre catégorie, grille, détail, don), ouvert par-dessus le panorama au tap de la vitrine.

**Files:**
- Create: `src/components/mobile/CollectionGridOverlay.tsx` (logique reprise de `src/app/collection/page.tsx`)
- Test: `src/components/mobile/CollectionGridOverlay.test.tsx`

**Interfaces:**
- Produces: `<CollectionGridOverlay open={boolean} onClose={() => void} />`
- Consumes: `useGame()` (état + actions `donnerACollection`, `retirerDeCollection`, `marquerVuDansCollection`), composants existants `CollectionGrid`, `CategoriePicker`, `CollectionDetailOverlay`, `DonationPickerSheet`, `ConfirmModal`, `ColonnesSlider`, hook `useColonnesCollection`, `useToast`.

- [ ] **Step 1: Créer `CollectionGridOverlay.tsx`**

Reprendre intégralement le corps de `src/app/collection/page.tsx` en :
- supprimant `MobileLayout`/`MobileHeader`/`StickyTop`/`PageHeaderBar`/`SkeletonScreen` et la redirection `router.replace("/")` (l'overlay vit dans le panorama, déjà gardé) ;
- enveloppant le contenu dans un conteneur overlay plein écran (au-dessus du panorama) avec en-tête (titre « Collection » + total) et bouton fermer ;
- gérant `open` (rien rendu si `!open`).

```tsx
"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { CollectionGrid } from "@/components/CollectionGrid";
import { ColonnesSlider } from "@/components/mobile/ColonnesSlider";
import { useColonnesCollection } from "@/lib/useColonnesCollection";
import { CollectionDetailOverlay } from "@/components/mobile/CollectionDetailOverlay";
import { DonationPickerSheet } from "@/components/mobile/DonationPickerSheet";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { stockageEstPlein } from "@/lib/stockage";
import { valeurDonation } from "@/lib/collection";
import type { CategorieObjet, CollectionSlot, Objet } from "@/types/game";

interface CollectionGridOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function CollectionGridOverlay({ open, onClose }: CollectionGridOverlayProps) {
  const {
    state,
    donnerACollection,
    retirerDeCollection,
    marquerVuDansCollection,
  } = useGame();
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
  const [slotActif, setSlotActif] = useState<CollectionSlot | null>(null);
  const [pickerOuvert, setPickerOuvert] = useState(false);
  const [objetADonner, setObjetADonner] = useState<Objet | null>(null);
  const [colonnes, setColonnes] = useColonnesCollection();

  const slotsFiltres: CollectionSlot[] = useMemo(() => {
    if (!state) return [];
    if (filtre) return state.collection[filtre] ?? [];
    return CATEGORIES.flatMap((c) => state.collection[c] ?? []);
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES)
      acc[c] = (state.collection[c] ?? []).filter((s) => s.donation !== null).length;
    return acc;
  }, [state]);

  const totauxParCat = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES) acc[c] = (state.collection[c] ?? []).length;
    return acc;
  }, [state]);

  const valeursParCat = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES) {
      acc[c] = (state.collection[c] ?? []).reduce(
        (s, slot) => s + (slot.donation?.valeur ?? 0),
        0,
      );
    }
    return acc;
  }, [state]);

  const candidats = useMemo(() => {
    if (!state || !slotActif) return [];
    return state.inventaireJoueur.filter((o) => o.templateId === slotActif.templateId);
  }, [state, slotActif]);

  const enStockIds = useMemo(
    () => new Set((state?.inventaireJoueur ?? []).map((o) => o.templateId)),
    [state],
  );

  if (!open || !state) return null;

  const nouveautesParCat = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = (state.collection[c] ?? []).some(
        (s) => s.vu && s.vuDansCollection === false,
      );
      return acc;
    },
    {} as Record<CategorieObjet, boolean>,
  );

  const labelGauche = filtre ?? "Total";
  const valeurAffichee = filtre
    ? (valeursParCat[filtre] ?? 0)
    : Object.values(valeursParCat).reduce((s, v) => s + v, 0);
  const plein = stockageEstPlein(state);

  return (
    <>
      <div
        role="dialog"
        aria-label="Collection"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "var(--wood-light)",
          display: "flex",
          flexDirection: "column",
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "10px 12px",
            background: "var(--paper)",
            borderBottom: "2px solid var(--brass-500)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
            }}
          >
            Collection
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              marginLeft: "auto",
            }}
          >
            {labelGauche} · {valeurAffichee} €
          </span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              border: "1px solid var(--brass-500)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--forest-800)",
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: "6px 12px 0" }}>
          <CategoriePicker
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={Object.values(comptes).reduce((s, v) => s + (v ?? 0), 0)}
            totauxParCat={totauxParCat}
            totalGlobal={Object.values(totauxParCat).reduce((s, v) => s + (v ?? 0), 0)}
            nouveautesParCat={nouveautesParCat}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "12px 0 56px",
          }}
        >
          <CollectionGrid
            slots={slotsFiltres}
            colonnes={colonnes}
            enStockIds={enStockIds}
            onTap={(s) => {
              if (s.vu && s.vuDansCollection === false) {
                marquerVuDansCollection(s.templateId);
              }
              setSlotActif(s);
            }}
          />
        </div>
        <ColonnesSlider value={colonnes} onChange={setColonnes} />
      </div>

      <CollectionDetailOverlay
        open={slotActif !== null && !pickerOuvert}
        onClose={() => setSlotActif(null)}
        slot={slotActif}
        candidatsCount={candidats.length}
        retirerDisabled={plein}
        onAjouter={() => setPickerOuvert(true)}
        onRetirer={() => {
          if (!slotActif?.donation) return;
          const res = retirerDeCollection(slotActif.templateId);
          if (res.ok) {
            setSlotActif(null);
            toast("Repris dans le stock", { type: "info" });
          }
        }}
      />
      <DonationPickerSheet
        open={pickerOuvert}
        onClose={() => setPickerOuvert(false)}
        slot={slotActif}
        candidats={candidats}
        onDonner={(objetId) => {
          const objet = candidats.find((o) => o.id === objetId) ?? null;
          setObjetADonner(objet);
        }}
        retirerDisabled={plein}
      />
      <ConfirmModal
        open={objetADonner !== null}
        onClose={() => setObjetADonner(null)}
        onConfirm={() => {
          if (!objetADonner) return;
          const valeur = valeurDonation(
            objetADonner.etat,
            objetADonner.prixReferenceReel,
          );
          const res = donnerACollection(objetADonner.id);
          if (res.ok) {
            setPickerOuvert(false);
            setSlotActif(null);
            toast(`Donné à la collection — +${valeur} € de valeur`, {
              type: "succes",
            });
          }
        }}
        titre="Donner à la collection"
        confirmLabel="Donner"
      >
        {objetADonner && (
          <>
            « {objetADonner.nom} » ({objetADonner.etat}) quittera votre stock et
            rejoindra la collection pour{" "}
            {valeurDonation(objetADonner.etat, objetADonner.prixReferenceReel)} €
            de valeur.
            {slotActif?.donation
              ? " L'exemplaire déjà exposé reviendra dans votre inventaire."
              : ""}
          </>
        )}
      </ConfirmModal>
    </>
  );
}
```

- [ ] **Step 2: Écrire un test de fumée**

Créer `src/components/mobile/CollectionGridOverlay.test.tsx`. Mirror le pattern de `BrocantePanorama.test.tsx` (jsdom, mocks). Mock `@/context/GameContext` (`useGame`) avec un `state` minimal et `@/components/ui/Toast` (`useToast`).

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CollectionGridOverlay } from "./CollectionGridOverlay";
import type { GameState } from "@/types/game";

afterEach(cleanup);

const minimalState = {
  budget: 0,
  inventaireJoueur: [],
  collection: {
    Musique: [],
    "Jeux & Loisirs": [],
    "Livres & Papeterie": [],
    Mode: [],
    Maison: [],
    "Objets d'art": [],
    Bricolage: [],
  },
} as unknown as GameState;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    state: minimalState,
    donnerACollection: vi.fn(),
    retirerDeCollection: vi.fn(),
    marquerVuDansCollection: vi.fn(),
  }),
}));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("CollectionGridOverlay", () => {
  it("ne rend rien quand fermé", () => {
    const { container } = render(
      <CollectionGridOverlay open={false} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("rend le titre Collection quand ouvert", () => {
    render(<CollectionGridOverlay open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Collection" })).toBeTruthy();
  });
});
```

- [ ] **Step 3: Lancer le test**

Run: `npx vitest run src/components/mobile/CollectionGridOverlay.test.tsx`
Expected: PASS (2 tests). Si un composant enfant (ex. `CategoriePicker`) requiert un provider manquant en jsdom, le mocker au minimum dans le test (suivre l'erreur exacte).

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/CollectionGridOverlay.tsx src/components/mobile/CollectionGridOverlay.test.tsx
git commit -m "feat(collection): grille Collection en overlay (refonte page autonome)"
```

---

### Task 6: Route — marqueur Collection dans le groupe panorama + suppression de l'ancienne page

**Files:**
- Create: `src/app/(panorama)/collection/page.tsx`
- Delete: `src/app/collection/page.tsx`

- [ ] **Step 1: Créer le marqueur de route**

`src/app/(panorama)/collection/page.tsx` :

```tsx
// Marqueur de route : tout le rendu est porté par (panorama)/layout.tsx
// (panorama unifié). La section Collection (cabinet) est la zone d'arrivée.
export default function CollectionRouteMarker() {
  return null;
}
```

- [ ] **Step 2: Supprimer l'ancienne page autonome**

```bash
git rm src/app/collection/page.tsx
```

- [ ] **Step 3: Vérifier qu'aucune autre référence n'attend l'ancienne page**

Run: `grep -rn "app/collection" src/ ; grep -rn "from \"@/app/collection" src/`
Expected: aucune occurrence. (La nav vers `/collection` se fait par chemin string via la TabBar, inchangée.)

- [ ] **Step 4: Vérifier l'absence de conflit de route**

Run: `npx next build --no-lint 2>&1 | grep -iE "collection|conflict|duplicate" | head` (ou, plus rapide, `ls src/app/collection 2>/dev/null` doit ne montrer aucun `page.tsx`, et `ls "src/app/(panorama)/collection"` doit montrer `page.tsx`).
Expected: pas de conflit `/collection`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(panorama)/collection/page.tsx"
git commit -m "feat(collection): route /collection portée par le panorama (marqueur)"
```

---

### Task 7: Câblage dans `(panorama)/layout.tsx`

**Files:**
- Modify: `src/app/(panorama)/layout.tsx` (fonctions de tab, type `currentTab`, virtualisation, rendu vitrine + overlay grille, imports audio)

**Interfaces:**
- Consumes: `zoneIndexToTab` (Task 1), `volumeVinylForPos`/`fireplaceVolumeForPos` (Task 2), `CollectionVitrine` (Task 3), `CollectionGridOverlay` (Task 5).

- [ ] **Step 1: Imports — ajouter les nouveaux modules, supprimer les fonctions audio locales**

En tête de fichier, ajouter :

```ts
import {
  volumeVinylForPos,
  fireplaceVolumeForPos,
} from "@/components/mobile/panorama/audioCurves";
import { CollectionVitrine } from "@/components/mobile/collection-pano/CollectionVitrine";
import { CollectionGridOverlay } from "@/components/mobile/CollectionGridOverlay";
```

Supprimer les définitions locales `function volumeVinylForPos(...)` (`:73-80`) et `function fireplaceVolumeForPos(...)` (`:83-87`) — désormais importées.

- [ ] **Step 2: Étendre `tabToInitialZone` et `pathnameToTab` (`:89-102`) avec "collection"**

```ts
/** Mappe un tab → initialZone du panorama. */
function tabToInitialZone(
  tab: "collection" | "bureau" | "stockage" | "atelier",
): UnifiedZoneKey {
  if (tab === "collection") return "vitrine"; // centre de la section
  if (tab === "bureau") return "porte";
  if (tab === "stockage") return "stockage";
  return "etabli";
}

function pathnameToTab(
  pathname: string,
): "collection" | "bureau" | "stockage" | "atelier" {
  if (pathname.startsWith("/collection")) return "collection";
  if (pathname.startsWith("/stockage")) return "stockage";
  if (pathname.startsWith("/atelier")) return "atelier";
  return "bureau";
}
```

- [ ] **Step 3: Étendre la cible URL du débounce (`:208-220`)**

Dans le `setTimeout` de `handleZoneIndex`, remplacer le calcul de `target` par :

```ts
        const targetTab = zoneIndexToTab(Math.round(zoneIdxRef.current));
        if (targetTab !== currentTab) {
          const target =
            targetTab === "collection"
              ? "/collection"
              : targetTab === "bureau"
                ? "/bureau"
                : targetTab === "stockage"
                  ? "/stockage"
                  : "/atelier";
          router.replace(target, { scroll: false });
        }
```

- [ ] **Step 4: Recaler la virtualisation des zones QG + ajouter la zone vitrine (`:444-445`)**

Les zones bureau/porte/repos sont désormais aux index 3/4/5. Remplacer le helper :

```ts
  // Virtualisation : monte un objet si sa zone est à distance ≤ 1 de la zone
  // active (index 0..8). bureau/porte/repos = 3/4/5 ; vitrine = 1.
  const showQgZone = (qgZoneIdx: 3 | 4 | 5) =>
    Math.abs(zoneActive - qgZoneIdx) <= 1;
  const showVitrineZone = Math.abs(zoneActive - 1) <= 1;
```

Puis dans le JSX, changer les trois appels :
- `showQgZone(0)` → `showQgZone(3)` (bloc carnet/bureau)
- `showQgZone(1)` → `showQgZone(4)` (bloc porte)
- `showQgZone(2)` → `showQgZone(5)` (bloc fauteuil/gramophone)

- [ ] **Step 5: Ajouter un état d'ouverture de la grille + le rendu de la vitrine**

Près des autres `useState` de sheets (`:138-147`), ajouter :

```ts
  const [grilleCollectionOuverte, setGrilleCollectionOuverte] = useState(false);
```

Passer la vitrine via le **nouveau prop** `collectionChildren` de `UnifiedPanorama` (rendu non décalé). Modifier l'ouverture de `<UnifiedPanorama …>` (`:497-500`) :

```tsx
          <UnifiedPanorama
            initialZone={mountInitialZoneRef.current}
            onZoneIndex={handleZoneIndex}
            collectionChildren={
              showVitrineZone && (
                <CollectionVitrine
                  onTap={() => {
                    playClick();
                    setGrilleCollectionOuverte(true);
                  }}
                />
              )
            }
          >
```

- [ ] **Step 6: Rendre l'overlay de grille (près des autres sheets, après `</MobileLayout>`/`{children}`)**

Ajouter, à côté des autres sheets (ex. après `<GazetteSheet … />`, `:741`) :

```tsx
      <CollectionGridOverlay
        open={grilleCollectionOuverte}
        onClose={() => setGrilleCollectionOuverte(false)}
      />
```

- [ ] **Step 7: Vérifier types + tests**

Run: `npx tsc --noEmit 2>&1 | grep -E "panorama/layout|collection" || echo "OK layout"`
Expected: `OK layout` (le type union élargi de `currentTab` se propage ; `tabToInitialZone(currentTab)` et `pathnameToTab` acceptent "collection").
Run: `npx vitest run src/components/mobile/panorama/ src/components/mobile/CollectionGridOverlay.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(panorama)/layout.tsx"
git commit -m "feat(collection): câble la scène Collection + overlay grille dans le panorama"
```

---

### Task 8: Highlight live de l'onglet Collection (TabBar)

> `ActiveTab` a déjà été étendu en Task 1 (Step 5). Ici on ne touche qu'à la TabBar.

**Files:**
- Modify: `src/components/mobile/TabBar.tsx:156-163` (mapping `liveTabPath`)

- [ ] **Step 1: Mapper "collection" → "/collection" dans la TabBar**

`src/components/mobile/TabBar.tsx`, remplacer le calcul de `liveTabPath` (`:156-163`) :

```ts
  const liveTabPath =
    liveTab === "collection"
      ? "/collection"
      : liveTab === "bureau"
        ? "/bureau"
        : liveTab === "stockage"
          ? "/stockage"
          : liveTab === "atelier"
            ? "/atelier"
            : null;
```

> L'onglet « Collection » (`Album` → `/collection`) et « Biblio. » (`/bibliotheque`) existent déjà dans `TAB_ORDER` — aucun ajout. La zone décor « lecture » (bibliothèque dessinée) de la scène n'est PAS liée à l'onglet Biblio. (pas de hotspot).

- [ ] **Step 2: Vérifier types + non-régression**

Run: `npx tsc --noEmit 2>&1 | grep -E "TabBar" || echo "OK tabbar"`
Expected: `OK tabbar`.

- [ ] **Step 3: Commit**

```bash
git add src/components/mobile/TabBar.tsx
git commit -m "feat(collection): highlight live de l'onglet Collection dans la TabBar"
```

---

### Task 9: Vérification visuelle + calage des coordonnées

**Files:**
- Modify (au besoin): `src/components/mobile/collection-pano/layout.ts` (coords vitrine), `src/components/mobile/panorama/UnifiedPanorama.tsx` (offsets `lecture`/`vitrine`/`escalier`)

- [ ] **Step 1: Lancer l'app**

Run: `npm run dev` puis ouvrir sur mobile/responsive (la TabBar n'apparaît qu'en layout mobile).

- [ ] **Step 2: Vérifier la suite complète**

Run: `npx vitest run`
Expected: PASS (aucune régression ; nouveaux tests verts).

- [ ] **Step 3: Vérifications manuelles (cocher chaque point)**
  - Onglet **Collection** → on arrive sur la **scène cabinet** (vitrine centrée).
  - Swipe **vers la gauche depuis le bureau** → on entre dans la Collection (ordre Collection → Bureau → Atelier).
  - Les **9 dots** s'affichent ; le dot actif suit le swipe ; la TabBar surligne la bonne section en temps réel.
  - Le **bureau et l'atelier sont intacts** (objets bien placés : carnet, porte, gramophone, cartons de stockage, slots d'établi, chats) — preuve que le wrapper de décalage fonctionne.
  - Taper la **vitrine** → ouvre l'**overlay grille** (filtre, détail, don OK) ; fermer revient à la scène.
  - L'URL passe à `/collection` quand on s'arrête sur la section ; back/refresh recharge bien la scène.

- [ ] **Step 4: Affiner les coordonnées si nécessaire**

Si la vitrine n'est pas bien cadrée/cliquable : ajuster `COLLECTION_LAYOUT.objets.vitrine` (`left`/`bottom`/`width`/`aspectRatio`) dans `collection-pano/layout.ts`. Si le cadrage des zones est décalé : ajuster `UNIFIED_ZONE_OFFSETS.lecture/vitrine/escalier` dans `UnifiedPanorama.tsx`. (Astuce : `?qgedit=1` n'inclut pas la vitrine ; calage à l'œil + refresh.)

- [ ] **Step 5: Commit (si ajustements)**

```bash
git add src/components/mobile/collection-pano/layout.ts src/components/mobile/panorama/UnifiedPanorama.tsx
git commit -m "fix(collection): calage des coordonnées de la vitrine et des zones"
```

---

## Récapitulatif des fichiers

**Créés :**
- `src/components/mobile/panorama/audioCurves.ts` (+ test)
- `src/components/mobile/panorama/unifiedZones.test.ts`
- `src/components/mobile/collection-pano/layout.ts`
- `src/components/mobile/collection-pano/CollectionVitrine.tsx`
- `src/components/mobile/CollectionGridOverlay.tsx` (+ test)
- `src/app/(panorama)/collection/page.tsx`

**Modifiés :**
- `src/components/mobile/panorama/UnifiedPanorama.tsx`
- `src/app/(panorama)/layout.tsx`
- `src/lib/panoramaActiveStore.ts`
- `src/components/mobile/TabBar.tsx`

**Supprimé :**
- `src/app/collection/page.tsx`

**Asset (déjà en place) :** `public/collection/fond-collection.webp`
