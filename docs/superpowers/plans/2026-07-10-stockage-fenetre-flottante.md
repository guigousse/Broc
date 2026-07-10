# Stockage fenêtre flottante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'écran Stockage s'ouvre en fenêtre flottante (2 blocs animés) par-dessus le panorama du bureau flouté, via un châssis réutilisable et un layout partagé `(qg)`.

**Architecture:** Un groupe de routes `src/app/(qg)/` monte le panorama du bureau une seule fois derrière `/bureau` et `/stockage` (le layout est l'actuel `bureau/page.tsx` déplacé, qui rend `{children}` par-dessus). La page `/stockage` re-house son contenu dans un nouveau composant présentational `FloatingRoomOverlay` (backdrop flouté façon `ReglagesModal`, bande haute qui descend de sous le header, panneau bas qui monte de la TabBar). Spec : `docs/superpowers/specs/2026-07-10-stockage-fenetre-flottante-design.md`.

**Tech Stack:** Next.js App Router (Next 16), React, TypeScript, vitest + Testing Library.

## Global Constraints

- `npm run lint` est CASSÉ (Next 16). Lint = `npx eslint src` ; hooks = `npm run lint:hooks`.
- Tests : `npx vitest run <fichier>` ; suite complète `npm run test:run` ; types `npx tsc --noEmit`. Si un `.next/` périmé fait échouer `tsc` après un déplacement de routes, `rm -rf .next` est légitime.
- Règle d'or i18n : aucune chaîne française en dur dans le JSX (libellés via `src/lib/i18n/ui/{fr,en,es}.ts`).
- Z-index de référence : TabBar 30, BottomSheet 40/41, ObjetDetailOverlay 105, ConfirmModal 110, ReglagesModal 100. Le châssis flottant se place à **35** (au-dessus du panorama et de ses dots (≤5), sous toutes les sheets/modales).
- Backdrop flouté = pattern exact de `ReglagesModal` : `background: rgba(15,31,24,0.35)` + `backdropFilter: blur(14px)` + préfixe `WebkitBackdropFilter`.
- ⚠ Rules-of-hooks : dans le layout `(qg)` (ex-`bureau/page.tsx`), TOUS les hooks restent AVANT le early return « ouverture du local » (historique crash React #310, filet `npm run lint:hooks`).
- NE PAS toucher : `/atelier` et `/collection` (migrations futures), `brocante-pano/`, `public/`.
- Messages de commit : convention `feat|fix|refactor|chore(scope): …` en français.

---

### Task 1: Composant FloatingRoomOverlay + keyframes

**Files:**
- Create: `src/components/mobile/floating-room/FloatingRoomOverlay.tsx`
- Modify: `src/app/globals.css` (2 keyframes + liste reduced-motion, autour des lignes 950-985)
- Test: `src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx`

**Interfaces:**
- Produces: `FloatingRoomOverlay({ bande: ReactNode, children: ReactNode })` — composant présentational pur, plein écran entre header et TabBar, sans bouton fermer. Consommé par la page stockage (Task 2), puis atelier/collection (chantiers futurs).

- [ ] **Step 1: Écrire le test (échoue : composant absent)**

Créer `src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx` (imports Testing Library : calquer les conventions de `src/components/mobile/TabBar.test.tsx` si elles diffèrent) :

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatingRoomOverlay } from "./FloatingRoomOverlay";

describe("FloatingRoomOverlay", () => {
  it("rend la bande haute et le panneau bas", () => {
    render(
      <FloatingRoomOverlay bande={<div>BANDE</div>}>
        <div>PANNEAU</div>
      </FloatingRoomOverlay>,
    );
    expect(screen.getByText("BANDE")).toBeTruthy();
    expect(screen.getByText("PANNEAU")).toBeTruthy();
  });

  it("est un overlay fixed qui couvre la zone entre header et TabBar", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector(
      '[data-floating-room="1"]',
    ) as HTMLElement;
    expect(wrap).not.toBeNull();
    expect(wrap.style.position).toBe("fixed");
    expect(wrap.style.zIndex).toBe("35");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx`
Expected: FAIL (module `./FloatingRoomOverlay` introuvable).

- [ ] **Step 3: Créer le composant**

Créer `src/components/mobile/floating-room/FloatingRoomOverlay.tsx` :

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Châssis « fenêtre flottante » des pièces (stockage aujourd'hui, atelier
 * et collection à terme) : s'affiche PAR-DESSUS le panorama du bureau,
 * entre le header et la TabBar, avec fond flouté (même habillage que le
 * menu Réglages de l'accueil). Deux blocs séparés par un interstice
 * flouté :
 *   - `bande` (haut) : sort de sous le header et glisse vers le bas ;
 *   - `children` (panneau bas, scrollable) : sort de la TabBar et monte.
 * Pas de bouton fermer : on quitte par la TabBar ou le swipe d'onglets.
 * Le backdrop bloque tous les pointeurs vers le panorama derrière.
 */

const wrap: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top) + var(--mobile-header-h))",
  left: 0,
  right: 0,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  // > panorama et ses dots (≤5) ; < BottomSheet (40) et overlays détail (105+).
  zIndex: 35,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "10px 12px 12px",
  // Clippe les deux blocs pendant leur glissement d'entrée : la bande
  // semble sortir de sous le header, le panneau de la TabBar.
  overflow: "hidden",
  boxSizing: "border-box",
};

/* Habillage carte des modales du menu (Réglages/Parties/Crédits), sur
   fond papier pour garder la lisibilité de la grille d'items. */
const carte: CSSProperties = {
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-card)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  background: "var(--paper-100)",
};

const bandeStyle: CSSProperties = {
  ...carte,
  flexShrink: 0,
  padding: "8px 10px 10px",
  animation: "broc-float-bande-in 320ms ease-out",
};

const panneauStyle: CSSProperties = {
  ...carte,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: 10,
  animation: "broc-float-panneau-in 320ms ease-out",
};

interface FloatingRoomOverlayProps {
  /** Carte haute (titre, actions, filtres). Glisse depuis le haut. */
  bande: ReactNode;
  /** Panneau bas (contenu scrollable). Monte depuis le bas. */
  children: ReactNode;
}

export function FloatingRoomOverlay({
  bande,
  children,
}: FloatingRoomOverlayProps) {
  return (
    <div style={wrap} data-floating-room="1">
      <div style={bandeStyle}>{bande}</div>
      <div style={panneauStyle}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Ajouter les keyframes dans globals.css**

Dans `src/app/globals.css`, à côté des keyframes existantes (`@keyframes broc-fade-in`, ~ligne 977), ajouter :

```css
/* Fenêtre flottante des pièces (stockage…) : la bande sort de sous le
   header (glisse vers le bas), le panneau sort de la TabBar (monte).
   Les +24px compensent le gap/padding pour partir totalement hors champ. */
@keyframes broc-float-bande-in {
  from { transform: translateY(calc(-100% - 24px)); }
  to { transform: translateY(0); }
}
@keyframes broc-float-panneau-in {
  from { transform: translateY(calc(100% + 24px)); }
  to { transform: translateY(0); }
}
```

Et dans le bloc `@media (prefers-reduced-motion: reduce)` (~ligne 943), la règle générale `animation-duration: 0.01ms !important` neutralise déjà ces animations — ne rien ajouter d'autre (les entrées `.broc-page-enter-*` listées explicitement utilisent `animation: none` parce qu'elles portent des classes ; nos animations sont inline et couvertes par la règle générale).

- [ ] **Step 5: Vérifier que le test passe**

Run: `npx vitest run src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx && npx tsc --noEmit`
Expected: PASS (2 tests), types OK.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/floating-room/ src/app/globals.css
git commit -m "feat(ui): châssis FloatingRoomOverlay (fenêtre flottante sur fond flouté)"
```

---

### Task 2: Layout (qg) partagé + stockage re-housé + navigation

Tâche atomique (UN commit) : les déplacements de `bureau/page.tsx` et `stockage/page.tsx` vers le groupe `(qg)` doivent être simultanés, sinon Next.js résout deux pages sur la même route.

**Files:**
- Move: `src/app/bureau/page.tsx` → `src/app/(qg)/layout.tsx` (+ adaptations)
- Create: `src/app/(qg)/bureau/page.tsx` (marqueur)
- Move: `src/app/stockage/page.tsx` → `src/app/(qg)/stockage/page.tsx` (+ re-housing)
- Modify: `src/components/mobile/SwipePager.tsx`
- Modify: `src/components/mobile/GlobalVinylAmbiance.tsx`
- Modify: `src/lib/i18n/ui/fr.ts` (~345), `en.ts` (~342), `es.ts` (~342) — retrait de `ouvertureStockage`

**Interfaces:**
- Consumes: `FloatingRoomOverlay({ bande, children })` (Task 1).
- Produces: layout `(qg)` rendant le panorama derrière ses pages ; routes `/bureau` et `/stockage` inchangées vues de l'extérieur (TabBar, liens, deep-link `?cat=`).

- [ ] **Step 1: Déplacer les fichiers**

```bash
mkdir -p "src/app/(qg)/bureau" "src/app/(qg)/stockage"
git mv src/app/bureau/page.tsx "src/app/(qg)/layout.tsx"
git mv src/app/stockage/page.tsx "src/app/(qg)/stockage/page.tsx"
rmdir src/app/bureau src/app/stockage
```

- [ ] **Step 2: Créer le marqueur bureau**

Créer `src/app/(qg)/bureau/page.tsx` :

```tsx
// Page marqueur : le panorama du bureau est rendu par le layout (qg),
// partagé avec /stockage (fenêtre flottante par-dessus le panorama).
export default function BureauPage() {
  return null;
}
```

- [ ] **Step 3: Adapter src/app/(qg)/layout.tsx**

Uniquement ces adaptations (TOUT le reste — gramophone, sheets, virtualisation, verrou scroll, mode édition, dots — inchangé) :

1. Renommer le composant interne `BureauPageInner` → `QgLayoutInner` et lui donner la prop children :

```tsx
function QgLayoutInner({ children }: { children: React.ReactNode }) {
```

2. Remplacer l'export default :

```tsx
export default function QgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <QgLayoutInner>{children}</QgLayoutInner>
    </Suspense>
  );
}
```

3. Rendre `{children}` juste après la fermeture `</MobileLayout>` (avant les sheets QG) :

```tsx
      </MobileLayout>

      {/* Pages du groupe (qg) : /bureau rend null ; /stockage rend la
          fenêtre flottante (FloatingRoomOverlay) par-dessus le panorama.
          Les sheets QG ci-dessous gardent leurs z-index (40+) au-dessus. */}
      {children}
```

4. Mettre à jour le commentaire d'en-tête du fichier : le panorama est rendu par le layout `(qg)`, partagé entre `/bureau` et `/stockage` ; le verrou de scroll du document et l'ambiance audio du bureau restent actifs quand la fenêtre flottante Stockage est ouverte (c'est voulu : on reste « dans la pièce », le panneau d'items a son propre scroll interne).

⚠ Vérifier après adaptation : tous les hooks de `QgLayoutInner` restent AVANT le early return « ouverture du local » (aucun hook ajouté — `children` est une prop).

- [ ] **Step 4: Re-houser src/app/(qg)/stockage/page.tsx**

Adaptations exactes (toute la logique métier — filtres, comptes, callbacks stabilisés, flash, overlays — inchangée) :

1. Imports : SUPPRIMER `MobileLayout`, `MobileHeader`, `StickyTop` ; AJOUTER :

```tsx
import { FloatingRoomOverlay } from "@/components/mobile/floating-room/FloatingRoomOverlay";
```

`useRouter` devient inutile (cf. point 2) : supprimer l'import si plus aucun usage.

2. Supprimer l'effet de redirection (le layout `(qg)` gère déjà redirect `/` + écran d'attente ; les children ne rendent pas tant que `state` est null) :

```tsx
  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);
```

et remplacer le bloc early-return « ouverture du stockage » (lignes ~159-174, le `<main>` centré) par un garde de narrowing minimal :

```tsx
  // Le layout (qg) gate le rendu (redirect + écran d'attente) : ce garde
  // ne sert qu'au narrowing TypeScript.
  if (!isHydrated || !state) return null;
```

3. JSX : remplacer l'enveloppe `<MobileLayout header={…} stickyTop={<StickyTop>…</StickyTop>}>…</MobileLayout>` par :

```tsx
      <FloatingRoomOverlay
        bande={
          <>
            <PageHeaderBar
              {/* … contenu STRICTEMENT inchangé (title, left tier/capacité/
                  loyer, right UpgradeButton/MAX) … */}
            />
            <div style={{ marginTop: 4 }}>
              <CategoriePicker
                selection={filtre}
                onChange={setFiltre}
                comptesParCat={comptes}
                total={state.inventaireJoueur.length}
              />
            </div>
          </>
        }
      >
        {flash && (
          {/* … bloc flash inchangé … */}
        )}
        <InventoryGrid
          {/* … props inchangées … */}
        />
      </FloatingRoomOverlay>
```

`ObjetDetailOverlay` et `ConfirmReplaceModal` restent APRÈS le châssis, inchangés (leurs z-index 105/110 passent au-dessus du châssis 35).

4. Le composant exporté garde son enveloppe `Suspense` (le deep-link `?cat=` utilise `useSearchParams`) — inchangé.

- [ ] **Step 5: Retirer la clé i18n orpheline**

`ouvertureStockage` n'a plus de consommateur (vérifier : `grep -rn "ouvertureStockage" src` → seulement les 3 dictionnaires). Supprimer la ligne dans `src/lib/i18n/ui/fr.ts` (~345), `en.ts` (~342), `es.ts` (~342).

- [ ] **Step 6: SwipePager — pageKey commune au groupe (qg)**

Dans `src/components/mobile/SwipePager.tsx`, au-dessus du composant, réintroduire :

```tsx
/**
 * Routes qui partagent le layout (qg) (panorama bureau + fenêtres
 * flottantes) : même pageKey pour que le sous-arbre ne re-monte PAS entre
 * elles — sinon le panorama perdrait sa position de scroll et sauterait
 * pendant la transition bureau ↔ stockage.
 */
const QG_GROUP = new Set<string>(["/bureau", "/stockage"]);

function pageKeyForPathname(pathname: string): string {
  return QG_GROUP.has(pathname) ? "_qg" : pathname;
}
```

et rebrancher le rendu dessus (état actuel : `direction = computeDirection(...)` direct et `key={pathname}`) :

```tsx
  // L'animation d'entrée ne joue que si la pageKey change : les
  // transitions internes au groupe (qg) gardent direction="none".
  const prevKey = prevPathnameRef.current
    ? pageKeyForPathname(prevPathnameRef.current)
    : null;
  const currKey = pageKeyForPathname(pathname);
  const direction =
    prevKey === currKey
      ? "none"
      : computeDirection(prevPathnameRef.current, pathname);
```

et en bas :

```tsx
  const pageKey = pageKeyForPathname(pathname);
  …
      <div key={pageKey} className={animClass}>
```

- [ ] **Step 7: GlobalVinylAmbiance — /stockage entre dans la pièce**

Dans `src/components/mobile/GlobalVinylAmbiance.tsx` :

```tsx
const PANORAMA_PATHS = new Set<string>(["/bureau", "/stockage"]);
```

et dans `ambianceForPathname`, la branche étouffée ne garde que l'atelier :

```tsx
  if (pathname.startsWith("/atelier")) {
    // Atelier : pièce voisine fermée (jusqu'à sa migration en fenêtre
    // flottante).
    return { volume: 0.28, lowpassHz: 800 };
  }
```

Mettre à jour le commentaire d'en-tête : `/stockage` est désormais une fenêtre flottante DANS la pièce du bureau — l'ambiance zone-driven du panorama continue derrière l'overlay.

- [ ] **Step 8: Gates**

```bash
rm -rf .next && npx tsc --noEmit && npx eslint src && npm run lint:hooks && npm run test:run
```

Expected: tout passe (971+ tests — les tests existants ne référencent pas les fichiers déplacés par leur chemin).

- [ ] **Step 9: Build et routes**

Run: `npx next build 2>&1 | tail -25`
Expected: build OK ; les routes listées incluent toujours `/bureau` et `/stockage` (URLs inchangées).

- [ ] **Step 10: Commit**

```bash
git add -A src/
git commit -m "feat(stockage): fenêtre flottante sur le panorama du bureau flouté

- layout (qg) partagé : panorama monté une fois derrière /bureau et /stockage
- page stockage re-housée dans FloatingRoomOverlay (bande haute + panneau items)
- SwipePager : pageKey commune au groupe (qg) ; ambiance audio pleine pièce
  sur /stockage"
```

---

### Task 3: Vérification visuelle

- [ ] **Step 1: Dev server**

Le dev server tourne déjà sur :3000 (hot-reload). Sinon : `npx next dev` en arrière-plan. Vérifier `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/stockage` → 200.

- [ ] **Step 2: Passe visuelle (simulateur déjà lancé ou navigateur)**

Vérifier et rapporter à Guillaume :
- `/stockage` : panorama du bureau visible flouté derrière, bande haute qui descend de sous le header, panneau d'items qui monte de la TabBar, interstice flouté entre les deux, ~320 ms.
- Bande : titre Stockage + tier/capacité/loyer + bouton amélioration + catégories ; panneau : grille scrollable, swipe-to-reveal des lignes intact.
- Détail objet et confirmation de remplacement s'ouvrent AU-DESSUS du châssis.
- TabBar : onglet Stockage actif ; bureau ↔ stockage sans remontage du panorama (position de zone conservée, gramophone non interrompu, pas d'animation de slide entre les deux) ; swipe d'onglets fonctionne depuis l'overlay.
- `/atelier` et `/collection` inchangés.
