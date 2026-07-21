# Cartes postales illustrées du grand-père — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les cartes postales d'épilogue arrivent tous les 10 jours et s'affichent comme de vraies cartes postales recto (illustration) / verso (texte + timbre dessiné en code), avec flip 3D au tap.

**Architecture:** Les données (`src/data/cartesPostales.ts`) gagnent `illustration`/`cachet`/`couleurTimbre` + un lookup `cartePostaleParId`. Un nouveau composant `CartePostaleView` rend la carte recto/verso ; `CourrierSheet` le substitue au rendu lettre quand l'id du courrier correspond à une carte postale. Aucune migration de save : tout est résolu à l'affichage par id.

**Tech Stack:** Next.js/React (styles inline `CSSProperties`, pattern du repo), vitest + @testing-library/react (`// @vitest-environment jsdom` pour les composants), i18n maison (`DictionnaireUI = DeepStrings<typeof fr>` → toute clé ajoutée à `fr.ts` DOIT l'être aussi dans `en.ts` et `es.ts` sous peine d'erreur de type).

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-21-cartes-postales-illustrees-design.md`.
- Intervalle épilogue : **10 jours** exactement (`INTERVALLE_CARTES_POSTALES = 10`).
- Images : chemins `/cartes-postales/{venise,lisbonne,marrakech,kyoto,sans-timbre}.webp`, format paysage 3:2 (1200×800). Les fichiers n'existent pas encore : le rendu DOIT avoir un fallback (pas d'icône cassée).
- La carte 5 (`carte_postale_5`, « Carte sans timbre ») n'a **ni timbre ni cachet**.
- Règle d'or du repo : jamais de chaîne localisée en sauvegarde — titre/corps restent résolus à l'affichage via `titreCourrier`/`corpsCourrier` (i18n contenu existant, déjà traduit EN/ES).
- Lint : `npm run lint` est cassé (Next 16) → utiliser `npx eslint src`.
- Commits en français, style Conventional Commits du repo (`feat(...)`, `fix(...)`).

---

### Task 1: Données — intervalle 10 j, champs illustration/cachet, lookup

**Files:**
- Modify: `src/data/cartesPostales.ts`
- Create: `src/data/cartesPostales.test.ts`
- Modify: `src/lib/quetes/tick.test.ts:32-41` (jours attendus codés sur l'ancien intervalle 6)

**Interfaces:**
- Consumes: rien (feuille de données).
- Produces (utilisé par les Tasks 2-3) :
  - `interface CartePostale { id: string; titre: string; corps: string[]; illustration: string; cachet?: string; couleurTimbre?: string }`
  - `export const CARTES_POSTALES: ReadonlyArray<CartePostale>`
  - `export const INTERVALLE_CARTES_POSTALES = 10`
  - `export function cartePostaleParId(id: string): CartePostale | undefined`

- [ ] **Step 1: Écrire les tests de données (échec attendu)**

Créer `src/data/cartesPostales.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  CARTES_POSTALES,
  INTERVALLE_CARTES_POSTALES,
  cartePostaleParId,
} from "./cartesPostales";

describe("cartesPostales (données)", () => {
  it("intervalle de 10 jours entre deux cartes", () => {
    expect(INTERVALLE_CARTES_POSTALES).toBe(10);
  });

  it("chaque carte a une illustration webp sous /cartes-postales/", () => {
    for (const c of CARTES_POSTALES) {
      expect(c.illustration).toMatch(/^\/cartes-postales\/[a-z-]+\.webp$/);
    }
  });

  it("cartes 1-4 : cachet + couleur de timbre ; carte 5 : ni l'un ni l'autre", () => {
    for (const c of CARTES_POSTALES.slice(0, 4)) {
      expect(c.cachet, c.id).toBeTruthy();
      expect(c.couleurTimbre, c.id).toMatch(/^#/);
    }
    const carte5 = CARTES_POSTALES[4];
    expect(carte5.id).toBe("carte_postale_5");
    expect(carte5.cachet).toBeUndefined();
    expect(carte5.couleurTimbre).toBeUndefined();
  });

  it("cartePostaleParId retrouve une carte, undefined sinon", () => {
    expect(cartePostaleParId("carte_postale_3")?.titre).toBe("Carte de Marrakech");
    expect(cartePostaleParId("lettre_maman_debut")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/cartesPostales.test.ts`
Expected: FAIL (`cartePostaleParId` n'existe pas, intervalle = 6).

- [ ] **Step 3: Implémenter les données**

Dans `src/data/cartesPostales.ts`, remplacer l'en-tête et ajouter les champs (le `titre` et le `corps` de chaque carte restent strictement inchangés) :

```ts
/** Épilogue : cartes postales du grand-père en voyage, injectées une à une
 *  après la remise des clés (trame_ch12). Contenu léger — garde le
 *  personnage vivant. Affichées recto (illustration) / verso (texte + timbre)
 *  par CartePostaleView ; assets recto : paysage 3:2, 1200×800, webp. */
export const INTERVALLE_CARTES_POSTALES = 10; // jours de jeu entre deux cartes

export interface CartePostale {
  id: string;
  titre: string;
  corps: string[];
  /** Chemin public de l'illustration recto (fallback si le fichier manque). */
  illustration: string;
  /** Nom de ville du cachet postal ; absent = pas de timbre (carte 5). */
  cachet?: string;
  /** Teinte de la vignette du timbre dessiné en code. */
  couleurTimbre?: string;
}

export const CARTES_POSTALES: ReadonlyArray<CartePostale> = [
```

puis, carte par carte, ajouter après `titre` :

| carte | champs ajoutés |
|---|---|
| carte_postale_1 | `illustration: "/cartes-postales/venise.webp", cachet: "VENEZIA", couleurTimbre: "#5a7d9a",` |
| carte_postale_2 | `illustration: "/cartes-postales/lisbonne.webp", cachet: "LISBOA", couleurTimbre: "#c98a3d",` |
| carte_postale_3 | `illustration: "/cartes-postales/marrakech.webp", cachet: "MARRAKECH", couleurTimbre: "#b5533c",` |
| carte_postale_4 | `illustration: "/cartes-postales/kyoto.webp", cachet: "KYOTO", couleurTimbre: "#7d9a6a",` |
| carte_postale_5 | `illustration: "/cartes-postales/sans-timbre.webp",` (pas de cachet ni couleur) |

et en fin de fichier :

```ts
/** Lookup par id de courrier (rendu carte postale dans CourrierSheet). */
export function cartePostaleParId(id: string): CartePostale | undefined {
  return CARTES_POSTALES.find((c) => c.id === id);
}
```

- [ ] **Step 4: Adapter les tests du tick (jours J+6 → J+10)**

Dans `src/lib/quetes/tick.test.ts`, remplacer les deux tests dépendant de l'ancien intervalle :

```ts
  it("rien avant l'intervalle", () => {
    const t = tickQuetes(finTrame(10), 19);
    expect(t.courriers.some((c) => c.id.startsWith("carte_postale"))).toBe(false);
  });
  it("injecte la carte 1 à J+10, non lue, expéditeur grand-père", () => {
    const t = tickQuetes(finTrame(10), 20);
    const carte = t.courriers.find((c) => c.id === "carte_postale_1");
    expect(carte).toBeDefined();
    expect(carte?.lu).toBe(false);
  });
```

Le test « une seule carte par tick … s'arrête à 5 » boucle jusqu'au jour 60 : avec l'intervalle 10, les cartes tombent aux jours 10/20/30/40/50 — il passe sans modification.

- [ ] **Step 5: Vérifier que tout passe**

Run: `npx vitest run src/data/cartesPostales.test.ts src/lib/quetes/tick.test.ts src/lib/i18n/contenu/courrier.test.ts`
Expected: PASS (le test i18n contenu garantit que les traductions EN/ES des cartes existent toujours).

- [ ] **Step 6: Commit**

```bash
git add src/data/cartesPostales.ts src/data/cartesPostales.test.ts src/lib/quetes/tick.test.ts
git commit -m "feat(epilogue): cartes postales tous les 10 jours + données illustration/cachet"
```

---

### Task 2: Composant CartePostaleView (flip 3D, timbre SVG, fallback) + clés i18n

**Files:**
- Create: `src/components/mobile/qg/sheets/CartePostaleView.tsx`
- Create: `src/components/mobile/qg/sheets/CartePostaleView.test.tsx`
- Modify: `src/lib/i18n/ui/fr.ts` (section `sheets`, vers la ligne 195), `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts` (même section)

**Interfaces:**
- Consumes: `cartePostaleParId`/`CartePostale` (Task 1), `titreCourrier(c, locale)`, `corpsCourrier(c, locale)` de `@/lib/i18n/contenu`, `useLangue()` de `@/lib/i18n/LangueContext` (fonctionne sans provider, défaut fr), `creerCartePostale(index, jour)` de `@/lib/courrier` (fixtures de test).
- Produces: `export function CartePostaleView({ courrier, carte }: { courrier: Courrier; carte: CartePostale }): JSX.Element` — élément racine `role="button"` avec `aria-pressed` reflétant la face verso ; `data-testid="carte-postale"` sur la racine, `data-testid="timbre"` sur le timbre.

- [ ] **Step 1: Ajouter les clés i18n**

Dans `src/lib/i18n/ui/fr.ts`, section `sheets` (après `compris: "Compris",`) :

```ts
    retournerCarte: "Retourner la carte postale",
    toucherPourRetourner: "Touchez pour retourner",
```

Dans `en.ts`, même position :

```ts
    retournerCarte: "Flip the postcard",
    toucherPourRetourner: "Tap to flip",
```

Dans `es.ts`, même position :

```ts
    retournerCarte: "Girar la postal",
    toucherPourRetourner: "Toca para girar",
```

- [ ] **Step 2: Écrire les tests du composant (échec attendu)**

Créer `src/components/mobile/qg/sheets/CartePostaleView.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartePostaleView } from "./CartePostaleView";
import { CARTES_POSTALES } from "@/data/cartesPostales";
import { creerCartePostale } from "@/lib/courrier";

afterEach(cleanup);

const carte1 = CARTES_POSTALES[0]; // Venise, avec timbre
const carte5 = CARTES_POSTALES[4]; // Carte sans timbre
const courrier1 = creerCartePostale(1, 20);
const courrier5 = creerCartePostale(5, 60);

describe("CartePostaleView", () => {
  it("arrive côté recto : illustration + indice, pas encore retournée", () => {
    render(<CartePostaleView courrier={courrier1} carte={carte1} />);
    const racine = screen.getByTestId("carte-postale");
    expect(racine.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByAltText("Carte de Venise")).toBeTruthy();
    expect(screen.getByText("Touchez pour retourner")).toBeTruthy();
  });

  it("tap → verso (texte + timbre VENEZIA), second tap → recto", async () => {
    const user = userEvent.setup();
    render(<CartePostaleView courrier={courrier1} carte={carte1} />);
    const racine = screen.getByTestId("carte-postale");
    await user.click(racine);
    expect(racine.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("timbre")).toBeTruthy();
    expect(screen.getByText("VENEZIA")).toBeTruthy();
    // Le corps (traduit à l'affichage) est présent dans le DOM.
    expect(screen.getByText(/lagune/)).toBeTruthy();
    await user.click(racine);
    expect(racine.getAttribute("aria-pressed")).toBe("false");
  });

  it("carte 5 : aucun timbre au verso", async () => {
    const user = userEvent.setup();
    render(<CartePostaleView courrier={courrier5} carte={carte5} />);
    await user.click(screen.getByTestId("carte-postale"));
    expect(screen.queryByTestId("timbre")).toBeNull();
  });

  it("image manquante → fallback avec le titre, sans balise img", () => {
    render(<CartePostaleView courrier={courrier1} carte={carte1} />);
    fireEvent.error(screen.getByAltText("Carte de Venise"));
    expect(screen.queryByAltText("Carte de Venise")).toBeNull();
    expect(screen.getByText("Carte de Venise")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/qg/sheets/CartePostaleView.test.tsx`
Expected: FAIL (« CartePostaleView » introuvable).

- [ ] **Step 4: Implémenter le composant**

Créer `src/components/mobile/qg/sheets/CartePostaleView.tsx` :

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import type { CartePostale } from "@/data/cartesPostales";
import { useLangue } from "@/lib/i18n/LangueContext";
import { corpsCourrier, titreCourrier } from "@/lib/i18n/contenu";
import type { Courrier } from "@/types/game";

interface CartePostaleViewProps {
  courrier: Courrier;
  carte: CartePostale;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const conteneur: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  aspectRatio: "3 / 2",
  perspective: 1200,
  margin: "0 0 18px",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const interne = (verso: boolean): CSSProperties => ({
  position: "relative",
  width: "100%",
  height: "100%",
  transformStyle: "preserve-3d",
  transition: "transform 600ms cubic-bezier(0.4, 0.1, 0.2, 1)",
  transform: verso ? "rotateY(180deg)" : "rotateY(0deg)",
});

const face: CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  borderRadius: 6,
  overflow: "hidden",
  // Liseré blanc cassé de carte postale.
  border: "6px solid #f8f3e6",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  boxShadow: "inset 0 0 28px rgba(120, 90, 40, 0.12), 0 6px 16px rgba(0,0,0,0.3)",
};

const faceVerso: CSSProperties = {
  ...face,
  transform: "rotateY(180deg)",
  display: "flex",
  flexDirection: "column",
  padding: "8px 14px 10px",
  overflowY: "auto",
};

const imgRecto: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const fallbackRecto: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-display)",
  fontSize: 17,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7a6335",
  textAlign: "center",
  padding: 12,
};

const indice: CSSProperties = {
  position: "absolute",
  right: 10,
  bottom: 8,
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(20,15,5,0.55)",
  color: "#f1e4c0",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  pointerEvents: "none",
};

const enTeteVerso: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  minHeight: 66,
  marginBottom: 4,
};

const titreVerso: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  margin: "6px 0 0",
  color: "var(--ink-700)",
  borderBottom: "1px dotted #a88f5a",
  paddingBottom: 4,
  alignSelf: "flex-end",
};

const corpsVerso: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 14.5,
  lineHeight: 1.32,
  color: "#3a2f1e",
  margin: "0 0 7px",
  textAlign: "left",
};

// Dernier paragraphe = signature du grand-père, penchée comme les lettres.
const corpsSignature: CSSProperties = {
  ...corpsVerso,
  textAlign: "right",
  fontSize: 16,
  color: "#2a2008",
  transform: "rotate(-2deg)",
  transformOrigin: "right center",
  margin: 0,
};

/* ------------------------------------------------------------------ */
/* Timbre dessiné en code : bord dentelé, vignette, cachet postal.     */
/* ------------------------------------------------------------------ */

const ENCRE_CACHET = "#3c3358";

function Timbre({ teinte, cachet }: { teinte: string; cachet: string }) {
  return (
    <div data-testid="timbre" style={{ position: "relative", flexShrink: 0, marginLeft: 40 }}>
      <svg width={54} height={64} viewBox="0 0 54 64" aria-hidden>
        <rect x={1} y={1} width={52} height={62} fill="#fdfaf2" stroke="#d8cdae" strokeWidth={1} />
        {/* Perforations : cercles couleur papier sur le pourtour. */}
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <circle cx={3 + i * 8} cy={1} r={2.3} fill="#f4e9cd" />
            <circle cx={3 + i * 8} cy={63} r={2.3} fill="#f4e9cd" />
          </g>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <circle cx={1} cy={3.5 + i * 8} r={2.3} fill="#f4e9cd" />
            <circle cx={53} cy={3.5 + i * 8} r={2.3} fill="#f4e9cd" />
          </g>
        ))}
        {/* Vignette colorée : soleil + vague, façon timbre de voyage. */}
        <rect x={8} y={7} width={38} height={44} fill={teinte} />
        <circle cx={27} cy={22} r={7} fill="rgba(255,252,240,0.85)" />
        <path
          d="M12 41 q 7.5 -7 15 0 t 15 0"
          stroke="rgba(255,252,240,0.75)"
          strokeWidth={2.2}
          fill="none"
        />
        <text
          x={27}
          y={59.5}
          textAnchor="middle"
          fontSize={6}
          fill="#7a6335"
          fontFamily="var(--font-display)"
          letterSpacing={1.5}
        >
          POSTES
        </text>
      </svg>
      {/* Cachet postal : cercles + nom de ville + oblitération ondulée. */}
      <svg
        width={70}
        height={64}
        viewBox="0 0 70 64"
        aria-hidden
        style={{ position: "absolute", left: -40, top: 4, opacity: 0.62 }}
      >
        <g stroke={ENCRE_CACHET} fill="none" transform="rotate(-12 35 32)">
          <circle cx={35} cy={32} r={20} strokeWidth={1.6} />
          <circle cx={35} cy={32} r={14.5} strokeWidth={0.8} />
          <path d="M0 24 q 6 -4 12 0" strokeWidth={1.3} />
          <path d="M-2 31 q 6 -4 12 0" strokeWidth={1.3} />
          <path d="M0 38 q 6 -4 12 0" strokeWidth={1.3} />
        </g>
        <text
          x={35}
          y={30.5}
          textAnchor="middle"
          fontSize={7}
          fill={ENCRE_CACHET}
          fontFamily="var(--font-display)"
          letterSpacing={1}
          transform="rotate(-12 35 32)"
        >
          {cachet}
        </text>
        <text
          x={35}
          y={40}
          textAnchor="middle"
          fontSize={5.5}
          fill={ENCRE_CACHET}
          fontFamily="var(--font-display)"
          transform="rotate(-12 35 32)"
        >
          POSTES
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function CartePostaleView({ courrier, carte }: CartePostaleViewProps) {
  const { d, locale } = useLangue();
  const [verso, setVerso] = useState(false);
  const [imgKo, setImgKo] = useState(false);

  const titre = titreCourrier(courrier, locale);
  const corps = corpsCourrier(courrier, locale);
  const basculer = () => setVerso((v) => !v);

  return (
    <div
      data-testid="carte-postale"
      role="button"
      tabIndex={0}
      aria-pressed={verso}
      aria-label={d.sheets.retournerCarte}
      style={conteneur}
      onClick={basculer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          basculer();
        }
      }}
    >
      <div style={interne(verso)}>
        <div style={face}>
          {imgKo ? (
            <div style={fallbackRecto}>{titre}</div>
          ) : (
            <img
              src={carte.illustration}
              alt={titre}
              style={imgRecto}
              onError={() => setImgKo(true)}
            />
          )}
          {!verso && <div style={indice}>{d.sheets.toucherPourRetourner}</div>}
        </div>
        <div style={faceVerso}>
          <div style={enTeteVerso}>
            <h3 style={titreVerso}>{titre}</h3>
            {carte.cachet && (
              <Timbre teinte={carte.couleurTimbre ?? "#8a7443"} cachet={carte.cachet} />
            )}
          </div>
          {corps.map((para, i) => (
            <p key={i} style={i === corps.length - 1 ? corpsSignature : corpsVerso}>
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Note : pas de `<button>` natif (le verso peut scroller si le texte déborde du ratio 3:2 ; un bouton contenant une zone scrollable est fragile) — d'où `role="button"` + gestion clavier. `next/image` n'est pas utilisé, conformément au reste du repo (`<img>` partout côté QG).

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run src/components/mobile/qg/sheets/CartePostaleView.test.tsx src/lib/i18n/ui/ui.test.ts`
Expected: PASS (le test ui garantit la parité des clés FR/EN/ES).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/qg/sheets/CartePostaleView.tsx \
        src/components/mobile/qg/sheets/CartePostaleView.test.tsx \
        src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts
git commit -m "feat(epilogue): CartePostaleView — recto illustré, flip 3D, timbre et cachet dessinés"
```

---

### Task 3: Branchement dans CourrierSheet + vérification globale

**Files:**
- Modify: `src/components/mobile/qg/sheets/CourrierSheet.tsx:332-337` (bloc `<article style={lettreCard}>`) + imports
- Create: `src/components/mobile/qg/sheets/CourrierSheet.test.tsx`

**Interfaces:**
- Consumes: `CartePostaleView` (Task 2), `cartePostaleParId` (Task 1), `creerCartePostale`/`creerLettreMamanDebut` de `@/lib/courrier` (tests).
- Produces: rien de nouveau (comportement : un courrier dont l'id est une carte postale se rend en carte, tout le reste inchangé — bouton « Compris », `onMarquerLu`).

- [ ] **Step 1: Écrire le test d'intégration (échec attendu)**

Créer `src/components/mobile/qg/sheets/CourrierSheet.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CourrierSheet } from "./CourrierSheet";
import { creerCartePostale, creerLettreMamanDebut } from "@/lib/courrier";

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn(), playCash: vi.fn() }),
}));

afterEach(cleanup);

describe("CourrierSheet — cartes postales", () => {
  it("rend une carte postale (recto + bouton Compris) au lieu de la lettre", () => {
    render(
      <CourrierSheet
        open
        onClose={vi.fn()}
        courriers={[creerCartePostale(1, 20)]}
        onMarquerLu={vi.fn()}
      />,
    );
    expect(screen.getByTestId("carte-postale")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compris" })).toBeTruthy();
  });

  it("une lettre ordinaire garde son rendu papier classique", () => {
    render(
      <CourrierSheet
        open
        onClose={vi.fn()}
        courriers={[creerLettreMamanDebut(1)]}
        onMarquerLu={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("carte-postale")).toBeNull();
    expect(screen.getByText("Pour bien démarrer")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/qg/sheets/CourrierSheet.test.tsx`
Expected: FAIL sur le premier test (`carte-postale` introuvable : la carte se rend encore comme une lettre).

- [ ] **Step 3: Brancher le rendu carte postale**

Dans `src/components/mobile/qg/sheets/CourrierSheet.tsx`, ajouter aux imports :

```tsx
import { cartePostaleParId } from "@/data/cartesPostales";
import { CartePostaleView } from "./CartePostaleView";
```

Dans le corps du composant, après `const estMission = ...` :

```tsx
  const carte =
    courant.payload.type === "lettre" ? cartePostaleParId(courant.id) : undefined;
```

Et remplacer le bloc `<article>` :

```tsx
          {carte ? (
            <CartePostaleView courrier={courant} carte={carte} />
          ) : (
            <article style={lettreCard}>
              {courant.payload.type === "mission"
                ? renderMission(courant, d, tr, locale)
                : renderLettre(courant, locale)}
            </article>
          )}
```

Le bouton bas ne change pas : une carte postale est une lettre sans récompense → libellé « Compris », `playClick`, `onMarquerLu` identiques.

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/components/mobile/qg/sheets/`
Expected: PASS (CartePostaleView + CourrierSheet).

- [ ] **Step 5: Vérification globale (suite complète + lint)**

Run: `npx vitest run` puis `npx eslint src`
Expected: suite entière verte (~1100 tests), eslint sans erreur.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/qg/sheets/CourrierSheet.tsx \
        src/components/mobile/qg/sheets/CourrierSheet.test.tsx
git commit -m "feat(epilogue): CourrierSheet rend les cartes postales en recto/verso"
```

---

## Rappel de fin de chantier (hors code)

Guillaume génère les 5 illustrations — **paysage 3:2, 1200×800, webp** — et les dépose dans `public/cartes-postales/` : `venise.webp`, `lisbonne.webp`, `marrakech.webp`, `kyoto.webp`, `sans-timbre.webp`. D'ici là, le recto affiche le fallback (titre sur fond papier). Vérif device ensuite (flip 3D WebKit/Tauri, `backface-visibility`).
