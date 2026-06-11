# Collection Étagères v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zoom 1-5 items par ligne, slider plus discret (pill fine, potard 18px), texture bois réelle derrière la grille Collection.

**Architecture:** Le type `Colonnes` du hook `useColonnesCollection` s'élargit à `1|2|3|4|5` et devient la source unique (réimporté par `CollectionGrid` et `ColonnesSlider`). Le slider passe à `max=5` avec 5 crans alignés sur les arrêts d'un potard réduit à 18px. La variable `--wood-light` passe d'un gradient à la photo de parquet copiée dans `public/textures/`.

**Tech Stack:** Next.js / React 19, styles inline + classes `globals.css`, vitest + Testing Library (jsdom). Spec : `docs/superpowers/specs/2026-06-11-collection-etageres-v2-design.md`.

**Répertoire de travail :** `/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc`, branche `feat/collection-etageres-v2`.

---

### Task 1: Type Colonnes 1-5 — hook + grille

**Files:**
- Modify: `src/lib/useColonnesCollection.ts`
- Modify: `src/components/CollectionGrid.tsx` (interface props, lignes ~10-17)
- Test: `src/lib/useColonnesCollection.test.ts`
- Test: `src/components/CollectionGrid.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

a) Dans `src/lib/useColonnesCollection.test.ts`, ajouter dans le `describe` existant :

```ts
  it("accepte 5 (nouvelle borne haute)", () => {
    window.localStorage.setItem(CLE_COLONNES, "5");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(5);
  });

  it("accepte 4", () => {
    window.localStorage.setItem(CLE_COLONNES, "4");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(4);
  });

  it("rejette un nombre hors plage (0, 6) → défaut 3", () => {
    window.localStorage.setItem(CLE_COLONNES, "6");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(3);
  });
```

b) Dans `src/components/CollectionGrid.test.tsx`, ajouter dans le `describe` existant (le tableau `slots` contient 3 slots) :

```tsx
  it("étagères : colonnes=5 → repeat(5, 1fr), une seule planche pour 3 slots", () => {
    render(<CollectionGrid slots={slots} colonnes={5} />);
    const rangee = screen.getAllByRole("button")[0].parentElement as HTMLElement;
    expect(rangee.style.gridTemplateColumns).toBe("repeat(5, 1fr)");
    expect(screen.getAllByTestId("planche")).toHaveLength(1);
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/useColonnesCollection.test.ts src/components/CollectionGrid.test.tsx`
Expected: FAIL — le hook rejette 4/5 (retombe à 3) et `colonnes={5}` est un type invalide (le test tournera quand même sous vitest, mais l'assertion `5` échouera car la prop est typée `1|2|3`... en pratique l'échec visible est sur le hook ; le typage est corrigé au Step 3).

- [ ] **Step 3: Implémentation**

a) `src/lib/useColonnesCollection.ts` — remplacer le contenu par :

```ts
"use client";

import { useEffect, useState } from "react";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

export const CLE_COLONNES = "broc.collection.colonnes";

export type Colonnes = 1 | 2 | 3 | 4 | 5;

function estColonnes(v: number): v is Colonnes {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * Préférence "items par ligne" de la page Collection. Démarre à 3 (rendu
 * SSR stable) puis relit le localStorage au montage — évite un mismatch
 * d'hydratation au prix d'un éventuel reflow bref.
 */
export function useColonnesCollection(): [Colonnes, (v: Colonnes) => void] {
  const [colonnes, setColonnes] = useState<Colonnes>(3);

  useEffect(() => {
    const v = safeLocalStorageGet<number>(CLE_COLONNES, 3);
    if (estColonnes(v)) setColonnes(v);
  }, []);

  const changer = (v: Colonnes) => {
    setColonnes(v);
    safeLocalStorageSet(CLE_COLONNES, v);
  };

  return [colonnes, changer];
}
```

b) `src/components/CollectionGrid.tsx` — ajouter l'import de type et remplacer le type de la prop :

```tsx
import type { Colonnes } from "@/lib/useColonnesCollection";
```

et dans l'interface :

```tsx
  /** Items par ligne (réglé par le slider de zoom). */
  colonnes?: Colonnes;
```

(le défaut `colonnes = 3` dans la signature ne change pas).

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/useColonnesCollection.test.ts src/components/CollectionGrid.test.tsx`
Expected: PASS (7 tests hook + 18 tests grille).

- [ ] **Step 5: Commit**

```bash
git add src/lib/useColonnesCollection.ts src/lib/useColonnesCollection.test.ts src/components/CollectionGrid.tsx src/components/CollectionGrid.test.tsx
git commit -m "feat(collection): zoom jusqu'à 5 items par ligne (type Colonnes élargi)"
```

---

### Task 2: Slider — max 5, 5 crans, pill discrète

**Files:**
- Modify: `src/components/mobile/ColonnesSlider.tsx`
- Modify: `src/app/globals.css` (bloc `.broc-colonnes-slider` en fin de fichier)
- Test: `src/components/mobile/ColonnesSlider.test.tsx`

- [ ] **Step 1: Adapter les tests (échec attendu)**

Dans `src/components/mobile/ColonnesSlider.test.tsx` :

a) Dans le test « rend un range 1-3 avec la valeur courante », renommer en « rend un range 1-5 avec la valeur courante » et remplacer l'assertion `expect(input.max).toBe("3");` par :

```tsx
    expect(input.max).toBe("5");
```

b) Ajouter un test :

```tsx
  it("remonte les nouvelles valeurs hautes (4, 5)", () => {
    const onChange = vi.fn();
    render(<ColonnesSlider value={2} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Items par ligne"), {
      target: { value: "5" },
    });
    expect(onChange).toHaveBeenCalledWith(5);
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/ColonnesSlider.test.tsx`
Expected: FAIL — `input.max` vaut `"3"`.

- [ ] **Step 3: Implémentation**

a) `src/components/mobile/ColonnesSlider.tsx` :
- `max={3}` → `max={5}`
- dans `wrap`, `padding: "6px 12px"` → `padding: "2px 12px"`

b) `src/app/globals.css`, bloc `.broc-colonnes-slider` (fin de fichier) — remplacer le bloc complet par :

```css
/* ============================================================
   Slider "items par ligne" (Collection) — esprit potard Marshall :
   rail sombre à 5 crans laiton, curseur laiton strié.
   ============================================================ */
.broc-colonnes-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 96px;
  height: 28px;
  background: transparent;
  cursor: pointer;
}
.broc-colonnes-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  /* Crans alignés sur les arrêts du potard de 18px :
     centre à 9px + (100% - 18px) × F, F = 0 / .25 / .5 / .75 / 1. */
  background:
    radial-gradient(circle 2.5px at 9px 50%, var(--brass-500) 99%, transparent),
    radial-gradient(circle 2.5px at calc(9px + (100% - 18px) * 0.25) 50%, var(--brass-500) 99%, transparent),
    radial-gradient(circle 2.5px at 50% 50%, var(--brass-500) 99%, transparent),
    radial-gradient(circle 2.5px at calc(9px + (100% - 18px) * 0.75) 50%, var(--brass-500) 99%, transparent),
    radial-gradient(circle 2.5px at calc(100% - 9px) 50%, var(--brass-500) 99%, transparent),
    var(--ink-900);
}
.broc-colonnes-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -7px;
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
  width: 18px;
  height: 18px;
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
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/ColonnesSlider.tsx src/components/mobile/ColonnesSlider.test.tsx src/app/globals.css
git commit -m "feat(collection): slider 5 crans, pill plus discrète (potard 18px)"
```

---

### Task 3: Texture bois réelle + vérification

**Files:**
- Create: `public/textures/bois-clair.jpg` (copie de l'asset fourni)
- Modify: `src/app/globals.css` (variable `--wood-light`, ligne ~63)

- [ ] **Step 1: Copier l'asset**

```bash
mkdir -p public/textures
cp "/Users/guillaume/Desktop/Douglas Fir None 3100 x 2193 mm texture.jpg" public/textures/bois-clair.jpg
```

Vérifier : `ls -lh public/textures/bois-clair.jpg` → ~105 Ko.

- [ ] **Step 2: Remplacer la variable**

Dans `src/app/globals.css`, remplacer :

```css
  --wood-light: linear-gradient(180deg, #F0DEAE 0%, #E9D29C 100%);
```

par :

```css
  /* Photo de parquet sapin clair (1024px, ~105 Ko), mosaïque réduite de
     moitié pour un grain fin sur téléphone ; beige moyen en fallback
     pendant le chargement. */
  --wood-light: url("/textures/bois-clair.jpg") top left / 512px auto repeat
    #EDD9A3;
```

(`--wood-light` n'est consommé que par le wrapper de `src/app/collection/page.tsx` via `background: var(--wood-light)` — le shorthand avec couleur est valide là.)

- [ ] **Step 3: Vérification complète**

Run: `npx vitest run && npx tsc --noEmit`
Expected: toute la suite PASS, typecheck propre. (`npm run lint` cassé dans ce repo — ne pas l'utiliser.)

- [ ] **Step 4: Commit**

```bash
git add public/textures/bois-clair.jpg src/app/globals.css
git commit -m "feat(collection): texture bois réelle derrière la grille"
```

- [ ] **Step 5: Vérification visuelle (Guillaume, sur téléphone via Vercel)**

- Texture parquet visible derrière la grille, planches brunes inchangées.
- Slider fin (pill basse), 5 crans, potard laiton 18px ; zoom 1→5 opérationnel.
- Recharger : valeur 4 ou 5 conservée (localStorage).
