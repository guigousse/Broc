# Collection Étagères v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planche d'étagère et espaces verticaux proportionnels au zoom (base = 3 items par ligne).

**Architecture:** Dans `CollectionGrid`, la constante de style `planche` devient une fonction `plancheStyle(colonnes)` (hauteur 48/colonnes, marges 18/colonnes et 48/colonnes, arrondies), évaluée une fois par rendu.

**Tech Stack:** React 19, styles inline, vitest + Testing Library (jsdom). Spec : `docs/superpowers/specs/2026-06-11-collection-etageres-v3-design.md`.

**Répertoire de travail :** `/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc`, branche `feat/collection-etageres-v3`.

---

### Task 1: Planche proportionnelle au zoom

**Files:**
- Modify: `src/components/CollectionGrid.tsx` (constante `planche` ~lignes 87-94, rendu ~ligne 277)
- Test: `src/components/CollectionGrid.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans le `describe` existant (le tableau `slots` contient 3 slots) :

```tsx
  it("étagères : planche et espaces proportionnels au zoom", () => {
    const attendus: Array<[1 | 3 | 5, number, number, number]> = [
      [1, 48, 18, 48],
      [3, 16, 6, 16],
      [5, 10, 4, 10],
    ];
    for (const [colonnes, hauteur, espaceHaut, espaceBas] of attendus) {
      const { unmount } = render(
        <CollectionGrid slots={slots} colonnes={colonnes} />,
      );
      const planche = screen.getAllByTestId("planche")[0];
      expect(planche.style.height).toBe(`${hauteur}px`);
      expect(planche.style.marginTop).toBe(`${espaceHaut}px`);
      expect(planche.style.marginBottom).toBe(`${espaceBas}px`);
      unmount();
    }
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/CollectionGrid.test.tsx`
Expected: FAIL — la planche fait toujours 16px / 6px / 16px quel que soit `colonnes`.

- [ ] **Step 3: Implémentation**

Dans `src/components/CollectionGrid.tsx`, remplacer la constante :

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

par :

```tsx
/**
 * Planche proportionnelle à la taille des items : la base (16px de bois,
 * 6px d'air au-dessus, 16px entre étagères) est celle du zoom à 3 colonnes.
 */
function plancheStyle(colonnes: Colonnes): CSSProperties {
  return {
    height: Math.round(48 / colonnes),
    marginTop: Math.round(18 / colonnes),
    marginBottom: Math.round(48 / colonnes),
    background: "var(--gradient-shelf)",
    borderTop: "2px solid var(--shelf-edge)",
    boxShadow: "0 3px 5px rgba(0, 0, 0, 0.28)",
  };
}
```

Puis dans le corps de `CollectionGrid`, avant le `return` :

```tsx
  const planche = plancheStyle(colonnes);
```

(le rendu `<div aria-hidden data-testid="planche" style={planche} />` ne change pas).

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/CollectionGrid.test.tsx && npx tsc --noEmit`
Expected: PASS (19 tests), tsc propre.

- [ ] **Step 5: Commit**

```bash
git add src/components/CollectionGrid.tsx src/components/CollectionGrid.test.tsx
git commit -m "feat(collection): planche et espaces d'étagère proportionnels au zoom"
```
