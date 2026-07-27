# Amélioration du véhicule depuis le garage — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au joueur un moyen d'acheter le véhicule suivant, via un panneau de concession posé dans le garage de l'écran de chargement du coffre.

**Architecture:** Un panneau présentationnel (`PanneauGarage`) est injecté en slot dans `CoffreCanvas` ; il ouvre une fiche (`ConcessionSheet`) bâtie sur le `BottomSheet` existant ; `CoffreChargement` orchestre et appelle le `onUpgrade` **déjà câblé mais jamais invoqué**. Aucune donnée, route, clé de sauvegarde ni migration nouvelle.

**Tech Stack:** Next 16 (export statique), React 19, TypeScript, Vitest + @testing-library/react (jsdom), styles inline avec variables CSS du thème.

**Spec :** `docs/superpowers/specs/2026-07-26-amelioration-vehicule-garage-design.md`

## Global Constraints

- **Aucune chaîne localisée en sauvegarde.** Seul `niveauCamion` (un nombre) est persisté. Les noms de véhicules se résolvent à l'affichage via `nomCamion(camion, locale)`.
- **Quatre locales obligatoires** : toute clé ajoutée à `src/lib/i18n/ui/fr.ts` doit l'être à l'identique dans `en.ts`, `es.ts`, `el.ts`. `tsc` garantit la présence des clés ; `src/lib/i18n/ui/ui.test.ts` garantit que les jetons `{x}` sont identiques d'une locale à l'autre.
- **Format monétaire** : `{prix} €` en postfixe dans les quatre locales (convention existante, cf. `vendrePrix`).
- **`npm run lint` est cassé sous Next 16.** Utiliser `npx eslint src` (alias `npm run lint:hooks`).
- **Pas de scroll ni de virtualisation basés sur `window`** — le body est verrouillé en WebView.
- **Prix et capacités inchangés** : 200 € / 500 €, 9 / 16 / 25 places. Ne pas rééquilibrer.
- Commentaires et identifiants en français, comme le reste du code.

## Structure des fichiers

| Fichier | Rôle | Action |
|---|---|---|
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | 5 clés dans la section `vente` | Modifier |
| `src/lib/releveVehicule.ts` | Minutage pur de la relève (testable sans rAF) | Créer |
| `src/lib/releveVehicule.test.ts` | Tests du minutage | Créer |
| `src/components/vente/PanneauGarage.tsx` | Pancarte présentationnelle | Créer |
| `src/components/vente/PanneauGarage.test.tsx` | Tests | Créer |
| `src/components/vente/ConcessionSheet.tsx` | Fiche du véhicule suivant | Créer |
| `src/components/vente/ConcessionSheet.test.tsx` | Tests | Créer |
| `src/components/vente/CoffreCanvas.tsx` | Accepte un slot `panneau` | Modifier |
| `src/components/vente/CoffreChargement.tsx` | Orchestration + relève | Modifier |
| `src/components/vente/CoffreChargement.test.tsx` | Tests d'orchestration | Créer |

---

### Task 1 : les cinq clés de traduction

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts:301`
- Modify: `src/lib/i18n/ui/en.ts:298`
- Modify: `src/lib/i18n/ui/es.ts:298`
- Modify: `src/lib/i18n/ui/el.ts:303`
- Test: `src/lib/i18n/ui/ui.test.ts` (existant, aucune modification)

**Interfaces:**
- Consumes: rien.
- Produces: `d.vente.concession`, `d.vente.placesCompte` (`{n}`), `d.vente.acheterVehicule` (`{prix}`), `d.vente.manqueSomme` (`{somme}`), `d.vente.vehiculeAcquis` (`{nom}`, `{n}`).

- [ ] **Step 1 : ajouter les clés en français**

Dans `src/lib/i18n/ui/fr.ts`, insérer juste après la ligne `etapeChoixBrocante: "3 — Choix de la brocante",` :

```ts
    concession: "Concession",
    placesCompte: "{n} places",
    acheterVehicule: "Acheter · {prix} €",
    manqueSomme: "Il vous manque {somme} €",
    vehiculeAcquis: "{nom} — {n} places",
```

- [ ] **Step 2 : vérifier que TypeScript réclame les trois autres locales**

Run: `npx tsc --noEmit`
Expected: FAIL — trois erreurs, une par locale, du type `Property 'concession' is missing in type ... but required in type 'DeepStrings<...>'` sur `en.ts`, `es.ts`, `el.ts`. C'est le filet `DeepStrings` de `src/lib/i18n/ui/index.ts` qui joue son rôle.

- [ ] **Step 3 : ajouter les trois traductions**

Dans `src/lib/i18n/ui/en.ts`, après `etapeChoixBrocante: "3 — Choose the flea market",` :

```ts
    concession: "Dealership",
    placesCompte: "{n} slots",
    acheterVehicule: "Buy · {prix} €",
    manqueSomme: "You are {somme} € short",
    vehiculeAcquis: "{nom} — {n} slots",
```

Dans `src/lib/i18n/ui/es.ts`, après `etapeChoixBrocante: "3 — Elegir el mercadillo",` :

```ts
    concession: "Concesionario",
    placesCompte: "{n} plazas",
    acheterVehicule: "Comprar · {prix} €",
    manqueSomme: "Te faltan {somme} €",
    vehiculeAcquis: "{nom} — {n} plazas",
```

Dans `src/lib/i18n/ui/el.ts`, après `etapeChoixBrocante: "3 — Επιλογή παζαριού",` :

```ts
    concession: "Αντιπροσωπεία",
    placesCompte: "{n} θέσεις",
    acheterVehicule: "Αγορά · {prix} €",
    manqueSomme: "Σου λείπουν {somme} €",
    vehiculeAcquis: "{nom} — {n} θέσεις",
```

- [ ] **Step 4 : vérifier la compilation et la parité des jetons**

Run: `npx tsc --noEmit && npx vitest run src/lib/i18n/ui/ui.test.ts`
Expected: tsc silencieux, et le test `parité des placeholders {x}` PASS. S'il échoue, un `{n}` ou `{prix}` a été oublié ou renommé dans une traduction.

- [ ] **Step 5 : commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "i18n(garage): libellés de la concession de véhicules en 4 langues"
```

---

### Task 2 : le panneau de concession

**Files:**
- Create: `src/components/vente/PanneauGarage.tsx`
- Test: `src/components/vente/PanneauGarage.test.tsx`

**Interfaces:**
- Consumes: `d.vente.concession`, `d.vente.placesCompte` (Task 1) ; `CamionConfig` et `getProchainCamion` de `src/data/camion.ts` ; `nomCamion(c, locale)` de `src/lib/i18n/contenu`.
- Produces:

```ts
export interface PanneauGarageProps {
  prochain: CamionConfig | null;
  peutPayer: boolean;
  onOuvrir: () => void;
}
export function PanneauGarage(p: PanneauGarageProps): JSX.Element | null;
```

**Note pour l'implémenteur :** les composants se rendent en français hors provider — `LangueContext` a une valeur par défaut FR (`src/lib/i18n/LangueContext.tsx:29`). Les tests n'ont donc besoin d'aucun wrapper.

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `src/components/vente/PanneauGarage.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PanneauGarage } from "./PanneauGarage";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const BREAK = CAMIONS[1]; // Break — 16 places, 200 €

describe("PanneauGarage", () => {
  it("affiche le surtitre, le nom, la capacité et le prix du palier suivant", () => {
    render(<PanneauGarage prochain={BREAK} peutPayer onOuvrir={() => {}} />);
    expect(screen.getByText("Concession")).toBeTruthy();
    expect(screen.getByText("Break")).toBeTruthy();
    expect(screen.getByText("16 places · 200 €")).toBeTruthy();
  });

  it("ne rend rien quand il n'y a plus de palier", () => {
    const { container } = render(
      <PanneauGarage prochain={null} peutPayer onOuvrir={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("grisé sans budget, mais toujours cliquable", () => {
    const onOuvrir = vi.fn();
    render(
      <PanneauGarage prochain={BREAK} peutPayer={false} onOuvrir={onOuvrir} />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(false);
    expect(Number(bouton.style.opacity)).toBeLessThan(1);
    fireEvent.click(bouton);
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it("pleine opacité quand le budget suffit", () => {
    render(<PanneauGarage prochain={BREAK} peutPayer onOuvrir={() => {}} />);
    expect(Number(screen.getByRole("button").style.opacity)).toBe(1);
  });
});
```

- [ ] **Step 2 : lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/vente/PanneauGarage.test.tsx`
Expected: FAIL avec `Failed to resolve import "./PanneauGarage"`.

- [ ] **Step 3 : écrire le composant**

Créer `src/components/vente/PanneauGarage.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { CamionConfig } from "@/data/camion";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomCamion } from "@/lib/i18n/contenu";

export interface PanneauGarageProps {
  /** Palier suivant, ou `null` si le niveau max est atteint. */
  prochain: CamionConfig | null;
  /**
   * Le budget couvre-t-il le prix ? Grise le panneau SANS le désactiver :
   * pouvoir consulter ce qu'on ne peut pas encore s'offrir entretient l'envie,
   * là où un bouton mort n'expliquerait rien.
   */
  peutPayer: boolean;
  onOuvrir: () => void;
}

const panneauStyle = (peutPayer: boolean): CSSProperties => ({
  // Posé sur le mur du garage : le fond est en portrait et le véhicule est
  // centré vers garageY 0,63-0,70, la bande haute est donc libre.
  position: "absolute",
  left: "6%",
  top: "5%",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 1,
  padding: "7px 11px",
  border: "1px solid var(--brass-500)",
  borderRadius: 3,
  background: "var(--paper-100)",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
  rotate: "-2.5deg",
  cursor: "pointer",
  opacity: peutPayer ? 1 : 0.62,
  filter: peutPayer ? undefined : "grayscale(0.7)",
  lineHeight: 1.15,
});

const surtitreStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

const detailStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "var(--ink-500)",
};

/**
 * Pancarte de concession accrochée au mur du garage, sur l'écran de
 * chargement du coffre. Purement présentationnelle : elle ne connaît ni le
 * GameState, ni le budget brut, ni l'achat lui-même.
 */
export function PanneauGarage(p: PanneauGarageProps) {
  const { d, tr, locale } = useLangue();
  if (!p.prochain) return null;

  const places = tr(d.vente.placesCompte, { n: p.prochain.capacitePlaces });
  const prix = p.prochain.prixUpgradeVersCeNiveau ?? 0;

  return (
    <button
      type="button"
      onClick={p.onOuvrir}
      style={panneauStyle(p.peutPayer)}
      aria-label={tr(d.vente.acheterVehicule, { prix })}
    >
      <span style={surtitreStyle}>{d.vente.concession}</span>
      <span style={nomStyle}>{nomCamion(p.prochain, locale)}</span>
      <span style={detailStyle}>
        {places} · {prix} €
      </span>
    </button>
  );
}
```

- [ ] **Step 4 : lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/vente/PanneauGarage.test.tsx`
Expected: PASS, 4 tests.

Si le test « pleine opacité » échoue parce que `style.opacity` vaut `""`, c'est que React n'a pas sérialisé l'opacité — vérifier que `opacity: peutPayer ? 1 : 0.62` est bien présent dans les deux branches et non `undefined`.

- [ ] **Step 5 : commit**

```bash
git add src/components/vente/PanneauGarage.tsx src/components/vente/PanneauGarage.test.tsx
git commit -m "feat(garage): panneau de concession posé sur le mur du garage"
```

---

### Task 3 : la fiche du véhicule suivant

**Files:**
- Create: `src/components/vente/ConcessionSheet.tsx`
- Test: `src/components/vente/ConcessionSheet.test.tsx`

**Interfaces:**
- Consumes: `d.vente.acheterVehicule`, `d.vente.manqueSomme`, `d.vente.placesCompte` (Task 1) ; `BottomSheet` de `@/components/mobile/BottomSheet` ; `getCoffreAssets` de `@/lib/coffreAssets`.
- Produces:

```ts
export interface ConcessionSheetProps {
  open: boolean;
  onClose: () => void;
  actuel: CamionConfig;
  prochain: CamionConfig;
  budget: number;
  onAcheter: () => void;
}
export function ConcessionSheet(p: ConcessionSheetProps): JSX.Element;
```

**Notes pour l'implémenteur :**
- `bottomOffset` est **indispensable** : le scrim du `BottomSheet` est en `z-index: 40` et la barre d'actions fixe de `CoffreChargement` en `z-index: 50`. Sans lui, la sheet passe sous la barre. La valeur à passer est `"calc(var(--mobile-tabbar-h) + var(--safe-bottom))"`, la hauteur exacte de cette barre.
- L'image du véhicule vient de `getCoffreAssets(prochain.visuelId).ferme` — les 12 assets sont déjà dans `public/coffre/`, rien à générer.
- Le lint interdit `<img>` brut : ajouter `// eslint-disable-next-line @next/next/no-img-element` juste au-dessus, comme le fait déjà `CoffreChargement.tsx:319`.

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `src/components/vente/ConcessionSheet.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConcessionSheet } from "./ConcessionSheet";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const ROGERS = CAMIONS[0]; // 9 places
const BREAK = CAMIONS[1]; // 16 places, 200 €

function poser(budget: number, onAcheter = vi.fn()) {
  render(
    <ConcessionSheet
      open
      onClose={() => {}}
      actuel={ROGERS}
      prochain={BREAK}
      budget={budget}
      onAcheter={onAcheter}
    />,
  );
  return onAcheter;
}

describe("ConcessionSheet", () => {
  it("montre le comparatif de capacité et le gain", () => {
    poser(500);
    expect(screen.getByText("9 places")).toBeTruthy();
    expect(screen.getByText("16 places")).toBeTruthy();
    expect(screen.getByText("+7 places")).toBeTruthy();
  });

  it("au budget exact : bouton actif, achat transmis", () => {
    const onAcheter = poser(200);
    const bouton = screen.getByRole("button", { name: "Acheter · 200 €" });
    expect(bouton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(bouton);
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("sous le prix : bouton bloqué et somme manquante annoncée", () => {
    const onAcheter = poser(160);
    const bouton = screen.getByRole("button", { name: "Acheter · 200 €" });
    expect(bouton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Il vous manque 40 €")).toBeTruthy();
    fireEvent.click(bouton);
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("fermée : ne rend pas son contenu", () => {
    render(
      <ConcessionSheet
        open={false}
        onClose={() => {}}
        actuel={ROGERS}
        prochain={BREAK}
        budget={500}
        onAcheter={() => {}}
      />,
    );
    expect(screen.queryByText("+7 places")).toBeNull();
  });
});
```

- [ ] **Step 2 : lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/vente/ConcessionSheet.test.tsx`
Expected: FAIL avec `Failed to resolve import "./ConcessionSheet"`.

- [ ] **Step 3 : écrire le composant**

Créer `src/components/vente/ConcessionSheet.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { CamionConfig } from "@/data/camion";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomCamion } from "@/lib/i18n/contenu";

export interface ConcessionSheetProps {
  open: boolean;
  onClose: () => void;
  actuel: CamionConfig;
  prochain: CamionConfig;
  budget: number;
  onAcheter: () => void;
}

const corpsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const vignetteStyle: CSSProperties = {
  width: "78%",
  maxWidth: 300,
  aspectRatio: "4 / 3",
  objectFit: "contain",
};

const comparatifStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-500)",
};

const gainStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  letterSpacing: "0.08em",
  color: "var(--forest-800)",
};

const boutonStyle = (peut: boolean): CSSProperties => ({
  width: "100%",
  minHeight: 46,
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: peut ? "var(--forest-800)" : "var(--paper-200)",
  color: peut ? "var(--brass-300)" : "var(--ink-300)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: peut ? "pointer" : "not-allowed",
  opacity: peut ? 1 : 0.5,
});

const manqueStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--vermillion-600)",
  margin: 0,
};

/**
 * Fiche du véhicule suivant : visuel, comparatif de capacité, prix et achat.
 * Décide seule de l'état de son bouton à partir du budget reçu.
 */
export function ConcessionSheet(p: ConcessionSheetProps) {
  const { d, tr, locale } = useLangue();

  const prix = p.prochain.prixUpgradeVersCeNiveau ?? 0;
  const peut = p.budget >= prix;
  const manque = prix - p.budget;
  const gain = p.prochain.capacitePlaces - p.actuel.capacitePlaces;
  const visuel = getCoffreAssets(p.prochain.visuelId)?.ferme ?? null;

  return (
    <BottomSheet
      open={p.open}
      onClose={p.onClose}
      title={nomCamion(p.prochain, locale)}
      // Sans bottomOffset, la sheet (z-index 40) passerait sous la barre
      // d'actions fixe de l'écran de chargement (z-index 50).
      bottomOffset="calc(var(--mobile-tabbar-h) + var(--safe-bottom))"
    >
      <div style={corpsStyle}>
        {visuel && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visuel} alt="" draggable={false} style={vignetteStyle} />
        )}

        <div style={comparatifStyle}>
          <span>{tr(d.vente.placesCompte, { n: p.actuel.capacitePlaces })}</span>
          <span aria-hidden>→</span>
          <span>{tr(d.vente.placesCompte, { n: p.prochain.capacitePlaces })}</span>
        </div>

        <span style={gainStyle}>+{tr(d.vente.placesCompte, { n: gain })}</span>

        <button
          type="button"
          disabled={!peut}
          onClick={p.onAcheter}
          style={boutonStyle(peut)}
        >
          {tr(d.vente.acheterVehicule, { prix })}
        </button>

        {!peut && <p style={manqueStyle}>{tr(d.vente.manqueSomme, { somme: manque })}</p>}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 4 : lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/vente/ConcessionSheet.test.tsx`
Expected: PASS, 4 tests.

Si le test « fermée » échoue, vérifier que `BottomSheet` renvoie bien `null` quand `open` est faux plutôt que de rendre un conteneur masqué.

- [ ] **Step 5 : commit**

```bash
git add src/components/vente/ConcessionSheet.tsx src/components/vente/ConcessionSheet.test.tsx
git commit -m "feat(garage): fiche du véhicule suivant en bottom sheet"
```

---

### Task 4 : câblage dans le garage

**Files:**
- Modify: `src/components/vente/CoffreCanvas.tsx` (props + JSX)
- Modify: `src/components/vente/CoffreChargement.tsx` (état + composition)
- Test: `src/components/vente/CoffreChargement.test.tsx` (créer)

**Interfaces:**
- Consumes: `PanneauGarage` (Task 2), `ConcessionSheet` (Task 3), `getProchainCamion(niveau)` de `src/data/camion.ts`, la prop `onUpgrade` déjà déclarée en `CoffreChargement.tsx:52` et déjà fournie par `vitrine/prep/page.tsx:154` et `vitrine/[brocanteId]/ClientPage.tsx:159`.
- Produces: `CoffreCanvas` gagne une prop optionnelle `panneau?: ReactNode` rendue à l'intérieur du conteneur du garage.

À ce stade l'achat est instantané (pas encore de relève animée) : c'est la Task 5 qui l'habille.

- [ ] **Step 1 : ouvrir un slot dans `CoffreCanvas`**

Dans `src/components/vente/CoffreCanvas.tsx`, ajouter l'import du type :

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
```

Ajouter la prop à l'interface `Props`, après `conteneurRef` :

```tsx
  /**
   * Slot rendu dans le conteneur du garage, au-dessus du fond et hors du
   * conteneur du camion (donc non soumis à l'opacité ni aux gestes de celui-ci).
   * Sert au panneau de concession.
   */
  panneau?: ReactNode;
```

L'ajouter à la déstructuration des paramètres, après `conteneurRef,` :

```tsx
  panneau,
```

Puis, dans le JSX, l'insérer **juste après l'ouverture** du `<div>` extérieur (celui qui porte `backgroundImage: "url('/coffre/fond-garage.webp')"`), avant le commentaire `{/* Conteneur du camion … */}` :

```tsx
      {panneau}
```

- [ ] **Step 2 : écrire le test d'orchestration qui échoue**

Créer `src/components/vente/CoffreChargement.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CoffreChargement } from "./CoffreChargement";

afterEach(cleanup);

beforeEach(() => {
  // jsdom ne décode pas les images : les masques du coffre et des objets
  // retombent sur leurs fallbacks, ce qui suffit à cette suite.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

function poser(over: Partial<Parameters<typeof CoffreChargement>[0]> = {}) {
  const props = {
    niveauCamion: 1 as const,
    budget: 500,
    stock: [],
    coffre: [],
    onAjouter: vi.fn(),
    onMove: vi.fn(),
    onRotate: vi.fn(),
    onRetirer: vi.fn(),
    onUpgrade: vi.fn(),
    onValider: vi.fn(),
    onAnnuler: vi.fn(),
    ...over,
  };
  render(<CoffreChargement {...props} />);
  return props;
}

describe("CoffreChargement — concession", () => {
  it("affiche le panneau du palier suivant au niveau 1", () => {
    poser();
    expect(screen.getByText("Concession")).toBeTruthy();
    expect(screen.getByText("Break")).toBeTruthy();
  });

  it("aucun panneau au niveau max", () => {
    poser({ niveauCamion: 3 });
    expect(screen.queryByText("Concession")).toBeNull();
  });

  it("aucun panneau pendant le tutoriel de préparation d'étal", () => {
    poser({ tuto: true });
    expect(screen.queryByText("Concession")).toBeNull();
  });

  it("le tap ouvre la fiche, l'achat appelle onUpgrade avec le palier suivant", () => {
    const props = poser();
    fireEvent.click(screen.getByText("Concession"));
    fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
    expect(props.onUpgrade).toHaveBeenCalledTimes(1);
    expect(props.onUpgrade).toHaveBeenCalledWith(2);
  });

  it("budget insuffisant : la fiche s'ouvre mais l'achat reste bloqué", () => {
    const props = poser({ budget: 40 });
    fireEvent.click(screen.getByText("Concession"));
    expect(screen.getByText("Il vous manque 160 €")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
    expect(props.onUpgrade).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3 : lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/components/vente/CoffreChargement.test.tsx`
Expected: FAIL — `Unable to find an element with the text: Concession`, le panneau n'étant pas encore composé.

- [ ] **Step 4 : composer dans `CoffreChargement`**

Dans `src/components/vente/CoffreChargement.tsx`, ajouter aux imports :

```tsx
import { getCamion, getProchainCamion, getScaleCoffre } from "@/data/camion";
import { PanneauGarage } from "./PanneauGarage";
import { ConcessionSheet } from "./ConcessionSheet";
```

(la ligne `getCamion, getScaleCoffre` existe déjà — n'ajouter que `getProchainCamion` dedans.)

Après la ligne `const [closing, setClosing] = useState(false);`, ajouter l'état de la fiche :

```tsx
  const [sheetOuverte, setSheetOuverte] = useState(false);
```

Après `const peutValider = …`, calculer le palier suivant :

```tsx
  const prochainCamion = getProchainCamion(p.niveauCamion);
  const prixProchain = prochainCamion?.prixUpgradeVersCeNiveau ?? 0;
  // Le panneau se retire dans trois cas : plus de palier, voiture en train de
  // partir, et tutoriel en cours — la main de guidage désigne déjà le
  // carrousel puis Valider, un second appel du regard brouillerait la leçon.
  const panneauVisible = prochainCamion !== null && !closing && p.tuto !== true;
```

Passer le slot à `CoffreCanvas` (ajouter la prop à l'appel existant, après `conteneurRef={conteneurCoffreRef}`) :

```tsx
        panneau={
          panneauVisible ? (
            <PanneauGarage
              prochain={prochainCamion}
              peutPayer={p.budget >= prixProchain}
              onOuvrir={() => setSheetOuverte(true)}
            />
          ) : null
        }
```

Enfin, rendre la fiche juste avant le `{/* Spacer pour libérer la zone occupée par la barre fixed du bas */}` :

```tsx
      {prochainCamion && (
        <ConcessionSheet
          open={sheetOuverte}
          onClose={() => setSheetOuverte(false)}
          actuel={camion}
          prochain={prochainCamion}
          budget={p.budget}
          onAcheter={() => {
            setSheetOuverte(false);
            p.onUpgrade(prochainCamion.niveau);
          }}
        />
      )}
```

- [ ] **Step 5 : lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/components/vente/CoffreChargement.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6 : vérifier la suite complète et le lint**

Run: `npx vitest run && npx eslint src`
Expected: toute la suite verte, eslint sans erreur. En particulier `src/components/vente/CoffreCanvas.test.tsx` s'il existe, et les tests de `coffre.ts`.

- [ ] **Step 7 : commit**

```bash
git add src/components/vente/CoffreCanvas.tsx src/components/vente/CoffreChargement.tsx src/components/vente/CoffreChargement.test.tsx
git commit -m "feat(garage): le panneau de concession déclenche l'achat du véhicule suivant"
```

---

### Task 5 : la relève du véhicule

**Files:**
- Create: `src/lib/releveVehicule.ts`
- Test: `src/lib/releveVehicule.test.ts`
- Modify: `src/components/vente/CoffreChargement.tsx`

**Interfaces:**
- Consumes: `d.vente.vehiculeAcquis`, `d.vente.placesCompte` (Task 1) ; `audioManager.playDepartVoiture(durationMs)` de `@/lib/audio/audioManager` ; l'état `truckOpacity` déjà présent dans `CoffreChargement`.
- Produces:

```ts
export const RELEVE_FONDU_SORTIE_MS = 300;
export const RELEVE_PAUSE_MS = 100;
export const RELEVE_FONDU_ENTREE_MS = 400;
export const RELEVE_BASCULE_MS: number;  // = RELEVE_FONDU_SORTIE_MS
export const RELEVE_DUREE_MS: number;    // = 800
export function opaciteReleve(t: number): number;
```

**Point de correction important :** l'échange de véhicule doit se faire **quand l'opacité est déjà à zéro**, sinon `onUpgrade` bascule l'état immédiatement et c'est le *nouveau* véhicule qu'on voit disparaître en fondu. `onUpgrade` est donc appelé à `RELEVE_BASCULE_MS`, pas au clic. Le clic ne fait que fermer la fiche et lancer la séquence.

**Sur le choix de tester une fonction pure :** le tween lui-même passe par `requestAnimationFrame` et `performance.now()`, pénibles et fragiles à piloter en jsdom. Le minutage — la seule partie où une erreur est plausible — sort donc dans une fonction pure testée à part, à l'image de ce qui existe déjà pour `audioCurves.ts`. Le câblage rAF suit le motif de l'animation de départ déjà en place dans ce fichier.

- [ ] **Step 1 : écrire le test du minutage**

Créer `src/lib/releveVehicule.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  RELEVE_BASCULE_MS,
  RELEVE_DUREE_MS,
  RELEVE_FONDU_SORTIE_MS,
  RELEVE_PAUSE_MS,
  opaciteReleve,
} from "./releveVehicule";

describe("opaciteReleve", () => {
  it("part de l'opacité pleine et finit pleine", () => {
    expect(opaciteReleve(0)).toBe(1);
    expect(opaciteReleve(RELEVE_DUREE_MS)).toBe(1);
    expect(opaciteReleve(RELEVE_DUREE_MS + 5000)).toBe(1);
  });

  it("s'éteint sur le fondu de sortie", () => {
    expect(opaciteReleve(RELEVE_FONDU_SORTIE_MS / 2)).toBeCloseTo(0.5, 5);
    expect(opaciteReleve(RELEVE_FONDU_SORTIE_MS)).toBe(0);
  });

  it("reste à zéro pendant toute la pause — c'est là que le véhicule change", () => {
    expect(opaciteReleve(RELEVE_BASCULE_MS)).toBe(0);
    expect(opaciteReleve(RELEVE_BASCULE_MS + RELEVE_PAUSE_MS / 2)).toBe(0);
  });

  it("remonte sur le fondu d'entrée", () => {
    const debutEntree = RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS;
    expect(opaciteReleve(debutEntree)).toBe(0);
    expect(opaciteReleve((debutEntree + RELEVE_DUREE_MS) / 2)).toBeCloseTo(0.5, 5);
  });

  it("la bascule tombe pile à la fin du fondu de sortie", () => {
    expect(RELEVE_BASCULE_MS).toBe(RELEVE_FONDU_SORTIE_MS);
    expect(RELEVE_DUREE_MS).toBe(800);
  });

  it("ne sort jamais de [0, 1]", () => {
    for (let t = -100; t <= RELEVE_DUREE_MS + 100; t += 7) {
      const o = opaciteReleve(t);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2 : lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/releveVehicule.test.ts`
Expected: FAIL avec `Failed to resolve import "./releveVehicule"`.

- [ ] **Step 3 : écrire le module de minutage**

Créer `src/lib/releveVehicule.ts` :

```ts
/**
 * Minutage de la « relève » du véhicule : l'ancien s'efface, l'échange se fait
 * à l'abri derrière une opacité nulle, le nouveau réapparaît.
 *
 * Isolé du composant parce que c'est la seule partie où une erreur est
 * plausible, et que la piloter à travers requestAnimationFrame en jsdom
 * coûterait plus qu'elle ne rapporte.
 */

export const RELEVE_FONDU_SORTIE_MS = 300;
export const RELEVE_PAUSE_MS = 100;
export const RELEVE_FONDU_ENTREE_MS = 400;

/**
 * Instant où l'état bascule sur le nouveau palier. DOIT tomber quand l'opacité
 * est nulle : plus tôt, et c'est le nouveau véhicule qu'on verrait s'effacer.
 */
export const RELEVE_BASCULE_MS = RELEVE_FONDU_SORTIE_MS;

export const RELEVE_DUREE_MS =
  RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS + RELEVE_FONDU_ENTREE_MS;

/** Opacité du véhicule à `t` millisecondes du début de la séquence. */
export function opaciteReleve(t: number): number {
  if (t <= 0) return 1;
  if (t < RELEVE_FONDU_SORTIE_MS) return 1 - t / RELEVE_FONDU_SORTIE_MS;

  const finPause = RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS;
  if (t < finPause) return 0;
  if (t >= RELEVE_DUREE_MS) return 1;

  return (t - finPause) / RELEVE_FONDU_ENTREE_MS;
}
```

- [ ] **Step 4 : lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/releveVehicule.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5 : brancher la séquence dans `CoffreChargement`**

Dans `src/components/vente/CoffreChargement.tsx`, ajouter aux imports :

```tsx
import {
  RELEVE_BASCULE_MS,
  RELEVE_DUREE_MS,
  RELEVE_FONDU_ENTREE_MS,
  RELEVE_FONDU_SORTIE_MS,
  RELEVE_PAUSE_MS,
  opaciteReleve,
} from "@/lib/releveVehicule";
```

Ce fichier importe aujourd'hui `useEffect, useMemo, useRef, useState` : y ajouter `useCallback`. `NiveauCamion` y est déjà importé depuis `@/types/game`, rien à faire de ce côté. Ajouter aussi :

```tsx
import { nomCamion } from "@/lib/i18n/contenu";
```

et remplacer la ligne `const { d } = useLangue();` par :

```tsx
  const { d, tr, locale } = useLangue();
```

Ajouter l'état et les références, près de `const [sheetOuverte, setSheetOuverte] = useState(false);` :

```tsx
  const [bandeauReleve, setBandeauReleve] = useState<string | null>(null);
  const releveRafRef = useRef<number | null>(null);
  const releveTimersRef = useRef<number[]>([]);
```

Ajouter les deux fonctions, juste avant `const handleValider = () => {` :

```tsx
  /** Coupe la séquence en cours et rétablit l'état final. */
  const arreterReleve = useCallback(() => {
    if (releveRafRef.current !== null) {
      cancelAnimationFrame(releveRafRef.current);
      releveRafRef.current = null;
    }
    for (const id of releveTimersRef.current) window.clearTimeout(id);
    releveTimersRef.current = [];
    setTruckOpacity(1);
    setBandeauReleve(null);
  }, []);

  /**
   * Relève du véhicule. `onUpgrade` n'est PAS appelé au clic mais à
   * RELEVE_BASCULE_MS, quand l'opacité est nulle : sinon l'état basculerait
   * tout de suite et c'est le nouveau véhicule qu'on verrait s'effacer.
   */
  const lancerReleve = useCallback(
    (niveauCible: NiveauCamion, nom: string, places: number) => {
      const debut = performance.now();

      releveTimersRef.current.push(
        window.setTimeout(() => p.onUpgrade(niveauCible), RELEVE_BASCULE_MS),
        window.setTimeout(() => {
          setBandeauReleve(tr(d.vente.vehiculeAcquis, { nom, n: places }));
          void audioManager.playDepartVoiture(RELEVE_FONDU_ENTREE_MS);
        }, RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS),
        window.setTimeout(() => setBandeauReleve(null), RELEVE_DUREE_MS + 600),
      );

      const tick = (now: number) => {
        const t = now - debut;
        setTruckOpacity(opaciteReleve(t));
        if (t < RELEVE_DUREE_MS) {
          releveRafRef.current = requestAnimationFrame(tick);
        } else {
          releveRafRef.current = null;
        }
      };
      releveRafRef.current = requestAnimationFrame(tick);
    },
    [p.onUpgrade, d, tr],
  );
```

Étendre le `useEffect` de nettoyage existant (celui qui annule `departRafRef`) pour qu'il appelle aussi `arreterReleve` — sans quoi un démontage en cours de séquence laisse des timers vivants qui appelleront `setState` sur un composant démonté :

```tsx
  useEffect(
    () => () => {
      if (departRafRef.current !== null) {
        cancelAnimationFrame(departRafRef.current);
        departRafRef.current = null;
      }
      arreterReleve();
    },
    [arreterReleve],
  );
```

Remplacer le `onAcheter` de la `ConcessionSheet` posé en Task 4 :

```tsx
          onAcheter={() => {
            setSheetOuverte(false);
            lancerReleve(
              prochainCamion.niveau,
              nomCamion(prochainCamion, locale),
              prochainCamion.capacitePlaces,
            );
          }}
```

`locale` et `nomCamion` sont disponibles grâce aux ajouts d'imports faits en début de cette étape.

Enfin, rendre le bandeau et sa zone de saut, juste après le bloc `<ConcessionSheet …>` :

```tsx
      {bandeauReleve && (
        <div
          onClick={arreterReleve}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Transparent : la relève reste visible, mais un tap n'importe où
            // la saute.
            background: "transparent",
          }}
        >
          <span
            style={{
              padding: "8px 16px",
              background: "rgba(15,30,22,0.85)",
              border: "1px solid var(--brass-500)",
              borderRadius: 3,
              color: "var(--brass-100)",
              fontFamily: "var(--font-display)",
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {bandeauReleve}
          </span>
        </div>
      )}
```

- [ ] **Step 6 : adapter le test d'orchestration au différé**

L'achat n'étant plus synchrone, le test « le tap ouvre la fiche, l'achat appelle onUpgrade » de Task 4 doit avancer le temps. Dans `src/components/vente/CoffreChargement.test.tsx`, remplacer ce test par :

```tsx
  it("le tap ouvre la fiche, l'achat appelle onUpgrade avec le palier suivant", () => {
    vi.useFakeTimers();
    try {
      const props = poser();
      fireEvent.click(screen.getByText("Concession"));
      fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
      // L'échange est différé jusqu'à ce que le véhicule soit invisible.
      expect(props.onUpgrade).not.toHaveBeenCalled();
      vi.advanceTimersByTime(RELEVE_BASCULE_MS);
      expect(props.onUpgrade).toHaveBeenCalledTimes(1);
      expect(props.onUpgrade).toHaveBeenCalledWith(2);
    } finally {
      vi.useRealTimers();
    }
  });
```

et ajouter en tête du fichier :

```tsx
import { RELEVE_BASCULE_MS } from "@/lib/releveVehicule";
```

- [ ] **Step 7 : lancer la suite complète et le lint**

Run: `npx vitest run && npx eslint src && npx tsc --noEmit`
Expected: toute la suite verte, eslint et tsc sans erreur.

Si `npx eslint src` signale une dépendance manquante dans un `useCallback`, l'ajouter plutôt que de désactiver la règle — `npm run lint:hooks` est un filet volontaire de ce dépôt.

- [ ] **Step 8 : commit**

```bash
git add src/lib/releveVehicule.ts src/lib/releveVehicule.test.ts src/components/vente/CoffreChargement.tsx src/components/vente/CoffreChargement.test.tsx
git commit -m "feat(garage): relève du véhicule à l'achat, fondu et coup de moteur"
```

---

## Recette device

Non automatisable — à faire après la Task 5, sur simulateur iOS (`scripts/ios-sim.sh`) puis sur appareil.

- [ ] Le panneau ne recouvre ni le véhicule ni la zone de dépose des objets, sur petit écran comme sur grand. Ajuster `left`/`top` dans `panneauStyle` si besoin.
- [ ] La fiche reste au-dessus de la barre d'actions fixe du bas (le `bottomOffset` fait son office).
- [ ] Le coup de moteur ne coupe pas l'ambiance sonore en cours.
- [ ] La relève ne provoque pas de saut de mise en page dans la WebView.
- [ ] Après un achat avec des objets déjà chargés : ceux qui sortent du nouveau coffre passent en rouge et `Valider` se bloque avec « réorganiser le coffre ». Aucun blocage — les objets restent déplaçables et retirables.
- [ ] Passage en EN / ES / EL : les trois lignes du panneau tiennent sans déborder de la pancarte.
