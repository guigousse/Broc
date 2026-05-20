# Refonte mobile — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre l'UI complète du jeu en mobile-first (portrait, 360–414 px), partagée web/Tauri, en suivant le spec `docs/superpowers/specs/2026-05-20-mobile-redesign-design.md`.

**Architecture:** Layout unique `flex column 100dvh` avec `MobileHeader` (ou `ContextualHeader`) + zone `StickyTop` contextuelle + contenu scrollable + `TabBar` (5 onglets) — sauf sur écrans d'action où la tab bar disparaît au profit d'un `ActionFab` flottant. Bottom sheets unifiées pour Gazette, négociation et donation. Suppression complète de la page Trophées et du `NavigationDock` actuel.

**Tech Stack:** Next.js 16 (app router), React 19, Tailwind v4, Lucide-react icons, tokens CSS de `globals.css` (palette parchemin/forêt/laiton), Tauri 2.x mobile (cible PWA + native).

**Spec source:** `docs/superpowers/specs/2026-05-20-mobile-redesign-design.md`
**Mockups visuels:** `.superpowers/brainstorm/99745-1779300505/content/` (intro, frame-qg, gazette, chiner-vitrine, collection-plus, qg-revise, qg-sticky, stock-atelier-comp, competences-v2)

## Conventions du plan

- Le projet est un repo git, on commit après chaque task terminée.
- Pas de tests unitaires : la vérification se fait par `npx tsc --noEmit` (0 erreur) + revue visuelle dans navigateur (`npm run dev`).
- Garder la convention française des noms (composants, props, commentaires) pour cohérence avec le code existant.
- Les tokens CSS et polices de `globals.css` sont **non modifiés**.
- Aucun changement de logique gameplay : on déplace/refactore l'UI uniquement.

---

## File Structure

### Nouveaux fichiers à créer

| Chemin | Responsabilité |
|--------|----------------|
| `src/components/mobile/MobileHeader.tsx` | Header global 3 colonnes (BROC · Jour · Caisse), sticky en haut, safe-area-top |
| `src/components/mobile/ContextualHeader.tsx` | Header d'écran d'action (back · titre+sous-titre · caisse) |
| `src/components/mobile/TabBar.tsx` | Tab bar bas 5 onglets (QG / Stockage / Atelier / Collection / Compétences), pastilles, safe-area-bottom |
| `src/components/mobile/StickyTop.tsx` | Wrapper générique pour zone sticky entre header et scroll |
| `src/components/mobile/MobileLayout.tsx` | Composition `flex column 100dvh` : header + sticky-top + scroll + tabbar |
| `src/components/mobile/BottomSheet.tsx` | Sheet réutilisable (scrim, handle, close, max-height) |
| `src/components/mobile/ActionFab.tsx` | FAB pleine largeur (1 ou 2 boutons) flottant au-dessus de la safe-area |
| `src/components/mobile/Badge.tsx` | Pastille rouge compteur (vermillon, circulaire) |
| `src/components/mobile/GazetteTeaser.tsx` | Carte compacte Gazette pour le QG (tap → ouvre sheet) |
| `src/components/mobile/GazetteSheet.tsx` | Contenu plein écran de la Gazette (tendances + météo + carnet mondain + reroll) |
| `src/components/mobile/QgEtatDesLieux.tsx` | Section « État des lieux » (4 lignes : Stockage, Atelier, Compétences, Collection) |
| `src/components/mobile/QgHistorique.tsx` | Section « Dernières sessions » (3 dernières entrées + lien archive) |
| `src/components/mobile/CategorieChips.tsx` | Chips horizontales scrollables de filtre par catégorie avec compteurs |
| `src/components/mobile/TreePicker.tsx` | Grille 8×1 de boutons carrés (Général + 7 catégories), pastille points |
| `src/components/mobile/NegociationSheet.tsx` | Sheet de négociation (input offre + boutons Annuler/Proposer) |
| `src/components/mobile/DonationPickerSheet.tsx` | Sheet de sélection d'item à donner depuis le stock |

### Fichiers à modifier

| Chemin | Modifications |
|--------|---------------|
| `src/app/layout.tsx` | Retire `<NavigationDock />`, monte `<TabBar />` conditionnel (masqué sur routes d'action) |
| `src/app/qg/page.tsx` | Refonte complète : `MobileLayout` + `StickyTop` (semaine + CTA) + Gazette teaser + État des lieux + Historique |
| `src/app/chiner/page.tsx` | Refonte : `ContextualHeader` + pills tier + liste 1 col de `BrocanteCard` mobile |
| `src/app/chiner/[brocanteId]/ClientPage.tsx` | Refonte : grille 2 col d'`ObjetEnVenteCard` compactes, FAB « Rentrer », `NegociationSheet` |
| `src/app/vitrine/page.tsx` | Refonte : `ContextualHeader` + liste brocantes-vitrine 1 col |
| `src/app/vitrine/[brocanteId]/ClientPage.tsx` | Refonte : panneau stand + liste items prix-inline + 2 FAB |
| `src/app/vitrine/[brocanteId]/journee/page.tsx` | Application du squelette mobile (header contextuel + scroll + FAB clore) |
| `src/app/stockage/page.tsx` | Refonte : `MobileLayout` + `StickyTop` (résumé + chips) + liste 1 col |
| `src/app/atelier/page.tsx` | Refonte : `MobileLayout` + `StickyTop` (résumé chantiers) + 2 sections en liste |
| `src/app/competences/page.tsx` | Refonte : `MobileLayout` + `StickyTop` (`TreePicker` + XP card) + liste compétences |
| `src/app/collection/page.tsx` | Refonte : `MobileLayout` + `StickyTop` (résumé + chips) + grille 3 col avec ruban valeur |
| `src/app/historique/page.tsx` | Application du squelette mobile (header global + scroll de toutes sessions) |
| `src/components/BrocanteCard.tsx` | Refonte en variante mobile compacte (header + desc + footer entrée/btn) |
| `src/components/InventoryGrid.tsx` | Refonte en liste verticale 1 col, plus de `CategorieAccordion` |
| `src/components/CollectionGrid.tsx` | Refonte en grille 3 col, 3 états visuels + ruban valeur |
| `src/components/WeekTimeline.tsx` | Variante compacte 7 cases pour le `StickyTop` du QG |
| `src/components/SessionSummary.tsx` | Adaptation mobile (un seul écran portrait) |
| `src/app/page.tsx` (home) | Vérifier compatibilité mobile (titre + boutons New game / Continue) |
| `src/app/globals.css` | Ajouter règles `body { padding-bottom: env(safe-area-inset-bottom) }`, viewport CSS, désactiver scroll horizontal global |
| `src/app/layout.tsx` (viewport) | Ajouter `viewport-fit: cover`, `interactiveWidget: 'resizes-content'` |

### Fichiers à supprimer

| Chemin | Raison |
|--------|--------|
| `src/app/trophees/` (page complète) | Page Trophées retirée du jeu |
| `src/components/BossUnlockModal.tsx` | Modale boss supprimée |
| `src/components/NavigationDock.tsx` | Remplacé par `TabBar` |
| `src/components/StatusBar.tsx` | Remplacé par `MobileHeader` + `ContextualHeader` |
| `src/components/MarketTrendsPanel.tsx` | Splitté en `GazetteTeaser` + `GazetteSheet` |

---

## Tâches

### Task 1 — Préparer la branche de travail

**Files:**
- Modify: `package.json` (aucun changement de deps prévu — vérifier que `lucide-react` ≥ 1.16.0 suffit)

- [ ] **Step 1 : Créer une branche de feature**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git status
git checkout -b feat/mobile-redesign
```

Expected: branche créée, pas de fichiers en attente (sinon stash d'abord).

- [ ] **Step 2 : Vérifier baseline tsc + dev**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

Ouvrir `http://localhost:3000/qg` → vérifier que la page actuelle (desktop) charge correctement. Arrêter le serveur (Ctrl+C).

- [ ] **Step 3 : Créer le dossier composants mobile**

```bash
mkdir -p src/components/mobile
```

- [ ] **Step 4 : Commit baseline**

```bash
git add docs/superpowers/specs/2026-05-20-mobile-redesign-design.md docs/superpowers/plans/2026-05-20-mobile-redesign.md
git commit -m "docs: spec + plan refonte mobile"
```

---

### Task 2 — Viewport, safe-area, CSS global

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1 : Mettre à jour le viewport pour PWA/Tauri mobile**

Modifier `src/app/layout.tsx` — remplacer la `viewport` export :

```tsx
export const viewport: Viewport = {
  themeColor: "#1A3326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
```

Retirer le `paddingBottom: 80` du `<body>` (la tab bar gérera son propre espace) :

```tsx
<body style={{ minHeight: "100dvh", overflowX: "hidden" }}>
```

Retirer aussi `<NavigationDock />` du JSX — on le remplacera plus tard par `<TabBar />` (Task 5).

- [ ] **Step 2 : Ajouter les variables safe-area et règles globales mobile**

Ajouter en fin de `src/app/globals.css` :

```css
/* ============================================================
   MOBILE — safe area & règles globales portrait
   ============================================================ */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);

  --mobile-header-h: 52px;
  --mobile-tabbar-h: 60px;
}

html, body {
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
}

@media (orientation: landscape) and (max-width: 900px) {
  body::before {
    content: "Tournez votre téléphone en portrait";
    position: fixed; inset: 0;
    background: var(--forest-800); color: var(--brass-300);
    font-family: var(--font-display);
    letter-spacing: 0.18em; text-transform: uppercase;
    display: grid; place-items: center;
    z-index: 9999; padding: 40px;
    text-align: center;
  }
}
```

- [ ] **Step 3 : Vérifier tsc et visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

Ouvrir DevTools mobile (Cmd+Opt+M sur Chrome), choisir iPhone 14 (390×844). Vérifier `/qg` :
- Le `NavigationDock` n'apparaît plus.
- Pas de scroll horizontal.
- Si on incline en paysage : message « Tournez votre téléphone ».

- [ ] **Step 4 : Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(mobile): viewport, safe-area, lockout paysage"
```

---

### Task 3 — Primitives layout : `MobileHeader`, `ContextualHeader`, `StickyTop`, `MobileLayout`

**Files:**
- Create: `src/components/mobile/MobileHeader.tsx`
- Create: `src/components/mobile/ContextualHeader.tsx`
- Create: `src/components/mobile/StickyTop.tsx`
- Create: `src/components/mobile/MobileLayout.tsx`

- [ ] **Step 1 : `MobileHeader.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

interface MobileHeaderProps {
  jour: number;
  budget: number;
}

const wrapStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  paddingTop: "var(--safe-top)",
  background: "var(--forest-800)",
  borderBottom: "1px solid var(--brass-500)",
};

const innerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

export function MobileHeader({ jour, budget }: MobileHeaderProps) {
  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <Link
          href="/qg"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.22em",
            color: "var(--brass-300)",
            textDecoration: "none",
          }}
        >
          BROC
        </Link>
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
          }}
        >
          Jour
          <strong
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: "var(--paper-100)",
              letterSpacing: "0.12em",
              marginTop: 1,
            }}
          >
            N°{String(jour).padStart(3, "0")}
          </strong>
        </div>
        <div
          style={{
            textAlign: "right",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Caisse
          <strong
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--brass-300)",
            }}
          >
            {budget.toLocaleString("fr-FR")} €
          </strong>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2 : `ContextualHeader.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

interface ContextualHeaderProps {
  titre: string;
  sousTitre?: string;
  budget: number;
  onBack?: () => void;
  backIcon?: "back" | "close";
}

const wrapStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  paddingTop: "var(--safe-top)",
  background: "var(--forest-800)",
  borderBottom: "1px solid var(--brass-500)",
};

const innerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

const btnStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 16,
  background: "transparent",
  cursor: "pointer",
};

export function ContextualHeader({
  titre,
  sousTitre,
  budget,
  onBack,
  backIcon = "back",
}: ContextualHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <button
          type="button"
          onClick={handleBack}
          aria-label={backIcon === "close" ? "Fermer" : "Retour"}
          style={btnStyle}
        >
          {backIcon === "close" ? "✕" : "‹"}
        </button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--brass-300)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {titre}
          </div>
          {sousTitre && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "var(--brass-700)",
                marginTop: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sousTitre}
            </div>
          )}
        </div>
        <div
          style={{
            textAlign: "right",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Caisse
          <strong
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              color: "var(--brass-300)",
            }}
          >
            {budget.toLocaleString("fr-FR")} €
          </strong>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3 : `StickyTop.tsx`**

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

interface StickyTopProps {
  children: ReactNode;
}

const style: CSSProperties = {
  position: "sticky",
  top: "calc(var(--safe-top) + var(--mobile-header-h))",
  zIndex: 20,
  background: "var(--paper-100)",
  borderBottom: "1px solid var(--brass-500)",
  boxShadow: "0 2px 6px rgba(40,25,5,0.10)",
  padding: "10px 12px",
};

export function StickyTop({ children }: StickyTopProps) {
  return <div style={style}>{children}</div>;
}
```

- [ ] **Step 4 : `MobileLayout.tsx`**

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

interface MobileLayoutProps {
  header: ReactNode;
  stickyTop?: ReactNode;
  children: ReactNode;
  /** Padding bottom additionnel (utile quand un FAB est affiché). */
  scrollPaddingBottom?: number;
}

const outerStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  background: "var(--paper-100)",
};

export function MobileLayout({
  header,
  stickyTop,
  children,
  scrollPaddingBottom = 0,
}: MobileLayoutProps) {
  return (
    <div style={outerStyle}>
      {header}
      {stickyTop}
      <main
        style={{
          flex: 1,
          padding: `12px 12px calc(${scrollPaddingBottom}px + var(--mobile-tabbar-h) + var(--safe-bottom))`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 5 : Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/
git commit -m "feat(mobile): primitives MobileHeader, ContextualHeader, StickyTop, MobileLayout"
```

---

### Task 4 — `Badge` (pastille compteur) et `ActionFab`

**Files:**
- Create: `src/components/mobile/Badge.tsx`
- Create: `src/components/mobile/ActionFab.tsx`

- [ ] **Step 1 : `Badge.tsx`**

```tsx
import type { CSSProperties } from "react";

interface BadgeProps {
  count: number;
  /** Si true, affiche aussi quand count = 0. Sinon, masqué quand count = 0. */
  showZero?: boolean;
}

const style: CSSProperties = {
  display: "inline-grid",
  placeItems: "center",
  minWidth: 18,
  height: 18,
  padding: "0 5px",
  borderRadius: 9,
  background: "var(--vermillion-600)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0,
  lineHeight: 1,
};

export function Badge({ count, showZero = false }: BadgeProps) {
  if (count <= 0 && !showZero) return null;
  return <span style={style}>{count}</span>;
}
```

- [ ] **Step 2 : `ActionFab.tsx`**

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

interface FabButton {
  label: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

interface ActionFabProps {
  buttons: FabButton[];
}

const wrapStyle: CSSProperties = {
  position: "fixed",
  left: "calc(12px + var(--safe-left))",
  right: "calc(12px + var(--safe-right))",
  bottom: "calc(12px + var(--safe-bottom))",
  display: "flex",
  gap: 8,
  zIndex: 25,
};

const baseBtn: CSSProperties = {
  flex: 1,
  padding: "12px 10px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  textAlign: "center",
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  ...baseBtn,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  boxShadow:
    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.18)",
};

const secondaryBtn: CSSProperties = {
  ...baseBtn,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.10)",
};

export function ActionFab({ buttons }: ActionFabProps) {
  return (
    <div style={wrapStyle}>
      {buttons.map((b, i) => (
        <button
          key={i}
          type="button"
          onClick={b.onClick}
          disabled={b.disabled}
          style={{
            ...(b.variant === "secondary" ? secondaryBtn : primaryBtn),
            opacity: b.disabled ? 0.45 : 1,
            cursor: b.disabled ? "not-allowed" : "pointer",
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/Badge.tsx src/components/mobile/ActionFab.tsx
git commit -m "feat(mobile): Badge et ActionFab"
```

---

### Task 5 — `TabBar` à 5 onglets, montée conditionnelle dans `layout.tsx`

**Files:**
- Create: `src/components/mobile/TabBar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1 : `TabBar.tsx`**

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Album, Anvil, BookOpen, Home, Warehouse, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useGame } from "@/context/GameContext";
import { progressionGlobale } from "@/lib/collection";

interface TabDef {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: (state: ReturnType<typeof useGame>["state"]) => number;
}

const tabs: TabDef[] = [
  { icon: Home, label: "QG", path: "/qg" },
  { icon: Warehouse, label: "Stockage", path: "/stockage" },
  {
    icon: Anvil,
    label: "Atelier",
    path: "/atelier",
    badge: (state) =>
      state
        ? state.inventaireJoueur.filter(
            (o) =>
              o.enRestauration &&
              (o.enRestauration.jourFin ?? Infinity) <= state.jourActuel,
          ).length
        : 0,
  },
  { icon: Album, label: "Collection", path: "/collection" },
  {
    icon: BookOpen,
    label: "Compét.",
    path: "/competences",
    badge: (state) =>
      state
        ? Object.values(state.competenceTrees).reduce(
            (s, t) => s + t.pointsDisponibles,
            0,
          )
        : 0,
  },
];

/** Routes sur lesquelles la tab bar est masquée (sessions plein écran). */
const HIDDEN_PREFIXES = ["/", "/chiner/", "/vitrine/"];

const wrapStyle: CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 30,
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  borderTop: "1px solid var(--brass-500)",
  background: "var(--paper-200)",
  padding: "6px 4px",
  paddingBottom: "calc(6px + var(--safe-bottom))",
  height: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  boxSizing: "border-box",
};

const tabBtn: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  padding: "4px 0",
};

const iconBox: CSSProperties = {
  position: "relative",
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
};

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isHydrated } = useGame();

  if (!isHydrated || !state) return null;
  if (pathname === "/") return null;
  for (const p of HIDDEN_PREFIXES) {
    if (p !== "/" && pathname.startsWith(p)) return null;
  }

  return (
    <nav aria-label="Navigation principale" style={wrapStyle}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active =
          pathname === t.path || pathname.startsWith(`${t.path}/`);
        const count = t.badge ? t.badge({ state, isHydrated }) : 0;
        return (
          <button
            key={t.path}
            type="button"
            onClick={() => router.push(t.path)}
            style={{
              ...tabBtn,
              color: active ? "var(--brass-700)" : "var(--ink-500)",
            }}
          >
            <span
              style={{
                ...iconBox,
                background: active ? "var(--forest-800)" : "var(--paper-100)",
              }}
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                color={active ? "var(--brass-300)" : "var(--forest-800)"}
              />
              {count > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6 }}>
                  <Badge count={count} />
                </span>
              )}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
```

> Note : l'import `useGame` ramène `state` typé. La signature de l'argument de `badge` peut être resserrée si TS râle ; au pire, utiliser `(state: any)`. La logique de pastille pour Compétences additionne `pointsDisponibles` sur tous les arbres (cohérent avec le QG actuel).

- [ ] **Step 2 : Monter `TabBar` dans `layout.tsx`**

Modifier `src/app/layout.tsx` — importer et placer `<TabBar />` à la place de `<NavigationDock />` :

```tsx
import { TabBar } from "@/components/mobile/TabBar";
// …
<GameProvider>
  {children}
  <TabBar />
</GameProvider>
```

- [ ] **Step 3 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

DevTools iPhone 14, naviguer `/qg`, `/stockage`, `/collection`, `/competences`, `/atelier` :
- La tab bar apparaît en bas avec 5 onglets icône+label.
- L'onglet actif a son icône inversée (forêt + laiton).
- Pastille rouge visible sur Compétences si `state.competenceTrees` cumule des points dispo.
- Sur `/chiner/<id>` la tab bar disparaît.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/TabBar.tsx src/app/layout.tsx
git commit -m "feat(mobile): TabBar 5 onglets avec pastilles d'action"
```

---

### Task 6 — `BottomSheet` (sheet réutilisable)

**Files:**
- Create: `src/components/mobile/BottomSheet.tsx`

- [ ] **Step 1 : `BottomSheet.tsx`**

```tsx
"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hauteur max en % du viewport. Défaut 88. */
  maxHeightPct?: number;
}

const scrimStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.45)",
  zIndex: 40,
  animation: "broc-fade-in 160ms ease",
};

const sheetWrap = (maxHeightPct: number): CSSProperties => ({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 41,
  background: "var(--paper-100)",
  borderTop: "2px solid var(--forest-800)",
  borderRadius: "14px 14px 0 0",
  boxShadow: "0 -6px 18px rgba(40,25,5,0.20)",
  maxHeight: `${maxHeightPct}%`,
  display: "flex",
  flexDirection: "column",
  paddingBottom: "calc(16px + var(--safe-bottom))",
  animation: "broc-slide-up 200ms ease",
});

const handleStyle: CSSProperties = {
  width: 40,
  height: 4,
  background: "var(--paper-500)",
  borderRadius: 2,
  margin: "8px auto 6px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 16px 8px",
  borderBottom: "1px solid var(--brass-500)",
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeightPct = 88,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div style={scrimStyle} onClick={onClose} aria-hidden />
      <div style={sheetWrap(maxHeightPct)} role="dialog" aria-modal="true">
        <div style={handleStyle} aria-hidden />
        <div style={headerStyle}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
            }}
          >
            {title ?? ""}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--brass-700)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            Fermer ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "12px 16px" }}>{children}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 2 : Ajouter les keyframes d'animation**

Ajouter en fin de `src/app/globals.css` :

```css
@keyframes broc-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes broc-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

- [ ] **Step 3 : Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/BottomSheet.tsx src/app/globals.css
git commit -m "feat(mobile): BottomSheet avec scrim, handle, escape"
```

---

### Task 7 — `WeekTimeline` compact + `QgEtatDesLieux` + `QgHistorique`

**Files:**
- Modify: `src/components/WeekTimeline.tsx`
- Create: `src/components/mobile/QgEtatDesLieux.tsx`
- Create: `src/components/mobile/QgHistorique.tsx`

- [ ] **Step 1 : Lire l'existant**

```bash
cat src/components/WeekTimeline.tsx
```

Identifier sa signature et son rendu. On veut une variante compacte (boîte ~5 px tall, 7 cases égales, hauteur totale ~28 px).

- [ ] **Step 2 : Refondre `WeekTimeline.tsx`**

Remplacer le rendu actuel par une grille de 7 cases compactes :

```tsx
"use client";

import type { CSSProperties } from "react";
import { indexJourSemaine, JOURS_SEMAINE } from "@/lib/meteo";

interface WeekTimelineProps {
  jourActuel: number;
}

const labels = ["L", "M", "M", "J", "V", "S", "D"];

const cellBase: CSSProperties = {
  textAlign: "center",
  padding: "5px 0",
  border: "1px solid var(--paper-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  color: "var(--ink-500)",
};

export function WeekTimeline({ jourActuel }: WeekTimelineProps) {
  const idx = indexJourSemaine(jourActuel);
  return (
    <div
      role="list"
      aria-label="Semaine en cours"
      style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}
    >
      {labels.map((l, i) => {
        const isToday = i === idx;
        const isWeekend = i >= 5;
        const style: CSSProperties = isToday
          ? {
              ...cellBase,
              background: "var(--forest-800)",
              color: "var(--brass-300)",
              borderColor: "var(--brass-500)",
            }
          : isWeekend
            ? { ...cellBase, background: "var(--paper-200)" }
            : cellBase;
        return (
          <div key={i} role="listitem" style={style} title={JOURS_SEMAINE[i]}>
            {l}
          </div>
        );
      })}
    </div>
  );
}
```

> ⚠ Vérifier que `indexJourSemaine` est bien exporté depuis `@/lib/meteo` (utilisé déjà ailleurs). Si besoin, importer la valeur `jourActuel % 7`.

- [ ] **Step 3 : `QgEtatDesLieux.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Album,
  Anvil,
  BookOpen,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { getStockageTier } from "@/data/stockage";
import { progressionGlobale } from "@/lib/collection";
import type { GameState } from "@/types/game";

interface QgEtatDesLieuxProps {
  state: GameState;
}

interface Ligne {
  icon: LucideIcon;
  titre: string;
  meta: string;
  path: string;
  badge?: number;
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "4px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

const rowBtn: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "26px 1fr auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px dotted var(--paper-500)",
  background: "transparent",
  border: "none",
  width: "100%",
  cursor: "pointer",
  textAlign: "left",
};

export function QgEtatDesLieux({ state }: QgEtatDesLieuxProps) {
  const router = useRouter();
  const stockTier = getStockageTier(state.inventaireJoueur.length);
  const totalPoints = Object.values(state.competenceTrees).reduce(
    (s, t) => s + t.pointsDisponibles,
    0,
  );
  const prets = state.inventaireJoueur.filter(
    (o) =>
      o.enRestauration &&
      (o.enRestauration.jourFin ?? Infinity) <= state.jourActuel,
  ).length;
  const col = progressionGlobale(state.collection);

  const lignes: Ligne[] = [
    {
      icon: Warehouse,
      titre: "Stockage",
      meta: `${stockTier.nom} · ${state.inventaireJoueur.length} obj.`,
      path: "/stockage",
    },
    {
      icon: Anvil,
      titre: "Atelier",
      meta:
        prets > 0
          ? `${prets} prêt${prets > 1 ? "s" : ""} à récupérer`
          : "Établi libre",
      path: "/atelier",
      badge: prets,
    },
    {
      icon: BookOpen,
      titre: "Compétences",
      meta:
        totalPoints > 0
          ? `${totalPoints} pt${totalPoints > 1 ? "s" : ""} à dépenser`
          : `${state.competencesDebloquees.length} acquise${state.competencesDebloquees.length > 1 ? "s" : ""}`,
      path: "/competences",
      badge: totalPoints,
    },
    {
      icon: Album,
      titre: "Collection",
      meta: `${col.donnees} / ${col.total} · ${col.valeur.toLocaleString("fr-FR")} €`,
      path: "/collection",
    },
  ];

  return (
    <section aria-label="État des lieux" style={cardStyle}>
      {lignes.map((l, i) => {
        const Icon = l.icon;
        return (
          <button
            key={l.path}
            type="button"
            onClick={() => router.push(l.path)}
            style={{
              ...rowBtn,
              borderBottom:
                i === lignes.length - 1
                  ? "none"
                  : "1px dotted var(--paper-500)",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--brass-500)",
                color: "var(--brass-700)",
              }}
            >
              <Icon size={14} strokeWidth={1.5} />
            </span>
            <span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                {l.titre}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 1,
                }}
              >
                {l.meta}
              </span>
            </span>
            <span
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {l.badge ? <Badge count={l.badge} /> : null}
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--brass-500)",
                  fontSize: 16,
                }}
              >
                ›
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4 : `QgHistorique.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { GameState, SessionHistorique } from "@/types/game";

interface QgHistoriqueProps {
  state: GameState;
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "4px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

function resumer(s: SessionHistorique): { kind: string; lbl: string; pl: number } {
  if (s.type === "chinage") {
    const total = s.achats.reduce((sum, a) => sum + a.prixPaye, 0);
    return {
      kind: "Chinage",
      lbl: `${s.brocanteNom} · ${s.achats.length} acqui${s.achats.length > 1 ? "s" : "s"}`,
      pl: -total,
    };
  }
  if (s.type === "vente") {
    const total = s.ventes.reduce((sum, v) => sum + v.prixVendu, 0);
    return {
      kind: "Vente",
      lbl: `${s.brocanteNom} · ${s.ventes.length} vente${s.ventes.length > 1 ? "s" : ""}`,
      pl: total,
    };
  }
  // restauration ou autre type — fallback générique
  return { kind: s.type, lbl: "", pl: 0 };
}

export function QgHistorique({ state }: QgHistoriqueProps) {
  const router = useRouter();
  const recents = state.historique.slice(0, 3);
  if (recents.length === 0) {
    return (
      <section style={cardStyle}>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Aucune session enregistrée.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Dernières sessions" style={cardStyle}>
      {recents.map((s) => {
        const { kind, lbl, pl } = resumer(s);
        return (
          <div
            key={s.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px dotted var(--paper-500)",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 10,
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                textAlign: "center",
                minWidth: 38,
              }}
            >
              Jour
              <strong
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--forest-800)",
                }}
              >
                {String(s.jour).padStart(2, "0")}
              </strong>
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 12.5,
                color: "var(--ink-700)",
                lineHeight: 1.3,
              }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                {kind}
              </span>
              {lbl}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                color: pl >= 0 ? "var(--forest-700)" : "var(--vermillion-600)",
              }}
            >
              {pl >= 0 ? "+" : ""}
              {pl} €
            </span>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => router.push("/historique")}
        style={{
          width: "100%",
          padding: "8px 0",
          background: "transparent",
          border: "none",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
          cursor: "pointer",
        }}
      >
        Tout l'historique ›
      </button>
    </section>
  );
}
```

> ⚠ Le typage de `SessionHistorique` doit couvrir `type: "chinage" | "vente" | …` — adapter `resumer` si le type a d'autres variants (ex : `restauration`). Vérifier `src/types/game.ts` et compléter le switch si nécessaire.

- [ ] **Step 5 : Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: 0 erreur. Si erreurs sur les types `SessionHistorique`, lire `src/types/game.ts` et ajuster `resumer` pour couvrir tous les variants.

- [ ] **Step 6 : Commit**

```bash
git add src/components/WeekTimeline.tsx src/components/mobile/QgEtatDesLieux.tsx src/components/mobile/QgHistorique.tsx
git commit -m "feat(mobile): WeekTimeline compact, QgEtatDesLieux, QgHistorique"
```

---

### Task 8 — `GazetteTeaser` + `GazetteSheet` (refonte `MarketTrendsPanel`)

**Files:**
- Create: `src/components/mobile/GazetteTeaser.tsx`
- Create: `src/components/mobile/GazetteSheet.tsx`

- [ ] **Step 1 : `GazetteTeaser.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { numeroEdition } from "@/lib/tendances";
import { METEO_ICON, METEO_LABEL } from "@/data/meteos";
import { JOURS_SEMAINE } from "@/lib/meteo";
import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";

interface GazetteTeaserProps {
  achetee: boolean;
  jourActuel: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  meteo: Meteo;
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  onOuvrir: () => void;
  onAcheter: () => void;
  budget: number;
  prixGazette: number;
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--forest-800)",
  background: "var(--paper-100)",
  padding: "10px 12px",
  boxShadow:
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px rgba(26,51,38,0.35)",
  backgroundImage:
    "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.025) 2px 3px)",
};

export function GazetteTeaser(props: GazetteTeaserProps) {
  const {
    achetee,
    jourActuel,
    tendances,
    categoriesConnues,
    meteo,
    revelerMeteo,
    celebrite,
    revelerCelebrite,
    onOuvrir,
    onAcheter,
    budget,
    prixGazette,
  } = props;

  const visibles = (tendances ?? []).filter((t) =>
    categoriesConnues.has(t.categorie),
  );
  const dominante = [...visibles].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
  )[0];

  return (
    <button
      type="button"
      onClick={achetee ? onOuvrir : undefined}
      disabled={!achetee}
      style={{
        ...cardStyle,
        textAlign: "left",
        width: "100%",
        cursor: achetee ? "pointer" : "default",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: "1px solid var(--forest-800)",
          paddingBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
          }}
        >
          La Gazette des Chineurs
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--ink-500)",
            letterSpacing: "0.1em",
          }}
        >
          N°{numeroEdition(jourActuel)}
        </span>
      </div>

      {!achetee ? (
        <div style={{ marginTop: 10 }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--ink-500)",
              margin: "0 0 8px",
            }}
          >
            Édition non acquise.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAcheter();
            }}
            disabled={budget < prixGazette}
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "var(--forest-800)",
              color: "var(--brass-300)",
              border: "1px solid var(--brass-500)",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: budget < prixGazette ? "not-allowed" : "pointer",
              opacity: budget < prixGazette ? 0.45 : 1,
            }}
          >
            Acheter · {prixGazette} €
          </button>
        </div>
      ) : (
        <>
          {dominante && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-700)",
                }}
              >
                {dominante.categorie}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color:
                    dominante.delta >= 0
                      ? "var(--forest-700)"
                      : "var(--vermillion-600)",
                }}
              >
                {dominante.delta >= 0 ? "↑" : "↓"} {dominante.delta > 0 ? "+" : ""}
                {dominante.delta}%
              </span>
            </div>
          )}
          {revelerMeteo && (
            <div
              style={{
                marginTop: 4,
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--ink-500)",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {(() => {
                const Icon = METEO_ICON[meteo];
                return (
                  <Icon size={14} color="var(--forest-800)" strokeWidth={1.5} />
                );
              })()}
              {METEO_LABEL[meteo]}
            </div>
          )}
          {revelerCelebrite && celebrite && (
            <div
              style={{
                marginTop: 4,
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--ink-500)",
              }}
            >
              ✦ {celebrite.nom} · {JOURS_SEMAINE[celebrite.jourSemaine]}
            </div>
          )}
          <div
            style={{
              textAlign: "right",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              marginTop: 6,
            }}
          >
            Lire la Gazette ›
          </div>
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2 : `GazetteSheet.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { numeroEdition } from "@/lib/tendances";
import { METEO_ICON, METEO_LABEL, descriptionEffetMeteo } from "@/data/meteos";
import { getBrocanteById } from "@/data/brocantes";
import { JOURS_SEMAINE } from "@/lib/meteo";
import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";

interface GazetteSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
  prochainRafraichissement: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  meteo: Meteo;
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  peutInfluencer: boolean;
  influenceUtilisee: boolean;
  onRerollMeteo: () => void;
  onRerollCelebrite: () => void;
}

const sectionLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  margin: "12px 0 6px",
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "4px 0",
  borderBottom: "1px dotted var(--paper-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-700)",
};

const rollBtn: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "3px 6px",
  border: "1px solid var(--brass-700)",
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  cursor: "pointer",
};

export function GazetteSheet(props: GazetteSheetProps) {
  const {
    open,
    onClose,
    jourActuel,
    prochainRafraichissement,
    tendances,
    categoriesConnues,
    meteo,
    revelerMeteo,
    celebrite,
    revelerCelebrite,
    peutInfluencer,
    influenceUtilisee,
    onRerollMeteo,
    onRerollCelebrite,
  } = props;
  const visibles = (tendances ?? []).filter((t) =>
    categoriesConnues.has(t.categorie),
  );
  const tries = [...visibles].sort((a, b) => b.delta - a.delta);
  const masquees = (tendances?.length ?? 0) - visibles.length;
  const joursAvantRefresh = Math.max(0, prochainRafraichissement - jourActuel);
  const brocanteCeleb = celebrite ? getBrocanteById(celebrite.brocanteId) : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`La Gazette · N°${numeroEdition(jourActuel)}`}
    >
      <div style={sectionLabel}>— Tendances —</div>
      {tries.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            textAlign: "center",
          }}
        >
          Aucune catégorie n'est connue. Apprenez « Veilleur » pour déchiffrer.
        </p>
      ) : (
        tries.map((t) => (
          <div key={t.categorie} style={row}>
            <span>{t.categorie}</span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color:
                  t.delta >= 0 ? "var(--forest-800)" : "var(--vermillion-600)",
              }}
            >
              {t.delta >= 0 ? "↑" : "↓"} {t.delta > 0 ? "+" : ""}
              {t.delta}%
            </span>
          </div>
        ))
      )}
      {masquees > 0 && (
        <p
          style={{
            marginTop: 6,
            textAlign: "center",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 11,
            color: "var(--ink-500)",
          }}
        >
          {masquees} autre{masquees > 1 ? "s" : ""} catégorie{masquees > 1 ? "s" : ""} restent illisibles.
        </p>
      )}

      {revelerMeteo && (
        <>
          <div style={sectionLabel}>— Bulletin météo —</div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-700)",
            }}
          >
            {(() => {
              const Icon = METEO_ICON[meteo];
              return <Icon size={24} color="var(--forest-800)" strokeWidth={1.5} />;
            })()}
            <span style={{ flex: 1 }}>
              <strong>{METEO_LABEL[meteo]}</strong> ·{" "}
              <span style={{ fontStyle: "italic", color: "var(--ink-500)" }}>
                {descriptionEffetMeteo(meteo)}
              </span>
            </span>
            {peutInfluencer && (
              <button
                type="button"
                onClick={onRerollMeteo}
                disabled={influenceUtilisee}
                style={{
                  ...rollBtn,
                  opacity: influenceUtilisee ? 0.4 : 1,
                  cursor: influenceUtilisee ? "not-allowed" : "pointer",
                }}
                title={
                  influenceUtilisee
                    ? "Influence déjà utilisée"
                    : "Reroll météo (consomme l'influence)"
                }
              >
                ↻
              </button>
            )}
          </div>
        </>
      )}

      {revelerCelebrite && celebrite && (
        <>
          <div style={sectionLabel}>— Carnet mondain —</div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--ink-700)",
            }}
          >
            <span style={{ flex: 1, lineHeight: 1.35 }}>
              <strong style={{ fontStyle: "normal" }}>{celebrite.nom}</strong>{" "}
              est annoncé(e) à{" "}
              <strong style={{ fontStyle: "normal" }}>
                {brocanteCeleb?.nom ?? "une brocante"}
              </strong>{" "}
              le{" "}
              <strong
                style={{ fontStyle: "normal", textTransform: "uppercase" }}
              >
                {JOURS_SEMAINE[celebrite.jourSemaine]}
              </strong>
              .
            </span>
            {peutInfluencer && (
              <button
                type="button"
                onClick={onRerollCelebrite}
                disabled={influenceUtilisee}
                style={{
                  ...rollBtn,
                  opacity: influenceUtilisee ? 0.4 : 1,
                  cursor: influenceUtilisee ? "not-allowed" : "pointer",
                }}
              >
                ↻
              </button>
            )}
          </div>
        </>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px dotted var(--paper-500)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        {joursAvantRefresh === 0
          ? "Prochaine édition demain"
          : `Prochaine édition dans ${joursAvantRefresh} jour${joursAvantRefresh > 1 ? "s" : ""}`}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 3 : Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/GazetteTeaser.tsx src/components/mobile/GazetteSheet.tsx
git commit -m "feat(mobile): Gazette splittée en Teaser + Sheet"
```

---

### Task 9 — Refonte `/qg/page.tsx` + suppression Trophées

**Files:**
- Modify: `src/app/qg/page.tsx`
- Delete: `src/app/trophees/` (dossier complet)
- Delete: `src/components/BossUnlockModal.tsx`

- [ ] **Step 1 : Refondre `src/app/qg/page.tsx`**

Remplacer intégralement le contenu par :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { WeekTimeline } from "@/components/WeekTimeline";
import { GazetteTeaser } from "@/components/mobile/GazetteTeaser";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { QgEtatDesLieux } from "@/components/mobile/QgEtatDesLieux";
import { QgHistorique } from "@/components/mobile/QgHistorique";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { meteoDuJour } from "@/lib/meteo";
import { PRIX_GAZETTE } from "@/lib/tendances";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
  aGenInfluence,
} from "@/lib/competences";
import type { CategorieObjet } from "@/types/game";

const stickyEyebrow = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center" as const,
  marginBottom: 6,
};

const sectTitle = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  margin: "12px 2px 6px",
};

export default function QgPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    acheterGazette,
    rerollMeteo,
    rerollCelebrite,
  } = useGame();
  const [gazetteOuverte, setGazetteOuverte] = useState(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture du QG…
      </main>
    );
  }

  const meteo = meteoDuJour(state);

  return (
    <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <div style={stickyEyebrow}>
              — Quartier Général · Semaine {Math.ceil(state.jourActuel / 7)} —
            </div>
            <div style={{ marginBottom: 10 }}>
              <WeekTimeline jourActuel={state.jourActuel} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/chiner")}
                style={{
                  padding: "12px 8px",
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  border: "1px solid var(--brass-500)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  boxShadow:
                    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
                  cursor: "pointer",
                }}
              >
                Chiner
              </button>
              <button
                type="button"
                onClick={() => router.push("/vitrine")}
                style={{
                  padding: "12px 8px",
                  background: "var(--paper-100)",
                  color: "var(--forest-800)",
                  border: "1px solid var(--brass-500)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  boxShadow:
                    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
                  cursor: "pointer",
                }}
              >
                {state.vitrine ? "Reprendre l'étal" : "Exposer"}
              </button>
            </div>
          </StickyTop>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GazetteTeaser
            achetee={state.gazetteAchetee}
            jourActuel={state.jourActuel}
            tendances={state.tendances}
            categoriesConnues={categoriesConnuesTendance}
            meteo={meteo}
            revelerMeteo={aGenBulletinMeteo(state)}
            celebrite={state.celebriteActuelle}
            revelerCelebrite={aGenCarnetMondain(state)}
            onOuvrir={() => setGazetteOuverte(true)}
            onAcheter={() => acheterGazette()}
            budget={state.budget}
            prixGazette={PRIX_GAZETTE}
          />

          <h2 style={sectTitle}>— État des lieux —</h2>
          <QgEtatDesLieux state={state} />

          <h2 style={sectTitle}>— Dernières sessions —</h2>
          <QgHistorique state={state} />
        </div>
      </MobileLayout>

      <GazetteSheet
        open={gazetteOuverte}
        onClose={() => setGazetteOuverte(false)}
        jourActuel={state.jourActuel}
        prochainRafraichissement={state.prochainRafraichissementTendances}
        tendances={state.tendances}
        categoriesConnues={categoriesConnuesTendance}
        meteo={meteo}
        revelerMeteo={aGenBulletinMeteo(state)}
        celebrite={state.celebriteActuelle}
        revelerCelebrite={aGenCarnetMondain(state)}
        peutInfluencer={aGenInfluence(state)}
        influenceUtilisee={state.influenceUtilisee}
        onRerollMeteo={() => rerollMeteo()}
        onRerollCelebrite={() => rerollCelebrite()}
      />
    </>
  );
}
```

> Note : on a retiré le bouton dev `+100 €`, la modale boss et toute la logique de déblocage tier 4 — la spec § 4.1 supprime Trophées.

- [ ] **Step 2 : Supprimer la page Trophées**

```bash
git rm -r src/app/trophees
git rm src/components/BossUnlockModal.tsx
```

Vérifier qu'aucun import résiduel ne référence `BossUnlockModal` :

```bash
grep -r "BossUnlockModal" src/ || true
grep -r "trophees" src/ || true
```

Si grep trouve quelque chose, retirer la référence (probablement seulement dans le QG mais déjà fait, et peut-être dans `NavigationDock` qu'on supprimera Task 18).

- [ ] **Step 3 : Vérifier tsc + visuel QG**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

DevTools iPhone 14, ouvrir `/qg` :
- Header BROC · Jour · Caisse en haut, sticky.
- Sticky-top : eyebrow + timeline 7 cases (jour actuel mis en valeur) + 2 boutons (Chiner large + Exposer).
- Scroll : carte Gazette (teaser), titre « État des lieux » + 4 lignes, titre « Dernières sessions » + 0 à 3 entrées + lien.
- Tap sur Gazette → sheet plein écran avec tendances, météo, carnet.
- Plus de tuile Trophées, plus de modale boss.

- [ ] **Step 4 : Commit**

```bash
git add src/app/qg/ src/app/trophees src/components/BossUnlockModal.tsx
git commit -m "feat(mobile): /qg refondu, suppression Trophées et modale boss"
```

> ⚠ Si `git status` montre `state.bossDebloqueSeen` encore dans le type ou le context, **ne pas** le supprimer tout de suite (compatibilité save). Laisser le champ inutilisé — sera nettoyé en Task 18 ou plus tard si besoin.

---

### Task 10 — Refonte `/competences/page.tsx` avec `TreePicker`

**Files:**
- Create: `src/components/mobile/TreePicker.tsx`
- Modify: `src/app/competences/page.tsx`

- [ ] **Step 1 : Identifier les arbres**

```bash
grep -n "TREE_" src/data/competences.ts | head -20
grep -n "catTreeId" src/data/competences.ts
```

Les arbres sont : `TREE_GENERAL` + un par catégorie via `catTreeId(cat)`. Il y a 7 catégories (`CATEGORIES`).

- [ ] **Step 2 : `TreePicker.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import {
  Disc3,
  Gamepad2,
  BookOpenText,
  Shirt,
  Home,
  Palette,
  Hammer,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/mobile/Badge";
import { CATEGORIES } from "@/data/categories";
import {
  TREE_GENERAL,
  catTreeId,
  getTreeMeta,
} from "@/data/competences";
import type {
  CategorieObjet,
  CompetenceTreeId,
  CompetenceTreeState,
} from "@/types/game";

interface TreePickerProps {
  trees: Record<CompetenceTreeId, CompetenceTreeState>;
  selectionne: CompetenceTreeId;
  onSelect: (id: CompetenceTreeId) => void;
}

const ICONS: Record<string, LucideIcon> = {
  general: Sparkles,
  Musique: Disc3,
  "Jeux & Loisirs": Gamepad2,
  "Livres & Papeterie": BookOpenText,
  Mode: Shirt,
  Maison: Home,
  "Objets d'art": Palette,
  Bricolage: Hammer,
};

const cellBase: CSSProperties = {
  aspectRatio: "1 / 1",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  padding: 2,
  position: "relative",
  cursor: "pointer",
};

const lvlText: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 7,
  letterSpacing: "0.04em",
  color: "var(--brass-700)",
};

export function TreePicker({ trees, selectionne, onSelect }: TreePickerProps) {
  const allIds: CompetenceTreeId[] = [
    TREE_GENERAL,
    ...CATEGORIES.map((c) => catTreeId(c)),
  ];

  return (
    <div
      role="tablist"
      aria-label="Arbres de compétences"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${allIds.length}, 1fr)`,
        gap: 4,
      }}
    >
      {allIds.map((id) => {
        const meta = getTreeMeta(id);
        const tree = trees[id];
        const active = id === selectionne;
        const points = tree?.pointsDisponibles ?? 0;
        const niveau = tree?.niveau ?? 0;
        const iconKey =
          id === TREE_GENERAL
            ? "general"
            : (meta?.categorie as CategorieObjet | undefined) ?? "general";
        const Icon = ICONS[iconKey] ?? Sparkles;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onSelect(id)}
            style={{
              ...cellBase,
              background: active ? "var(--forest-800)" : "var(--paper-100)",
              boxShadow: active
                ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)"
                : "none",
            }}
            title={meta?.nom ?? id}
          >
            <Icon
              size={14}
              strokeWidth={1.5}
              color={active ? "var(--brass-300)" : "var(--forest-800)"}
            />
            <span
              style={{
                ...lvlText,
                color: active ? "var(--brass-300)" : "var(--brass-700)",
              }}
            >
              {niveau > 0 ? `N${niveau}` : "—"}
            </span>
            {points > 0 && (
              <span style={{ position: "absolute", top: -3, right: -3 }}>
                <Badge count={points} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

> ⚠ `getTreeMeta` doit exister et retourner `{ nom, categorie }` — vérifier dans `src/data/competences.ts`. Si la signature diffère, ajuster les références (ex : utiliser un mapping `TREE_ID → { nom, categorie }` direct).

- [ ] **Step 3 : Refondre `/competences/page.tsx`**

Remplacer le contenu par une version mobile-first :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { TreePicker } from "@/components/mobile/TreePicker";
import { useGame } from "@/context/GameContext";
import {
  COMPETENCES,
  TREE_GENERAL,
  getTreeDef,
  getTreeMeta,
} from "@/data/competences";
import { etatCompetence } from "@/lib/competences";
import { progressionNiveau, xpRequisPourNiveau } from "@/lib/xp";
import type { CompetenceDef, CompetenceTreeId } from "@/types/game";

const eyebrow = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center" as const,
  marginBottom: 8,
};

export default function CompetencesPage() {
  const router = useRouter();
  const { state, isHydrated, debloquerCompetence } = useGame();
  const [tree, setTree] = useState<CompetenceTreeId>(TREE_GENERAL);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — consultation du grimoire…
      </main>
    );
  }

  const treeState = state.competenceTrees[tree];
  const meta = getTreeMeta(tree);
  const treeDef = getTreeDef(tree);
  const xpProgress = progressionNiveau(treeState.xp);
  const xpRequis = xpRequisPourNiveau(treeState.niveau + 1);

  const competencesArbre = useMemo(
    () =>
      COMPETENCES.filter((c) => c.tree === tree).sort(
        (a, b) => a.niveauRequis - b.niveauRequis,
      ),
    [tree],
  );

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div style={eyebrow}>— Grimoire des compétences —</div>
          <TreePicker
            trees={state.competenceTrees}
            selectionne={tree}
            onSelect={setTree}
          />
          <div
            style={{
              textAlign: "center",
              marginTop: 6,
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              fontWeight: 700,
            }}
          >
            {meta?.nom ?? tree}
          </div>
          <div
            style={{
              marginTop: 8,
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>
              N{treeState.niveau}
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  color: "var(--brass-700)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Niv.
              </span>
            </div>
            <div
              style={{
                flex: 1,
                height: 8,
                background: "var(--paper-300)",
                border: "1px solid var(--brass-500)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "var(--brass-700)",
                  width: `${Math.round(xpProgress * 100)}%`,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                color:
                  treeState.pointsDisponibles > 0
                    ? "var(--vermillion-600)"
                    : "var(--ink-500)",
                textAlign: "right",
              }}
            >
              {treeState.pointsDisponibles}
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                Pts
              </span>
            </div>
          </div>
        </StickyTop>
      }
    >
      {flash && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--brass-100)",
            border: "1px solid var(--brass-700)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-700)",
            marginBottom: 8,
          }}
        >
          « {flash} »
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {competencesArbre.map((c) => (
          <CompetenceCard
            key={c.id}
            comp={c}
            etat={etatCompetence(c, state)}
            onAcheter={() => {
              const res = debloquerCompetence(c.id);
              if (res.ok) setFlash(`Compétence acquise : ${c.nom}.`);
              else setFlash(`Impossible : ${res.raison}.`);
              setTimeout(() => setFlash(null), 2500);
            }}
          />
        ))}
      </div>
    </MobileLayout>
  );
}

function CompetenceCard({
  comp,
  etat,
  onAcheter,
}: {
  comp: CompetenceDef;
  etat: ReturnType<typeof etatCompetence>;
  onAcheter: () => void;
}) {
  const isAcquired = etat === "acquise";
  const isLocked = etat === "verrouillee";
  const isAvailable = etat === "disponible";
  return (
    <article
      style={{
        border: `1px solid ${isAcquired ? "var(--brass-700)" : "var(--brass-500)"}`,
        background: isAcquired ? "var(--brass-100)" : "var(--paper-100)",
        opacity: isLocked ? 0.5 : 1,
        padding: 10,
        display: "grid",
        gridTemplateColumns: "36px 1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--brass-500)",
          color: "var(--brass-700)",
          fontFamily: "var(--font-display)",
          fontSize: 18,
        }}
      >
        ✦
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
          }}
        >
          {comp.nom}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 11.5,
            color: "var(--ink-500)",
            marginTop: 2,
            lineHeight: 1.3,
          }}
        >
          {comp.description}
        </div>
        {comp.niveauRequis > 0 && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--brass-700)",
              marginTop: 3,
            }}
          >
            Requis : N{comp.niveauRequis}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onAcheter}
        disabled={!isAvailable}
        style={{
          padding: "6px 8px",
          fontFamily: "var(--font-display)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          border: "1px solid var(--brass-500)",
          background: isAcquired
            ? "var(--patina-500)"
            : isAvailable
              ? "var(--forest-800)"
              : "var(--paper-300)",
          color: isAcquired
            ? "var(--paper-100)"
            : isAvailable
              ? "var(--brass-300)"
              : "var(--ink-500)",
          cursor: isAvailable ? "pointer" : "not-allowed",
        }}
      >
        {isAcquired ? "Acquise" : isLocked ? "Verrouillée" : `${comp.cout} pt${comp.cout > 1 ? "s" : ""}`}
      </button>
    </article>
  );
}
```

> ⚠ Adapter le nom des fonctions de `etatCompetence` si la signature diffère. Les valeurs `"acquise" | "disponible" | "verrouillee"` sont supposées — à valider en lisant `src/lib/competences.ts`.

- [ ] **Step 4 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur (sinon adapter les appels d'API qui diffèrent).

```bash
npm run dev
```

DevTools iPhone 14, ouvrir `/competences` :
- Sticky-top : eyebrow + grille 8 carrés (Général + 7 cat.), tap → switch d'arbre.
- Nom de l'arbre actif visible dessous + carte XP/Niv/Pts.
- Pastille rouge sur les arbres avec points disponibles.
- Scroll : liste verticale de cartes compétences avec 3 états visuels.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/TreePicker.tsx src/app/competences/page.tsx
git commit -m "feat(mobile): /competences refondu, TreePicker grille 8 carrés"
```

---

### Task 11 — `CategorieChips` + refonte `/stockage/page.tsx`

**Files:**
- Create: `src/components/mobile/CategorieChips.tsx`
- Modify: `src/components/InventoryGrid.tsx`
- Modify: `src/app/stockage/page.tsx`

- [ ] **Step 1 : `CategorieChips.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import type { CategorieObjet } from "@/types/game";

interface CategorieChipsProps {
  /** `null` = chip « Tous » sélectionné. */
  selection: CategorieObjet | null;
  onChange: (c: CategorieObjet | null) => void;
  comptesParCat: Partial<Record<CategorieObjet, number>>;
  total: number;
  categories: readonly CategorieObjet[];
}

const wrap: CSSProperties = {
  display: "flex",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2,
  WebkitOverflowScrolling: "touch",
};

const chip: CSSProperties = {
  flexShrink: 0,
  padding: "6px 10px",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  color: "var(--ink-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  cursor: "pointer",
};

export function CategorieChips({
  selection,
  onChange,
  comptesParCat,
  total,
  categories,
}: CategorieChipsProps) {
  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={() => onChange(null)}
        style={{
          ...chip,
          background:
            selection === null ? "var(--forest-800)" : "var(--paper-100)",
          color: selection === null ? "var(--brass-300)" : "var(--ink-500)",
        }}
      >
        Tous{" "}
        <strong
          style={{
            color: selection === null ? "var(--brass-300)" : "var(--brass-700)",
            fontFamily: "var(--font-display)",
          }}
        >
          {total}
        </strong>
      </button>
      {categories.map((c) => {
        const n = comptesParCat[c] ?? 0;
        const active = selection === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              ...chip,
              background: active ? "var(--forest-800)" : "var(--paper-100)",
              color: active ? "var(--brass-300)" : "var(--ink-500)",
              opacity: n === 0 ? 0.45 : 1,
            }}
          >
            {c}{" "}
            <strong
              style={{
                color: active ? "var(--brass-300)" : "var(--brass-700)",
                fontFamily: "var(--font-display)",
              }}
            >
              {n}
            </strong>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2 : Refondre `InventoryGrid.tsx` en vue liste**

Remplacer le rendu par une liste verticale 1 col (plus d'accordéon) :

```tsx
import type { CSSProperties } from "react";
import type { CategorieObjet, Objet } from "@/types/game";
import { CategorieIcon } from "@/components/ui/CategorieIcon";

interface InventoryGridProps {
  objets: Objet[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
}

const item: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px dotted var(--paper-500)",
};

const thumb: CSSProperties = {
  width: 44,
  height: 44,
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  color: "var(--brass-100)",
};

const card: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "6px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function InventoryGrid({ objets, categoriesConnues }: InventoryGridProps) {
  if (objets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--ink-500)",
            marginBottom: 12,
          }}
        >
          Aucun objet dans cette catégorie.
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Partez chiner pour la garnir.
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      {objets.map((o, i) => {
        const valeurConnue = categoriesConnues.has(o.categorie);
        return (
          <div
            key={o.id}
            style={{
              ...item,
              borderBottom:
                i === objets.length - 1
                  ? "none"
                  : "1px dotted var(--paper-500)",
            }}
          >
            <div style={thumb}>
              <CategorieIcon
                categorie={o.categorie}
                size={20}
                strokeWidth={1.5}
                color="var(--brass-100)"
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  fontWeight: 700,
                }}
              >
                {o.nom}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 2,
                }}
              >
                {o.etat} · {o.rarete} · {o.categorie}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--forest-800)",
                }}
              >
                {valeurConnue ? `${Math.round(o.prixReferenceReel)} €` : "?"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--brass-700)",
                  letterSpacing: "0.06em",
                }}
              >
                ref.
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3 : Refondre `/stockage/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategorieChips } from "@/components/mobile/CategorieChips";
import { InventoryGrid } from "@/components/InventoryGrid";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getStockageTier } from "@/data/stockage";
import { aConnaisseurVitrine } from "@/lib/competences";
import type { CategorieObjet } from "@/types/game";

export default function StockagePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  const objetsFiltres = useMemo(() => {
    if (!state) return [];
    return filtre
      ? state.inventaireJoueur.filter((o) => o.categorie === filtre)
      : state.inventaireJoueur;
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const o of state.inventaireJoueur) {
      acc[o.categorie] = (acc[o.categorie] ?? 0) + 1;
    }
    return acc;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — ouverture du stockage…
      </main>
    );
  }

  const tier = getStockageTier(state.inventaireJoueur.length);
  const ratio = state.inventaireJoueur.length / tier.capacite;

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            — Stockage · {tier.nom} —
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                color: "var(--forest-800)",
              }}
            >
              {state.inventaireJoueur.length} / {tier.capacite} obj.
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              Loyer {tier.loyerHebdo} €/sem.
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "var(--paper-300)",
              border: "1px solid var(--brass-500)",
              margin: "6px 0 8px",
            }}
          >
            <div
              style={{
                height: "100%",
                background:
                  ratio >= 1
                    ? "var(--vermillion-600)"
                    : "var(--forest-800)",
                width: `${Math.min(100, Math.round(ratio * 100))}%`,
              }}
            />
          </div>
          <CategorieChips
            categories={CATEGORIES}
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={state.inventaireJoueur.length}
          />
        </StickyTop>
      }
    >
      <InventoryGrid
        objets={objetsFiltres}
        categoriesConnues={categoriesConnuesVitrine}
      />
    </MobileLayout>
  );
}
```

- [ ] **Step 4 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

DevTools, `/stockage` : sticky-top avec compteur + jauge + chips ; scroll de liste 1 col ; filtre catégorie fonctionnel.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/CategorieChips.tsx src/components/InventoryGrid.tsx src/app/stockage/page.tsx
git commit -m "feat(mobile): /stockage liste + chips filtre catégorie"
```

---

### Task 12 — Refonte `/atelier/page.tsx`

**Files:**
- Modify: `src/app/atelier/page.tsx`

- [ ] **Step 1 : Lire la page atelier existante en entier**

```bash
wc -l src/app/atelier/page.tsx
```

Identifier les sections actuelles : objets en chantier vs. restaurations possibles, calculs `dureeRestauration`, fonctions `peutRestaurer*`.

- [ ] **Step 2 : Refondre**

Remplacer par version mobile (squelette ci-dessous, à compléter en gardant la logique existante) :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { useGame } from "@/context/GameContext";
import {
  dureeRestauration,
  peutRestaurerBonVersTresBon,
  peutRestaurerCategorie,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { etatSuivant, recalculerPrixReference } from "@/lib/etat";
import type { EtatObjet, Objet } from "@/types/game";

const sectTitle = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "var(--forest-800)",
  margin: "10px 2px 6px",
};

const cardWrap = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "8px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export default function AtelierPage() {
  const router = useRouter();
  const { state, isHydrated, restaurerObjet } = useGame();
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const enCours = useMemo(
    () => state?.inventaireJoueur.filter((o) => o.enRestauration) ?? [],
    [state],
  );
  const prets = useMemo(
    () =>
      enCours.filter(
        (o) => (o.enRestauration?.jourFin ?? Infinity) <= (state?.jourActuel ?? 0),
      ),
    [enCours, state],
  );
  const restaurables = useMemo(() => {
    if (!state) return [];
    return state.inventaireJoueur.filter(
      (o) =>
        !o.enRestauration &&
        peutRestaurerCategorie(state, o.categorie) &&
        ((o.etat === "Bon" && peutRestaurerBonVersTresBon(state, o.categorie)) ||
          (o.etat === "Très bon" &&
            peutRestaurerTresBonVersPristin(state, o.categorie))),
    );
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — préparation de l'établi…
      </main>
    );
  }

  const handleRestaurer = (objet: Objet, cible: EtatObjet) => {
    const duree = dureeRestauration(state, objet.categorie);
    const res = restaurerObjet(objet.id, cible, { dureeJours: duree });
    if (res.ok) setFlash(`${objet.nom} en restauration · ${cible} dans ${duree} j.`);
    else setFlash(`Impossible : ${res.raison}`);
    setTimeout(() => setFlash(null), 2500);
  };

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            — Atelier · Établi —
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--forest-800)",
              }}
            >
              {enCours.length} en chantier
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color:
                  prets.length > 0 ? "var(--forest-700)" : "var(--brass-700)",
              }}
            >
              {prets.length > 0 ? `${prets.length} prêt${prets.length > 1 ? "s" : ""}` : "—"}
            </span>
          </div>
        </StickyTop>
      }
    >
      {flash && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--brass-100)",
            border: "1px solid var(--brass-700)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-700)",
            marginBottom: 8,
          }}
        >
          « {flash} »
        </div>
      )}

      <h2 style={sectTitle}>— Travaux en cours —</h2>
      {enCours.length === 0 ? (
        <div style={cardWrap}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun chantier. L'établi est libre.
          </p>
        </div>
      ) : (
        <div style={cardWrap}>
          {enCours.map((o, i) => {
            const fin = o.enRestauration?.jourFin ?? Infinity;
            const debut = o.enRestauration?.jourDebut ?? state.jourActuel;
            const duree = Math.max(1, fin - debut);
            const ecoule = Math.min(duree, state.jourActuel - debut);
            const ratio = ecoule / duree;
            const ready = state.jourActuel >= fin;
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === enCours.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: ready ? "var(--forest-700)" : "var(--brass-700)",
                    }}
                  >
                    {ready ? "Prêt ✓" : `${fin - state.jourActuel} j. rest.`}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--paper-300)",
                    border: "1px solid var(--brass-500)",
                    margin: "6px 0",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "var(--forest-800)",
                      width: `${Math.min(100, Math.round(ratio * 100))}%`,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--ink-500)",
                    }}
                  >
                    {o.etat} → {o.enRestauration?.etatCible}
                  </span>
                  {/* Le bouton « Récupérer » est géré par l'avancement de jour côté logique métier — affichage seul ici. */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 style={sectTitle}>— Restaurations possibles —</h2>
      {restaurables.length === 0 ? (
        <div style={cardWrap}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun objet restaurable. Acquérez la compétence requise ou rapportez du stock.
          </p>
        </div>
      ) : (
        <div style={cardWrap}>
          {restaurables.map((o, i) => {
            const cible: EtatObjet =
              o.etat === "Bon"
                ? "Très bon"
                : o.etat === "Très bon"
                  ? "Pristin"
                  : etatSuivant(o.etat);
            const duree = dureeRestauration(state, o.categorie);
            const cout = Math.round(o.prixReferenceReel * 0.25); // placeholder — à recalculer selon recalculerPrixReference si pertinent
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === restaurables.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      marginTop: 2,
                    }}
                  >
                    {o.etat} → {cible} · {duree} j. · {cout} €
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestaurer(o, cible)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: "var(--forest-800)",
                    color: "var(--brass-300)",
                    cursor: "pointer",
                  }}
                >
                  Lancer
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MobileLayout>
  );
}
```

> ⚠ Le calcul de coût (`cout`) ci-dessus est un placeholder éditorial — vérifier dans l'ancienne page atelier la vraie formule (peut utiliser `recalculerPrixReference` ou une constante par catégorie) et la reprendre telle quelle. **Ne pas changer la logique métier.**

- [ ] **Step 3 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur (sinon ajuster les imports/API).

```bash
npm run dev
```

DevTools, `/atelier` : sticky-top compact, 2 sections (chantiers avec barres + restaurations possibles avec bouton Lancer).

- [ ] **Step 4 : Commit**

```bash
git add src/app/atelier/page.tsx
git commit -m "feat(mobile): /atelier refondu (sticky-top + 2 sections)"
```

---

### Task 13 — Refonte `/collection/page.tsx` + `CollectionGrid`

**Files:**
- Modify: `src/components/CollectionGrid.tsx`
- Modify: `src/app/collection/page.tsx`

- [ ] **Step 1 : Lire `CollectionGrid.tsx` existant**

```bash
wc -l src/components/CollectionGrid.tsx
```

Identifier les props et l'API actuelle (probablement `slots: CollectionSlot[]`, `categorie: CategorieObjet`, callbacks de donation/retrait).

- [ ] **Step 2 : Refondre `CollectionGrid.tsx` en grille 3 cols avec 3 états**

Le composant doit afficher des slots carrés ~100 px, avec 3 styles : silhouette / vu / donné. Le ruban valeur s'affiche en haut-droite des donnés.

```tsx
"use client";

import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CollectionSlot } from "@/types/game";

interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
}

const cellBase: CSSProperties = {
  aspectRatio: "1 / 1",
  border: "1px solid var(--brass-500)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  padding: 4,
  position: "relative",
  cursor: "pointer",
};

export function CollectionGrid({ slots, onTap }: CollectionGridProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {slots.map((s) => {
        const isDonne = s.donation !== null;
        const isVu = !isDonne && s.vu;
        const isSilhouette = !isDonne && !isVu;
        const style: CSSProperties = isDonne
          ? {
              ...cellBase,
              background: "var(--paper-100)",
              borderColor: "var(--forest-800)",
            }
          : isVu
            ? { ...cellBase, background: "var(--paper-300)", opacity: 0.75 }
            : {
                ...cellBase,
                background: "var(--paper-200)",
                borderStyle: "dashed",
                borderColor: "var(--paper-500)",
              };
        return (
          <button
            key={s.templateId}
            type="button"
            onClick={() => onTap?.(s)}
            style={style}
            aria-label={isSilhouette ? "Pièce inconnue" : s.nom}
          >
            {isDonne && (
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 7.5,
                  padding: "1px 4px",
                  letterSpacing: "0.08em",
                }}
              >
                {Math.round(s.donation!.valeur)} €
              </span>
            )}
            {isSilhouette ? (
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  color: "var(--paper-500)",
                }}
              >
                ?
              </span>
            ) : (
              <CategorieIcon
                categorie={s.categorie}
                size={22}
                strokeWidth={1.5}
                color={isDonne ? "var(--forest-800)" : "var(--brass-700)"}
              />
            )}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                color: isSilhouette ? "var(--paper-500)" : "var(--ink-700)",
                letterSpacing: "0.06em",
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {isSilhouette ? "???" : s.nom}
            </span>
            {isVu && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  color: "var(--brass-700)",
                  letterSpacing: "0.06em",
                }}
              >
                Vu
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3 : Refondre `/collection/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategorieChips } from "@/components/mobile/CategorieChips";
import { CollectionGrid } from "@/components/CollectionGrid";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { progressionGlobale, valeurParCategorie } from "@/lib/collection";
import type { CategorieObjet, CollectionSlot } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

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

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — consultation de la collection…
      </main>
    );
  }

  const global = progressionGlobale(state.collection);
  const valeurs = valeurParCategorie(state.collection);
  const breakdown = CATEGORIES.filter((c) => (valeurs[c] ?? 0) > 0)
    .sort((a, b) => (valeurs[b] ?? 0) - (valeurs[a] ?? 0))
    .slice(0, 3)
    .map((c) => `${c} ${Math.round(valeurs[c] ?? 0)} €`)
    .join(" · ");

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              border: "1px solid var(--brass-500)",
              padding: "8px 12px",
              background: "var(--paper-100)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              — Valeur totale —
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                color: "var(--forest-800)",
                letterSpacing: "0.04em",
              }}
            >
              {Math.round(global.valeur).toLocaleString("fr-FR")} €
            </div>
            {breakdown && (
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 11.5,
                  color: "var(--ink-500)",
                  marginTop: 4,
                }}
              >
                {breakdown}
              </div>
            )}
          </div>
          <CategorieChips
            categories={CATEGORIES}
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={global.donnees}
          />
        </StickyTop>
      }
    >
      <CollectionGrid slots={slotsFiltres} />
    </MobileLayout>
  );
}
```

> Note : on n'inclut pas la sheet `DonationPicker` ici — elle sera ajoutée en Task 14. Le `onTap` reste optionnel.

- [ ] **Step 4 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur (vérifier que `valeurParCategorie` est bien exporté ; sinon utiliser `valeurTotale` ou autre helper existant).

```bash
npm run dev
```

DevTools, `/collection` : résumé valeur en haut, chips, grille 3 cols avec 3 états (silhouette pointillée / vu désaturé / donné avec ruban valeur).

- [ ] **Step 5 : Commit**

```bash
git add src/components/CollectionGrid.tsx src/app/collection/page.tsx
git commit -m "feat(mobile): /collection grille 3 cols + 3 états + ruban valeur"
```

---

### Task 14 — `DonationPickerSheet` + intégration dans Collection

**Files:**
- Create: `src/components/mobile/DonationPickerSheet.tsx`
- Modify: `src/app/collection/page.tsx`

- [ ] **Step 1 : `DonationPickerSheet.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CollectionSlot, Objet } from "@/types/game";

interface DonationPickerSheetProps {
  open: boolean;
  onClose: () => void;
  slot: CollectionSlot | null;
  candidats: Objet[];
  onDonner: (objetId: string) => void;
  onRetirer?: () => void;
}

const itemStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px dotted var(--paper-500)",
};

const thumbStyle: CSSProperties = {
  width: 44,
  height: 44,
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  color: "var(--brass-100)",
};

export function DonationPickerSheet({
  open,
  onClose,
  slot,
  candidats,
  onDonner,
  onRetirer,
}: DonationPickerSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={slot ? slot.nom : "Donation"}
    >
      {slot?.donation && (
        <div
          style={{
            border: "1px solid var(--forest-800)",
            background: "var(--brass-100)",
            padding: "10px 12px",
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-700)",
            }}
          >
            Slot rempli — valeur {Math.round(slot.donation.valeur)} €
          </span>
          {onRetirer && (
            <button
              type="button"
              onClick={onRetirer}
              style={{
                padding: "6px 10px",
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--vermillion-600)",
                background: "var(--paper-100)",
                color: "var(--vermillion-600)",
                cursor: "pointer",
              }}
            >
              Retirer
            </button>
          )}
        </div>
      )}

      {candidats.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "16px 0",
          }}
        >
          Aucun objet éligible dans le stock pour cet emplacement.
        </p>
      ) : (
        candidats.map((o) => (
          <div key={o.id} style={itemStyle}>
            <div style={thumbStyle}>
              <CategorieIcon
                categorie={o.categorie}
                size={20}
                strokeWidth={1.5}
                color="var(--brass-100)"
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  fontWeight: 700,
                }}
              >
                {o.nom}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                }}
              >
                {o.etat} · {o.rarete} · {Math.round(o.prixReferenceReel)} €
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDonner(o.id)}
              style={{
                padding: "6px 10px",
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--brass-500)",
                background: "var(--forest-800)",
                color: "var(--brass-300)",
                cursor: "pointer",
              }}
            >
              Donner
            </button>
          </div>
        ))
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 2 : Brancher la sheet dans `/collection/page.tsx`**

Ajouter en haut du fichier l'import et un état `slotActif`. Modifier `<CollectionGrid />` pour passer `onTap`. Filtrer les candidats correspondant au `templateId` du slot.

```tsx
import { DonationPickerSheet } from "@/components/mobile/DonationPickerSheet";
// …
const [slotActif, setSlotActif] = useState<CollectionSlot | null>(null);
// …
const candidats = useMemo(() => {
  if (!state || !slotActif) return [];
  return state.inventaireJoueur.filter((o) => o.templateId === slotActif.templateId);
}, [state, slotActif]);
// …
<CollectionGrid slots={slotsFiltres} onTap={setSlotActif} />
// après </MobileLayout> :
<DonationPickerSheet
  open={slotActif !== null}
  onClose={() => setSlotActif(null)}
  slot={slotActif}
  candidats={candidats}
  onDonner={(objetId) => {
    const res = donnerACollection(objetId);
    if (res.ok) setSlotActif(null);
  }}
  onRetirer={
    slotActif?.donation
      ? () => {
          const res = retirerDeCollection(slotActif.templateId);
          if (res.ok) setSlotActif(null);
        }
      : undefined
  }
/>
```

> ⚠ Ajouter `donnerACollection` et `retirerDeCollection` dans la destructure du `useGame()`.

- [ ] **Step 3 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

DevTools, `/collection` : tap sur un slot vide → sheet avec candidats du stock. Tap « Donner » → slot devient donné. Tap sur slot donné → sheet avec bouton « Retirer ».

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/DonationPickerSheet.tsx src/app/collection/page.tsx
git commit -m "feat(mobile): DonationPickerSheet branché sur /collection"
```

---

### Task 15 — Refonte `/chiner` (liste) + `BrocanteCard` mobile

**Files:**
- Modify: `src/components/BrocanteCard.tsx`
- Modify: `src/app/chiner/page.tsx`

- [ ] **Step 1 : Refondre `BrocanteCard.tsx`**

Le composant doit afficher : nom + étoiles + description + verrouillage explicite + footer (entrée + items + bouton « Entrer »).

```tsx
"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { Brocante, GameState } from "@/types/game";
import { coutEntree } from "@/data/brocantes";

interface BrocanteCardProps {
  brocante: Brocante;
  state: GameState;
  debloquee: boolean;
  raisonVerrou?: string;
  destination: "chiner" | "vitrine";
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "10px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function BrocanteCard({
  brocante,
  state,
  debloquee,
  raisonVerrou,
  destination,
}: BrocanteCardProps) {
  const router = useRouter();
  const entree = coutEntree(brocante);
  return (
    <article style={{ ...cardStyle, opacity: debloquee ? 1 : 0.55 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
          }}
        >
          {brocante.nom}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            color: "var(--brass-600)",
            letterSpacing: "0.06em",
          }}
        >
          {"★".repeat(brocante.tier)}
        </span>
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12.5,
          color: "var(--ink-500)",
          margin: "4px 0 6px",
          lineHeight: 1.3,
        }}
      >
        {brocante.description}
      </p>
      {!debloquee && raisonVerrou && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "var(--vermillion-600)",
            marginBottom: 6,
            letterSpacing: "0.06em",
          }}
        >
          ⊘ {raisonVerrou}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--brass-700)",
            letterSpacing: "0.06em",
          }}
        >
          Entrée {entree} € · {brocante.taillePool ?? "?"} items
        </span>
        <button
          type="button"
          disabled={!debloquee || state.budget < entree}
          onClick={() => router.push(`/${destination}/${brocante.id}`)}
          style={{
            padding: "7px 12px",
            fontFamily: "var(--font-display)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: "1px solid var(--brass-500)",
            background: debloquee ? "var(--forest-800)" : "var(--paper-300)",
            color: debloquee ? "var(--brass-300)" : "var(--ink-500)",
            cursor: debloquee ? "pointer" : "not-allowed",
            opacity: !debloquee || state.budget < entree ? 0.6 : 1,
          }}
        >
          {debloquee ? "Entrer" : "Fermé"}
        </button>
      </div>
    </article>
  );
}
```

> ⚠ Le typage `Brocante` doit avoir `tier: 1|2|3|4`, `taillePool?: number`, `description: string`. Vérifier `src/types/game.ts`.

- [ ] **Step 2 : Refondre `/chiner/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { BrocanteCard } from "@/components/BrocanteCard";
import { useGame } from "@/context/GameContext";
import { brocantesParTier } from "@/data/brocantes";
import { estDebloquee, decrireConditions } from "@/lib/deblocage";

type Tier = 1 | 2 | 3 | 4;

const pill = (active: boolean) => ({
  flex: 1,
  textAlign: "center" as const,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  padding: "6px 0",
  border: "1px solid var(--brass-500)",
  background: active ? "var(--forest-800)" : "var(--paper-100)",
  color: active ? "var(--brass-300)" : "var(--ink-500)",
  cursor: "pointer",
});

export default function ChinerListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [tier, setTier] = useState<Tier>(1);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const debloqueesParTier = useMemo(() => {
    const m = new Map<Tier, Set<string>>([
      [1, new Set()],
      [2, new Set()],
      [3, new Set()],
      [4, new Set()],
    ]);
    if (!state) return m;
    for (const t of [1, 2, 3, 4] as const) {
      for (const b of brocantesParTier(t)) {
        if (estDebloquee(b, state, m)) m.get(t)!.add(b.id);
      }
    }
    return m;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — préparation des halles…
      </main>
    );
  }

  const liste = brocantesParTier(tier);
  const dejaCount = Array.from(debloqueesParTier.values()).reduce(
    (s, set) => s + set.size,
    0,
  );

  return (
    <MobileLayout
      header={
        <ContextualHeader
          titre="Chiner"
          sousTitre={`${dejaCount} brocante${dejaCount > 1 ? "s" : ""} ouverte${dejaCount > 1 ? "s" : ""}`}
          budget={state.budget}
          onBack={() => router.push("/qg")}
        />
      }
      stickyTop={
        <StickyTop>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={pill(tier === 1)} onClick={() => setTier(1)}>★</button>
            <button type="button" style={pill(tier === 2)} onClick={() => setTier(2)}>★★</button>
            <button type="button" style={pill(tier === 3)} onClick={() => setTier(3)}>★★★</button>
            <button type="button" style={pill(tier === 4)} onClick={() => setTier(4)}>Boss</button>
          </div>
        </StickyTop>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {liste.map((b) => {
          const debloquee = debloqueesParTier.get(tier)!.has(b.id);
          const raison = debloquee ? undefined : decrireConditions(b, state);
          return (
            <BrocanteCard
              key={b.id}
              brocante={b}
              state={state}
              debloquee={debloquee}
              raisonVerrou={raison}
              destination="chiner"
            />
          );
        })}
      </div>
    </MobileLayout>
  );
}
```

> ⚠ `decrireConditions` est supposé exister dans `src/lib/deblocage.ts`. Si l'API diffère, soit l'ajouter (helper simple qui décrit la 1re condition manquante), soit utiliser une chaîne fallback `"Condition non remplie"`.

- [ ] **Step 3 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur. Si `decrireConditions` n'existe pas, créer un helper minimal dans `src/lib/deblocage.ts` qui retourne `"Condition non remplie"`.

```bash
npm run dev
```

DevTools, depuis QG tap « Chiner » → liste 1 col avec pills tier en sticky, cartes verrouillées en opacité 0.55.

- [ ] **Step 4 : Commit**

```bash
git add src/components/BrocanteCard.tsx src/app/chiner/page.tsx src/lib/deblocage.ts
git commit -m "feat(mobile): /chiner liste + BrocanteCard mobile"
```

---

### Task 16 — Refonte `/chiner/[brocanteId]` (session) + `NegociationSheet`

**Files:**
- Create: `src/components/mobile/NegociationSheet.tsx`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`

- [ ] **Step 1 : `NegociationSheet.tsx`**

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface NegociationSheetProps {
  open: boolean;
  onClose: () => void;
  prixAffiche: number;
  offreInitiale: number;
  onProposer: (offre: number) => void;
}

export function NegociationSheet({
  open,
  onClose,
  prixAffiche,
  offreInitiale,
  onProposer,
}: NegociationSheetProps) {
  const [offre, setOffre] = useState(offreInitiale);
  return (
    <BottomSheet open={open} onClose={onClose} title="Négocier">
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--ink-500)",
          margin: "0 0 12px",
        }}
      >
        Prix affiché : <strong>{prixAffiche} €</strong>. Quelle est votre offre ?
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <input
          type="number"
          min={1}
          max={prixAffiche}
          value={offre}
          onChange={(e) => setOffre(Number(e.target.value))}
          style={{
            flex: 1,
            padding: "10px 12px",
            fontFamily: "var(--font-display)",
            fontSize: 18,
            border: "1px solid var(--brass-700)",
            background: "var(--paper-100)",
            color: "var(--forest-800)",
            textAlign: "right",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--brass-700)",
          }}
        >
          €
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={btnSecondary}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onProposer(offre)}
          style={btnPrimary}
        >
          Proposer {offre} €
        </button>
      </div>
    </BottomSheet>
  );
}

const btnPrimary: CSSProperties = {
  padding: "12px 8px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
};
```

- [ ] **Step 2 : Refondre `/chiner/[brocanteId]/ClientPage.tsx`**

C'est le fichier le plus gros à toucher. Stratégie :
1. Garder TOUTE la logique métier (`genererSession`, `reagirNegociation`, achats, flash, retour QG, XP) — ne pas y toucher.
2. Remplacer uniquement le rendu (`return (…)`) et le sous-composant `ObjetEnVenteCard`.
3. Ajouter `NegociationSheet` pour la négo.

Voici la structure de rendu à substituer :

```tsx
// imports ajoutés en haut :
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { ActionFab } from "@/components/mobile/ActionFab";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
// (garder tous les imports existants liés à la logique)

// dans le composant :
const [negoOuverte, setNegoOuverte] = useState<string | null>(null);

// le return remplace l'ancien :
return (
  <div
    style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--paper-100)",
    }}
  >
    <ContextualHeader
      titre={brocante.nom}
      sousTitre={`${achats.length} / ${items.length} acquis · ${achats.reduce((s, a) => s + a.prixPaye, 0)} €`}
      budget={state.budget}
      onBack={handleRentrer}
      backIcon="close"
    />
    <main
      style={{
        flex: 1,
        padding: `12px 12px calc(80px + var(--safe-bottom))`,
        overflowY: "auto",
      }}
    >
      {flash && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--brass-100)",
            border: "1px solid var(--brass-700)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-700)",
            marginBottom: 10,
          }}
        >
          « {flash} »
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {items.map((it) => (
          <ObjetCardMobile
            key={it.id}
            item={it}
            budget={state.budget}
            oeilExerce={aConnaisseurChinage(state, it.objet.categorie)}
            onNegocier={() => setNegoOuverte(it.id)}
            onAcheter={() => handleAcheter(it.id)}
          />
        ))}
      </div>
    </main>

    <ActionFab
      buttons={[
        {
          label: "Rentrer · fin de journée",
          variant: "secondary",
          onClick: handleRentrer,
        },
      ]}
    />

    {negoOuverte && (() => {
      const it = items.find((i) => i.id === negoOuverte);
      if (!it) return null;
      return (
        <NegociationSheet
          open
          onClose={() => setNegoOuverte(null)}
          prixAffiche={it.prixVendeur}
          offreInitiale={Math.round(it.prixVendeur * 0.8)}
          onProposer={(offre) => {
            handleChangerOffre(it.id, offre);
            handleProposer(it.id);
            setNegoOuverte(null);
          }}
        />
      );
    })()}
  </div>
);
```

Et le `ObjetCardMobile` (nouveau, remplace l'ancien `ObjetEnVenteCard`) :

```tsx
function ObjetCardMobile({
  item,
  budget,
  oeilExerce,
  onNegocier,
  onAcheter,
}: {
  item: ObjetEnVente;
  budget: number;
  oeilExerce: boolean;
  onNegocier: () => void;
  onAcheter: () => void;
}) {
  const { objet, prixVendeur, statut } = item;
  const tropCher = budget < prixVendeur;
  if (statut === "achete") {
    return (
      <article
        style={{
          border: "1px solid var(--brass-500)",
          background: "var(--paper-300)",
          padding: 6,
          opacity: 0.4,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <div
          style={{
            aspectRatio: "4/3",
            background: "linear-gradient(135deg, var(--paper-500), var(--brass-700))",
            display: "grid",
            placeItems: "center",
            color: "var(--brass-100)",
          }}
        >
          <CategorieIcon categorie={objet.categorie} size={28} strokeWidth={1.5} color="var(--brass-100)" />
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-500)",
          }}
        >
          — Acquis —
        </div>
      </article>
    );
  }
  return (
    <article
      style={{
        border: `1px solid ${statut === "refuse" ? "var(--vermillion-600)" : "var(--brass-500)"}`,
        background: "var(--paper-300)",
        padding: 6,
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <div
        style={{
          aspectRatio: "4/3",
          background: "linear-gradient(135deg, var(--paper-500), var(--brass-700))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          color: "var(--brass-100)",
        }}
      >
        <CategorieIcon categorie={objet.categorie} size={24} strokeWidth={1.5} color="var(--brass-100)" />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 8,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {objet.categorie}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <EtatBadge etat={objet.etat} />
        <RareteBadge rarete={objet.rarete} />
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 14,
          color: tropCher ? "var(--vermillion-600)" : "var(--forest-800)",
          fontWeight: 700,
        }}
      >
        {prixVendeur} €
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <button
          type="button"
          onClick={onNegocier}
          style={miniBtn(false)}
        >
          Négo
        </button>
        <button
          type="button"
          onClick={onAcheter}
          disabled={tropCher}
          style={{ ...miniBtn(true), opacity: tropCher ? 0.45 : 1, cursor: tropCher ? "not-allowed" : "pointer" }}
        >
          Acheter
        </button>
      </div>
    </article>
  );
}

const miniBtn = (primary: boolean): CSSProperties => ({
  padding: "6px 0",
  textAlign: "center",
  fontFamily: "var(--font-display)",
  fontSize: 8.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: primary ? "var(--forest-800)" : "var(--paper-100)",
  color: primary ? "var(--brass-300)" : "var(--forest-800)",
  cursor: "pointer",
});
```

- [ ] **Step 3 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

DevTools : QG → Chiner → choisir une brocante débloquée → vérifier grille 2 cols, tap « Négo » ouvre sheet, FAB « Rentrer » visible en bas. Tab bar masquée pendant la session.

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/NegociationSheet.tsx src/app/chiner/[brocanteId]/ClientPage.tsx
git commit -m "feat(mobile): session chinage 2 cols + NegociationSheet + FAB Rentrer"
```

---

### Task 17 — Refonte `/vitrine` (liste) + `/vitrine/[brocanteId]` (prep) + `/vitrine/[brocanteId]/journee`

**Files:**
- Modify: `src/app/vitrine/page.tsx`
- Modify: `src/app/vitrine/[brocanteId]/ClientPage.tsx`
- Modify: `src/app/vitrine/[brocanteId]/journee/page.tsx`

- [ ] **Step 1 : Refondre `/vitrine/page.tsx`** (liste — réutilise `BrocanteCard` avec `destination="vitrine"`)

Similaire à Task 15 mais pour vitrine. Le squelette est quasi identique : `ContextualHeader` (titre « Vitrine ») + sticky-top avec pills tier + `BrocanteCard` avec `destination="vitrine"`. Adapter en se basant sur la version chiner.

- [ ] **Step 2 : Refondre `/vitrine/[brocanteId]/ClientPage.tsx`** (prep)

Stratégie identique au chiner : garder la logique (`ouvrirVitrine`, `mettreEnVitrine`, `retirerDeVitrine`, `ajusterPrixVitrine`), refondre le rendu en :
- `ContextualHeader` (titre « Vitrine » + sous-titre nom brocante + étoiles).
- Scroll : panneau Stand (niveau + capacité + coût), liste items exposés (prix inline éditable), section « + Ajouter depuis le stock ».
- 2 `ActionFab` : « Annuler » (secondary) + « Ouvrir l'étal · X € » (primary).

Squelette du rendu :

```tsx
<div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper-100)" }}>
  <ContextualHeader
    titre="Vitrine"
    sousTitre={`${brocante.nom} · ${"★".repeat(brocante.tier)}`}
    budget={state.budget}
    onBack={() => router.push("/vitrine")}
  />
  <main style={{ flex: 1, padding: "12px 12px calc(80px + var(--safe-bottom))", overflowY: "auto" }}>
    {/* Panneau Stand */}
    <section style={cardStyle}>
      <div style={rowStyle}>
        <span style={lblStyle}>Stand niveau</span>
        <span style={valStyle}>
          {standActuel ? `${standActuel.niveau} — ${standActuel.nom}` : "—"}
        </span>
      </div>
      <div style={{ height: 6, background: "var(--paper-300)", border: "1px solid var(--brass-500)", margin: "6px 0" }}>
        <div style={{ height: "100%", background: "var(--forest-800)", width: `${Math.min(100, (objetsEnVitrine.length / CAPACITE_MAX_GLOBALE) * 100)}%` }} />
      </div>
      <div style={rowStyle}>
        <span style={lblStyle}>Capacité</span>
        <span style={{ ...valStyle, fontSize: 11 }}>
          {objetsEnVitrine.length} / {CAPACITE_MAX_GLOBALE} · loc. {coutActuel} €
        </span>
      </div>
    </section>

    <h2 style={sectTitle}>— Objets exposés —</h2>
    <section style={cardStyle}>
      {objetsEnVitrine.length === 0 && (
        <p style={emptyStyle}>Aucun objet exposé. Ajoutez-en depuis le stock.</p>
      )}
      {objetsEnVitrine.map((ov) => (
        <VitrineItemRow
          key={ov.objet.id}
          ov={ov}
          onChangePrix={(p) => ajusterPrixVitrine(ov.objet.id, p)}
          onRetirer={() => retirerDeVitrine(ov.objet.id)}
        />
      ))}
    </section>

    <h2 style={sectTitle}>— Ajouter depuis le stock —</h2>
    {/* Pour la phase 1, navigation simple vers /stockage avec query param picker */}
    <button
      type="button"
      onClick={() => router.push(`/stockage`)}
      style={{ ...ctaSecondary, width: "100%", marginTop: 4 }}
    >
      Parcourir le stock ({stockDisponible.length} obj.)
    </button>
  </main>

  <ActionFab
    buttons={[
      { label: "Annuler", variant: "secondary", onClick: () => router.push("/qg") },
      {
        label: `Ouvrir l'étal · ${coutActuel} €`,
        onClick: () => router.push(`/vitrine/${brocante.id}/journee`),
        disabled: !peutOuvrir,
      },
    ]}
  />
</div>
```

Où `VitrineItemRow` est une petite fonction locale avec input numérique inline (similaire à la maquette `chiner-vitrine.html`).

> **Itération future** : la sélection d'objets depuis le stock pour les ajouter à la vitrine pourrait passer par une `BottomSheet` dédiée (`StockPickerSheet`). Pour cette phase, la navigation simple vers `/stockage` est acceptable ; à revoir si l'UX devient trop lourde.

- [ ] **Step 3 : Refondre `/vitrine/[brocanteId]/journee/page.tsx`**

Application du même squelette : `ContextualHeader` + scroll de cartes ventes/refus + `ActionFab` « Clore la journée ». Conserver la logique de tirage de ventes/négociations existante. Adapter au layout mobile sans toucher au métier.

- [ ] **Step 4 : Vérifier tsc + visuel**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

Tester : QG → « Exposer » → choisir brocante → ajouter quelques objets (via stockage) → ajuster prix → « Ouvrir l'étal » → simuler une journée.

- [ ] **Step 5 : Commit**

```bash
git add src/app/vitrine/
git commit -m "feat(mobile): /vitrine liste, préparation, journée — squelette mobile"
```

---

### Task 18 — Refonte `/historique/page.tsx` + nettoyage final

**Files:**
- Modify: `src/app/historique/page.tsx`
- Delete: `src/components/NavigationDock.tsx`
- Delete: `src/components/StatusBar.tsx`
- Delete: `src/components/MarketTrendsPanel.tsx`
- Modify: `src/app/page.tsx` (vérifier compatibilité mobile)

- [ ] **Step 1 : Refondre `/historique/page.tsx`**

Application du squelette mobile : `MobileLayout` + `MobileHeader` + scroll de cartes par jour. Reprendre la logique d'agrégation existante.

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { useGame } from "@/context/GameContext";

export default function HistoriquePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return null;
  }

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
    >
      {state.historique.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "40px 20px",
          }}
        >
          Aucune session enregistrée.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.historique.map((s) => (
            <article
              key={s.id}
              style={{
                border: "1px solid var(--brass-500)",
                background: "var(--paper-100)",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--forest-800)",
                  }}
                >
                  Jour {s.jour} · {s.type}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 12.5,
                  color: "var(--ink-500)",
                  marginTop: 4,
                }}
              >
                {s.brocanteNom}
              </div>
            </article>
          ))}
        </div>
      )}
    </MobileLayout>
  );
}
```

- [ ] **Step 2 : Supprimer les composants obsolètes**

```bash
git rm src/components/NavigationDock.tsx
git rm src/components/StatusBar.tsx
git rm src/components/MarketTrendsPanel.tsx
```

Vérifier qu'aucun import résiduel :

```bash
grep -r "NavigationDock\|StatusBar\|MarketTrendsPanel" src/ || true
```

S'il y en a, retirer les imports concernés.

- [ ] **Step 3 : Vérifier la home `/`**

```bash
cat src/app/page.tsx
```

Si elle utilise une mise en page desktop large, l'adapter en réduisant le `max-width` et en empilant les boutons verticalement. Sinon, juste vérifier visuellement en DevTools.

- [ ] **Step 4 : Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/app/historique/page.tsx src/components/NavigationDock.tsx src/components/StatusBar.tsx src/components/MarketTrendsPanel.tsx src/app/page.tsx
git commit -m "chore(mobile): /historique squelette + suppression NavigationDock/StatusBar/MarketTrendsPanel"
```

---

### Task 19 — Smoke test complet + commit final

**Files:** aucun nouveau.

- [ ] **Step 1 : Smoke test full**

```bash
npx tsc --noEmit
```

Expected: 0 erreur.

```bash
npm run dev
```

Sur iPhone 14 (390 × 844) dans DevTools, parcourir séquentiellement :
- `/` (home, new game ou continue)
- `/qg` : header sticky, semaine + CTA sticky, Gazette teaser, État des lieux (4 lignes), Dernières sessions (3 entrées). Tap Gazette → sheet pleine.
- `/stockage` : sticky-top compteur + jauge + chips, liste 1 col.
- `/atelier` : sticky-top résumé, 2 sections (chantiers + restaurables). Avancer un jour (en jouant) pour valider une restauration prête.
- `/collection` : résumé valeur + chips + grille 3 cols. Tap slot → sheet donation.
- `/competences` : grille 8 carrés + nom arbre + carte XP. Switch d'arbre fonctionnel.
- `/chiner` : pills tier, cartes brocantes verrouillage explicite. Entrer dans une débloquée.
- `/chiner/<id>` : grille 2 cols, négo via sheet, FAB Rentrer.
- `/vitrine` puis `/vitrine/<id>` : prep + ouverture étal + journée.
- `/historique` : liste de toutes les sessions.

Vérifier sur **toutes** les pages :
- Pas de scroll horizontal.
- Tap targets ≥ 40 px (zoom navigateur pour mesurer si besoin).
- Tab bar visible sauf sur `/chiner/<id>`, `/vitrine/<id>`, `/vitrine/<id>/journee`, `/`.
- Pastilles rouges visibles sur Atelier (si objet prêt) et Compétences (si points dispo).
- Bascule en paysage → message « Tournez votre téléphone en portrait ».

- [ ] **Step 2 : Vérifier le build de production**

```bash
npm run build
```

Expected: build réussit sans erreur, génère `out/` (export statique).

- [ ] **Step 3 : Smoke test sur Android (Chrome DevTools)**

DevTools, changer pour Pixel 7 (412 × 915). Re-parcourir 2-3 routes pour vérifier la cohérence.

- [ ] **Step 4 : Commit final + tag**

```bash
git status
# si tout est propre :
git tag mobile-redesign-v1
git log --oneline -20
```

- [ ] **Step 5 : Update memory**

Mettre à jour `~/.claude/projects/-Users-guillaume-Documents-01-Personnel-07-Loisirs-01-Cr-ation-Projet-Broc/memory/` avec un nouveau memo de type `project` notant la livraison de la refonte mobile (Phase 7).

---

## Self-review

**Spec coverage :** chaque section de la spec est couverte par au moins une tâche.

- §2 stratégie mobile-first / portrait → Task 2 (viewport + lockout paysage).
- §3 langage visuel allégé → appliqué dans chaque task (bordures simples, pas de BrassCorners sur petits éléments).
- §4 navigation (suppression Trophées, Chiner-via-CTA, Historique au QG, TabBar 5 onglets) → Tasks 5, 7, 9.
- §5.1 QG sticky-top + Gazette teaser + État + Historique → Tasks 7, 8, 9.
- §5.2 Chiner liste → Task 15.
- §5.3 Chiner session (2 cols + nego sheet + FAB) → Task 16.
- §5.4 Vitrine prep → Task 17.
- §5.5 Vitrine journée → Task 17 (squelette).
- §5.6 Stockage → Task 11.
- §5.7 Atelier → Task 12.
- §5.8 Compétences (grille 8 carrés) → Task 10.
- §5.9 Collection (grille 3 cols + 3 états + ruban + DonationPicker) → Tasks 13, 14.
- §5.10 Historique → Task 18.
- §6 patterns transverses (sheets, pastilles, FAB, layout) → Tasks 3, 4, 5, 6.
- §7 suppressions / migrations → Tasks 9, 18.
- §8 composants → tous mappés à une task.
- §10 critères de validation → Task 19.

**Placeholder scan :** quelques « ⚠ vérifier API » subsistent volontairement comme garde-fous (signatures `getTreeMeta`, `etatCompetence`, `decrireConditions`). Aucun « TBD/TODO » non résolu.

**Type consistency :** noms cohérents (`CompetenceTreeId`, `CollectionSlot`, `SessionHistorique`, `ObjetEnVente`, `EtatObjet`, `CategorieObjet`). Les composants partagent la même convention de props (`state`, `onXxx`).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-20-mobile-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — je dispatche un subagent par task, revue entre tasks, itération rapide

**2. Inline Execution** — j'exécute en continu dans cette session avec checkpoints

**Lequel ?**
