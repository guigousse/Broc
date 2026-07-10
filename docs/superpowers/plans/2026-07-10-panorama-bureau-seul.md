# Panorama bureau seul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réduire le panorama unifié (3 images, 9 zones) à la seule image du bureau (3 zones), promouvoir les écrans de gestion en routes racines (`/stockage`, `/atelier`, `/collection`) et supprimer tout le code + les assets des sections atelier/collection.

**Architecture:** On rétrécit `UnifiedPanorama` en place (300vw, 3 zones `bureau`/`porte`/`repos`), on remplace le groupe de routes `(panorama)` par une unique page `/bureau` qui porte tout le rendu, et on fait pointer la TabBar (chemins inchangés) vers les pages de gestion promues. Spec : `docs/superpowers/specs/2026-07-10-panorama-bureau-seul-design.md`.

**Tech Stack:** Next.js App Router (Next 16), React, TypeScript, vitest.

## Global Constraints

- `npm run lint` est CASSÉ (Next 16). Lint = `npx eslint src` (c'est aussi ce que fait `npm run lint:hooks`).
- Tests : `npx vitest run <fichier>` (suite complète : `npm run test:run`).
- Types : `npx tsc --noEmit` doit passer à la fin de chaque tâche.
- Règle d'or i18n du projet : aucune chaîne française en dur dans le JSX — les libellés viennent des dictionnaires `src/lib/i18n/ui/{fr,en,es}.ts`.
- NE PAS toucher : `public/brocantes/` (dont `atelier-bricoleur.webp`), `public/items/*atelier*`, `src/components/mobile/brocante-pano/` (panorama des brocantes, feature distincte), `panorama-fusionne.png`/`panorama-rue.png` à la racine (fichiers de travail non trackés), `scripts/generate-atelier-images.mjs` (outil dev).
- Messages de commit : convention `feat|fix|refactor|chore(scope): …` en français (cf. `git log`).

---

### Task 1: Courbes audio 3 zones

**Files:**
- Modify: `src/components/mobile/panorama/audioCurves.ts`
- Test: `src/components/mobile/panorama/audioCurves.test.ts`

**Interfaces:**
- Produces: `volumeVinylForPos(pos: number): number` et `fireplaceVolumeForPos(pos: number): number` — signatures inchangées, mais domaine `pos` = 0..2 (0 = bureau, 1 = porte, 2 = repos). Consommées par la page `/bureau` (Task 3).

- [ ] **Step 1: Réécrire le test pour 3 zones**

Remplacer intégralement `src/components/mobile/panorama/audioCurves.test.ts` :

```typescript
import { describe, expect, it } from "vitest";
import { volumeVinylForPos, fireplaceVolumeForPos } from "./audioCurves";

describe("audioCurves (panorama bureau 3 zones)", () => {
  it("vinyle : 0.3 au bureau (0), 0.5 à la porte (1), pic 0.8 au repos (2)", () => {
    expect(volumeVinylForPos(0)).toBeCloseTo(0.3); // bureau
    expect(volumeVinylForPos(1)).toBeCloseTo(0.5); // porte
    expect(volumeVinylForPos(2)).toBeCloseTo(0.8); // repos (gramophone)
    // Interpolation continue entre zones.
    expect(volumeVinylForPos(0.5)).toBeCloseTo(0.4);
    expect(volumeVinylForPos(1.5)).toBeCloseTo(0.65);
  });

  it("cheminée : nulle au bureau, pic 0.6 au repos", () => {
    expect(fireplaceVolumeForPos(0)).toBe(0); // bureau
    expect(fireplaceVolumeForPos(1)).toBeCloseTo(0.3); // porte
    expect(fireplaceVolumeForPos(2)).toBeCloseTo(0.6); // repos
  });

  it("reste borné hors domaine (robustesse overscroll)", () => {
    expect(volumeVinylForPos(-0.3)).toBeGreaterThanOrEqual(0.3 - 0.2 * 0.3);
    expect(volumeVinylForPos(2.4)).toBeLessThanOrEqual(0.8);
    expect(fireplaceVolumeForPos(-0.3)).toBe(0);
    expect(fireplaceVolumeForPos(2.4)).toBeLessThanOrEqual(0.6);
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/components/mobile/panorama/audioCurves.test.ts`
Expected: FAIL (les anciennes courbes donnent p.ex. `volumeVinylForPos(1) = 0.3`, pas `0.5`).

- [ ] **Step 3: Réécrire audioCurves.ts**

Remplacer intégralement `src/components/mobile/panorama/audioCurves.ts` :

```typescript
/**
 * Courbes de volume audio pilotées par l'index de zone fractionnaire du
 * panorama bureau 3 zones (0 = bureau · 1 = porte · 2 = repos).
 * Le gramophone et la cheminée sont dans le coin repos (idx 2).
 */

/** Volume vinyle : ramp du bureau vers le repos (pic au gramophone). */
export function volumeVinylForPos(pos: number): number {
  if (pos <= 1) return 0.3 + 0.2 * Math.max(0, pos); // 0.3 → 0.5 (porte)
  return Math.min(0.8, 0.5 + 0.3 * (pos - 1)); // 0.5 → 0.8 (repos)
}

/** Volume cheminée : triangulaire, nul au bureau, pic au repos (idx 2). */
export function fireplaceVolumeForPos(pos: number): number {
  return Math.min(0.6, 0.3 * Math.max(0, pos)); // 0 → 0.6 (repos)
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run src/components/mobile/panorama/audioCurves.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/panorama/audioCurves.ts src/components/mobile/panorama/audioCurves.test.ts
git commit -m "refactor(panorama): courbes audio recalées sur 3 zones bureau"
```

---

### Task 2: Chat baladeur — position bureau uniquement

**Files:**
- Modify: `src/lib/chatBaladeur.ts`
- Modify: `src/components/mobile/qg/chatBaladeurLayout.ts`
- Modify: `src/components/mobile/qg/QgChatBaladeur.tsx`
- Test: `src/lib/chatBaladeur.test.ts`

**Interfaces:**
- Produces: `CHAT_BALADEUR_ORDER = ["qg-fenetre"]`, `ChatBaladeurId = "qg-fenetre"`, `selectChatBaladeur(jourActuel, chatSurFauteuil)` inchangée. `CHAT_BALADEUR_LAYOUT` ne contient plus que `qg-fenetre` avec `left` SANS le décalage +300vw (235 → le baked reste 235 car le wrapper de décalage disparaît en Task 3 : la coordonnée 235 était déjà exprimée dans le repère bureau 0–300).

- [ ] **Step 1: Mettre à jour le test**

Remplacer intégralement `src/lib/chatBaladeur.test.ts` :

```typescript
import { describe, expect, it } from "vitest";
import { selectChatBaladeur, CHAT_BALADEUR_ORDER } from "./chatBaladeur";

describe("selectChatBaladeur", () => {
  it("ne connaît plus que la fenêtre du bureau", () => {
    expect(CHAT_BALADEUR_ORDER).toEqual(["qg-fenetre"]);
  });

  it("renvoie null si le chat est sur le fauteuil", () => {
    expect(selectChatBaladeur(0, true)).toBeNull();
    expect(selectChatBaladeur(42, true)).toBeNull();
  });

  it("renvoie la fenêtre du bureau tous les jours sinon", () => {
    expect(selectChatBaladeur(0, false)).toBe("qg-fenetre");
    expect(selectChatBaladeur(1, false)).toBe("qg-fenetre");
    expect(selectChatBaladeur(7, false)).toBe("qg-fenetre");
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/lib/chatBaladeur.test.ts`
Expected: FAIL (`CHAT_BALADEUR_ORDER` contient encore 3 entrées).

- [ ] **Step 3: Réduire chatBaladeur.ts**

Dans `src/lib/chatBaladeur.ts`, remplacer :

```typescript
export const CHAT_BALADEUR_ORDER = [
  "qg-fenetre",
  "atelier-fenetre",
  "atelier-marche",
] as const;
```

par :

```typescript
export const CHAT_BALADEUR_ORDER = ["qg-fenetre"] as const;
```

(La logique modulo de `selectChatBaladeur` reste correcte avec 1 élément.)

- [ ] **Step 4: Réduire chatBaladeurLayout.ts**

Remplacer intégralement `src/components/mobile/qg/chatBaladeurLayout.ts` :

```typescript
import type { ChatBaladeurId } from "@/lib/chatBaladeur";

/**
 * Coordonnées des emplacements du chat baladeur dans le panorama bureau.
 * Mêmes conventions que `QG_LAYOUT` : `left` et `width` en vw (repère
 * 0–300 de l'image bureau), `bottom` en pourcentage.
 */
export const CHAT_BALADEUR_LAYOUT: Record<
  ChatBaladeurId,
  { left: number; bottom: number; width: number }
> = {
  "qg-fenetre": { left: 235.0, bottom: 28.2, width: 10.7 },
};
```

- [ ] **Step 5: Réduire la map d'assets dans QgChatBaladeur.tsx**

Dans `src/components/mobile/qg/QgChatBaladeur.tsx`, remplacer :

```typescript
const SRC: Record<ChatBaladeurId, string> = {
  "qg-fenetre": "/qg/chat-baladeur/qg-fenetre.webp",
  "atelier-fenetre": "/qg/chat-baladeur/atelier-fenetre.webp",
  "atelier-marche": "/qg/chat-baladeur/atelier-marche.webp",
};
```

par :

```typescript
const SRC: Record<ChatBaladeurId, string> = {
  "qg-fenetre": "/qg/chat-baladeur/qg-fenetre.webp",
};
```

- [ ] **Step 6: Tests + types**

Run: `npx vitest run src/lib/chatBaladeur.test.ts && npx tsc --noEmit`
Expected: PASS. Si `tsc` râle sur `dev/QgEditContext.tsx` (coords chat), corriger uniquement ce qui référence les ids `atelier-*` supprimés (le gros nettoyage du tooling arrive en Task 4).

- [ ] **Step 7: Commit**

```bash
git add src/lib/chatBaladeur.ts src/lib/chatBaladeur.test.ts src/components/mobile/qg/chatBaladeurLayout.ts src/components/mobile/qg/QgChatBaladeur.tsx
git commit -m "refactor(qg): chat baladeur réduit à la fenêtre du bureau"
```

---

### Task 3: Panorama 3 zones, page /bureau, promotion des routes

C'est la tâche pivot — elle doit rester UN SEUL commit car Next.js interdit deux pages résolvant la même route (les marqueurs `(panorama)/stockage` etc. doivent disparaître dans le même commit que la promotion de `stockage/gerer`).

**Files:**
- Modify: `src/components/mobile/panorama/UnifiedPanorama.tsx` (réécriture)
- Modify: `src/components/mobile/panorama/unifiedZones.test.ts` (réécriture)
- Create: `src/app/bureau/page.tsx` (contenu adapté de `src/app/(panorama)/layout.tsx`)
- Delete: `src/app/(panorama)/` (layout + 4 pages marqueurs)
- Move: `src/app/stockage/gerer/page.tsx` → `src/app/stockage/page.tsx`
- Move: `src/app/atelier/gerer/page.tsx` → `src/app/atelier/page.tsx`
- Move: `src/app/collection/grille/page.tsx` → `src/app/collection/page.tsx`
- Modify: `src/components/mobile/TabBar.tsx`, `src/components/mobile/SwipePager.tsx`, `src/components/mobile/GlobalVinylAmbiance.tsx`
- Delete: `src/lib/panoramaActiveStore.ts`

**Interfaces:**
- Consumes: `volumeVinylForPos`/`fireplaceVolumeForPos` (Task 1, domaine 0..2).
- Produces: `UnifiedZoneKey = "bureau" | "porte" | "repos"`, `UNIFIED_ZONE_ORDER` (3 clés), `UNIFIED_ZONE_OFFSETS` (0/100/200), `UNIFIED_PANORAMA_WIDTH_VW = 300`, composant `UnifiedPanorama({ initialZone?, children?, onZoneIndex? })`. Supprimés : `zoneIndexToTab`, `COLLECTION_X_SHIFT_VW`, `collectionChildren`, `unifiedZoneAnchorSelector`, `panoramaActiveStore`.

- [ ] **Step 1: Réécrire le test de zones**

Remplacer intégralement `src/components/mobile/panorama/unifiedZones.test.ts` :

```typescript
import { describe, expect, it } from "vitest";
import {
  UNIFIED_ZONE_ORDER,
  UNIFIED_ZONE_OFFSETS,
  UNIFIED_PANORAMA_WIDTH_VW,
} from "./UnifiedPanorama";

describe("modèle de zones du panorama bureau", () => {
  it("ordonne les 3 zones gauche→droite", () => {
    expect(UNIFIED_ZONE_ORDER).toEqual(["bureau", "porte", "repos"]);
  });

  it("a des offsets 0/100/200 dans la largeur 300vw", () => {
    expect(UNIFIED_ZONE_OFFSETS).toEqual({ bureau: 0, porte: 100, repos: 200 });
    expect(UNIFIED_PANORAMA_WIDTH_VW).toBe(300);
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/components/mobile/panorama/unifiedZones.test.ts`
Expected: FAIL (9 zones actuellement, et `zoneIndexToTab` encore exporté).

- [ ] **Step 3: Réécrire UnifiedPanorama.tsx**

Remplacer intégralement `src/components/mobile/panorama/UnifiedPanorama.tsx` :

```tsx
"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { QgEditOverlay } from "../qg/dev/QgEditOverlay";

/**
 * Panorama du bureau : une seule image de fond (`/qg/fond-cabinet.webp`,
 * 300vw), 3 zones de snap (bureau · porte · repos) avec scroll horizontal
 * natif. Le stockage, l'atelier et la collection ne sont plus des sections
 * du panorama : on y accède directement par la TabBar.
 */

export type UnifiedZoneKey = "bureau" | "porte" | "repos";

/** Offsets en vw des centres de zone (largeur totale 300vw). */
export const UNIFIED_ZONE_OFFSETS: Record<UnifiedZoneKey, number> = {
  bureau: 0,
  porte: 100,
  repos: 200,
};

export const UNIFIED_ZONE_ORDER: UnifiedZoneKey[] = ["bureau", "porte", "repos"];

export const UNIFIED_PANORAMA_WIDTH_VW = 300;

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  scrollSnapType: "x mandatory",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
};

const snapAnchorStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  width: "100vw",
  height: "100%",
  scrollSnapAlign: "center",
  pointerEvents: "none",
};

const sceneStyle: CSSProperties = {
  position: "relative",
  width: `${UNIFIED_PANORAMA_WIDTH_VW}vw`,
  // Hauteur proportionnée à l'aspect de l'image bureau (2752:1536).
  height: `calc(${UNIFIED_PANORAMA_WIDTH_VW}vw * 1536 / 2752)`,
  flexShrink: 0,
};

const bgStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  pointerEvents: "none",
  userSelect: "none",
  display: "block",
};

const objectsLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  pointerEvents: "none",
};

interface UnifiedPanoramaProps {
  initialZone?: UnifiedZoneKey;
  children?: ReactNode;
  /**
   * Index de zone fractionnaire (0 = bureau … 2 = repos). Émis à chaque
   * rAF de scroll, après ré-interpolation depuis scrollLeft.
   */
  onZoneIndex?: (idx: number) => void;
}

export function UnifiedPanorama({
  initialZone = "porte",
  children,
  onZoneIndex,
}: UnifiedPanoramaProps) {
  const { d } = useLangue();
  const ref = useRef<HTMLDivElement>(null);
  const onZoneIndexRef = useRef(onZoneIndex);
  useEffect(() => {
    onZoneIndexRef.current = onZoneIndex;
  }, [onZoneIndex]);

  // Init scroll position sur la zone cible (au mount UNIQUEMENT).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = ref.current;
    if (!el) return;
    const anchor = el.querySelector(
      `[data-unified-zone="${initialZone}"]`,
    ) as HTMLElement | null;
    if (!anchor) return;
    const saved = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    anchor.scrollIntoView({ inline: "center", block: "nearest" });
    el.style.scrollBehavior = saved;
    didInitRef.current = true;
    onZoneIndexRef.current?.(UNIFIED_ZONE_ORDER.indexOf(initialZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener de scroll → index de zone fractionnaire vers le parent.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const clientWidth = el.clientWidth;
        if (clientWidth <= 0) return;
        // scrollLeft en vw (1vw = 1% de la largeur du viewport ≈ clientWidth).
        const currentVw = (el.scrollLeft / clientWidth) * 100;
        let closestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < UNIFIED_ZONE_ORDER.length; i++) {
          const z = UNIFIED_ZONE_ORDER[i];
          const dz = Math.abs(currentVw - UNIFIED_ZONE_OFFSETS[z]);
          if (dz < bestDist) {
            bestDist = dz;
            closestIdx = i;
          }
        }
        onZoneIndexRef.current?.(closestIdx);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={containerStyle}
      aria-label={d.qg.panorama}
      data-unified-panorama="1"
    >
      <div style={sceneStyle} data-unified-scene="1">
        <img
          src="/qg/fond-cabinet.webp"
          alt=""
          style={bgStyle}
          draggable={false}
        />
        {/* Objets interactifs positionnés au-dessus */}
        <div style={objectsLayer}>
          {children}
          {/* L'overlay s'auto-gate via le contexte d'édition (enabled + active). */}
          <QgEditOverlay />
        </div>
      </div>

      {/* Snap anchors (1 par zone) */}
      {UNIFIED_ZONE_ORDER.map((zone) => (
        <div
          key={zone}
          data-unified-zone={zone}
          style={{
            ...snapAnchorStyle,
            left: `${UNIFIED_ZONE_OFFSETS[zone]}vw`,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}
```

Notes :
- `aria-label` : réutilise la clé existante `d.qg.panorama` (« Panorama du QG », déjà traduite fr/en/es) — l'ancienne chaîne en dur mentionnait stockage/atelier.
- `data-unified-scene` est conservé : `QgEditOverlay.tsx:86` s'en sert (`el.closest("[data-unified-scene]")`).
- Le fractionnaire émis par le rAF est en réalité un index SNAPPÉ (comportement identique à l'existant — `handleZoneIndex` reçoit déjà des entiers pendant le scroll, sauf l'init).

- [ ] **Step 4: Vérifier que le test de zones passe**

Run: `npx vitest run src/components/mobile/panorama/unifiedZones.test.ts`
Expected: PASS.

- [ ] **Step 5: Promouvoir les 3 pages de gestion et supprimer le groupe (panorama)**

```bash
git rm "src/app/(panorama)/layout.tsx" "src/app/(panorama)/bureau/page.tsx" "src/app/(panorama)/atelier/page.tsx" "src/app/(panorama)/collection/page.tsx" "src/app/(panorama)/stockage/page.tsx"
git mv src/app/stockage/gerer/page.tsx src/app/stockage/page.tsx
git mv src/app/atelier/gerer/page.tsx src/app/atelier/page.tsx
git mv src/app/collection/grille/page.tsx src/app/collection/page.tsx
rmdir src/app/stockage/gerer src/app/atelier/gerer src/app/collection/grille
```

(Le contenu de l'ancien `(panorama)/layout.tsx` est recréé en Step 6 — garder son texte sous la main via `git show HEAD:"src/app/(panorama)/layout.tsx"`.)

- [ ] **Step 6: Créer src/app/bureau/page.tsx**

Créer `src/app/bureau/page.tsx` en partant du contenu de l'ancien `src/app/(panorama)/layout.tsx` avec EXACTEMENT les adaptations suivantes (tout le reste — gramophone, sheets, virtualisation, verrou scroll, mode édition, dots — est conservé tel quel) :

1. Renommer `PanoramaInner` → `BureauPageInner` et l'export default :

```tsx
export default function BureauPage() {
  return (
    <Suspense fallback={null}>
      <BureauPageInner />
    </Suspense>
  );
}
```

`BureauPageInner` ne prend plus de prop `children` ; supprimer aussi le rendu `{children}` (« Page-level children ») avant les sheets.

2. Supprimer les imports devenus inutiles : `usePathname`, `panoramaActiveStore`, `CollectionVitrine`, `WorkshopSlots`, `QgStockageBoxes`, `zoneIndexToTab`, `unifiedZoneAnchorSelector`. `useRouter` RESTE (redirect `/` + navigation porte).

3. Supprimer les fonctions module `tabToInitialZone` et `pathnameToTab`, et les lignes :

```tsx
  const currentTab = pathnameToTab(pathname);
  // Zone initiale = calculée au PREMIER mount uniquement (cf. UnifiedPanorama).
  const mountInitialZoneRef = useRef<UnifiedZoneKey>(tabToInitialZone(currentTab));
```

ainsi que `const pathname = usePathname();`. La zone d'entrée devient la constante `"porte"` (défaut du composant) : passer `initialZone="porte"` à `<UnifiedPanorama>`.

4. Simplifier `handleZoneIndex` (plus de store, plus de sync URL) :

```tsx
  const handleZoneIndex = useCallback((idx: number) => {
    zoneIdxRef.current = idx;
    const snapIdx = Math.round(idx);
    setZoneActive((prev) => (prev === snapIdx ? prev : snapIdx));

    // Audio : volume cheminée + vinyle pilotés par la position. Pic au
    // repos (idx 2) où sont cheminée et gramophone.
    audioManager.setFireplaceVolume(fireplaceVolumeForPos(idx));
    if (!gramophoneOuvertRef.current) {
      setVinylTargetVolumeRef.current(volumeVinylForPos(idx));
    }
  }, []);
```

5. Supprimer intégralement : les refs `mountTimeRef` / `urlDebounceRef` et leurs commentaires, l'effet « Au démontage du layout … panoramaActiveStore », l'effet « Cleanup débounce URL au démontage », l'effet « Quand le pathname change … smooth-scroll » (celui qui utilise `unifiedZoneAnchorSelector`).

6. Zone init du state :

```tsx
  // Index de zone fractionnaire courant (0..2).
  const zoneIdxRef = useRef(UNIFIED_ZONE_ORDER.indexOf("porte"));
  const [zoneActive, setZoneActive] = useState(zoneIdxRef.current);
```

7. Virtualisation recalée sur 3 zones — remplacer le bloc `showQgZone`/`showVitrineZone` :

```tsx
  // Virtualisation : monte un objet si sa zone est à distance ≤ 1 de la zone
  // active (index 0..2). bureau/porte/repos = 0/1/2.
  const showQgZone = (qgZoneIdx: 0 | 1 | 2) =>
    Math.abs(zoneActive - qgZoneIdx) <= 1;
```

et dans le JSX : `showQgZone(3)` → `showQgZone(0)`, `showQgZone(4)` → `showQgZone(1)`, `showQgZone(5)` → `showQgZone(2)`.

8. Dans le JSX du panorama, supprimer : la prop `collectionChildren={…}` entière (avec son `<CollectionVitrine …>`), `<WorkshopSlots />` et son commentaire « L'accès à /atelier/gerer … », `<QgStockageBoxes />` et son commentaire « Cartons cliquables … ». `<QgChatBaladeur …>` RESTE. Mettre à jour le commentaire de section « Section bureau (sections 1/2/3) » → « Sections du bureau (0/1/2) ».

9. Mettre à jour le commentaire de l'effet ambiance (ligne « sortira sur /chiner, /vitrine, /atelier/gerer, etc. ») → « sortira sur /chiner, /vitrine, /atelier, etc. ».

10. Le commentaire du `useLayoutEffect` verrou scroll mentionnant « d'un onglet précédent (Collection/Stockage) » reste vrai (les onglets scrollent) — le garder.

- [ ] **Step 7: Supprimer panoramaActiveStore et nettoyer TabBar**

```bash
git rm src/lib/panoramaActiveStore.ts
```

Dans `src/components/mobile/TabBar.tsx` :
- Supprimer l'import `useSyncExternalStore` (garder `type CSSProperties`) et l'import du bloc `panoramaActiveStore` / `panoramaActiveServerSnapshot`.
- Supprimer le bloc `liveTab` (commentaire « Override "live" … » + l'appel `useSyncExternalStore`) et le bloc `liveTabPath` ; remplacer :

```tsx
  const effectivePath = liveTabPath ?? pathname;
  const activeIdx = findActiveTabIndex(effectivePath);
```

par :

```tsx
  const activeIdx = findActiveTabIndex(pathname);
```

- Mettre à jour le commentaire au-dessus de `TAB_ORDER` (il décrit le panorama Atelier+Stockage partagé) :

```tsx
/**
 * Ordre cyclique : Collection → Bibliothèque → Bureau → Stockage → Atelier → (boucle)
 *
 * Seul le Bureau est un panorama (3 zones swipables). Les autres onglets
 * ouvrent directement leur écran de gestion.
 */
```

⚠ `useSyncExternalStore` était appelé AVANT les early returns (`if (!isHydrated) return null`). En le supprimant on RÉDUIT le nombre de hooks — pas de violation rules-of-hooks, mais lancer `npm run lint:hooks` quand même (Step 10).

- [ ] **Step 8: Nettoyer SwipePager**

Dans `src/components/mobile/SwipePager.tsx` :
- Supprimer le bloc `PANORAMA_GROUP` + `pageKeyForPathname` (et son long commentaire), et remplacer leurs usages : `const prevKey = …` / `const currKey = …` / `const pageKey = pageKeyForPathname(pathname)` par l'utilisation directe des pathnames :

```tsx
  const direction = computeDirection(prevPathnameRef.current, pathname);
```

et `<div key={pathname} className={animClass}>`.
- Mettre à jour le commentaire d'en-tête (« ex. panorama du Bureau au milieu » reste correct) et celui du bloc scrollable (« Pour le panorama unifié (data-unified-panorama), les bords correspondent EXACTEMENT aux zones bureau (gauche) et coinL (droite) ») → « aux zones bureau (gauche) et repos (droite) ».

- [ ] **Step 9: Recaler GlobalVinylAmbiance**

Dans `src/components/mobile/GlobalVinylAmbiance.tsx`, remplacer :

```tsx
const PANORAMA_PATHS = new Set<string>(["/bureau", "/stockage", "/atelier"]);
```

par :

```tsx
const PANORAMA_PATHS = new Set<string>(["/bureau"]);
```

et la branche :

```tsx
  if (
    pathname.startsWith("/atelier/gerer") ||
    pathname.startsWith("/stockage/gerer")
  ) {
    return { volume: 0.28, lowpassHz: 800 };
  }
```

par :

```tsx
  if (pathname.startsWith("/atelier") || pathname.startsWith("/stockage")) {
    // Atelier / stockage : pièces voisines fermées.
    return { volume: 0.28, lowpassHz: 800 };
  }
```

Mettre à jour le commentaire d'en-tête du fichier en conséquence (« Dans le panorama (bureau) … » ; «  - atelier, stockage : pièce voisine fermée »).

- [ ] **Step 10: Retirer le bouton retour de la page Collection**

Dans `src/app/collection/page.tsx` (ex-grille) : supprimer le `left={<button …ChevronLeft…/>}` du `PageHeaderBar` (le retour au « cabinet » n'existe plus — la TabBar suffit), l'import `ChevronLeft` de lucide-react s'il n'est plus utilisé, et la clé `retourCabinet` des trois dictionnaires `src/lib/i18n/ui/fr.ts` (ligne ~404), `en.ts` (~401), `es.ts` (~401).

- [ ] **Step 11: Vérifier compilation, lint, tests, build**

```bash
npx tsc --noEmit && npx eslint src && npm run lint:hooks && npm run test:run
```

Expected: tout passe SAUF peut-être des erreurs de compilation dans `atelier-pano/`, `collection-pano/`, `QgStockageBoxes` (composants encore présents mais orphelins, imports de routes/constantes supprimées). Si c'est le cas, passer directement à la Task 4 et faire UN commit combiné Task 3+4 (les deux états ne sont séparables que si tout compile). Sinon :

- [ ] **Step 12: Vérification manuelle du routage**

Run: `npx next build 2>&1 | tail -20`
Expected: build OK ; les routes listées incluent `/bureau`, `/stockage`, `/atelier`, `/collection`, `/bibliotheque` et n'incluent PLUS `/stockage/gerer`, `/atelier/gerer`, `/collection/grille`.

- [ ] **Step 13: Commit**

```bash
git add -A src/
git commit -m "feat(panorama): panorama bureau seul, routes de gestion promues

- UnifiedPanorama réduit à 300vw / 3 zones (bureau·porte·repos)
- (panorama) remplacé par la page /bureau autonome
- /stockage/gerer → /stockage, /atelier/gerer → /atelier,
  /collection/grille → /collection (TabBar inchangée)
- panoramaActiveStore supprimé (TabBar sur pathname seul)"
```

---

### Task 4: Purge des composants morts et du tooling d'édition

**Files:**
- Delete: `src/components/mobile/atelier-pano/` (6 fichiers), `src/components/mobile/collection-pano/` (2 fichiers), `src/components/mobile/qg/QgStockageBoxes.tsx`, `src/components/mobile/qg/stockageBoxesLayout.ts`, `src/components/mobile/qg/QgPanorama.tsx` (legacy mort)
- Modify: `src/components/mobile/qg/dev/QgEditContext.tsx`, `dev/QgEditPanel.tsx`, `dev/QgEditOverlay.tsx`
- Modify: `src/context/GameContext.tsx` (commentaire), `src/components/mobile/StockageItemRow.tsx` (commentaire)

**Interfaces:**
- Consumes: rien — tout est devenu orphelin après Task 3.
- Produces: le tooling `qgedit` ne gère plus que les objets QG (`QG_LAYOUT`) et le chat baladeur (`CHAT_BALADEUR_LAYOUT`).

- [ ] **Step 1: Supprimer les fichiers morts**

```bash
git rm -r src/components/mobile/atelier-pano src/components/mobile/collection-pano
git rm src/components/mobile/qg/QgStockageBoxes.tsx src/components/mobile/qg/stockageBoxesLayout.ts src/components/mobile/qg/QgPanorama.tsx
```

Avant le `git rm` de `QgPanorama.tsx`, confirmer qu'il est bien orphelin :
`grep -rn "from.*QgPanorama" src` → aucune occurrence attendue.

- [ ] **Step 2: Purger le tooling d'édition**

Guidé par le compilateur (`npx tsc --noEmit` après chaque fichier) :

- `dev/QgEditContext.tsx` : supprimer les imports depuis `../stockageBoxesLayout` (`STOCKAGE_BOXES_LAYOUT`, types associés) et `@/components/mobile/atelier-pano/slotsLayout` (`ATELIER_SLOT_LAYOUT`, `ATELIER_SLOT_ORDER`, …) ; supprimer `SLOT_KEYS`, les branches boxes/slots de la résolution de coords (lignes ~56-59) et le hook « Coords effectives … slot de restauration atelier » (ligne ~206). Garder : objets QG + `useChatBaladeurCoord` (réduit à `qg-fenetre` depuis la Task 2).
- `dev/QgEditOverlay.tsx` : supprimer les imports boxes/slots, `SLOT_KEYS`, la branche `if ((ATELIER_SLOT_ORDER …).includes(editKey))` (ligne ~48) et les cadres associés.
- `dev/QgEditPanel.tsx` : supprimer les imports boxes/slots, `SLOT_KEYS`, les branches `isSlot`/boxes du sélecteur (lignes ~92-96), la section export « // Slots atelier » (lignes ~132, ~276) et toute UI listant boxes/slots.

- [ ] **Step 3: Commentaires orphelins**

- `src/context/GameContext.tsx:623` : « (slot panorama ou page /atelier/gerer) » → « (page /atelier) ».
- `src/components/mobile/StockageItemRow.tsx:345` : « cf. stockage/gerer/page.tsx » → « cf. app/stockage/page.tsx ».
- `grep -rn "gerer\|grille\|atelier-pano\|collection-pano\|CollectionVitrine\|WorkshopSlots\|QgStockageBoxes" src` — corriger tout commentaire/référence restant (hors `stockage/gerer` legacy dans d'éventuels docs).

- [ ] **Step 4: Compilation, lint, tests**

```bash
npx tsc --noEmit && npx eslint src && npm run test:run
```

Expected: PASS. (Si des clés i18n deviennent orphelines — libellés spécifiques aux cartons/slots du panorama — les repérer avec l'outil d'audit i18n du projet s'il existe, sinon les laisser : clés inutilisées = inoffensives, à purger dans le backlog i18n.)

- [ ] **Step 5: Commit**

```bash
git add -A src/
git commit -m "chore(panorama): purge composants atelier/collection/stockage du panorama"
```

---

### Task 5: Purge des assets

**Files:**
- Delete: `public/atelier/fond-atelier.png`, `public/collection/fond-collection.webp`, `public/qg/boxes/` (10 fichiers), `public/qg/chat-baladeur/atelier-fenetre.webp`, `public/qg/chat-baladeur/atelier-marche.webp`

- [ ] **Step 1: Vérifier qu'aucune référence ne subsiste**

```bash
grep -rn "fond-atelier\|fond-collection\|/qg/boxes\|chat-baladeur/atelier" src src-tauri 2>/dev/null
```

Expected: aucune occurrence. (Si `src-tauri` référence des assets dans sa config, vérifier aussi.)

- [ ] **Step 2: Supprimer**

```bash
git rm -r public/atelier public/collection public/qg/boxes
git rm public/qg/chat-baladeur/atelier-fenetre.webp public/qg/chat-baladeur/atelier-marche.webp
```

NE PAS toucher `public/qg/chat-baladeur/qg-fenetre.webp`, `public/brocantes/`, `public/items/`.

- [ ] **Step 3: Build de contrôle**

Run: `npx next build 2>&1 | tail -5`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add -A public/
git commit -m "chore(assets): suppression fonds atelier/collection, cartons et chats atelier"
```

---

### Task 6: Vérification finale

- [ ] **Step 1: Suite complète**

```bash
npx tsc --noEmit && npx eslint src && npm run lint:hooks && npm run test:run && npx next build 2>&1 | tail -5
```

Expected: tout passe.

- [ ] **Step 2: Vérification fonctionnelle au simulateur iOS**

Lancer `scripts/ios-sim.sh` (cf. mémoire projet : l'archive Tauri est cassée sur Mac Intel, ce script est le chemin supporté). Vérifier :
- `/bureau` : swipe 3 zones, entrée sur la porte, 3 dots, tous les hotspots (carnet, carnet de notes, porte, courrier, calendrier, porte-revues, fauteuil, gramophone), chat baladeur à la fenêtre, audio cheminée/gramophone qui monte vers le coin repos.
- TabBar : Stockage → écran de gestion direct ; Atelier → écran de restauration direct (badge « prêt » conservé) ; Collection → grille directe (plus de bouton retour) ; Bibliothèque inchangée.
- Swipe entre onglets (SwipePager) : cycle Collection → Bibliothèque → Bureau → Stockage → Atelier, animations d'entrée OK, le swipe DANS le panorama ne déclenche la navigation qu'aux bords.
- Retour de /chiner et /vitrine vers /bureau intact ; musique gramophone étouffée hors bureau (0.28 sur stockage/atelier, 0.22 sur collection/bibliothèque).

- [ ] **Step 3: Rapport final**

Constater l'état, signaler tout écart à Guillaume (notamment ce qui ne peut se vérifier qu'on-device : gyro, audio réel, haptique).
