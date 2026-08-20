# Décor du Bazar — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'écran nu du Bazar par un lieu illustré — un panorama à trois zones qu'on parcourt au swipe, où les articles de la semaine sont posés sur les étagères d'un comptoir.

**Architecture:** Le châssis de panorama du bureau (`UnifiedPanorama`) est généralisé par trois props (image, aspect, zones) au lieu d'être recopié ; le Bazar l'instancie avec son propre décor. Les articles sont des boutons positionnés en pourcentage au-dessus du fond, via un fichier de coordonnées calqué sur celui du QG et calé avec l'outil dev existant. Aucune illustration nouvelle n'est commandée pour les articles : les lots réutilisent `PieceIcon`, l'objet de la semaine réutilise `ItemImage`.

**Tech Stack:** Next.js 16 (App Router, `"use client"`), TypeScript strict, React 19, Vitest + Testing Library, Tauri v2 (iOS/Android), Gemini Image API pour le fond.

**Spec:** `docs/superpowers/specs/2026-08-20-bazar-decor-design.md`

## Global Constraints

- **Tests :** `npx vitest run --maxWorkers=4 <fichier>`. **Le drapeau `--maxWorkers=4` est obligatoire** sur cette machine : sans lui, ~41 tests échouent par famine de workers, et le diagnostic est trompeur.
- **Lint :** `npx eslint src` (et non `npm run lint`, cassé depuis Next 16). `npx tsc --noEmit` doit rester vert.
- **Aucun champ de save n'est touché : `SAVE_VERSION` ne bouge pas** (elle reste à 20). Ce chantier est purement présentation.
- **i18n : quatre langues obligatoires** — `fr`, `en`, `es`, `el`. `src/lib/i18n/ui/ui.test.ts` vérifie la parité des placeholders `{x}` ; TypeScript vérifie la présence des clés. Le Bazar **vouvoie** le joueur (cf. `bazar.soldeJetons: "Vos jetons : {n}"`) — toute chaîne neuve doit vouvoyer.
- **Coordonnées en vw sur un panorama de référence de 300vw**, converties en % par `qgPct`. C'est la convention du QG et **la seule que l'outil de calage dev sait manipuler** (son drag calcule en `window.innerWidth / 100`). Ne pas inventer une convention en % pour le Bazar : l'outil deviendrait inutilisable.
- **Rien à cheval sur 33 % ni 66 %** de la largeur du fond : ce sont les frontières de snap du swipe.
- **Commits fréquents**, un par tâche minimum, message en français à l'impératif implicite (voir l'historique du dépôt).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `src/components/bazar/bazarLayout.ts` | Les coordonnées des objets de la scène. Rien d'autre. |
| `src/components/bazar/BazarScene.tsx` | La scène : le panorama, les articles posés, les emplacements muets. |
| `src/components/bazar/ArticleBazar.tsx` | Un article posé : visuel, étiquette de prix, état hors de portée. |
| `public/bazar/fond-bazar.webp` | Le fond illustré, 2752×1536. |

**Modifiés :**

| Fichier | Ce qui change |
|---|---|
| `src/components/mobile/panorama/UnifiedPanorama.tsx` | Props `image`, `aspect`, `zones`, `ariaLabel`, `editKeys` ; défauts = bureau |
| `src/components/mobile/qg/dev/QgEditContext.tsx` | `EditableKey` et `baseCoord` connaissent les clés du Bazar |
| `src/components/mobile/qg/dev/QgEditOverlay.tsx` | Prop `cles` : l'overlay n'affiche que les clés de la scène montée |
| `src/app/bazar/page.tsx` | Rend `BazarScene` au lieu d'`EtalBazarVue` |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | Libellés neufs du Bazar |
| `scripts/qg-prompts.json` | Entrée `fond-bazar` |

**Supprimés :**

| Fichier | Pourquoi |
|---|---|
| `src/components/bazar/EtalBazar.tsx` | Remplacé par la scène. Ses cas de test migrent vers `BazarScene.test.tsx`. |
| `src/components/bazar/EtalBazar.test.tsx` | Idem. |

Le découpage sépare **où sont les choses** (`bazarLayout.ts`), **la scène** (`BazarScene.tsx`) et **un article** (`ArticleBazar.tsx`). Un article a sa propre logique (prix, hors de portée, vendu) qui grossira au chantier ④ quand les paquets de cartes rejoindront l'étal ; le garder dans la scène ferait un fichier qui enfle à chaque chantier.

---

### Task 1 : Le panorama accepte un décor

Généraliser `UnifiedPanorama` sans toucher au bureau.

**Files:**
- Modify: `src/components/mobile/panorama/UnifiedPanorama.tsx`
- Test: `src/components/mobile/panorama/UnifiedPanorama.test.tsx` (créer)

**Interfaces:**
- Consomme : rien.
- Produit :
  - `export interface PanoramaZone { key: string; center: number }`
  - `export const ZONES_BUREAU: PanoramaZone[]`
  - Props : `image?: string`, `aspect?: { w: number; h: number }`, `zones?: PanoramaZone[]`, `ariaLabel?: string`, `editKeys?: EditableKey[]`, `initialZone?: string`, `children?: ReactNode`, `onZoneIndex?: (idx: number) => void`.
  - Défaut d'`initialZone` : **la zone du milieu** — `zones[Math.floor(zones.length / 2)].key`. Pour le bureau ça vaut `porte` (comportement actuel), pour le Bazar `comptoir`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/mobile/panorama/UnifiedPanorama.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UnifiedPanorama, ZONES_BUREAU } from "./UnifiedPanorama";

afterEach(cleanup);

// Pas de LangueProvider : `useLangue` lit un contexte qui a une valeur par
// défaut (fr). C'est la convention de tous les tests de composants du dépôt,
// cf. `EtalBazar.test.tsx`.

describe("UnifiedPanorama", () => {
  it("garde le décor du bureau quand on ne lui passe rien", () => {
    const { container } = render(<UnifiedPanorama />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/qg/fond-cabinet.webp");
    const ancres = [...container.querySelectorAll("[data-unified-zone]")].map((n) =>
      n.getAttribute("data-unified-zone"),
    );
    expect(ancres).toEqual(["bureau", "porte", "repos"]);
  });

  it("accepte un autre décor et d'autres zones", () => {
    const { container } = render(
      <UnifiedPanorama
        image="/bazar/fond-bazar.webp"
        aspect={{ w: 2752, h: 1536 }}
        zones={[
          { key: "arcade", center: 1 / 6 },
          { key: "comptoir", center: 1 / 2 },
          { key: "antiquites", center: 5 / 6 },
        ]}
        ariaLabel="Panorama du Bazar"
      />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/bazar/fond-bazar.webp");
    const ancres = [...container.querySelectorAll("[data-unified-zone]")].map((n) =>
      n.getAttribute("data-unified-zone"),
    );
    expect(ancres).toEqual(["arcade", "comptoir", "antiquites"]);
    expect(screen.getByLabelText("Panorama du Bazar")).toBeTruthy();
  });

  it("les centres de zone restent des tiers", () => {
    expect(ZONES_BUREAU.map((z) => z.center)).toEqual([1 / 6, 1 / 2, 5 / 6]);
  });
});
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/panorama/UnifiedPanorama.test.tsx
```
Attendu : ÉCHEC — `ZONES_BUREAU` n'est pas exporté, et les props sont refusées par TypeScript.

- [ ] **Step 3: Généraliser le composant**

Dans `UnifiedPanorama.tsx` :

```tsx
export interface PanoramaZone {
  /** Identifiant de la zone, écrit dans `data-unified-zone`. */
  key: string;
  /** Centre de la zone en FRACTION de la largeur de scène (0..1). */
  center: number;
}

/** Zones du bureau : 3 tiers égaux → centres à 1/6, 1/2, 5/6. */
export const ZONES_BUREAU: PanoramaZone[] = [
  { key: "bureau", center: 1 / 6 },
  { key: "porte", center: 1 / 2 },
  { key: "repos", center: 5 / 6 },
];

const IMAGE_BUREAU = "/qg/fond-cabinet.webp";
const ASPECT_BUREAU = { w: 2752, h: 1536 };
```

Conserver `UNIFIED_ZONE_ORDER` et `UNIFIED_ZONE_CENTER_FRACTION` tels quels : ils sont importés ailleurs (`src/app/(qg)/layout.tsx`, `unifiedZones.test.ts`) et ce plan ne les touche pas.

Remplacer la signature et le corps :

```tsx
interface UnifiedPanoramaProps {
  image?: string;
  aspect?: { w: number; h: number };
  zones?: PanoramaZone[];
  ariaLabel?: string;
  /** Clés que l'overlay de calage dev doit afficher sur CETTE scène. */
  editKeys?: EditableKey[];
  /** Zone centrée au montage. Défaut : la zone du milieu. */
  initialZone?: string;
  children?: ReactNode;
  onZoneIndex?: (idx: number) => void;
}

export function UnifiedPanorama({
  image = IMAGE_BUREAU,
  aspect = ASPECT_BUREAU,
  zones = ZONES_BUREAU,
  ariaLabel,
  editKeys,
  initialZone,
  children,
  onZoneIndex,
}: UnifiedPanoramaProps) {
  const { d } = useLangue();
  const zoneCible = initialZone ?? zones[Math.floor(zones.length / 2)].key;
  // …
}
```

Trois remplacements mécaniques dans le corps :

1. `sceneStyle` devient une valeur calculée : `const sceneStyle = { ...sceneStyleBase, aspectRatio: `${aspect.w} / ${aspect.h}` }` — sortir `aspectRatio` de la constante de module.
2. La boucle du listener de scroll itère `zones` : `const centerPx = sceneWidth * zones[i].center;`.
3. Le rendu : `src={image}`, `aria-label={ariaLabel ?? d.qg.panorama}`, `{zones.map((z) => …)}` avec `data-unified-zone={z.key}` et `left: ${z.center * 100}%`, et `<QgEditOverlay cles={editKeys} />`.

L'init de scroll cible `[data-unified-zone="${zoneCible}"]`, et l'index émis au montage devient `zones.findIndex((z) => z.key === zoneCible)`.

⚠ `editKeys` référence le type `EditableKey` de `../qg/dev/QgEditContext` — l'import existe déjà pour `QgEditOverlay`. La prop `cles` de l'overlay est ajoutée à la Task 3 ; d'ici là, passer `editKeys` sans que l'overlay le lise ne casse rien. Pour que cette tâche compile seule, ajouter dès maintenant la prop optionnelle `cles?: EditableKey[]` à `QgEditOverlay` et l'ignorer (`ALL_KEYS` reste utilisé) — la Task 3 la branche.

- [ ] **Step 4: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/panorama src/app
npx tsc --noEmit && npx eslint src
```
Attendu : tout passe, et **le bureau est inchangé** (les tests existants d'`unifiedZones` et du layout `(qg)` restent verts).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/panorama src/components/mobile/qg/dev/QgEditOverlay.tsx
git commit -m "refactor(panorama): le châssis accepte un décor et des zones"
```

---

### Task 2 : Le fond illustré du Bazar

**Files:**
- Modify: `scripts/qg-prompts.json` (ajouter une entrée `fond-bazar`)
- Create: `public/bazar/fond-bazar.webp`
- Test: `src/components/bazar/fondBazar.test.ts` (créer)

**Interfaces:**
- Consomme : rien.
- Produit : le fichier `/bazar/fond-bazar.webp`, 2752×1536, opaque.

- [ ] **Step 1: Ajouter l'entrée de prompt**

Dans `scripts/qg-prompts.json`, ajouter un objet au tableau. Le prompt reprend mot pour mot la discipline de `fond-cabinet` (zones de respiration, boîte à trois murs, emplacements réservés) :

```json
{
  "id": "fond-bazar",
  "aspect": "16:9",
  "transparent": false,
  "description": "A SINGLE UNINTERRUPTED PANORAMIC PAINTING of one continuous second-hand curiosity shop interior, rendered as ONE flowing seamless mural with absolutely NO vertical lines dividing the image, NO triptych frames, NO panels, NO image seams, NO black borders between any parts — strictly forbidden to split the image into thirds or sections; the result must read as a single painted scroll-like view of the same room.\n\nMATCH THE REFERENCE IMAGE EXACTLY in rendering style, camera height, perspective and depth: single vanishing point at the horizontal centre, horizon line at about 57% of the image height, the room read as a three-walled box — a LEFT SIDE WALL angling forward from 0 to 18%, a FLAT BACK WALL seen straight on from 18% to 82%, a RIGHT SIDE WALL angling forward from 82% to the right edge. ONE continuous wooden floor runs unbroken across the bottom, ONE continuous ceiling moulding runs unbroken across the top. Same sepia ink line-art, soft watercolour wash, cream parchment paper texture, brass and warm wood tones, subtle paper grain.\n\nIMPORTANT compositional constraint: this panorama is viewed on a smartphone that swipes horizontally, snapping to three viewing windows (0-33%, 33-66%, 66-100%). NO key element may straddle the vertical positions at 33% or 66%. Those two areas must contain ONLY plain continuous wall surface — they are the breathing zones between viewing windows.\n\nFeature details by horizontal position (0% = left edge, 100% = right edge):\n\n• 0-18% — LEFT SIDE WALL, the retro video-game corner: floor-to-ceiling wooden shelving crowded with old game consoles, stacked cartridges, small painted figurines, boxed toys, coiled controllers. Dense clutter, muted dusty colours.\n• 0-14% — FOREGROUND ANCHOR: a wooden crate and a stack of boxed games juts forward from the LEFT-BOTTOM CORNER into the viewer's space, cropping out of frame on the left.\n• 20-30% — on the BACK WALL: RESERVED EMPTY SPACE. Plain bare wall and completely CLEAR EMPTY FLOOR here — no furniture, no objects, and NO SHADOW, NO STAIN, NO MARKING OF ANY KIND on either the wall or the floor. This area must read as simply empty. An arcade cabinet will be composited into this spot later. Nothing may overlap this reserved area.\n• 33% area — plain continuous wall only (BREATHING ZONE). No furniture, no shelf edge, no object.\n• 38-62% — THE COUNTER: a massive warm mahogany shop counter seen straight on, frontal, carved with simple Art Déco panels. Its top is a PLAIN SOLID WOOD SURFACE — absolutely NO glass display case, NO vitrine, NO glass of any kind. The counter top is bare EXCEPT for one object: an ORNATE ANTIQUE BRASS CASH REGISTER standing at the RIGHT END of the counter (around 57-62% of the image width), with round keys, a scrolled brass body and a small price flag on top, catching a warm highlight. The rest of the counter top — its whole left and centre — stays completely clear and empty.\n• 38-62% — on the BACK WALL behind the counter: ONE WOODEN SHELF UNIT mounted FLAT AGAINST THE FRONTAL BACK WALL (not angled, not in perspective), divided into EXACTLY NINE equal compartments in a grid of THREE COLUMNS by THREE ROWS. Every one of the nine compartments is COMPLETELY EMPTY — bare clean shelf boards with nothing on them whatsoever. Merchandise will be composited into these compartments later, so they must be clearly separated, equally sized, and squarely facing the viewer.\n• VERTICAL PLACEMENT, measured from the TOP of the image (0% = top edge, 100% = bottom edge). These four bands are mandatory and must not overlap:\n  – 6% to 20%: the PENDANT LAMP — a short brass rod and a wide shade. The BOTTOM of its shade must sit at 20% and no lower.\n  – 20% to 30%: EMPTY WALL. A clearly visible gap of bare wall between the lamp and the shelf unit below it.\n  – 30% to 58%: the SHELF UNIT with its nine compartments. Its top edge starts at 30%, its bottom edge ends at 58%.\n  – 58% to 68%: EMPTY WALL again — the reserved band where a shopkeeper's chest and head will appear. Nothing may be drawn here.\n  – 68%: the COUNTER TOP.\n  The lamp and the shelf unit must NEVER touch, overlap or cross. If they would, lower the shelf unit and shorten the lamp's rod until a strip of bare wall separates them. The nine compartments must be unobstructed from edge to edge — nothing hangs in front of any of them.\n• 44-56% — the floor between the counter and the back wall: RESERVED EMPTY SPACE, a clear standing area about one person wide, bare floor, nothing on it — a shopkeeper figure will be composited standing here later. Keep the floor line crisp and unobstructed.\n• ~50% on the CEILING: a brass pendant lamp hangs above the counter, casting a warm pool of light that makes the counter the brightest area of the whole painting.\n• 66% area — plain continuous wall only (BREATHING ZONE). No furniture, no object.\n• 68-82% — the antiques corner: a joyful jumble of old things heaped and stacked — grandfather clock, steamer trunks, oil lamps, stacked picture frames, porcelain, a birdcage, rolled carpets. Dense and cluttered, but DESATURATED and dusty; this area must not attract the eye.\n• 72-80% — a plain WOODEN TABLE standing in the middle of this corner, its top completely BARE and clearly readable, no objects on it at all. Reserved for later use.\n• 82-100% — RIGHT SIDE WALL angling forward, with the SHOP'S FRONT DOOR set into it, seen at a three-quarter angle: a wooden door with a large frosted glass pane, a small brass bell above it, warm daylight streaming in through the glass and spilling onto the floor. This daylight is the second bright accent of the painting.\n\nColour: the painting is gently muted and dusty, but NOT washed out and NEVER grey — it must feel like a warm, lived-in shop, not a pencil study. Soft sage-green walls, honey and mahogany woods, brass that glows, and scattered low-saturation accents among the clutter: faded red and teal on the boxed games, ochre and dusty blue on the antiques, a worn carpet with colour left in it. The two light sources — the counter's pendant lamp and the daylight at the door — are the warmest, brightest points. Keep every colour a step below full saturation, so that the bright objects composited on top later still stand out.\n\nLighting: soft warm directional light from the upper-left, consistent across the whole panorama. NO people, no text, no captions, no signatures, no watermark, no transparent areas — the image is fully opaque.\n\nCRITICAL FINAL CONSTRAINTS — (a) The shelf unit behind the counter has EXACTLY NINE empty compartments (3 columns × 3 rows), hangs at mid-wall height with a chest-high band of bare wall between it and the counter, and is never overlapped by the pendant lamp; the counter top carries NO glass case and nothing but the brass cash register at its right end. (b) The arcade spot (20-30%), the shopkeeper spot (44-56%) and the table top (72-80%) are EMPTY and unobstructed, with no shadow or marking of any kind. (c) Nothing crosses the vertical positions at 33% or 66%. (d) No vertical seams, no panel borders, no black bars anywhere."
}
```

- [ ] **Step 2: Générer l'image**

```bash
npm run gen:qg -- --model=pro --aspect=16:9 fond-bazar
```
Le PNG sort dans `public/qg/fond-bazar.png`.

⚠ Le script écrit dans `public/qg/`. Le déplacement vers `public/bazar/` est fait à l'étape suivante — ne pas modifier le script pour ça.

- [ ] **Step 3: Convertir et ranger**

```bash
mkdir -p public/bazar
npx --yes -- node -e "
const sharp = require('sharp');
sharp('public/qg/fond-bazar.png')
  .resize(2752, 1536, { fit: 'cover' })
  .webp({ quality: 82 })
  .toFile('public/bazar/fond-bazar.webp')
  .then((r) => console.log('écrit', r.width + 'x' + r.height, Math.round(r.size / 1024) + ' Ko'));
"
rm public/qg/fond-bazar.png
```
Attendu : `écrit 2752x1536` et un poids du même ordre que `fond-cabinet.webp` (≈ 620 Ko).

- [ ] **Step 4: Écrire le filet**

Créer `src/components/bazar/fondBazar.test.ts` :

```ts
import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("le fond du Bazar", () => {
  it("est présent et d'un poids raisonnable", () => {
    const s = statSync("public/bazar/fond-bazar.webp");
    expect(s.isFile()).toBe(true);
    // Un fond de panorama pèse quelques centaines de Ko. En dessous de 100 Ko,
    // c'est un placeholder ou une image ratée ; au-dessus de 1,5 Mo, le WebView
    // iOS le paiera au chargement.
    expect(s.size).toBeGreaterThan(100_000);
    expect(s.size).toBeLessThan(1_500_000);
  });
});
```

- [ ] **Step 5: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/components/bazar/fondBazar.test.ts
```
Attendu : PASS.

**Vérification à l'œil, obligatoire avant de commiter** — l'image est le livrable, pas le test :
1. Aucun objet ne chevauche 33 % ni 66 % de la largeur.
2. L'étagère porte NEUF cases vides, frontales, de taille égale, montées haut au-dessus du comptoir.
3. Le plateau du comptoir est nu — aucune vitrine sous verre, rien dessus.
4. Les trois emplacements réservés (borne ~25 %, vendeur ~50 %, table ~76 %) sont dégagés.
5. La perspective se lit comme celle du bureau : même hauteur d'œil, même profondeur.

Si un point manque, régénérer (`--force`) en durcissant la contrainte fautive dans le prompt. Ne pas « rattraper » au montage : un objet peint au mauvais endroit ne se déplace pas.

- [ ] **Step 6: Commit**

```bash
git add scripts/qg-prompts.json public/bazar/fond-bazar.webp src/components/bazar/fondBazar.test.ts
git commit -m "feat(bazar): le fond illustré de la boutique"
```

---

### Task 3 : Les coordonnées et l'outil de calage

**Files:**
- Create: `src/components/bazar/bazarLayout.ts`
- Modify: `src/components/mobile/qg/dev/QgEditContext.tsx`
- Modify: `src/components/mobile/qg/dev/QgEditOverlay.tsx`
- Test: `src/components/bazar/bazarLayout.test.ts` (créer)

**Interfaces:**
- Consomme : `qgPct` de `@/components/mobile/qg/layout`.
- Produit :
  - `BAZAR_LAYOUT` avec `panoramaWidth: 300`, `panoramaAspect: { w: 2752, h: 1536 }`, `objets`
  - `export type BazarObjetKey = keyof typeof BAZAR_LAYOUT.objets`
  - `EditableKey` (élargi) accepte les clés du Bazar ; `QgEditOverlay` accepte `cles?: EditableKey[]`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/bazar/bazarLayout.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { BAZAR_LAYOUT, CLES_LOTS, CLE_VITRINE, type BazarObjetKey } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";

describe("BAZAR_LAYOUT", () => {
  it("porte les neuf cases de l'étagère et les quatre emplacements du décor", () => {
    const cles = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];
    expect(cles.sort()).toEqual(
      [
        "case1", "case2", "case3",
        "case4", "case5", "case6",
        "case7", "case8", "case9",
        "borne", "sortie", "table", "vendeur",
      ].sort(),
    );
  });

  it("désigne la rangée du bas pour les lots et le centre pour l'objet de la semaine", () => {
    expect(CLES_LOTS).toEqual(["case7", "case8", "case9"]);
    expect(CLE_VITRINE).toBe("case5");
  });

  it("utilise le même repère que le QG (300vw), sinon l'outil de calage ment", () => {
    expect(BAZAR_LAYOUT.panoramaWidth).toBe(300);
    expect(qgPct(150)).toBe(50);
  });

  it("range la grille de gauche à droite et de haut en bas", () => {
    const o = BAZAR_LAYOUT.objets;
    // Trois colonnes : même ordre horizontal sur chaque rangée.
    for (const [g, c, d] of [
      ["case1", "case2", "case3"],
      ["case4", "case5", "case6"],
      ["case7", "case8", "case9"],
    ] as const) {
      expect(o[g].left).toBeLessThan(o[c].left);
      expect(o[c].left).toBeLessThan(o[d].left);
    }
    // Trois rangées : la première est la plus haute (bottom décroît vers le bas).
    expect(o.case1.bottom).toBeGreaterThan(o.case4.bottom);
    expect(o.case4.bottom).toBeGreaterThan(o.case7.bottom);
  });

  it("garde les neuf cases dans la zone du comptoir, loin des frontières de swipe", () => {
    // Zone centre = 33 %..66 % de 300vw = 100vw..200vw. Une case qui déborde
    // serait coupée en deux par le snap.
    for (const cle of ["case1", "case5", "case9"] as const) {
      const c = BAZAR_LAYOUT.objets[cle];
      expect(qgPct(c.left)).toBeGreaterThan(33);
      expect(qgPct(c.left + c.width)).toBeLessThan(66);
    }
  });
});
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

```bash
npx vitest run --maxWorkers=4 src/components/bazar/bazarLayout.test.ts
```
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3: Écrire le layout**

Créer `src/components/bazar/bazarLayout.ts` :

```ts
/**
 * Coordonnées des objets de la scène du Bazar.
 *
 * MÊME REPÈRE QUE LE QG : `left`/`width` en vw sur un panorama de référence de
 * 300vw, `bottom` en % de la hauteur de scène. Ce n'est pas un hasard —
 * l'outil de calage dev (`?qgedit=1`) calcule ses déplacements en
 * `window.innerWidth / 100`. Une convention en % ici rendrait l'outil
 * inutilisable sur cette scène.
 *
 * Valeurs de départ posées à la lecture du fond ; à affiner à la souris.
 */
export const BAZAR_LAYOUT = {
  panoramaWidth: 300,
  panoramaAspect: { w: 2752, h: 1536 },
  objets: {
    // Zone gauche (0..100vw) — réservé, muet.
    borne: { left: 61.0, bottom: 18.0, width: 30.0 },
    // Zone centre (100..200vw) — la grille de neuf cases, mesurée sur le fond :
    // l'étagère occupe 36 %..64 % de la largeur, ses trois rangées sont à
    // 53 %, 62 % et 71 % de la hauteur.
    case1: { left: 111.0, bottom: 71.0, width: 24.0 },
    case2: { left: 139.0, bottom: 71.0, width: 24.0 },
    case3: { left: 167.0, bottom: 71.0, width: 24.0 },
    case4: { left: 111.0, bottom: 62.0, width: 24.0 },
    case5: { left: 139.0, bottom: 62.0, width: 24.0 },
    case6: { left: 167.0, bottom: 62.0, width: 24.0 },
    case7: { left: 111.0, bottom: 53.0, width: 24.0 },
    case8: { left: 139.0, bottom: 53.0, width: 24.0 },
    case9: { left: 167.0, bottom: 53.0, width: 24.0 },
    // La bande de mur nu entre le plateau du comptoir et la première planche.
    vendeur: { left: 138.0, bottom: 40.0, width: 24.0 },
    // Zone droite (200..300vw) — réservé et sortie.
    table: { left: 209.0, bottom: 18.0, width: 44.0 },
    sortie: { left: 270.0, bottom: 20.0, width: 28.0 },
  },
} as const;

export type BazarObjetKey = keyof typeof BAZAR_LAYOUT.objets;

/**
 * Les trois lots de pièces vont sur la rangée du BAS — la plus proche de la
 * main, et la seule que la suspension n'éclipse pas.
 */
export const CLES_LOTS: BazarObjetKey[] = ["case7", "case8", "case9"];

/** L'objet de la semaine trône au centre de la grille. */
export const CLE_VITRINE: BazarObjetKey = "case5";
```

- [ ] **Step 4: Brancher l'outil de calage**

Dans `QgEditContext.tsx` :

```ts
import { BAZAR_LAYOUT, type BazarObjetKey } from "@/components/bazar/bazarLayout";

export type EditableKey = QgObjetKey | ChatBaladeurId | BazarObjetKey;

const BAZAR_KEYS = new Set<string>(Object.keys(BAZAR_LAYOUT.objets));

function isBazarKey(key: EditableKey): key is BazarObjetKey {
  return BAZAR_KEYS.has(key);
}

function baseCoord(key: EditableKey): { left: number; bottom: number; width: number } {
  if (isChatKey(key)) return CHAT_BALADEUR_LAYOUT[key];
  if (isBazarKey(key)) return BAZAR_LAYOUT.objets[key];
  return QG_LAYOUT.objets[key as QgObjetKey];
}
```

Dans `QgEditOverlay.tsx`, faire vivre la prop `cles` ajoutée en Task 1 :

```tsx
export function QgEditOverlay({ cles }: { cles?: EditableKey[] }) {
  const aAfficher = cles ?? ALL_KEYS;
  // …itérer aAfficher au lieu de ALL_KEYS
}
```

Et le dispatch par famille gagne une branche :

```tsx
function ObjetOutline({ editKey }: OutlineProps) {
  if ((CHAT_BALADEUR_ORDER as readonly string[]).includes(editKey)) {
    return <OutlineChat editKey={editKey as ChatBaladeurId} />;
  }
  if (editKey in BAZAR_LAYOUT.objets) {
    return <OutlineBazar editKey={editKey as BazarObjetKey} />;
  }
  return <OutlineQg editKey={editKey as QgObjetKey} />;
}

function OutlineBazar({ editKey }: { editKey: BazarObjetKey }) {
  const coord = useQgObjet(editKey);
  return <OutlineAvecCoord editKey={editKey} coord={coord} />;
}
```

⚠ `useQgObjet` est typé `QgObjetKey` (`QgEditContext.tsx:151`) alors que le `useEditableCoord` qu'il appelle accepte déjà `EditableKey`. Élargir la signature publique, sans quoi `OutlineBazar` ne compile pas :

```ts
export function useQgObjet(key: EditableKey): { left: number; bottom: number; width: number } {
  return useEditableCoord(key);
}
```

- [ ] **Step 5: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/components/bazar src/components/mobile/qg
npx tsc --noEmit && npx eslint src
```
Attendu : tout passe.

- [ ] **Step 6: Commit**

```bash
git add src/components/bazar/bazarLayout.ts src/components/bazar/bazarLayout.test.ts src/components/mobile/qg/dev
git commit -m "feat(bazar): les emplacements de la scène, calables à la souris"
```

---

### Task 4 : Un article posé

Le composant d'un article, sans la scène autour.

**Files:**
- Create: `src/components/bazar/ArticleBazar.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`
- Test: `src/components/bazar/ArticleBazar.test.tsx` (créer)

**Interfaces:**
- Consomme : `BAZAR_LAYOUT`, `qgPct`, `PieceIcon`, `ItemImage`.
- Produit :

```ts
interface ArticleBazarProps {
  cle: BazarObjetKey;          // où le poser
  visuel: ReactNode;           // PieceIcon ou ItemImage
  libelle: string;             // nom lisible, porté par le bouton
  prix: number;                // en jetons
  jetons: number;              // la bourse du joueur
  onAcheter: () => void;
}
```

- Clés i18n neuves : `bazar.manqueJetons` (`"Il vous manque {n} jetons"`), `bazar.manqueJetonUn` (`"Il vous manque {n} jeton"`).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/bazar/ArticleBazar.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ArticleBazar } from "./ArticleBazar";

afterEach(cleanup);

function monter(props: Partial<React.ComponentProps<typeof ArticleBazar>> = {}) {
  const onAcheter = vi.fn();
  render(
    <ArticleBazar
      cle="case7"
      visuel={<span data-testid="visuel" />}
      libelle="5 pièces · Musique"
      prix={3}
      jetons={10}
      onAcheter={onAcheter}
      {...props}
    />,
  );
  return { onAcheter };
}

describe("ArticleBazar", () => {
  it("montre le visuel, le libellé et le prix", () => {
    monter();
    expect(screen.getByTestId("visuel")).toBeTruthy();
    expect(screen.getByRole("button", { name: /5 pièces · Musique/ })).toBeTruthy();
    expect(screen.getByText("3 jetons")).toBeTruthy();
  });

  it("achète au tap quand la bourse suffit", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("hors de portée : bouton inerte, prix barré, et le manque chiffré au tap", () => {
    const { onAcheter } = monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    // `toHaveStyle` n'existe pas ici : le dépôt n'installe PAS @testing-library/jest-dom.
    // On lit la propriété de style directement.
    const prix = screen.getByText("12 jetons") as HTMLElement;
    expect(prix.style.textDecoration).toBe("line-through");
    // La bulle est portée par le conteneur : un bouton désactivé n'émet pas de clic.
    fireEvent.click(screen.getByTestId("article-case7"));
    expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("le singulier du manque est respecté", () => {
    monter({ prix: 6, jetons: 5 });
    fireEvent.click(screen.getByTestId("article-case7"));
    expect(screen.getByText("Il vous manque 1 jeton")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npx vitest run --maxWorkers=4 src/components/bazar/ArticleBazar.test.tsx
```
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3: Ajouter les libellés dans les quatre langues**

Dans `src/lib/i18n/ui/fr.ts`, section `bazar` :

```ts
    manqueJetons: "Il vous manque {n} jetons",
    manqueJetonUn: "Il vous manque {n} jeton",
```

`en.ts` :

```ts
    manqueJetons: "You need {n} more tokens",
    manqueJetonUn: "You need {n} more token",
```

`es.ts` :

```ts
    manqueJetons: "Te faltan {n} fichas",
    manqueJetonUn: "Te falta {n} ficha",
```

`el.ts` :

```ts
    manqueJetons: "Σου λείπουν {n} μάρκες",
    manqueJetonUn: "Σου λείπει {n} μάρκα",
```

- [ ] **Step 4: Écrire le composant**

Créer `src/components/bazar/ArticleBazar.tsx` :

```tsx
"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { qgPct } from "@/components/mobile/qg/layout";
import { BAZAR_LAYOUT, type BazarObjetKey } from "./bazarLayout";

interface ArticleBazarProps {
  cle: BazarObjetKey;
  visuel: ReactNode;
  libelle: string;
  prix: number;
  jetons: number;
  onAcheter: () => void;
}

/**
 * Un article posé dans la scène : son visuel, son étiquette de prix, et
 * l'état « hors de portée ». Le bouton reste `disabled` quand la bourse ne
 * suit pas (l'achat ne doit pas partir), mais c'est le CONTENEUR qui porte le
 * tap : sans ça, la boutique ne répondrait rien du tout au joueur sans jetons
 * — le défaut relevé à la recette du 2026-08-20.
 */
export function ArticleBazar({ cle, visuel, libelle, prix, jetons, onAcheter }: ArticleBazarProps) {
  const { d, tr } = useLangue();
  const [bulle, setBulle] = useState(false);
  const horsDePortee = jetons < prix;
  const manque = prix - jetons;
  const coord = BAZAR_LAYOUT.objets[cle];

  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    pointerEvents: "auto",
    display: "grid",
    justifyItems: "center",
    gap: 2,
    filter: horsDePortee ? "grayscale(1) opacity(0.65)" : undefined,
  };

  return (
    <div
      style={style}
      data-testid={`article-${cle}`}
      onClick={() => horsDePortee && setBulle(true)}
    >
      <button
        type="button"
        aria-label={libelle}
        disabled={horsDePortee}
        onClick={onAcheter}
        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
      >
        {visuel}
      </button>
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--brass-700)",
          textDecoration: horsDePortee ? "line-through" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix })}
      </span>
      {bulle && horsDePortee && (
        <span role="status" style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
          {tr(manque > 1 ? d.bazar.manqueJetons : d.bazar.manqueJetonUn, { n: manque })}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/components/bazar src/lib/i18n
npx tsc --noEmit && npx eslint src
```
Attendu : PASS, y compris `ui.test.ts` (parité des placeholders `{n}`).

- [ ] **Step 6: Commit**

```bash
git add src/components/bazar/ArticleBazar.tsx src/components/bazar/ArticleBazar.test.tsx src/lib/i18n/ui
git commit -m "feat(bazar): un article posé, et le manque de jetons qui se dit"
```

---

### Task 5 : La scène

**Files:**
- Create: `src/components/bazar/BazarScene.tsx`
- Test: `src/components/bazar/BazarScene.test.tsx` (créer)

**Interfaces:**
- Consomme : `UnifiedPanorama` + `ZONES_BAZAR`, `ArticleBazar`, `BAZAR_LAYOUT`, `CLES_LOTS`, `CLE_VITRINE`, `PieceIcon`, `ItemImage`, `getTemplate`, `nomObjet`, `libelleCategorie`.
- Produit :

```ts
interface BazarSceneProps {
  etal: EtalBazar;
  jetons: number;
  onAcheter: (achat: AchatBazar) => void;
  onSortir: () => void;
}
```

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/bazar/BazarScene.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BazarScene, ZONES_BAZAR } from "./BazarScene";
import type { EtalBazar } from "@/types/game";

afterEach(cleanup);

const ETAL: EtalBazar = {
  cleSemaine: "2026-W34",
  lotsPieces: [
    { categorie: "Musique", quantite: 5, prix: 1 },
    { categorie: "Mode", quantite: 5, prix: 1 },
    { categorie: "Maison", quantite: 5, prix: 1 },
  ],
  vitrine: { templateId: "jx.jeu_magnatimmo_annees_80", valeurBase: 200, prix: 8 },
};

function monter(etal: EtalBazar = ETAL, jetons = 25) {
  const onAcheter = vi.fn();
  const onSortir = vi.fn();
  render(<BazarScene etal={etal} jetons={jetons} onAcheter={onAcheter} onSortir={onSortir} />);
  return { onAcheter, onSortir };
}

describe("BazarScene", () => {
  it("a trois zones, en tiers, et s'ouvre sur le comptoir", () => {
    expect(ZONES_BAZAR.map((z) => z.key)).toEqual(["arcade", "comptoir", "antiquites"]);
    expect(ZONES_BAZAR.map((z) => z.center)).toEqual([1 / 6, 1 / 2, 5 / 6]);
    // La zone du milieu est celle que `UnifiedPanorama` centre au montage
    // quand `initialZone` n'est pas passé (cf. Task 1).
    expect(ZONES_BAZAR[Math.floor(ZONES_BAZAR.length / 2)].key).toBe("comptoir");
  });

  it("pose les trois lots sur la rangée du bas", () => {
    monter();
    expect(screen.getByTestId("article-case7")).toBeTruthy();
    expect(screen.getByTestId("article-case8")).toBeTruthy();
    expect(screen.getByTestId("article-case9")).toBeTruthy();
  });

  it("pose l'objet de la semaine dans la case centrale", () => {
    monter();
    expect(screen.getByTestId("article-case5")).toBeTruthy();
  });

  it("achète le lot touché, avec son index", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getAllByRole("button", { name: /Mode/ })[0]);
    expect(onAcheter).toHaveBeenCalledWith({ type: "pieces", index: 1 });
  });

  it("achète la vitrine", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    expect(onAcheter).toHaveBeenCalledWith({ type: "vitrine" });
  });

  it("vitrine vendue : la place est vide et le dit", () => {
    monter({ ...ETAL, vitrine: null });
    expect(screen.queryByTestId("article-case5")).toBeNull();
    expect(screen.getByText(/Vendu/)).toBeTruthy();
  });

  it("la porte fait sortir", () => {
    const { onSortir } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Sortir/ }));
    expect(onSortir).toHaveBeenCalledTimes(1);
  });

  it("la borne et la table ne répondent pas", () => {
    monter();
    expect(screen.queryByTestId("article-borne")).toBeNull();
    expect(screen.queryByTestId("article-table")).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npx vitest run --maxWorkers=4 src/components/bazar/BazarScene.test.tsx
```
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3: Ajouter la clé i18n de la sortie**

Dans les quatre `ui/*.ts`, section `bazar` : `sortir` → `"Sortir du Bazar"` / `"Leave the Bazaar"` / `"Salir del Bazar"` / `"Έξοδος από το Παζάρι"`.

- [ ] **Step 4: Écrire la scène**

Créer `src/components/bazar/BazarScene.tsx` :

```tsx
"use client";

import { UnifiedPanorama, type PanoramaZone } from "@/components/mobile/panorama/UnifiedPanorama";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { qgPct } from "@/components/mobile/qg/layout";
import type { AchatBazar } from "@/lib/bazar/achat";
import type { EtalBazar } from "@/types/game";
import { ArticleBazar } from "./ArticleBazar";
import { BAZAR_LAYOUT, CLES_LOTS, CLE_VITRINE } from "./bazarLayout";

/** Les trois zones du Bazar : le coin arcade, le comptoir, les antiquités. */
export const ZONES_BAZAR: PanoramaZone[] = [
  { key: "arcade", center: 1 / 6 },
  { key: "comptoir", center: 1 / 2 },
  { key: "antiquites", center: 5 / 6 },
];

interface BazarSceneProps {
  etal: EtalBazar;
  jetons: number;
  onAcheter: (achat: AchatBazar) => void;
  onSortir: () => void;
}

export function BazarScene({ etal, jetons, onAcheter, onSortir }: BazarSceneProps) {
  const { d, tr, locale } = useLangue();
  const template = etal.vitrine ? getTemplate(etal.vitrine.templateId) : undefined;
  const coordVitrine = BAZAR_LAYOUT.objets[CLE_VITRINE];
  const coordSortie = BAZAR_LAYOUT.objets.sortie;

  return (
    <UnifiedPanorama
      image="/bazar/fond-bazar.webp"
      aspect={BAZAR_LAYOUT.panoramaAspect}
      zones={ZONES_BAZAR}
      ariaLabel={d.bazar.titre}
      editKeys={Object.keys(BAZAR_LAYOUT.objets) as (keyof typeof BAZAR_LAYOUT.objets)[]}
    >
      {etal.lotsPieces.map((lot, index) => (
        <ArticleBazar
          key={lot.categorie}
          cle={CLES_LOTS[index]}
          visuel={<PieceIcon categorie={lot.categorie} size={48} count={lot.quantite} />}
          libelle={tr(d.bazar.lotPieces, {
            n: lot.quantite,
            categorie: libelleCategorie(lot.categorie, d),
          })}
          prix={lot.prix}
          jetons={jetons}
          onAcheter={() => onAcheter({ type: "pieces", index })}
        />
      ))}

      {etal.vitrine && template ? (
        <ArticleBazar
          cle={CLE_VITRINE}
          visuel={
            <span style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}>
              <ItemImage
                templateId={template.templateId}
                categorie={template.categorie}
                alt=""
                sizes="30vw"
              />
            </span>
          }
          libelle={nomObjet({ templateId: template.templateId, nom: template.nom }, locale)}
          prix={etal.vitrine.prix}
          jetons={jetons}
          onAcheter={() => onAcheter({ type: "vitrine" })}
        />
      ) : (
        <span
          style={{
            position: "absolute",
            left: `${qgPct(coordVitrine.left)}%`,
            bottom: `${coordVitrine.bottom}%`,
            width: `${qgPct(coordVitrine.width)}%`,
            textAlign: "center",
            fontSize: "0.7rem",
            color: "var(--brass-700)",
          }}
        >
          {d.bazar.vendu}
        </span>
      )}

      <button
        type="button"
        aria-label={d.bazar.sortir}
        onClick={onSortir}
        style={{
          position: "absolute",
          left: `${qgPct(coordSortie.left)}%`,
          bottom: `${coordSortie.bottom}%`,
          width: `${qgPct(coordSortie.width)}%`,
          aspectRatio: "1 / 2",
          pointerEvents: "auto",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      />
    </UnifiedPanorama>
  );
}
```

⚠ `nomObjet` et `getTemplate` sont déjà utilisés par `EtalBazar.tsx` — reprendre exactement les mêmes imports que lui, ils sont vérifiés.

- [ ] **Step 5: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/components/bazar
npx tsc --noEmit && npx eslint src
```
Attendu : PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/bazar/BazarScene.tsx src/components/bazar/BazarScene.test.tsx src/lib/i18n/ui
git commit -m "feat(bazar): la scène de la boutique, les articles posés sur les étagères"
```

---

### Task 6 : Brancher l'écran et retirer l'ancien

**Files:**
- Modify: `src/app/bazar/page.tsx`
- Delete: `src/components/bazar/EtalBazar.tsx`, `src/components/bazar/EtalBazar.test.tsx`

**Interfaces:**
- Consomme : `BazarScene`.
- Produit : l'écran `/bazar` définitif.

- [ ] **Step 1: Remplacer le rendu**

Dans `src/app/bazar/page.tsx`, remplacer l'import et le corps du `return` :

```tsx
import { BazarScene } from "@/components/bazar/BazarScene";
// …
  return (
    <MobileLayout
      header={<MobileHeader budget={state.budget} jetons={state.jetons} forcerAffichageJetons />}
    >
      <BazarScene
        etal={state.bazar}
        jetons={state.jetons}
        onAcheter={handleAcheter}
        onSortir={() => router.push("/bureau")}
      />
    </MobileLayout>
  );
```

Tout le reste du fichier — la redirection avant l'ouverture, le `rafraichirPeriodiques()` au montage, le `SkeletonScreen` — **ne change pas**. Ces trois points portent des corrections déjà payées ; les toucher est hors périmètre.

- [ ] **Step 2: Retirer l'ancien écran**

```bash
git rm src/components/bazar/EtalBazar.tsx src/components/bazar/EtalBazar.test.tsx
```

- [ ] **Step 3: Vérifier l'ensemble**

```bash
npx vitest run --maxWorkers=4
npx tsc --noEmit && npx eslint src
```
Attendu : **toute** la suite verte (2302 tests + ceux de ce plan), aucun import orphelin d'`EtalBazarVue`.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/bazar src/components/bazar
git commit -m "feat(bazar): l'écran de la boutique devient un lieu"
```

---

### Task 7 : Le calage à l'œil

Les coordonnées de la Task 3 sont posées à la lecture du prompt, pas mesurées. Cette tâche les remplace par des valeurs vues.

**Files:**
- Modify: `src/components/bazar/bazarLayout.ts` (les seules valeurs numériques)

- [ ] **Step 1: Ouvrir la scène avec l'outil de calage**

```bash
npx next dev --hostname localhost --port 3000
```
Puis, dans le navigateur : `http://localhost:3000/bazar?qgedit=1`.

⚠ `localhost` obligatoire — sur `127.0.0.1` l'app reste bloquée sur « Ouverture du local… ». Un seul `next dev` à la fois.

⚠ Il faut une partie avec le Bazar ouvert ET des jetons. Le banc local le fournit : `scripts/_gen-saves-bazar.ts` (non commité) installe trois parties via `http://localhost:3000/dev-save-bazar.html`, dont « Étal garni » (jour 40, 25 jetons).

- [ ] **Step 2: Caler chaque objet à la souris**

Glisser chaque cadre sur sa place dans le décor, redimensionner par la poignée. Les treize clés : `case1..case9`, `sortie`, `borne`, `table`, `vendeur`.

Points de contrôle :
- Les trois lots sont **posés** dans les cases du bas, pas flottants au-dessus.
- L'objet de la semaine est **dans** la case centrale, sans déborder de ses montants.
- La zone `sortie` couvre la porte d'entrée sans déborder sur le mur.
- `borne`, `table`, `vendeur` : les cadres coïncident avec les emplacements laissés vides dans l'image (ils ne sont pas rendus en jeu, mais leurs coordonnées serviront aux chantiers suivants — mieux vaut les caler tant que le décor est sous les yeux).

- [ ] **Step 3: Recopier les valeurs**

Le panneau d'édition affiche les coordonnées courantes. Les reporter dans `BAZAR_LAYOUT.objets`, puis vider les overrides (bouton « reset all » du panneau) et recharger : le rendu doit être identique **sans** override.

- [ ] **Step 4: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/components/bazar
```
Attendu : PASS — dont le test qui exige les trois travées entre 33 % et 66 %.

- [ ] **Step 5: Commit**

```bash
git add src/components/bazar/bazarLayout.ts
git commit -m "fix(bazar): les objets de la scène calés sur le décor"
```

---

## Recette à la main (Guillaume)

Le code ne prouve pas ces points-là :

1. Le swipe ne coupe aucun objet en deux aux frontières de zone.
2. On arrive **sur le comptoir**, pas sur une zone latérale.
3. La perspective du Bazar se lit comme celle du bureau — même hauteur d'œil, même profondeur.
4. Le comptoir et la porte attirent l'œil ; les antiquités restent en retrait.
5. Bourse vide : les quatre articles sont visiblement éteints, et le tap dit le manque chiffré.
6. Achat d'un lot : les pièces arrivent à l'atelier, le lot reste sur l'étagère.
7. Achat de la vitrine : la place se vide et affiche « Vendu ».
8. La porte ramène au bureau.
9. Les emplacements réservés (vendeur, borne) sont crédibles vides.
10. Les quatre langues sur les étiquettes et la bulle de manque, grec en priorité (c'est là que ça déborde).
11. Sur iPad, la scène remplit la hauteur sans rogner le haut.

## Ce que ce plan ne fait pas

- **Aucun vendeur** — asset séparé, plus tard.
- **Aucune borne d'arcade** — asset séparé, chantier ⑤. La place est réservée dans l'image et dans le layout.
- **Aucun son d'ambiance** pour le lieu.
- **Aucune transition d'entrée** particulière (l'iris reste réservé menu→bureau).
- **Aucune retouche du contenu de l'étal** — composition, prix, rotation sont livrés et hors périmètre.
