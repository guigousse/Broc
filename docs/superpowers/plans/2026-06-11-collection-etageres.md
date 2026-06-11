# Collection Étagères Bois + Slider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habiller la grille Collection en étagères de bois (rangées posées sur des planches, fond bois clair) avec un slider laiton 3 crans (1-3 items par ligne, mémorisé).

**Architecture:** `CollectionGrid` passe d'une grid auto-fill à des rangées explicites de `colonnes` items, chacune suivie d'une planche décorative. Un hook `useColonnesCollection` (état + localStorage via les helpers `safeLocalStorage*` existants) alimente la page ; un composant `ColonnesSlider` flottant (input range stylé en potard Marshall) règle la valeur. Le fond bois clair est posé par un wrapper dans la page.

**Tech Stack:** Next.js / React 19, styles inline + classes dans `globals.css`, vitest + Testing Library (jsdom). Spec : `docs/superpowers/specs/2026-06-11-collection-etageres-design.md`.

**Répertoire de travail :** `/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc`, branche `feat/collection-etageres`.

---

### Task 1: CollectionGrid — rangées explicites + planches

**Files:**
- Modify: `src/app/globals.css` (nouvelles variables, à côté de `--gradient-cargo-wood` ligne ~63)
- Modify: `src/components/CollectionGrid.tsx` (props + rendu de la grille, lignes ~10-15 et ~218-238)
- Test: `src/components/CollectionGrid.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans le `describe("CollectionGrid", ...)` existant (le tableau `slots` du fichier contient 3 slots) :

```tsx
it("étagères : une planche par rangée (3 slots, colonnes=3 → 1 planche)", () => {
  render(<CollectionGrid slots={slots} />);
  expect(screen.getAllByTestId("planche")).toHaveLength(1);
});

it("étagères : colonnes=1 → une planche par item", () => {
  render(<CollectionGrid slots={slots} colonnes={1} />);
  expect(screen.getAllByTestId("planche")).toHaveLength(3);
});

it("étagères : la rangée utilise repeat(colonnes, 1fr)", () => {
  render(<CollectionGrid slots={slots} colonnes={2} />);
  const rangee = screen.getAllByRole("button")[0].parentElement as HTMLElement;
  expect(rangee.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
  expect(screen.getAllByTestId("planche")).toHaveLength(2);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: FAIL — `getAllByTestId("planche")` ne trouve rien, prop `colonnes` inexistante.

- [ ] **Step 3: Implémentation**

a) Dans `src/app/globals.css`, juste sous la ligne `--gradient-cargo-wood: ...` :

```css
  /* Étagères de la Collection : fond bois clair derrière la grille,
     planche brune sous chaque rangée, chant clair sur le dessus. */
  --wood-light: linear-gradient(180deg, #F0DEAE 0%, #E9D29C 100%);
  --gradient-shelf: linear-gradient(180deg, #B08A52 0%, #99713C 50%, #7C5B2F 100%);
  --shelf-edge: #CBA96B;
```

b) Dans `src/components/CollectionGrid.tsx`, ajouter `colonnes` aux props :

```tsx
interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
  /** TemplateIds présents dans l'inventaire du joueur (badge "+"). */
  enStockIds?: ReadonlySet<string>;
  /** Items par ligne (réglé par le slider de zoom). */
  colonnes?: 1 | 2 | 3;
}
```

c) Ajouter le style de planche près des autres constantes de style (après `newBadge`) :

```tsx
const planche: CSSProperties = {
  height: 16,
  marginTop: 6,
  marginBottom: 16,
  background: "var(--gradient-shelf)",
  borderTop: "2px solid var(--shelf-edge)",
  boxShadow: "0 3px 5px rgba(0, 0, 0, 0.28)",
};
```

d) Remplacer le rendu de `CollectionGrid` (l'actuel `<div>` grid auto-fill et son map) :

```tsx
export function CollectionGrid({
  slots,
  onTap,
  enStockIds,
  colonnes = 3,
}: CollectionGridProps) {
  // Wrapper stable (pattern latest-ref) : même si le parent passe une arrow
  // function inline recréée à chaque render, les cellules mémoïsées gardent
  // une référence stable et ne re-rendent que quand leur slot change.
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const stableOnTap = useCallback(
    (slot: CollectionSlot) => onTapRef.current?.(slot),
    [],
  );

  const rangees: CollectionSlot[][] = [];
  for (let i = 0; i < slots.length; i += colonnes) {
    rangees.push(slots.slice(i, i + colonnes));
  }

  return (
    <div>
      {rangees.map((rangee) => (
        <div key={rangee[0].templateId}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${colonnes}, 1fr)`,
              gap: "var(--gutter)",
              padding: "0 var(--gutter)",
            }}
          >
            {rangee.map((s) => (
              <CollectionCell
                key={s.templateId}
                slot={s}
                onTap={stableOnTap}
                enStock={enStockIds?.has(s.templateId) ?? false}
              />
            ))}
          </div>
          {/* Planche d'étagère sous la rangée */}
          <div aria-hidden data-testid="planche" style={planche} />
        </div>
      ))}
    </div>
  );
}
```

Note : les tests de mémoïsation existants (« re-render avec mêmes slots ne re-rend pas les cellules ») doivent continuer à passer — les cellules restent mémoïsées, seule la structure autour change.

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: PASS (17 tests : 14 existants + 3 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/CollectionGrid.tsx src/components/CollectionGrid.test.tsx
git commit -m "feat(collection): grille en rangées posées sur des planches d'étagère"
```

---

### Task 2: Hook useColonnesCollection (persistance localStorage)

**Files:**
- Create: `src/lib/useColonnesCollection.ts`
- Test: `src/lib/useColonnesCollection.test.ts` (extension `.tsx` interdite inutilement — renderHook n'a pas besoin de JSX, mais vitest/jsdom oui : utiliser `.ts` fonctionne avec renderHook)

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/useColonnesCollection.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { CLE_COLONNES, useColonnesCollection } from "./useColonnesCollection";

afterEach(() => window.localStorage.clear());

describe("useColonnesCollection", () => {
  it("défaut 3 sans valeur stockée", () => {
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(3);
  });

  it("relit une valeur stockée valide", () => {
    window.localStorage.setItem(CLE_COLONNES, "1");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(1);
  });

  it("ignore une valeur stockée invalide (défaut 3)", () => {
    window.localStorage.setItem(CLE_COLONNES, '"abc"');
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(3);
  });

  it("persiste le changement dans le localStorage", () => {
    const { result } = renderHook(() => useColonnesCollection());
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(window.localStorage.getItem(CLE_COLONNES)).toBe("2");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/useColonnesCollection.test.ts`
Expected: FAIL — module `./useColonnesCollection` inexistant.

- [ ] **Step 3: Implémentation**

Créer `src/lib/useColonnesCollection.ts` :

```ts
"use client";

import { useEffect, useState } from "react";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

export const CLE_COLONNES = "broc.collection.colonnes";

export type Colonnes = 1 | 2 | 3;

/**
 * Préférence "items par ligne" de la page Collection. Démarre à 3 (rendu
 * SSR stable) puis relit le localStorage au montage — évite un mismatch
 * d'hydratation au prix d'un éventuel reflow bref.
 */
export function useColonnesCollection(): [Colonnes, (v: Colonnes) => void] {
  const [colonnes, setColonnes] = useState<Colonnes>(3);

  useEffect(() => {
    const v = safeLocalStorageGet<number>(CLE_COLONNES, 3);
    if (v === 1 || v === 2 || v === 3) setColonnes(v);
  }, []);

  const changer = (v: Colonnes) => {
    setColonnes(v);
    safeLocalStorageSet(CLE_COLONNES, v);
  };

  return [colonnes, changer];
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/useColonnesCollection.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/useColonnesCollection.ts src/lib/useColonnesCollection.test.ts
git commit -m "feat(collection): hook useColonnesCollection (préférence mémorisée)"
```

---

### Task 3: ColonnesSlider — potard laiton 3 crans

**Files:**
- Create: `src/components/mobile/ColonnesSlider.tsx`
- Modify: `src/app/globals.css` (classe `.broc-colonnes-slider`, à la fin du fichier)
- Test: `src/components/mobile/ColonnesSlider.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/mobile/ColonnesSlider.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ColonnesSlider } from "./ColonnesSlider";

afterEach(cleanup);

describe("ColonnesSlider", () => {
  it("rend un range 1-3 avec la valeur courante", () => {
    render(<ColonnesSlider value={2} onChange={() => {}} />);
    const input = screen.getByLabelText("Items par ligne") as HTMLInputElement;
    expect(input.type).toBe("range");
    expect(input.min).toBe("1");
    expect(input.max).toBe("3");
    expect(input.step).toBe("1");
    expect(input.value).toBe("2");
  });

  it("remonte la nouvelle valeur en nombre", () => {
    const onChange = vi.fn();
    render(<ColonnesSlider value={3} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Items par ligne"), {
      target: { value: "1" },
    });
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/ColonnesSlider.test.tsx`
Expected: FAIL — module `./ColonnesSlider` inexistant.

- [ ] **Step 3: Implémentation**

Créer `src/components/mobile/ColonnesSlider.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { Colonnes } from "@/lib/useColonnesCollection";

interface ColonnesSliderProps {
  value: Colonnes;
  onChange: (v: Colonnes) => void;
}

const wrap: CSSProperties = {
  position: "fixed",
  left: 12,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 12px)",
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: 999,
  background: "var(--forest-800)",
  border: "1px solid var(--brass-600)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
};

export function ColonnesSlider({ value, onChange }: ColonnesSliderProps) {
  return (
    <div style={wrap}>
      <input
        type="range"
        min={1}
        max={3}
        step={1}
        value={value}
        aria-label="Items par ligne"
        className="broc-colonnes-slider"
        onChange={(e) => onChange(Number(e.target.value) as Colonnes)}
      />
    </div>
  );
}
```

À la fin de `src/app/globals.css` :

```css
/* ============================================================
   Slider "items par ligne" (Collection) — esprit potard Marshall :
   rail sombre à 3 crans laiton, curseur laiton strié.
   ============================================================ */
.broc-colonnes-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 96px;
  height: 24px;
  background: transparent;
  cursor: pointer;
}
.broc-colonnes-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background:
    radial-gradient(circle 2.5px at 3px 50%, var(--brass-500) 99%, transparent),
    radial-gradient(circle 2.5px at 50% 50%, var(--brass-500) 99%, transparent),
    radial-gradient(circle 2.5px at calc(100% - 3px) 50%, var(--brass-500) 99%, transparent),
    var(--ink-900);
}
.broc-colonnes-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -9px;
  border-radius: 50%;
  border: 2px solid var(--brass-900);
  background:
    repeating-conic-gradient(
      rgba(79, 61, 20, 0.45) 0deg 7deg,
      rgba(0, 0, 0, 0) 7deg 14deg
    ),
    radial-gradient(
      circle at 32% 30%,
      var(--brass-100) 0%,
      var(--brass-500) 55%,
      var(--brass-700) 100%
    );
  box-shadow:
    inset 0 0 0 2px var(--brass-300),
    0 1px 3px rgba(0, 0, 0, 0.5);
}
.broc-colonnes-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: var(--ink-900);
}
.broc-colonnes-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--brass-900);
  background:
    repeating-conic-gradient(
      rgba(79, 61, 20, 0.45) 0deg 7deg,
      rgba(0, 0, 0, 0) 7deg 14deg
    ),
    radial-gradient(
      circle at 32% 30%,
      var(--brass-100) 0%,
      var(--brass-500) 55%,
      var(--brass-700) 100%
    );
  box-shadow:
    inset 0 0 0 2px var(--brass-300),
    0 1px 3px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/mobile/ColonnesSlider.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/ColonnesSlider.tsx src/components/mobile/ColonnesSlider.test.tsx src/app/globals.css
git commit -m "feat(collection): slider laiton 3 crans pour les items par ligne"
```

---

### Task 4: Câblage page Collection — fond bois + slider

**Files:**
- Modify: `src/app/collection/page.tsx`

- [ ] **Step 1: Imports et hook**

Dans `src/app/collection/page.tsx`, ajouter aux imports :

```tsx
import { ColonnesSlider } from "@/components/mobile/ColonnesSlider";
import { useColonnesCollection } from "@/lib/useColonnesCollection";
```

Dans le corps du composant, à côté des autres hooks d'état (après `const [objetADonner, ...]`) :

```tsx
  const [colonnes, setColonnes] = useColonnesCollection();
```

- [ ] **Step 2: Fond bois + props de la grille**

Remplacer l'appel actuel `<CollectionGrid slots={slotsFiltres} enStockIds={enStockIds} onTap={...} />` (enfant de `<MobileLayout>`) par un wrapper bois pleine largeur (le `<main>` du layout a un padding de 12px, compensé par les marges négatives) :

```tsx
      <div
        style={{
          // Pleine largeur : annule le padding 12px du <main> du MobileLayout.
          margin: "-12px -12px 0",
          padding: "12px 0 4px",
          background: "var(--wood-light)",
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
```

- [ ] **Step 3: Slider flottant**

Juste après `</MobileLayout>` (avant `<CollectionDetailOverlay …/>`), ajouter :

```tsx
    <ColonnesSlider value={colonnes} onChange={setColonnes} />
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run && npx tsc --noEmit`
Expected: toute la suite PASS, typecheck propre.

- [ ] **Step 5: Commit**

```bash
git add src/app/collection/page.tsx
git commit -m "feat(collection): fond bois clair et slider de zoom câblés"
```

---

### Task 5: Vérification visuelle et qualité

**Files:** aucun (vérification)

- [ ] **Step 1: Suite complète + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: tous tests PASS, tsc propre. (Note : `npm run lint` est cassé dans ce repo — `next lint` retiré en Next 16 — ne pas s'en servir.)

- [ ] **Step 2: Vérification navigateur (viewport mobile ~390px)**

Run: `npm run dev`, page Collection :
- Chaque rangée repose sur une planche brune (chant clair en haut, ombre en bas), fond bois clair pleine largeur derrière la grille.
- Slider en bas à gauche au-dessus de la TabBar : rail sombre 3 crans, curseur laiton strié ; régler 1/2/3 re-disposera la grille.
- Recharger la page : la valeur choisie est conservée (localStorage).
- Badges `*`/`+`, silhouettes "?", overlay détail et donation fonctionnent comme avant.
- Les autres pages (Atelier, Stockage, Compétences, Bureau) sont inchangées.

- [ ] **Step 3: Commit final éventuel**

Si retouches issues de la vérification (espacements planche/rangée, teintes bois) :

```bash
git add -u
git commit -m "fix(collection): retouches étagères après vérification visuelle"
```
