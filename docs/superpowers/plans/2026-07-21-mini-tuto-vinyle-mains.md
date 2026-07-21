# Mains de guidage du mini-tuto vinyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la chaîne de guidage du mini-tuto vinyle visible de bout en bout : main de l'onglet Bureau au premier plan et centrée, doigt de swipe vers la droite sur le panorama, main du gramophone devant le chat, doigt sur le vinyle dans la sheet.

**Architecture:** Quatre retouches ciblées sans refonte : z-index conditionnels (TabBar 30→40 quand une main est affichée, bouton gramophone z3 en guidage), correction CSS du centrage de `.tuto-main-haut`, nouvel élément CSS `.tuto-main-swipe` piloté par une fonction pure dans `src/lib/anniversaire.ts`, et prop `guide` sur `GramophoneSheet`.

**Tech Stack:** React styles inline + classes CSS globales (`globals.css`), vitest + jsdom + testing-library (pattern `TabBar.test.tsx` : mocks `next/navigation`, `GameContext`, `SettingsContext`).

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-21-mini-tuto-vinyle-mains-design.md`.
- Zones panorama : `["bureau", "porte", "repos"]` = 0/1/2 ; gramophone en zone 2 ; le doigt de swipe s'affiche si `miniTutoVinyle === "ecouter"` ET `zoneActive !== 2`.
- Hors mini-tuto : AUCUN changement visuel (z-index nav 30, chat au-dessus du gramophone, sheet sans main, pas de doigt de swipe).
- `prefers-reduced-motion` : le doigt de swipe coupe son animation comme les autres mains.
- Lint : `npm run lint` cassé → `npx eslint src`.
- Commits en français, Conventional Commits, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: TabBar au premier plan + centrage de l'index

**Files:**
- Modify: `src/components/mobile/TabBar.tsx:188-195` (style de la nav)
- Modify: `src/app/globals.css:1414-1421` (`.tuto-main-haut::after`)
- Test: `src/components/mobile/TabBar.test.tsx` (nouveau describe)

**Interfaces:**
- Consumes: `mainMiniTuto(tabPath)` (déjà présent dans TabBar, lignes 174-179), `wrapStyle` (zIndex 30, ligne 102).
- Produces: rien pour les autres tâches (comportement local à la nav).

- [ ] **Step 1: Écrire le test (échec attendu)**

Dans `src/components/mobile/TabBar.test.tsx`, ajouter après le describe existant (réutilise les mocks du fichier ; l'helper `etat` existant force `tutorielEtape: "termine"`) :

```tsx
describe("TabBar — mini-tuto vinyle (main pointeuse)", () => {
  function etatMiniTuto(mt: "ajouter" | "ecouter"): GameState {
    return {
      brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
      inventaireJoueur: [],
      tutorielEtape: "termine",
      miniTutoVinyle: mt,
    } as unknown as GameState;
  }

  it("nav en zIndex 40 + main sur Bureau quand ecouter hors /bureau", () => {
    mockPathname = "/stockage";
    mockGameStateValue = { state: etatMiniTuto("ecouter"), isHydrated: true };
    render(<TabBar />);
    const nav = screen.getByRole("navigation");
    expect(nav.style.zIndex).toBe("40");
    const bureau = screen.getAllByRole("button").find((b) => b.className.includes("tuto-main"));
    expect(bureau?.textContent).toContain("Bureau");
  });

  it("nav en zIndex 30 sans main (ecouter, déjà sur /bureau)", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etatMiniTuto("ecouter"), isHydrated: true };
    render(<TabBar />);
    expect(screen.getByRole("navigation").style.zIndex).toBe("30");
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx`
Expected: FAIL — `nav.style.zIndex` vaut `"30"` au lieu de `"40"` dans le premier test.

- [ ] **Step 3: Implémenter le z-index conditionnel**

Dans `src/components/mobile/TabBar.tsx`, juste après la définition de `mainMiniTuto` (ligne 179), ajouter :

```tsx
  // Une main est-elle affichée ? La fenêtre flottante du stockage (zIndex 35)
  // passerait sinon devant la main qui déborde au-dessus de la nav (zIndex 30).
  const mainAffichee = visibleTabs.some((t) => mainMiniTuto(t.path));
```

Et dans le style de la `<nav>` (lignes 191-194) :

```tsx
      style={{
        ...wrapStyle,
        ...(mainAffichee ? { zIndex: 40 } : null),
        gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`,
      }}
```

- [ ] **Step 4: Centrer la pointe de l'index (CSS)**

Dans `src/app/globals.css`, `.tuto-main-haut::after` (ligne 1414) : remplacer

```css
  left: calc(50% - 44px);
```

par

```css
  /* -49px et non -44px (demi-boîte) : la pointe de l'index est excentrée
     dans l'image (doigt en haut) — après rotate 90°, elle tombe ~5px à
     droite du centre de la boîte. Le décalage la remet pile sur la cible. */
  left: calc(50% - 49px);
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx`
Expected: PASS (describe onboarding existant + nouveau describe).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/TabBar.tsx src/components/mobile/TabBar.test.tsx src/app/globals.css
git commit -m "fix(mini-tuto): main de l'onglet Bureau au premier plan et index centré"
```

---

### Task 2: Doigt de swipe vers le gramophone sur le panorama

**Files:**
- Modify: `src/lib/anniversaire.ts` (fonction pure de condition)
- Modify: `src/lib/anniversaire.test.ts` (tests de la condition)
- Modify: `src/app/globals.css` (classe `.tuto-main-swipe` + reduced-motion)
- Modify: `src/app/(qg)/layout.tsx:584-614` (rendu, à côté des dots)

**Interfaces:**
- Consumes: `zoneActive` (state du layout, index 0..2), `state.miniTutoVinyle` (`GameState["miniTutoVinyle"]`), keyframes `tuto-main-kf` (globals.css:1330).
- Produces: `export function doigtSwipeVersGramophone(miniTuto: GameState["miniTutoVinyle"], zoneActive: number): boolean` dans `src/lib/anniversaire.ts`.

- [ ] **Step 1: Écrire les tests de la condition (échec attendu)**

Dans `src/lib/anniversaire.test.ts`, ajouter :

```ts
describe("doigtSwipeVersGramophone", () => {
  it("visible en zones bureau/porte quand le mini-tuto guide vers l'écoute", () => {
    expect(doigtSwipeVersGramophone("ecouter", 0)).toBe(true);
    expect(doigtSwipeVersGramophone("ecouter", 1)).toBe(true);
  });
  it("absent en zone repos (la main du gramophone prend le relais)", () => {
    expect(doigtSwipeVersGramophone("ecouter", 2)).toBe(false);
  });
  it("absent hors étape ecouter", () => {
    expect(doigtSwipeVersGramophone("ajouter", 1)).toBe(false);
    expect(doigtSwipeVersGramophone(undefined, 1)).toBe(false);
  });
});
```

(compléter l'import existant : `import { ..., doigtSwipeVersGramophone } from "./anniversaire";`)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/anniversaire.test.ts`
Expected: FAIL — `doigtSwipeVersGramophone` n'existe pas.

- [ ] **Step 3: Implémenter la fonction**

Dans `src/lib/anniversaire.ts`, ajouter en fin de fichier (adapter l'import de type existant si `GameState` n'y est pas déjà importé) :

```ts
/**
 * Doigt de swipe du mini-tuto vinyles : en arrivant sur le bureau on
 * atterrit zone « porte » (1) alors que le gramophone est en zone
 * « repos » (2) — la main flottante pointe vers la droite tant que la
 * zone repos n'est pas atteinte (correct aussi depuis la zone 0).
 */
export function doigtSwipeVersGramophone(
  miniTuto: GameState["miniTutoVinyle"],
  zoneActive: number,
): boolean {
  return miniTuto === "ecouter" && zoneActive !== 2;
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/lib/anniversaire.test.ts`
Expected: PASS.

- [ ] **Step 5: Ajouter la classe CSS**

Dans `src/app/globals.css`, après le bloc `.tuto-main-haut::after` (ligne ~1421) :

```css
/* Mini-tuto vinyles : main flottante au bord droit du panorama bureau,
   pointe vers la droite pour inviter à swiper vers la zone repos
   (gramophone). Élément réel (pas un ::after) rendu par le layout QG. */
.tuto-main-swipe {
  position: absolute;
  right: 12px;
  top: 50%;
  width: 88px;
  height: 36px;
  margin-top: -18px;
  background: url("/tutoriel/main-pointeuse.webp") no-repeat center / contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
  animation: tuto-main-kf 1.6s ease-in-out infinite;
  pointer-events: none;
  z-index: 6;
}
```

Et dans le bloc `@media (prefers-reduced-motion: reduce)` (ligne ~1423), ajouter `.tuto-main-swipe` à la liste qui coupe l'animation :

```css
  .tuto-main::after,
  .tuto-main-swipe,
  .tuto-fleches::before,
  .tuto-fleches::after {
    animation: none;
  }
```

- [ ] **Step 6: Rendre le doigt dans le layout**

Dans `src/app/(qg)/layout.tsx` : ajouter `doigtSwipeVersGramophone` à l'import depuis `@/lib/anniversaire` (un import de ce module existe déjà pour `cadeauAnniversaireVisible`). Puis, dans le conteneur fixed du panorama, juste APRÈS le bloc des dots (`</div>` de la ligne ~614, toujours à l'intérieur du conteneur fixed) :

```tsx
          {/* Mini-tuto vinyles : invite à swiper vers la droite (gramophone
              en zone repos) tant qu'on n'y est pas. zIndex 6 > dots (5). */}
          {state && doigtSwipeVersGramophone(state.miniTutoVinyle, zoneActive) && (
            <div className="tuto-main-swipe" aria-hidden />
          )}
```

- [ ] **Step 7: Vérification ciblée**

Run: `npx vitest run src/lib/anniversaire.test.ts && npx eslint src/app/\(qg\)/layout.tsx src/lib/anniversaire.ts`
Expected: tests PASS, eslint sans erreur.

- [ ] **Step 8: Commit**

```bash
git add src/lib/anniversaire.ts src/lib/anniversaire.test.ts src/app/globals.css "src/app/(qg)/layout.tsx"
git commit -m "feat(mini-tuto): doigt de swipe vers le gramophone sur le panorama bureau"
```

---

### Task 3: Gramophone devant le chat + doigt sur le vinyle dans la sheet

**Files:**
- Modify: `src/components/mobile/qg/QgGramophone.tsx:16-22`
- Modify: `src/components/mobile/qg/sheets/GramophoneSheet.tsx:13-22,159-166,229-239,350-373`
- Modify: `src/app/(qg)/layout.tsx:728-737` (prop `guide`)
- Create: `src/components/mobile/qg/sheets/GramophoneSheet.test.tsx`

**Interfaces:**
- Consumes: `QgGramophone` prop `guide` (existante), `GramophoneSheetProps` (lignes 13-22), `bandeWrap` (ligne 159), boucle des vignettes (lignes 352-373), `state?.miniTutoVinyle === "ecouter"` (même condition que `QgGramophone` ligne 564).
- Produces: prop `guide?: boolean` sur `GramophoneSheet`.

- [ ] **Step 1: Écrire le test de la sheet (échec attendu)**

Créer `src/components/mobile/qg/sheets/GramophoneSheet.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { GramophoneSheet } from "./GramophoneSheet";
import type { CollectionSlot } from "@/types/game";

vi.mock("@/components/ui/ItemImage", () => ({
  ItemImage: () => <div data-testid="item-image" />,
}));

afterEach(cleanup);

const vinyle = {
  templateId: "mus.33tours_jazz_1",
  rarete: "commun",
  etat: "Très bon",
} as unknown as CollectionSlot;

function renderSheet(guide: boolean) {
  return render(
    <GramophoneSheet
      open
      onClose={vi.fn()}
      vinyles={[vinyle]}
      vinyleCourantIdx={null}
      enLecture={false}
      onSelect={vi.fn()}
      onPlayPause={vi.fn()}
      onNext={vi.fn()}
      guide={guide}
    />,
  );
}

describe("GramophoneSheet — guidage mini-tuto", () => {
  it("guide : la 1ʳᵉ vignette porte la main pointeuse", () => {
    renderSheet(true);
    const tuile = document.querySelector(".tuto-main.tuto-main-haut");
    expect(tuile).not.toBeNull();
    expect(tuile?.tagName).toBe("BUTTON");
  });

  it("sans guide : aucune main", () => {
    renderSheet(false);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/qg/sheets/GramophoneSheet.test.tsx`
Expected: FAIL — la prop `guide` n'existe pas (erreur TS) ou aucune `.tuto-main` trouvée.

- [ ] **Step 3: Implémenter la prop `guide` dans la sheet**

Dans `src/components/mobile/qg/sheets/GramophoneSheet.tsx` :

1. Props (après `onNext: () => void;` ligne 21) :

```ts
  /** Mini-tuto vinyles : main pointeuse sur la première vignette. */
  guide?: boolean;
```

2. Destructuration (ligne 230-239) : ajouter `guide = false,`.

3. Bande (ligne 351) — ne pas rogner la main pendant le guidage (un seul
vinyle à ce stade, aucun scroll nécessaire) :

```tsx
              <div style={guide ? { ...bandeWrap, overflowX: "visible" } : bandeWrap}>
```

4. Vignette (bouton ligne 356) : ajouter la classe :

```tsx
                    <button
                      key={v.templateId}
                      type="button"
                      className={guide && idx === 0 ? "tuto-main tuto-main-haut" : undefined}
                      onClick={() => onSelect(idx)}
```

- [ ] **Step 4: Passer le bouton gramophone devant le chat**

Dans `src/components/mobile/qg/QgGramophone.tsx`, remplacer le `<button ... style={style}>` par :

```tsx
    <button
      className={guide ? "tuto-main" : undefined}
      type="button"
      onClick={onTap}
      aria-label={d.qg.gramophone}
      // Pendant le guidage : passe devant le chat baladeur (zIndex 2, rendu
      // après dans le DOM) pour que la main pointeuse reste visible.
      style={guide ? { ...style, zIndex: 3 } : style}
    >
```

- [ ] **Step 5: Brancher `guide` dans le layout**

Dans `src/app/(qg)/layout.tsx`, le rendu `<GramophoneSheet ... />` (lignes 728-737) gagne :

```tsx
        guide={state?.miniTutoVinyle === "ecouter"}
```

- [ ] **Step 6: Vérifier que les tests passent**

Run: `npx vitest run src/components/mobile/qg/sheets/GramophoneSheet.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 7: Vérification globale**

Run: `npx vitest run` puis `npx eslint src`
Expected: suite entière verte (1146+ tests dont 2 skips), eslint sans erreur.

- [ ] **Step 8: Commit**

```bash
git add src/components/mobile/qg/QgGramophone.tsx \
        src/components/mobile/qg/sheets/GramophoneSheet.tsx \
        src/components/mobile/qg/sheets/GramophoneSheet.test.tsx \
        "src/app/(qg)/layout.tsx"
git commit -m "feat(mini-tuto): gramophone devant le chat + doigt sur le vinyle dans la sheet"
```

---

## Rappel de fin de chantier (hors code)

Vérif device par Guillaume : main Bureau au-dessus de la fenêtre stockage,
pointe centrée sur l'onglet, doigt de swipe au bord droit du panorama,
main gramophone devant le chat, doigt sur la vignette dans la sheet
(stacking réel WebKit).
