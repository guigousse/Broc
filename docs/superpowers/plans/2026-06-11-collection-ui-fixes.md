# Corrections UI Collection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger trois défauts visuels de la page Collection : bordure pointillée incomplète des silhouettes, header redondant/tronqué, badges `*`/`(+)` (visibilité et nouveau badge "en stock").

**Architecture:** Tout est localisé dans 3 fichiers existants : `CollectionGrid.tsx` (cellules), `PageHeaderBar.tsx` (header partagé, nouvelle prop `align` rétro-compatible), `collection/page.tsx` (câblage). Aucun changement de modèle de données.

**Tech Stack:** Next.js / React 19, styles inline, vitest + Testing Library (jsdom). Spec : `docs/superpowers/specs/2026-06-11-collection-ui-fixes-design.md`.

---

### Task 1: Silhouettes — bordure pointillée et police du "?"

**Files:**
- Modify: `src/components/CollectionGrid.tsx:117-119` (border), `:156-167` (span "?")
- Test: `src/components/CollectionGrid.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans le `describe("CollectionGrid", ...)` de `src/components/CollectionGrid.test.tsx` :

```tsx
it("silhouette : bordure pointillée de largeur entière (rendu WebKit fiable)", () => {
  render(<CollectionGrid slots={slots} />);
  const silhouette = screen.getByRole("button", { name: "Pièce inconnue" });
  expect(silhouette.style.border).toBe("1px dashed var(--paper-500)");
});

it("silhouette : le « ? » utilise la police Art Déco du titre Broc", () => {
  render(<CollectionGrid slots={slots} />);
  const silhouette = screen.getByRole("button", { name: "Pièce inconnue" });
  const point = silhouette.querySelector("span");
  expect(point?.style.fontFamily).toBe("var(--font-broc-title)");
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: FAIL — border vaut `1.5px dashed …`, fontFamily vaut `var(--font-display)`.

- [ ] **Step 3: Implémentation minimale**

Dans `src/components/CollectionGrid.tsx`, remplacer la bordure (lignes 117-119) :

```tsx
    border: isSilhouette
      ? `1px dashed ${GRAY_OUTER}`
      : `1.5px solid ${outerColor}`,
```

Et le style du "?" (lignes 156-167) :

```tsx
      {isSilhouette ? (
        <span
          style={{
            fontFamily: "var(--font-broc-title)",
            fontSize: 36,
            fontWeight: 400,
            color: GRAY_OUTER,
            lineHeight: 1,
          }}
        >
          ?
        </span>
      ) : (
```

(`fontWeight: 400` : la police titre est décorative, le gras 700 n'existe pas — même réglage que le logo "Broc" dans `MobileHeader.tsx:59-60`.)

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CollectionGrid.tsx src/components/CollectionGrid.test.tsx
git commit -m "fix(collection): pointillés silhouettes en 1px (bug WebKit) + ? en police titre"
```

---

### Task 2: Badges — `(+)` en stock prioritaire, `*` hors filtre grisaille

**Files:**
- Modify: `src/components/CollectionGrid.tsx` (props, logique badges, filtre)
- Test: `src/components/CollectionGrid.test.tsx`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans le `describe` :

```tsx
const slotNouveau = makeSlot({
  templateId: "n",
  nom: "Objet N",
  donation: null,
  vu: true,
  vuDansCollection: false,
});

it("badge * : affiché pour une nouveauté non consultée", () => {
  render(<CollectionGrid slots={[slotNouveau]} />);
  expect(screen.getByLabelText("Nouvellement découvert").textContent).toBe("*");
});

it("badge + : affiché si le templateId est en stock et le slot non donné", () => {
  render(
    <CollectionGrid
      slots={[makeSlot({ templateId: "s", nom: "Objet S", donation: null })]}
      enStockIds={new Set(["s"])}
    />,
  );
  expect(
    screen.getByLabelText("Exemplaire disponible en stock").textContent,
  ).toBe("+");
});

it("badge + : absent si le slot est déjà donné", () => {
  render(
    <CollectionGrid
      slots={[makeSlot({ templateId: "d", nom: "Objet D" })]}
      enStockIds={new Set(["d"])}
    />,
  );
  expect(screen.queryByLabelText("Exemplaire disponible en stock")).toBeNull();
});

it("priorité : + masque * quand les deux conditions sont vraies", () => {
  render(
    <CollectionGrid slots={[slotNouveau]} enStockIds={new Set(["n"])} />,
  );
  expect(screen.getByLabelText("Exemplaire disponible en stock")).toBeTruthy();
  expect(screen.queryByLabelText("Nouvellement découvert")).toBeNull();
});

it("le filtre grisaille s'applique à la couche image, pas au bouton (badges en couleur)", () => {
  render(<CollectionGrid slots={[slotNouveau]} />);
  const bouton = screen.getByRole("button", { name: "Objet N" });
  expect(bouton.style.filter).toBe("");
  const coucheImage = screen.getByTestId("img-n").parentElement;
  expect(coucheImage?.style.filter).toContain("grayscale");
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: FAIL — prop `enStockIds` inexistante, badge `+` absent, `filter` posé sur le bouton.

- [ ] **Step 3: Implémentation**

Dans `src/components/CollectionGrid.tsx` :

a) Props de la grille (lignes 10-13) :

```tsx
interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
  /** TemplateIds présents dans l'inventaire du joueur (badge "+"). */
  enStockIds?: ReadonlySet<string>;
}
```

b) Props de la cellule (lignes 83-86) — booléen par cellule pour préserver la mémoïsation :

```tsx
interface CollectionCellProps {
  slot: CollectionSlot;
  onTap: (slot: CollectionSlot) => void;
  enStock: boolean;
}
```

Signature : `function CollectionCell({ slot: s, onTap, enStock }: CollectionCellProps)`.

c) Logique badges (remplacer la ligne 100) :

```tsx
  const showStockBadge = enStock && !isDonne;
  const showNewBadge =
    !showStockBadge && s.vu && !isDonne && s.vuDansCollection === false;
```

d) Retirer `filter` de `cellStyle` (supprimer les lignes 129-133, le commentaire inclus) et l'appliquer à la couche image (lignes 169-179) :

```tsx
        <div
          style={{
            ...centerLayer,
            // Grisaille sur l'image seule : les badges du bouton restent en couleur.
            filter: isVu
              ? "grayscale(1) brightness(1.35) contrast(0.7) opacity(0.55)"
              : undefined,
          }}
        >
          <ItemImage
```

e) Rendu des badges (remplacer les lignes 182-187) :

```tsx
      {/* Badge "+" — exemplaire en stock, pas encore donné (prioritaire sur "*") */}
      {showStockBadge && (
        <span style={newBadge} aria-label="Exemplaire disponible en stock">
          +
        </span>
      )}

      {/* Badge "*" — nouveauté pas encore consultée */}
      {showNewBadge && (
        <span style={newBadge} aria-label="Nouvellement découvert">
          *
        </span>
      )}
```

f) Passage de la prop dans la grille (lignes 218-230) :

```tsx
export function CollectionGrid({ slots, onTap, enStockIds }: CollectionGridProps) {
```

et dans le map :

```tsx
      {slots.map((s) => (
        <CollectionCell
          key={s.templateId}
          slot={s}
          onTap={stableOnTap}
          enStock={enStockIds?.has(s.templateId) ?? false}
        />
      ))}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: PASS (14 tests, dont les tests de mémoïsation existants).

- [ ] **Step 5: Commit**

```bash
git add src/components/CollectionGrid.tsx src/components/CollectionGrid.test.tsx
git commit -m "feat(collection): badge + pour exemplaires en stock, * au premier plan"
```

---

### Task 3: Header — "Collection" à gauche, catégorie + somme à droite

**Files:**
- Modify: `src/components/mobile/PageHeaderBar.tsx`
- Modify: `src/app/collection/page.tsx:113-145`
- Test: `src/components/mobile/PageHeaderBar.test.tsx` (créer)

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/mobile/PageHeaderBar.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PageHeaderBar } from "./PageHeaderBar";

afterEach(cleanup);

describe("PageHeaderBar", () => {
  it("par défaut : titre centré entre tirets, zones left/right rendues", () => {
    render(<PageHeaderBar title="Atelier" left={<i>g</i>} right={<i>d</i>} />);
    expect(screen.getByText("— ATELIER —")).toBeTruthy();
    expect(screen.getByText("g")).toBeTruthy();
    expect(screen.getByText("d")).toBeTruthy();
  });

  it("align left : titre en premier, contenu right à droite, pas de zone left", () => {
    const { container } = render(
      <PageHeaderBar title="Collection" align="left" right={<i>somme</i>} />,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.firstElementChild?.textContent).toBe("— COLLECTION —");
    expect(wrap.lastElementChild?.textContent).toBe("somme");
    expect(wrap.style.justifyContent).toBe("space-between");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/PageHeaderBar.test.tsx`
Expected: FAIL — la prop `align` n'existe pas (erreur TS / titre toujours centré en grid).

- [ ] **Step 3: Implémentation**

Remplacer le contenu de `src/components/mobile/PageHeaderBar.tsx` :

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

interface PageHeaderBarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  /** "center" (défaut) : grid 3 colonnes. "left" : titre à gauche, right à droite. */
  align?: "center" | "left";
}

const wrapCenter: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 10,
};

const wrapLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const colLeft: CSSProperties = {
  minWidth: 0,
  textAlign: "left",
};

const colRight: CSSProperties = {
  minWidth: 0,
  display: "flex",
  justifyContent: "flex-end",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  whiteSpace: "nowrap",
};

/**
 * En-tête sticky commun aux pages Atelier / Stockage / Collection / Compétences.
 * Mode "center" : grid 3 colonnes left | titre | right, zones libres en
 * min-width 0 pour le truncate. Mode "left" : titre à gauche, right à droite
 * (pas de zone left), pour libérer la largeur quand le contenu latéral est long.
 */
export function PageHeaderBar({
  title,
  left,
  right,
  align = "center",
}: PageHeaderBarProps) {
  const titre = <div style={titleStyle}>— {title.toUpperCase()} —</div>;

  if (align === "left") {
    return (
      <div style={wrapLeft}>
        {titre}
        <div style={colRight}>{right ?? null}</div>
      </div>
    );
  }

  return (
    <div style={wrapCenter}>
      <div style={colLeft}>{left ?? null}</div>
      {titre}
      <div style={colRight}>{right ?? null}</div>
    </div>
  );
}
```

Puis dans `src/app/collection/page.tsx`, remplacer le bloc `<PageHeaderBar …/>` (lignes 113-145) :

```tsx
          <PageHeaderBar
            title="Collection"
            align="left"
            right={
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={`${labelGauche} · ${valeurAffichee} €`}
              >
                {labelGauche} · {valeurAffichee} €
              </div>
            }
          />
```

(Le compteur `possedeAffiche/totalAffiche` disparaît du header — il reste visible dans le `CategoriePicker`. Les variables `possedeAffiche`/`totalAffiche` restent utilisées par le picker lignes 151-156 : ne pas les supprimer.)

Enfin, câbler le badge "+" : dans `src/app/collection/page.tsx`, ajouter après le useMemo `candidats` (ligne 77) :

```tsx
  const enStockIds = useMemo(
    () => new Set((state?.inventaireJoueur ?? []).map((o) => o.templateId)),
    [state],
  );
```

et passer la prop à la grille (ligne 163) :

```tsx
      <CollectionGrid
        slots={slotsFiltres}
        enStockIds={enStockIds}
        onTap={(s) => {
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run`
Expected: PASS — toute la suite, y compris les nouveaux tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/PageHeaderBar.tsx src/components/mobile/PageHeaderBar.test.tsx src/app/collection/page.tsx
git commit -m "feat(collection): header titre à gauche + valeur à droite, badge + câblé"
```

---

### Task 4: Vérification visuelle et qualité

**Files:** aucun (vérification)

- [ ] **Step 1: Lint + suite complète**

Run: `npm run lint && npx vitest run`
Expected: 0 erreur lint, tous tests PASS.

- [ ] **Step 2: Vérification navigateur**

Run: `npm run dev`, ouvrir la page Collection (viewport mobile ~390px) et vérifier :
- Silhouettes : pointillés visibles sur les 4 côtés, "?" en police Art Déco.
- Header : "— COLLECTION —" à gauche, "Total · X €" à droite ; choisir une catégorie → son nom remplace "Total" ; plus de compteur X/Y dans le header.
- Un item vu non consulté → `*` vermillon net (non grisé).
- Un item en stock non donné → `+` (prioritaire sur `*` le cas échéant).
- Autres pages utilisant `PageHeaderBar` (Atelier, Stockage, Compétences) : inchangées.

Si les pointillés restent partiels sur téléphone après déploiement : appliquer le fallback `background-image` prévu au spec (4 `repeating-linear-gradient`, un par bord) à la place du `border dashed`.

- [ ] **Step 3: Commit final éventuel**

Si retouches issues de la vérification :

```bash
git add -u
git commit -m "fix(collection): retouches après vérification visuelle"
```
