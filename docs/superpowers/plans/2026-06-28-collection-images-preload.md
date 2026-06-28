# Préchargement des vignettes de la collection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer le « pop-in » (fondu) et la latence des vignettes dans la grille Collection, en chargeant en avance du scroll et en réchauffant le cache à l'ouverture, sans réintroduire le pic mémoire iOS.

**Architecture:** Trois leviers bornés : `ItemSticker` gagne un prop `eager` (chargement immédiat), `CollectionGrid` élargit son overscan de virtualisation (4 → 8) et déclenche un warm-up du cache, et un nouveau module `prefetchThumbs` réchauffe le **cache HTTP** (octets seulement, via `fetch` — jamais `new Image()`) pour les vignettes des slots affichés. Le décodage reste borné par la virtualisation.

**Tech Stack:** React 18, TypeScript, `@tanstack/react-virtual` (`useWindowVirtualizer`), Vitest + Testing Library (jsdom).

## Global Constraints

- **iOS-safe :** le warm-up ne met que des **octets** en cache via `fetch(url)` — **jamais `new Image()`** (qui décoderait et referait exploser la mémoire). Le décodage des bitmaps reste limité à la fenêtre de virtualisation.
- `ItemSticker.eager` par défaut **`false`** → conserve `loading="lazy"` pour les vues plein écran (overlay détail). La grille passe `eager` à `true`.
- `decoding="async"` est **conservé** sur l'`<img>` dans tous les cas.
- `overscan` de la grille : **8**.
- Warm-up limité aux **slots actuellement affichés** (suit donc le filtre catégorie courant).
- Vignettes : URL `/items/thumbs/{templateId}.webp`, uniquement pour les `templateId` de `ITEMS_WITH_IMAGE` (via `getItemThumbUrl`, qui renvoie `null` sinon).

---

### Task 1: `ItemSticker` — prop `eager`

**Files:**
- Modify: `src/components/ui/ItemSticker.tsx`
- Test: `src/components/ui/ItemSticker.test.tsx`

**Interfaces:**
- Produces: `ItemSticker` accepte `eager?: boolean` (défaut `false`). L'`<img>` utilise `loading={eager ? "eager" : "lazy"}`.

- [ ] **Step 1: Écrire les tests (échouent)**

Ajouter ces deux tests à `src/components/ui/ItemSticker.test.tsx`, dans le `describe("ItemSticker", …)` :

```tsx
  it("charge en lazy par défaut", () => {
    const { container } = render(
      <ItemSticker templateId="br.scie_egoine_de_charpentier" categorie="Bricolage" />,
    );
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });

  it("charge en eager quand eager=true", () => {
    const { container } = render(
      <ItemSticker
        templateId="br.scie_egoine_de_charpentier"
        categorie="Bricolage"
        eager
      />,
    );
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });
```

- [ ] **Step 2: Lancer les tests (le 2e doit échouer)**

Run: `npx vitest run src/components/ui/ItemSticker.test.tsx`
Expected: « charge en eager quand eager=true » FAIL (l'img est toujours `loading="lazy"`).

- [ ] **Step 3: Implémenter le prop**

Dans `src/components/ui/ItemSticker.tsx` :

a) Ajouter le champ à l'interface `ItemStickerProps` (après `thumb?: boolean;`) :

```ts
  /**
   * Si vrai, l'image charge immédiatement (`loading="eager"`) au lieu de
   * `lazy`. À activer dans les listes virtualisées (la virtualisation borne
   * déjà le nombre de cellules montées) pour éviter le fondu « pop-in ».
   */
  eager?: boolean;
```

b) Ajouter `eager = false,` à la déstructuration des props de `ItemSticker` (après `thumb = false,`).

c) Sur l'`<img>`, remplacer `loading="lazy"` par :

```tsx
          loading={eager ? "eager" : "lazy"}
```

- [ ] **Step 4: Lancer les tests (tout passe)**

Run: `npx vitest run src/components/ui/ItemSticker.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ItemSticker.tsx src/components/ui/ItemSticker.test.tsx
git commit -m "feat(collection): ItemSticker — prop eager (chargement immédiat)"
```

---

### Task 2: Module `prefetchThumbs` (warm-up cache, octets seulement)

**Files:**
- Create: `src/lib/prefetchThumbs.ts`
- Test: `src/lib/prefetchThumbs.test.ts`

**Interfaces:**
- Consumes: `getItemThumbUrl` de `@/lib/itemImages`, type `CollectionSlot` de `@/types/game`.
- Produces:
  - `thumbUrlsForSlots(slots: CollectionSlot[]): string[]` — pure ; URLs de vignette des slots ayant une image, dédupliquées, dans l'ordre de première apparition.
  - `prefetchThumbs(urls: string[], concurrency?: number): void` — fire-and-forget ; `fetch(url, { cache: "force-cache" })` avec concurrence bornée (défaut 6) ; ignore les erreurs.

- [ ] **Step 1: Écrire les tests (échouent)**

Créer `src/lib/prefetchThumbs.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { thumbUrlsForSlots, prefetchThumbs } from "./prefetchThumbs";
import type { CollectionSlot } from "@/types/game";

function slot(templateId: string): CollectionSlot {
  return {
    templateId,
    nom: templateId,
    categorie: "Bricolage",
    rarete: "commun",
    vu: true,
    dejaPossede: true,
    donation: null,
  } as CollectionSlot;
}

afterEach(() => vi.restoreAllMocks());

describe("thumbUrlsForSlots", () => {
  it("ne garde que les items avec image, mappe vers /items/thumbs et déduplique", () => {
    const urls = thumbUrlsForSlots([
      slot("br.scie_egoine_de_charpentier"), // a une image
      slot("legacy-sans-image"), // pas d'image → ignoré
      slot("br.scie_egoine_de_charpentier"), // doublon → ignoré
      slot("br.marteau_menuisier"), // a une image
    ]);
    expect(urls).toEqual([
      "/items/thumbs/br.scie_egoine_de_charpentier.webp",
      "/items/thumbs/br.marteau_menuisier.webp",
    ]);
  });

  it("renvoie [] pour une liste vide", () => {
    expect(thumbUrlsForSlots([])).toEqual([]);
  });
});

describe("prefetchThumbs", () => {
  it("lance un fetch par URL (best-effort)", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));
    prefetchThumbs(["/items/thumbs/a.webp", "/items/thumbs/b.webp"]);
    // concurrence par défaut (6) ≥ 2 URLs → les 2 fetch partent immédiatement.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("/items/thumbs/a.webp", {
      cache: "force-cache",
    });
  });

  it("ne fait rien pour une liste vide", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));
    prefetchThumbs([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer les tests (échouent)**

Run: `npx vitest run src/lib/prefetchThumbs.test.ts`
Expected: FAIL (module `./prefetchThumbs` introuvable).

- [ ] **Step 3: Créer le module**

`src/lib/prefetchThumbs.ts` :

```ts
import { getItemThumbUrl } from "@/lib/itemImages";
import type { CollectionSlot } from "@/types/game";

/**
 * URLs de vignette des slots qui ont une image, dédupliquées (ordre de première
 * apparition). Les slots sans image (`getItemThumbUrl` → null) sont ignorés.
 */
export function thumbUrlsForSlots(slots: CollectionSlot[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const s of slots) {
    const u = getItemThumbUrl(s.templateId);
    if (u && !seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

/**
 * Réchauffe le cache HTTP des vignettes : `fetch` les OCTETS (sans décoder).
 * Best-effort, fire-and-forget, concurrence bornée. NE PAS utiliser `new Image()`
 * ici : cela décoderait les bitmaps et referait exploser la mémoire (le crash
 * WebView iOS que la virtualisation évite). Le décodage reste assuré, borné, par
 * la grille virtualisée au moment où chaque cellule se monte.
 */
export function prefetchThumbs(urls: string[], concurrency = 6): void {
  if (typeof fetch !== "function" || urls.length === 0) return;
  let i = 0;
  const worker = (): void => {
    if (i >= urls.length) return;
    const url = urls[i++];
    fetch(url, { cache: "force-cache" })
      .catch(() => {})
      .finally(worker);
  };
  const n = Math.min(concurrency, urls.length);
  for (let k = 0; k < n; k++) worker();
}
```

- [ ] **Step 4: Lancer les tests (passent)**

Run: `npx vitest run src/lib/prefetchThumbs.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prefetchThumbs.ts src/lib/prefetchThumbs.test.ts
git commit -m "feat(collection): prefetchThumbs — warm-up cache vignettes (octets seulement)"
```

---

### Task 3: Câblage dans `CollectionGrid` (overscan 8 + eager + warm-up)

**Files:**
- Modify: `src/components/CollectionGrid.tsx`
- Test: `src/components/CollectionGrid.test.tsx`

**Interfaces:**
- Consumes: `ItemSticker` (prop `eager`, Task 1), `prefetchThumbs`/`thumbUrlsForSlots` (Task 2).

- [ ] **Step 1: Écrire le test du warm-up (échoue)**

Dans `src/components/CollectionGrid.test.tsx`, ajouter en tête (sous le `vi.mock` d'ItemSticker existant) un mock du module de prefetch :

```tsx
import { prefetchThumbs } from "@/lib/prefetchThumbs";

vi.mock("@/lib/prefetchThumbs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prefetchThumbs")>();
  return { ...actual, prefetchThumbs: vi.fn() };
});
```

Puis ajouter ce test dans le `describe("CollectionGrid", …)` :

```tsx
  it("réchauffe le cache des vignettes des slots affichés au montage", () => {
    render(
      <CollectionGrid
        slots={[
          makeSlot({ templateId: "br.scie_egoine_de_charpentier" }),
          makeSlot({ templateId: "sans-image" }),
        ]}
      />,
    );
    expect(prefetchThumbs).toHaveBeenCalledWith([
      "/items/thumbs/br.scie_egoine_de_charpentier.webp",
    ]);
  });
```

- [ ] **Step 2: Lancer le test (échoue)**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: FAIL — « réchauffe le cache… » échoue (`prefetchThumbs` jamais appelé).

- [ ] **Step 3: Câbler la grille**

Dans `src/components/CollectionGrid.tsx` :

a) Ajouter `useEffect` à l'import React existant (la ligne `import { memo, useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";`) → ajouter `useEffect,` :

```ts
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
```

b) Ajouter l'import du module de prefetch (sous l'import d'`ItemSticker`) :

```ts
import { prefetchThumbs, thumbUrlsForSlots } from "@/lib/prefetchThumbs";
```

c) Dans `CollectionCell`, passer `eager` au sticker. Remplacer le bloc `<ItemSticker … thumb />` par :

```tsx
      <ItemSticker
        templateId={s.templateId}
        categorie={s.categorie}
        fill
        tilt={false}
        variant={variant}
        halo={halo}
        thumb
        eager
      />
```

d) Passer l'`overscan` de `4` à `8` dans l'appel `useWindowVirtualizer` :

```ts
    overscan: 8,
```

e) Ajouter le warm-up : juste après le calcul de `rangees` (après la boucle qui remplit `rangees`, avant `const planche = …`), insérer :

```ts
  // Warm-up : réchauffe le cache HTTP des vignettes affichées (octets seulement,
  // pas de décodage → iOS-safe). Suit le filtre catégorie via `slots`.
  useEffect(() => {
    prefetchThumbs(thumbUrlsForSlots(slots));
  }, [slots]);
```

- [ ] **Step 4: Lancer les tests (passent)**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: PASS (tous, dont le nouveau warm-up). Le mock conserve `thumbUrlsForSlots` réel (via `importOriginal`), donc l'URL attendue est bien calculée.

- [ ] **Step 5: Vérifier la non-régression + types**

Run: `npx vitest run src/components/ src/lib/prefetchThumbs.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit 2>&1 | grep -E "^src/" || echo "src clean"`
Expected: `src clean`.

- [ ] **Step 6: Commit**

```bash
git add src/components/CollectionGrid.tsx src/components/CollectionGrid.test.tsx
git commit -m "feat(collection): grille — overscan 8, vignettes eager + warm-up cache"
```

---

### Task 4: Vérification manuelle (anti pop-in)

**Files:** aucun (validation).

- [ ] **Step 1: Lancer l'app**

Run: `npm run dev` → vue mobile.

- [ ] **Step 2: Suite complète**

Run: `npx vitest run`
Expected: PASS (aucune régression ; nouveaux tests verts).

- [ ] **Step 3: Vérifications à l'écran (cocher)**
  - Onglet Collection → vitrine → grille `/collection/grille`.
  - À l'ouverture : les vignettes apparaissent vite (cache réchauffé), sans long délai.
  - Au scroll normal : les vignettes sont **déjà nettes** quand la cellule arrive — plus de fondu « en direct ».
  - Changer de filtre catégorie : les vignettes de la nouvelle catégorie se chargent en avance.
  - Sur iOS (ou simu) : pas de rechargement/instabilité du WebView (la virtualisation borne toujours le décodage).

- [ ] **Step 4: Affiner si besoin**

Si le fondu persiste au scroll très rapide : augmenter `overscan` (8 → 10/12) dans `CollectionGrid.tsx`, ou passer les vignettes en `decoding="sync"` (petites images ~22 Ko) via un ajustement ciblé d'`ItemSticker`. Si l'ouverture sature : baisser la concurrence du warm-up. Commit si ajustement :

```bash
git add -p && git commit -m "fix(collection): calage overscan/warm-up des vignettes"
```

---

## Récapitulatif des fichiers

**Créés :**
- `src/lib/prefetchThumbs.ts` (+ test)

**Modifiés :**
- `src/components/ui/ItemSticker.tsx` (+ test)
- `src/components/CollectionGrid.tsx` (+ test)
