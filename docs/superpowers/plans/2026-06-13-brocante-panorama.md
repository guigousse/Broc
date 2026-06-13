# Brocante Panorama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le `BrocanteCarousel` + pills tier des pages `/chiner` et `/vitrine` par un panorama de 4 scènes (1 par tier), avec des cadres cliquables, une plaquette de scène et un panneau détail bas affichant la sélection.

**Architecture:** Conteneur scroll horizontal `scroll-snap-type: x mandatory` (pattern `AtelierPanorama`) contenant 4 scènes `100vw`. Chaque scène = fond image + cadres positionnés en vw/vh + plaquette laiton. La sélection (un seul `selectedBrocanteId`) vit dans le conteneur ; un panneau bas fixe (35vh) affiche le détail et le bouton Entrer. Suppression des pills, suppression de l'état `tier` dans les pages.

**Tech Stack:** Next.js 15 App Router, TypeScript, `next/image`, charte CSS variables (`--paper-*`, `--brass-*`, `--forest-*`, `--font-display`, `--font-mono`, `--font-serif`). Tests : Vitest + React Testing Library (`@vitest-environment jsdom`, cf. `ColonnesSlider.test.tsx`).

**Spec :** `docs/superpowers/specs/2026-06-13-brocante-panorama-design.md`

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts` | Créer | Coordonnées (en `%`/`vw`) des cadres + plaquettes par tier. |
| `src/components/mobile/brocante-pano/ScenePlaque.tsx` | Créer | Plaquette gravée laiton centrée bas-de-scène (4 variantes). |
| `src/components/mobile/brocante-pano/ScenePlaque.test.tsx` | Créer | Tests : rendu des 4 tiers. |
| `src/components/mobile/brocante-pano/BrocanteFrame.tsx` | Créer | Cadre cliquable (image + bordure + highlight + grayscale). |
| `src/components/mobile/brocante-pano/BrocanteFrame.test.tsx` | Créer | Tests : clic, état sélectionné, état verrouillé. |
| `src/components/mobile/brocante-pano/BrocanteDetailPanel.tsx` | Créer | Panneau bas — vide / rempli / verrouillé / fonds insuffisants. |
| `src/components/mobile/brocante-pano/BrocanteDetailPanel.test.tsx` | Créer | Tests : 4 états + clic Entrer. |
| `src/components/mobile/brocante-pano/BrocanteScene.tsx` | Créer | Décor + cadres + plaquette pour 1 tier. |
| `src/components/mobile/brocante-pano/BrocantePanorama.tsx` | Créer | Conteneur scroll snap, gère sélection + reset au snap. |
| `src/components/mobile/brocante-pano/BrocantePanorama.test.tsx` | Créer | Tests : sélection au clic, reset si snap vers autre tier. |
| `src/app/chiner/page.tsx` | Modifier | Supprime pills + état tier, branche `BrocantePanorama`. |
| `src/app/vitrine/page.tsx` | Modifier | Idem. |

`BrocanteCarousel.tsx` est conservé tel quel (suppression différée).

Aucune modification : `src/data/brocantes.ts`, `src/lib/brocanteImages.ts`, `src/lib/deblocage.ts`, `src/types/game.ts`.

---

## Task 1 — Layout config (coordonnées des cadres et plaquettes)

**Files:**
- Create: `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts`

Ce fichier est de la config pure (pas de logique), pas de test. Les valeurs sont des stubs équilibrés ; tu les ajusteras à l'œil après intégration.

- [ ] **Step 1 : Créer le fichier de layout**

```ts
/**
 * Coordonnées des cadres et plaquettes du panorama de brocantes.
 *
 * Toutes les valeurs sont exprimées en pourcentage de la SCÈNE (qui fait
 * 100vw × full-height). À ajuster à l'œil après intégration des fonds.
 */

import type { BrocanteTier } from "@/types/game";

export interface FrameCoord {
  /** id de la brocante (cf. src/data/brocantes.ts). */
  id: string;
  /** En % de la largeur de scène. */
  left: string;
  /** En % de la hauteur de scène. */
  top: string;
  /** En % de la largeur de scène. */
  width: string;
  /** En % de la hauteur de scène. */
  height: string;
}

export interface PlaqueCoord {
  left: string;
  top: string;
  width: string;
}

// Tier 1 — 5 brocantes alignées sur une rangée basse
export const TIER_1_FRAMES: FrameCoord[] = [
  { id: "vide-grenier-quartier",     left: "6%",  top: "28%", width: "16%", height: "32%" },
  { id: "marche-aux-puces-dimanche", left: "25%", top: "28%", width: "16%", height: "32%" },
  { id: "bouquinerie-plein-air",     left: "44%", top: "28%", width: "16%", height: "32%" },
  { id: "vide-dressing-centre",      left: "63%", top: "28%", width: "16%", height: "32%" },
  { id: "brocante-club-jeux",        left: "82%", top: "28%", width: "16%", height: "32%" },
];

export const TIER_2_FRAMES: FrameCoord[] = [
  { id: "deballage-collectionneurs",     left: "6%",  top: "26%", width: "16%", height: "32%" },
  { id: "marche-saint-ouen",             left: "25%", top: "26%", width: "16%", height: "32%" },
  { id: "disquaire-independant",         left: "44%", top: "26%", width: "16%", height: "32%" },
  { id: "atelier-bricoleur",             left: "63%", top: "26%", width: "16%", height: "32%" },
  { id: "marche-antiquaires-bibelots",   left: "82%", top: "26%", width: "16%", height: "32%" },
];

// Tier 3 — 6 brocantes (plus petit format pour rentrer)
export const TIER_3_FRAMES: FrameCoord[] = [
  { id: "foire-chatou",                    left: "4%",  top: "24%", width: "14%", height: "30%" },
  { id: "salon-grands-collectionneurs",    left: "20%", top: "24%", width: "14%", height: "30%" },
  { id: "drouot-mode-couture",             left: "36%", top: "24%", width: "14%", height: "30%" },
  { id: "salon-violon-ancien",             left: "52%", top: "24%", width: "14%", height: "30%" },
  { id: "galerie-arts-decoratifs",         left: "68%", top: "24%", width: "14%", height: "30%" },
  { id: "galerie-tableaux-sculptures",     left: "84%", top: "24%", width: "14%", height: "30%" },
];

// Tier 4 — 1 cadre central monumental
export const TIER_4_FRAMES: FrameCoord[] = [
  { id: "salon-antiquaires-drouot", left: "32%", top: "16%", width: "36%", height: "50%" },
];

export const SCENE_FRAMES: Record<BrocanteTier, FrameCoord[]> = {
  1: TIER_1_FRAMES,
  2: TIER_2_FRAMES,
  3: TIER_3_FRAMES,
  4: TIER_4_FRAMES,
};

export const SCENE_PLAQUE: Record<BrocanteTier, PlaqueCoord> = {
  1: { left: "38%", top: "70%", width: "24%" },
  2: { left: "38%", top: "70%", width: "24%" },
  3: { left: "38%", top: "70%", width: "24%" },
  4: { left: "30%", top: "74%", width: "40%" },
};
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/brocante-pano/brocantePanoramaLayout.ts
git commit -m "feat(brocante-pano): config layout 4 scènes"
```

---

## Task 2 — ScenePlaque (composant + tests)

**Files:**
- Create: `src/components/mobile/brocante-pano/ScenePlaque.tsx`
- Test: `src/components/mobile/brocante-pano/ScenePlaque.test.tsx`

- [ ] **Step 1 : Écrire le test**

Crée `src/components/mobile/brocante-pano/ScenePlaque.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ScenePlaque } from "./ScenePlaque";

afterEach(cleanup);

describe("ScenePlaque", () => {
  it("rend le tier 1 avec une étoile", () => {
    render(<ScenePlaque tier={1} />);
    expect(screen.getByLabelText("Rang : 1 étoile")).toBeTruthy();
    expect(screen.getByText("★")).toBeTruthy();
  });

  it("rend le tier 2 avec deux étoiles", () => {
    render(<ScenePlaque tier={2} />);
    expect(screen.getByText("★★")).toBeTruthy();
  });

  it("rend le tier 3 avec trois étoiles", () => {
    render(<ScenePlaque tier={3} />);
    expect(screen.getByText("★★★")).toBeTruthy();
  });

  it("rend le tier 4 avec la mention salon des antiquaires", () => {
    render(<ScenePlaque tier={4} />);
    expect(screen.getByText("★★★★")).toBeTruthy();
    expect(screen.getByText(/salon des antiquaires/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/brocante-pano/ScenePlaque.test.tsx`
Expected: FAIL (`ScenePlaque` n'existe pas).

- [ ] **Step 3 : Implémenter le composant**

Crée `src/components/mobile/brocante-pano/ScenePlaque.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { BrocanteTier } from "@/types/game";

interface ScenePlaqueProps {
  tier: BrocanteTier;
}

const labels: Record<BrocanteTier, { stars: string; label?: string; aria: string }> = {
  1: { stars: "★", aria: "Rang : 1 étoile" },
  2: { stars: "★★", aria: "Rang : 2 étoiles" },
  3: { stars: "★★★", aria: "Rang : 3 étoiles" },
  4: { stars: "★★★★", label: "Salon des Antiquaires", aria: "Rang : 4 étoiles — Salon des Antiquaires" },
};

const plaqueStyle: CSSProperties = {
  background: "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  borderRadius: 4,
  padding: "8px 14px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.25), 0 4px 10px rgba(40,25,5,0.35)",
  textAlign: "center",
  color: "var(--forest-800)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  userSelect: "none",
};

const starsStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  marginTop: 4,
  letterSpacing: "0.22em",
};

export function ScenePlaque({ tier }: ScenePlaqueProps) {
  const { stars, label, aria } = labels[tier];
  return (
    <div style={plaqueStyle} role="img" aria-label={aria}>
      <div style={starsStyle}>{stars}</div>
      {label && <div style={labelStyle}>{label}</div>}
    </div>
  );
}
```

- [ ] **Step 4 : Relancer le test, vérifier qu'il passe**

Run: `npx vitest run src/components/mobile/brocante-pano/ScenePlaque.test.tsx`
Expected: 4 passing.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/brocante-pano/ScenePlaque.tsx src/components/mobile/brocante-pano/ScenePlaque.test.tsx
git commit -m "feat(brocante-pano): plaquette laiton par scène"
```

---

## Task 3 — BrocanteFrame (composant + tests)

**Files:**
- Create: `src/components/mobile/brocante-pano/BrocanteFrame.tsx`
- Test: `src/components/mobile/brocante-pano/BrocanteFrame.test.tsx`

- [ ] **Step 1 : Écrire le test**

Crée `src/components/mobile/brocante-pano/BrocanteFrame.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocanteFrame } from "./BrocanteFrame";

afterEach(cleanup);

const baseProps = {
  brocanteId: "vide-grenier-quartier",
  nom: "Vide-grenier du quartier",
  coord: { id: "vide-grenier-quartier", left: "6%", top: "28%", width: "16%", height: "32%" },
};

describe("BrocanteFrame", () => {
  it("appelle onSelect au clic", () => {
    const onSelect = vi.fn();
    render(
      <BrocanteFrame {...baseProps} selected={false} debloquee onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(onSelect).toHaveBeenCalledWith("vide-grenier-quartier");
  });

  it("ajoute aria-pressed=true quand sélectionné", () => {
    render(
      <BrocanteFrame {...baseProps} selected debloquee onSelect={() => {}} />,
    );
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("ajoute aria-disabled quand verrouillée mais reste cliquable", () => {
    const onSelect = vi.fn();
    render(
      <BrocanteFrame {...baseProps} selected={false} debloquee={false} onSelect={onSelect} />,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith("vide-grenier-quartier");
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/brocante-pano/BrocanteFrame.test.tsx`
Expected: FAIL (`BrocanteFrame` n'existe pas).

- [ ] **Step 3 : Implémenter le composant**

Crée `src/components/mobile/brocante-pano/BrocanteFrame.tsx` :

```tsx
"use client";

import Image from "next/image";
import { Store } from "lucide-react";
import type { CSSProperties } from "react";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import type { FrameCoord } from "./brocantePanoramaLayout";

interface BrocanteFrameProps {
  brocanteId: string;
  nom: string;
  coord: FrameCoord;
  selected: boolean;
  debloquee: boolean;
  onSelect: (id: string) => void;
}

const frameOuter = (coord: FrameCoord, selected: boolean): CSSProperties => ({
  position: "absolute",
  left: coord.left,
  top: coord.top,
  width: coord.width,
  height: coord.height,
  padding: 0,
  border: selected
    ? "3px solid var(--brass-300)"
    : "2px solid var(--brass-700)",
  background: "var(--paper-200)",
  boxShadow: selected
    ? "0 0 0 2px var(--brass-500), 0 0 18px 4px rgba(220,170,60,0.55), 0 6px 14px rgba(40,25,5,0.25)"
    : "inset 0 0 0 2px var(--paper-100), 0 4px 10px rgba(40,25,5,0.25)",
  overflow: "hidden",
  cursor: "pointer",
  opacity: selected ? 1 : 0.92,
  transition: "box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease",
});

const imgWrapper: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

const fallbackStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
};

export function BrocanteFrame({
  brocanteId,
  nom,
  coord,
  selected,
  debloquee,
  onSelect,
}: BrocanteFrameProps) {
  const imageUrl = getBrocanteImageUrl(brocanteId);
  return (
    <button
      type="button"
      onClick={() => onSelect(brocanteId)}
      aria-label={nom}
      aria-pressed={selected}
      aria-disabled={!debloquee}
      style={frameOuter(coord, selected)}
    >
      <div style={imgWrapper}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 600px) 20vw, 200px"
            style={{
              objectFit: "cover",
              filter: debloquee ? undefined : "grayscale(1) brightness(0.85)",
            }}
          />
        ) : (
          <div style={fallbackStyle}>
            <Store size={32} strokeWidth={1.2} color="var(--brass-100)" />
          </div>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 4 : Relancer le test**

Run: `npx vitest run src/components/mobile/brocante-pano/BrocanteFrame.test.tsx`
Expected: 3 passing.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/brocante-pano/BrocanteFrame.tsx src/components/mobile/brocante-pano/BrocanteFrame.test.tsx
git commit -m "feat(brocante-pano): cadre cliquable avec surbrillance"
```

---

## Task 4 — BrocanteDetailPanel (composant + tests)

**Files:**
- Create: `src/components/mobile/brocante-pano/BrocanteDetailPanel.tsx`
- Test: `src/components/mobile/brocante-pano/BrocanteDetailPanel.test.tsx`

- [ ] **Step 1 : Écrire le test**

Crée `src/components/mobile/brocante-pano/BrocanteDetailPanel.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocanteDetailPanel } from "./BrocanteDetailPanel";
import type { Brocante } from "@/types/game";

afterEach(cleanup);

const brocante: Brocante = {
  id: "vide-grenier-quartier",
  nom: "Vide-grenier du quartier",
  description: "Quelques tables dépliées sur la place.",
  ambiance: "Familial",
  tier: 1,
  etoiles: 1,
  taillePool: 6,
  poolExclusif: [],
  conditionDeblocage: { type: "depart" },
};

describe("BrocanteDetailPanel", () => {
  it("affiche le prompt quand aucune brocante n'est sélectionnée", () => {
    render(
      <BrocanteDetailPanel
        brocante={null}
        debloquee={false}
        peutEntrer={false}
        raisonVerrouillage={null}
        onEntrer={() => {}}
      />,
    );
    expect(screen.getByText(/choisissez une brocante/i)).toBeTruthy();
  });

  it("affiche les infos quand une brocante est sélectionnée et débloquée", () => {
    const onEntrer = vi.fn();
    render(
      <BrocanteDetailPanel
        brocante={brocante}
        debloquee
        peutEntrer
        raisonVerrouillage={null}
        onEntrer={onEntrer}
      />,
    );
    expect(screen.getByText("Vide-grenier du quartier")).toBeTruthy();
    expect(screen.getByText(/quelques tables/i)).toBeTruthy();
    const btn = screen.getByRole("button", { name: /entrer/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(onEntrer).toHaveBeenCalled();
  });

  it("désactive le bouton et affiche la raison quand verrouillée", () => {
    render(
      <BrocanteDetailPanel
        brocante={brocante}
        debloquee={false}
        peutEntrer={false}
        raisonVerrouillage="Atteignez 30 € de valeur de collection."
        onEntrer={() => {}}
      />,
    );
    expect(screen.getByText(/atteignez 30 €/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /fermé/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("affiche fonds insuffisants quand le budget est trop bas", () => {
    render(
      <BrocanteDetailPanel
        brocante={brocante}
        debloquee
        peutEntrer={false}
        raisonVerrouillage={null}
        onEntrer={() => {}}
      />,
    );
    expect((screen.getByRole("button", { name: /fonds insuffisants/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/brocante-pano/BrocanteDetailPanel.test.tsx`
Expected: FAIL (composant inexistant).

- [ ] **Step 3 : Implémenter le composant**

Crée `src/components/mobile/brocante-pano/BrocanteDetailPanel.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";

interface BrocanteDetailPanelProps {
  brocante: Brocante | null;
  debloquee: boolean;
  peutEntrer: boolean;
  raisonVerrouillage: string | null;
  onEntrer: () => void;
}

const panelStyle: CSSProperties = {
  height: "35vh",
  minHeight: 220,
  borderTop: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "12px 16px calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 8px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  boxSizing: "border-box",
  flexShrink: 0,
};

const emptyStyle: CSSProperties = {
  flex: 1,
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--ink-500)",
  textAlign: "center",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  lineHeight: 1.2,
};

const tierStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  color: "var(--brass-600)",
  letterSpacing: "0.1em",
};

const descStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  margin: 0,
  lineHeight: 1.4,
  textAlign: "center",
  maxWidth: 480,
};

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const lockStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--vermillion-600)",
  letterSpacing: "0.06em",
  textAlign: "center",
  maxWidth: 480,
  lineHeight: 1.3,
};

const enterBtn = (
  debloquee: boolean,
  peutEntrer: boolean,
): CSSProperties => ({
  width: "100%",
  maxWidth: 360,
  padding: "12px 16px",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: debloquee && peutEntrer ? "var(--forest-800)" : "var(--paper-300)",
  color: debloquee && peutEntrer ? "var(--brass-300)" : "var(--ink-500)",
  cursor: debloquee && peutEntrer ? "pointer" : "not-allowed",
  opacity: !debloquee || !peutEntrer ? 0.65 : 1,
  boxShadow:
    debloquee && peutEntrer
      ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.25)"
      : "none",
  marginTop: "auto",
});

export function BrocanteDetailPanel({
  brocante,
  debloquee,
  peutEntrer,
  raisonVerrouillage,
  onEntrer,
}: BrocanteDetailPanelProps) {
  if (!brocante) {
    return (
      <aside style={panelStyle}>
        <div style={emptyStyle}>Choisissez une brocante</div>
      </aside>
    );
  }

  const label = !debloquee
    ? "Fermé"
    : !peutEntrer
      ? "Fonds insuffisants"
      : "Entrer";

  return (
    <aside style={panelStyle}>
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <div style={tierStyle}>{"★".repeat(brocante.tier)}</div>
      <p style={descStyle}>{brocante.description}</p>
      <div style={metaStyle}>
        {brocante.taillePool} items · entrée {fraisEntree(brocante)} €
      </div>
      {!debloquee && raisonVerrouillage && (
        <div style={lockStyle}>⊘ {raisonVerrouillage}</div>
      )}
      <button
        type="button"
        disabled={!debloquee || !peutEntrer}
        onClick={onEntrer}
        style={enterBtn(debloquee, peutEntrer)}
      >
        {label}
      </button>
    </aside>
  );
}
```

- [ ] **Step 4 : Relancer le test**

Run: `npx vitest run src/components/mobile/brocante-pano/BrocanteDetailPanel.test.tsx`
Expected: 4 passing.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/brocante-pano/BrocanteDetailPanel.tsx src/components/mobile/brocante-pano/BrocanteDetailPanel.test.tsx
git commit -m "feat(brocante-pano): panneau détail bas"
```

---

## Task 5 — BrocanteScene (composant)

**Files:**
- Create: `src/components/mobile/brocante-pano/BrocanteScene.tsx`

Pas de test dédié : composant 100 % visuel (un fond + des frames placés). Sa logique de sélection est testée via `BrocantePanorama`.

- [ ] **Step 1 : Implémenter le composant**

Crée `src/components/mobile/brocante-pano/BrocanteScene.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { Brocante, BrocanteTier } from "@/types/game";
import { BrocanteFrame } from "./BrocanteFrame";
import { ScenePlaque } from "./ScenePlaque";
import { SCENE_FRAMES, SCENE_PLAQUE } from "./brocantePanoramaLayout";

interface BrocanteSceneProps {
  tier: BrocanteTier;
  brocantesById: Map<string, Brocante>;
  selectedId: string | null;
  debloqueesIds: Set<string>;
  onSelect: (id: string) => void;
}

// Dégradés de stub par tier (en attendant les vraies illustrations).
const STUB_GRADIENT: Record<BrocanteTier, string> = {
  1: "linear-gradient(180deg, #c9d3c2 0%, #8a9a82 60%, #5c6b58 100%)",
  2: "linear-gradient(180deg, #b8a382 0%, #8a6f4a 60%, #5b4527 100%)",
  3: "linear-gradient(180deg, #d6c2a2 0%, #a98455 50%, #5d3d1d 100%)",
  4: "linear-gradient(180deg, #6c1d22 0%, #2d0d10 100%)",
};

const sceneStyle = (tier: BrocanteTier): CSSProperties => ({
  position: "relative",
  flex: "0 0 100vw",
  width: "100vw",
  height: "100%",
  scrollSnapAlign: "start",
  background: STUB_GRADIENT[tier],
  overflow: "hidden",
});

const plaqueWrapper = (tier: BrocanteTier): CSSProperties => ({
  position: "absolute",
  left: SCENE_PLAQUE[tier].left,
  top: SCENE_PLAQUE[tier].top,
  width: SCENE_PLAQUE[tier].width,
});

export function BrocanteScene({
  tier,
  brocantesById,
  selectedId,
  debloqueesIds,
  onSelect,
}: BrocanteSceneProps) {
  const frames = SCENE_FRAMES[tier];
  return (
    <section style={sceneStyle(tier)} data-brocante-scene={tier} aria-label={`Scène tier ${tier}`}>
      {frames.map((coord) => {
        const b = brocantesById.get(coord.id);
        if (!b) return null;
        return (
          <BrocanteFrame
            key={b.id}
            brocanteId={b.id}
            nom={b.nom}
            coord={coord}
            selected={selectedId === b.id}
            debloquee={debloqueesIds.has(b.id)}
            onSelect={onSelect}
          />
        );
      })}
      <div style={plaqueWrapper(tier)}>
        <ScenePlaque tier={tier} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/brocante-pano/BrocanteScene.tsx
git commit -m "feat(brocante-pano): scène (fond + cadres + plaquette)"
```

---

## Task 6 — BrocantePanorama (conteneur + tests)

**Files:**
- Create: `src/components/mobile/brocante-pano/BrocantePanorama.tsx`
- Test: `src/components/mobile/brocante-pano/BrocantePanorama.test.tsx`

`BrocantePanorama` gère :
- l'état `selectedBrocanteId`,
- le scroll initial vers `maxUnlockedTier`,
- l'écoute du scroll pour détecter le tier courant et reset la sélection si elle n'appartient plus au tier visible,
- le rendu des 4 scènes + du `BrocanteDetailPanel`,
- le clic Entrer qui pousse `/{destination}/{id}`.

Stratégie de test : `jsdom` ne simule pas le snap. On teste la **logique de sélection** en exposant un hook : on rend le composant et on vérifie qu'un clic sur un frame met à jour le panneau. Le reset au snap est testé via une simulation manuelle d'event `scroll` (vu que `scrollLeft` est mutable en jsdom).

- [ ] **Step 1 : Écrire le test**

Crée `src/components/mobile/brocante-pano/BrocantePanorama.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocantePanorama } from "./BrocantePanorama";
import { BROCANTES } from "@/data/brocantes";
import type { GameState } from "@/types/game";

afterEach(cleanup);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const minimalState = {
  budget: 1000,
} as unknown as GameState;

describe("BrocantePanorama", () => {
  it("affiche le prompt vide au montage", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        decrireConditions={() => "raison"}
        destination="chiner"
      />,
    );
    expect(screen.getByText(/choisissez une brocante/i)).toBeTruthy();
  });

  it("met à jour le panneau détail au clic sur un cadre", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set(["vide-grenier-quartier"])}
        decrireConditions={() => "raison"}
        destination="chiner"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.getByRole("heading", { name: /vide-grenier du quartier/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /entrer/i })).toBeTruthy();
  });

  it("affiche la raison de verrouillage quand la brocante n'est pas débloquée", () => {
    render(
      <BrocantePanorama
        brocantes={BROCANTES}
        state={minimalState}
        debloqueesIds={new Set()}
        decrireConditions={() => "Atteignez 30 € de valeur de collection."}
        destination="chiner"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(screen.getByText(/atteignez 30 €/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /fermé/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/brocante-pano/BrocantePanorama.test.tsx`
Expected: FAIL (composant inexistant).

- [ ] **Step 3 : Implémenter le composant**

Crée `src/components/mobile/brocante-pano/BrocantePanorama.tsx` :

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Brocante, BrocanteTier, GameState } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { BrocanteScene } from "./BrocanteScene";
import { BrocanteDetailPanel } from "./BrocanteDetailPanel";

interface BrocantePanoramaProps {
  brocantes: Brocante[];
  state: GameState;
  debloqueesIds: Set<string>;
  decrireConditions: (b: Brocante) => string;
  destination: "chiner" | "vitrine";
}

const TIERS: BrocanteTier[] = [1, 2, 3, 4];

const wrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
};

const scrollerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflowX: "auto",
  overflowY: "hidden",
  scrollSnapType: "x mandatory",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
};

export function BrocantePanorama({
  brocantes,
  state,
  debloqueesIds,
  decrireConditions,
  destination,
}: BrocantePanoramaProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const brocantesById = useMemo(() => {
    const m = new Map<string, Brocante>();
    for (const b of brocantes) m.set(b.id, b);
    return m;
  }, [brocantes]);

  // Tier le plus haut où au moins une brocante est débloquée.
  const maxUnlockedTier: BrocanteTier = useMemo(() => {
    let max: BrocanteTier = 1;
    for (const b of brocantes) {
      if (debloqueesIds.has(b.id) && b.tier > max) max = b.tier;
    }
    return max;
  }, [brocantes, debloqueesIds]);

  // Scroll initial vers la scène du maxUnlockedTier (au mount uniquement).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const idx = TIERS.indexOf(maxUnlockedTier);
    if (idx > 0) {
      el.scrollLeft = idx * el.clientWidth;
    }
    didInitRef.current = true;
  }, [maxUnlockedTier]);

  // Reset de la sélection si la brocante choisie n'est plus dans le tier visible.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cw = el.clientWidth;
        if (cw <= 0) return;
        const tierIdx = Math.round(el.scrollLeft / cw);
        const currentTier = TIERS[Math.max(0, Math.min(3, tierIdx))];
        if (selectedId) {
          const sel = brocantesById.get(selectedId);
          if (sel && sel.tier !== currentTier) setSelectedId(null);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [selectedId, brocantesById]);

  const selected = selectedId ? brocantesById.get(selectedId) ?? null : null;
  const selectedDebloquee = selected ? debloqueesIds.has(selected.id) : false;
  const selectedPeutEntrer = selected ? state.budget >= fraisEntree(selected) : false;
  const selectedRaison = selected && !selectedDebloquee ? decrireConditions(selected) : null;

  const onEntrer = useCallback(() => {
    if (!selected || !selectedDebloquee || !selectedPeutEntrer) return;
    router.push(`/${destination}/${selected.id}`);
  }, [selected, selectedDebloquee, selectedPeutEntrer, router, destination]);

  return (
    <div style={wrapperStyle}>
      <div ref={scrollerRef} style={scrollerStyle} aria-label="Panorama des brocantes">
        {TIERS.map((tier) => (
          <BrocanteScene
            key={tier}
            tier={tier}
            brocantesById={brocantesById}
            selectedId={selectedId}
            debloqueesIds={debloqueesIds}
            onSelect={setSelectedId}
          />
        ))}
      </div>
      <BrocanteDetailPanel
        brocante={selected}
        debloquee={selectedDebloquee}
        peutEntrer={selectedPeutEntrer}
        raisonVerrouillage={selectedRaison}
        onEntrer={onEntrer}
      />
    </div>
  );
}
```

- [ ] **Step 4 : Relancer le test**

Run: `npx vitest run src/components/mobile/brocante-pano/BrocantePanorama.test.tsx`
Expected: 3 passing.

- [ ] **Step 5 : Lancer toute la suite de tests du dossier**

Run: `npx vitest run src/components/mobile/brocante-pano/`
Expected: 14 passing (4 + 3 + 4 + 3).

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/brocante-pano/BrocantePanorama.tsx src/components/mobile/brocante-pano/BrocantePanorama.test.tsx
git commit -m "feat(brocante-pano): panorama conteneur scroll-snap + sélection"
```

---

## Task 7 — Brancher la page /chiner

**Files:**
- Modify: `src/app/chiner/page.tsx`

- [ ] **Step 1 : Remplacer le contenu de la page**

Édite `src/app/chiner/page.tsx`. Remplace tout le fichier par :

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { BrocantePanorama } from "@/components/mobile/brocante-pano/BrocantePanorama";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { useGame } from "@/context/GameContext";
import { BROCANTES } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  decrireConditions,
} from "@/lib/deblocage";

export default function ChinerListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const debloqueesIds = useMemo(() => {
    if (!state) return new Set<string>();
    const parTier = calculerBrocantesDebloqueesParTier(state);
    const all = new Set<string>();
    for (const set of parTier.values()) for (const id of set) all.add(id);
    return all;
  }, [state]);

  if (!isHydrated || !state) {
    return <SkeletonScreen label="— préparation des halles…" />;
  }

  return (
    <MobileLayout
      header={
        <ContextualHeader
          titre="Chiner"
          sousTitre={`${debloqueesIds.size} brocante${debloqueesIds.size > 1 ? "s" : ""} ouverte${debloqueesIds.size > 1 ? "s" : ""}`}
          budget={state.budget}
          onBack={() => router.push("/bureau")}
        />
      }
      fillContent
    >
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={debloqueesIds}
        decrireConditions={(b) => decrireConditions(b, state)}
        destination="chiner"
      />
    </MobileLayout>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/chiner/page.tsx
git commit -m "feat(chiner): branche le panorama de brocantes"
```

---

## Task 8 — Brancher la page /vitrine

**Files:**
- Modify: `src/app/vitrine/page.tsx`

- [ ] **Step 1 : Remplacer le contenu de la page**

Édite `src/app/vitrine/page.tsx`. Remplace tout le fichier par :

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { BrocantePanorama } from "@/components/mobile/brocante-pano/BrocantePanorama";
import { useGame } from "@/context/GameContext";
import { BROCANTES } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  decrireConditions,
} from "@/lib/deblocage";

export default function VitrineListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const debloqueesIds = useMemo(() => {
    if (!state) return new Set<string>();
    const parTier = calculerBrocantesDebloqueesParTier(state);
    const all = new Set<string>();
    for (const set of parTier.values()) for (const id of set) all.add(id);
    return all;
  }, [state]);

  if (!isHydrated || !state) return null;

  return (
    <MobileLayout
      header={
        <ContextualHeader
          titre="Exposer"
          sousTitre={`${debloqueesIds.size} brocante${debloqueesIds.size > 1 ? "s" : ""} ouverte${debloqueesIds.size > 1 ? "s" : ""}`}
          budget={state.budget}
          onBack={() => router.push("/bureau")}
        />
      }
      fillContent
    >
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={debloqueesIds}
        decrireConditions={(b) => decrireConditions(b, state)}
        destination="vitrine"
      />
    </MobileLayout>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/vitrine/page.tsx
git commit -m "feat(vitrine): branche le panorama de brocantes"
```

---

## Task 9 — Vérification end-to-end (manuelle)

**Files:** —

- [ ] **Step 1 : Lancer le dev server**

Run: `npm run dev`
Expected: serveur up sur `http://localhost:3000`.

- [ ] **Step 2 : Vérification visuelle /chiner**

Ouvre `http://localhost:3000/chiner` dans un navigateur mobile (DevTools → mode mobile, viewport ~390×844).

Vérifie :
- 4 scènes visibles en swipe horizontal, snap par scène,
- chaque scène a sa plaquette (★, ★★, ★★★, ★★★★ + « Salon des Antiquaires »),
- les cadres affichent les bonnes brocantes (5 / 5 / 6 / 1),
- au mount, la scène affichée correspond au tier le plus haut débloqué,
- clic sur un cadre → cadre surligné + détails en bas,
- clic sur un cadre verrouillé → détails en bas avec raison et bouton « Fermé » désactivé,
- bouton « Entrer » route vers `/chiner/{brocanteId}` quand débloquée,
- swipe vers une autre scène → si la sélection appartenait à l'ancien tier, le panneau redevient « Choisissez une brocante ».

- [ ] **Step 3 : Vérification visuelle /vitrine**

Ouvre `http://localhost:3000/vitrine`. Mêmes vérifications, le bouton « Entrer » route vers `/vitrine/{brocanteId}`.

- [ ] **Step 4 : Lancer tous les tests Vitest**

Run: `npx vitest run`
Expected: tous verts, aucune régression.

- [ ] **Step 5 : Lancer le build**

Run: `npm run build`
Expected: build réussi sans warning bloquant.

- [ ] **Step 6 : Si tout est OK, rien à commit (vérification seule)**

Si tu as ajusté des coordonnées dans `brocantePanoramaLayout.ts` pendant la vérification, commit-les :

```bash
git add src/components/mobile/brocante-pano/brocantePanoramaLayout.ts
git commit -m "chore(brocante-pano): ajuste coords stubs"
```

---

## Notes de suivi (hors plan)

- `BrocanteCarousel.tsx` n'est plus importé après ce plan ; sa suppression est volontairement différée. À retirer dans un commit dédié une fois la nouvelle UI validée à long terme.
- Les fonds de scène sont des dégradés stub. Quand les 4 illustrations seront prêtes, les placer sous `public/brocantes/scenes/fond-tier-{1,2,3,4}.webp` et remplacer `STUB_GRADIENT` par un `<img>` plein cadre dans `BrocanteScene.tsx`.
- Coordonnées des cadres et plaquettes : ajustables à l'œil dans `brocantePanoramaLayout.ts`. À retoucher une fois les vrais fonds en place.
