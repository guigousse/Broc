# Transition iris menu → bureau — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le flash abrupt menu titre → bureau par une transition « iris » (cercle qui se referme sur la porte de la façade → noir + préchargement → cercle qui se rouvre dans le bureau), identique sur les trois chemins : Continuer, lancement d'un slot, nouvelle partie (refonte d'IntroPorte, zoom supprimé).

**Architecture:** Un module `src/lib/transitionIris.ts` (constantes, flag sessionStorage, préchargement d'image, conversion point porte → écran) + un composant `src/components/mobile/IrisTransition.tsx` (fermeture `IrisFermeture`, réouverture `IrisArrivee`). Le flag sessionStorage `broc.transition-iris` fait traverser la navigation (dure via `window.location.href`, ou soft via `router.push` pour la nouvelle partie). Côté arrivée, un script inline « preboot » dans le layout racine couvre l'écran de noir dès le parsing HTML (avant React), relayé par `IrisArrivee` monté dans le layout `(qg)`.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, CSS pur (aucune lib d'animation), vitest + @testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-17-transition-iris-design.md`

## Global Constraints

- **Branche de travail :** `feat/transition-iris`, créée depuis `feat/sp2-trame-mecanique` (le layout (qg) y contient déjà les changements de la trame ; brancher depuis main créerait des conflits).
- **Aucune lib d'animation** : CSS pur (transitions inline), comme tout le reste du code.
- **Identifiants et commentaires en français**, style du code existant.
- **Durées (constantes exportées par `src/lib/transitionIris.ts`)** : fermeture `900` ms, noir minimum `250` ms, ouverture `700` ms, fade reduced-motion `400` ms, timeout préchargement `4000` ms.
- **Clé du flag** : `broc.transition-iris` (sessionStorage). Elle est dupliquée EN DUR dans le script preboot du layout racine (un script inline ne peut pas importer) — garder les deux synchronisées.
- **Couleur du noir** : `var(--forest-900)` partout, sauf le script preboot qui utilise `#0f1f18` en dur (les CSS ne sont pas forcément chargées à cet instant ; 15,31,24 = valeurs vues dans les gradients existants).
- **Lint** : `npm run lint` est CASSÉ (Next 16). Utiliser `npx eslint src` (c'est aussi ce que fait `npm run lint:hooks`).
- **Tests** : `npx vitest run <fichier>` pour un fichier, `npx vitest run` pour tout.
- **Point porte** : le centre de la porte est à 51 % / 66 % de l'image `facade-accueil.webp`. Comme l'`object-position` des `<img>` concernées vaut exactement `51% 66%`, ce point coïncide par définition avec 51 % / 66 % de la BOÎTE rendue de l'élément (`getBoundingClientRect`, transforms de parallaxe comprises) — aucun calcul de cover nécessaire.
- **Technique de l'iris** : trou = div rond transparent, noir = `box-shadow: 0 0 0 300vmax` (sans flou = remplissage bon marché). On anime `width`/`height`, PAS `transform: scale` — le box-shadow est rendu après transform, donc à `scale(0)` l'ombre disparaîtrait avec l'élément et l'écran ne serait jamais noir.

---

### Task 1: Module utilitaire `transitionIris.ts`

**Files:**
- Create: `src/lib/transitionIris.ts`
- Test: `src/lib/transitionIris.test.ts`

**Interfaces:**
- Consumes: rien (module feuille).
- Produces (utilisé par les Tasks 2, 3, 4, 5) :
  - `DUREE_FERMETURE_MS = 900`, `DUREE_OUVERTURE_MS = 700`, `NOIR_MIN_MS = 250`, `TIMEOUT_PRECHARGEMENT_MS = 4000`, `DUREE_FADE_REDUIT_MS = 400` (const number)
  - `PORTE_CX_PCT = 51`, `PORTE_CY_PCT = 66` (const number)
  - `poserFlagIris(): void`, `lireFlagIris(): boolean`, `effacerFlagIris(): void`
  - `pointPorteEcran(el: HTMLElement | null): { x: number; y: number }`
  - `prechargerImage(src: string, timeoutMs?: number): Promise<void>` (ne rejette jamais)
  - `prefersReducedMotion(): boolean`

- [ ] **Step 1: Créer la branche de travail**

```bash
git checkout feat/sp2-trame-mecanique && git checkout -b feat/transition-iris
```

- [ ] **Step 2: Écrire les tests (échouants)**

Créer `src/lib/transitionIris.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PORTE_CX_PCT,
  PORTE_CY_PCT,
  TIMEOUT_PRECHARGEMENT_MS,
  effacerFlagIris,
  lireFlagIris,
  pointPorteEcran,
  poserFlagIris,
  prechargerImage,
} from "./transitionIris";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("flag iris (sessionStorage)", () => {
  it("poser puis lire retourne true ; effacer le fait retomber à false", () => {
    expect(lireFlagIris()).toBe(false);
    poserFlagIris();
    expect(lireFlagIris()).toBe(true);
    effacerFlagIris();
    expect(lireFlagIris()).toBe(false);
  });

  it("lire ne consomme PAS le flag (la consommation est du ressort de l'appelant)", () => {
    poserFlagIris();
    lireFlagIris();
    expect(lireFlagIris()).toBe(true);
  });
});

describe("pointPorteEcran", () => {
  it("mappe le point porte à 51 % / 66 % de la boîte rendue de l'élément", () => {
    const el = document.createElement("img");
    el.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 400, height: 800 }) as DOMRect;
    expect(pointPorteEcran(el)).toEqual({
      x: 100 + (400 * PORTE_CX_PCT) / 100,
      y: 50 + (800 * PORTE_CY_PCT) / 100,
    });
  });

  it("retombe au centre de l'écran sans élément ou avec une boîte vide", () => {
    const centre = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    expect(pointPorteEcran(null)).toEqual(centre);
    const el = document.createElement("img");
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    expect(pointPorteEcran(el)).toEqual(centre);
  });
});

describe("prechargerImage", () => {
  it("résout au timeout si l'image ne charge jamais (jsdom ne charge rien)", async () => {
    vi.useFakeTimers();
    let resolue = false;
    void prechargerImage("/qg/fond-cabinet.webp").then(() => {
      resolue = true;
    });
    await vi.advanceTimersByTimeAsync(TIMEOUT_PRECHARGEMENT_MS - 1);
    expect(resolue).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolue).toBe(true);
  });

  it("résout dès onload + decode() quand l'image charge", async () => {
    vi.useFakeTimers();
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decode = () => Promise.resolve();
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    let resolue = false;
    void prechargerImage("/x.webp").then(() => {
      resolue = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolue).toBe(true);
  });

  it("résout sur onerror (image introuvable) sans attendre le timeout", async () => {
    vi.useFakeTimers();
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    let resolue = false;
    void prechargerImage("/inexistante.webp").then(() => {
      resolue = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolue).toBe(true);
  });
});
```

- [ ] **Step 3: Vérifier que les tests échouent**

Run: `npx vitest run src/lib/transitionIris.test.ts`
Expected: FAIL — `Cannot find module './transitionIris'` (ou équivalent).

- [ ] **Step 4: Implémenter le module**

Créer `src/lib/transitionIris.ts` :

```ts
/**
 * Transition « iris » entre le menu titre et le bureau — spec
 * docs/superpowers/specs/2026-07-17-transition-iris-design.md.
 *
 * Le flag sessionStorage fait traverser la navigation (rechargement dur de
 * « Continuer »/« Lancer », ou router.push de la nouvelle partie) à
 * l'information « jouer la réouverture d'iris à l'arrivée » ; il est
 * consommé côté bureau (IrisArrivee). sessionStorage et pas localStorage :
 * la transition ne doit jamais survivre à un kill de l'appli.
 *
 * ⚠ La clé FLAG_KEY est dupliquée EN DUR dans le script preboot du layout
 * racine (src/app/layout.tsx) — garder les deux synchronisées.
 */

export const DUREE_FERMETURE_MS = 900;
export const DUREE_OUVERTURE_MS = 700;
export const NOIR_MIN_MS = 250;
export const TIMEOUT_PRECHARGEMENT_MS = 4000;
export const DUREE_FADE_REDUIT_MS = 400;

/**
 * Centre mesuré de la porte d'entrée sur `facade-accueil.webp` (rectangle
 * brun sombre ~190×470 px, mesure sharp .extract + .stats() — cf. l'ancienne
 * doc d'IntroPorte) : cx ≈ 51 %, cy ≈ 66 % de l'image.
 */
export const PORTE_CX_PCT = 51;
export const PORTE_CY_PCT = 66;

const FLAG_KEY = "broc.transition-iris";

export function poserFlagIris(): void {
  try {
    window.sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    // Storage indisponible : l'arrivée se fera sans iris, sans casser le jeu.
  }
}

export function lireFlagIris(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function effacerFlagIris(): void {
  try {
    window.sessionStorage.removeItem(FLAG_KEY);
  } catch {
    // Si le storage est HS, le flag n'a jamais pu être posé : rien à faire.
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Point écran (px viewport) du centre de la porte pour un élément rendu en
 * `object-fit: cover` avec `object-position: 51% 66%` : par définition du
 * pourcentage d'object-position, le point à 51 %/66 % de l'IMAGE coïncide
 * avec le point à 51 %/66 % de la BOÎTE de l'élément — y compris à travers
 * les transforms (scale/translate de parallaxe), que getBoundingClientRect
 * intègre. Fallback : centre de l'écran si l'élément n'est pas mesurable.
 */
export function pointPorteEcran(el: HTMLElement | null): { x: number; y: number } {
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return {
        x: r.left + (r.width * PORTE_CX_PCT) / 100,
        y: r.top + (r.height * PORTE_CY_PCT) / 100,
      };
    }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Précharge et décode une image, sans jamais rejeter : résout quand l'image
 * est prête à peindre, sur erreur de chargement, ou au timeout (image lente,
 * decode() absent) — l'appelant ne doit jamais rester bloqué au noir.
 */
export function prechargerImage(
  src: string,
  timeoutMs = TIMEOUT_PRECHARGEMENT_MS,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve();
      return;
    }
    let fini = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const terminer = () => {
      if (fini) return;
      fini = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(terminer, timeoutMs);
    const img = new Image();
    img.onerror = terminer;
    img.onload = () => {
      // decode() garantit l'image décodée (prête à peindre), pas seulement
      // téléchargée ; absent ou en échec, onload est la meilleure approximation.
      if (typeof img.decode === "function") {
        img.decode().then(terminer, terminer);
      } else {
        terminer();
      }
    };
    img.src = src;
  });
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run src/lib/transitionIris.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/transitionIris.ts src/lib/transitionIris.test.ts
git commit -m "feat(transition): module utilitaire iris (flag sessionStorage, préchargement, point porte)"
```

---

### Task 2: Composant `IrisTransition` (fermeture + réouverture)

**Files:**
- Create: `src/components/mobile/IrisTransition.tsx`
- Test: `src/components/mobile/IrisTransition.test.tsx`

**Interfaces:**
- Consumes (Task 1) : constantes de durées, `lireFlagIris`, `effacerFlagIris`, `prechargerImage`, `prefersReducedMotion`.
- Produces (utilisé par les Tasks 3, 5, 6) :
  - `IrisFermeture({ cx, cy, onNoir }: { cx: number; cy: number; onNoir: () => void }): JSX.Element` — overlay plein écran, joue la fermeture au montage, appelle `onNoir` une fois l'écran noir.
  - `IrisArrivee({ imageSrc }: { imageSrc: string }): JSX.Element | null` — rend `null` sans flag ; sinon noir immédiat, préchargement de `imageSrc`, réouverture, puis se démonte tout seul. Retire aussi le voile DOM `#broc-iris-preboot` (posé par le script du layout racine, Task 6).

- [ ] **Step 1: Écrire les tests (échouants)**

Créer `src/components/mobile/IrisTransition.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { IrisArrivee, IrisFermeture } from "./IrisTransition";
import {
  DUREE_FERMETURE_MS,
  DUREE_OUVERTURE_MS,
  NOIR_MIN_MS,
  lireFlagIris,
  poserFlagIris,
} from "@/lib/transitionIris";

// prechargerImage résout immédiatement : les tests pilotent le déroulé via
// les seuls timers (noir minimum, durées d'animation).
vi.mock("@/lib/transitionIris", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/transitionIris")>();
  return { ...orig, prechargerImage: vi.fn(() => Promise.resolve()) };
});

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("IrisFermeture", () => {
  it("appelle onNoir une fois la fermeture jouée, pas avant", async () => {
    const onNoir = vi.fn();
    render(<IrisFermeture cx={100} cy={200} onNoir={onNoir} />);

    await act(() => vi.advanceTimersByTimeAsync(DUREE_FERMETURE_MS));
    expect(onNoir).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(onNoir).toHaveBeenCalledTimes(1);
  });
});

describe("IrisArrivee", () => {
  it("sans flag : ne rend rien", () => {
    const { container } = render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(container.firstChild).toBeNull();
  });

  it("avec flag : couvre l'écran dès le rendu et consomme le flag", () => {
    poserFlagIris();
    const { container } = render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(container.firstChild).not.toBeNull();
    expect(lireFlagIris()).toBe(false);
  });

  it("retire le voile preboot posé par le script du layout racine", () => {
    const preboot = document.createElement("div");
    preboot.id = "broc-iris-preboot";
    document.body.appendChild(preboot);
    poserFlagIris();
    render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);
    expect(document.getElementById("broc-iris-preboot")).toBeNull();
  });

  it("s'ouvre après préchargement + noir minimum, puis se démonte", async () => {
    poserFlagIris();
    const { container } = render(<IrisArrivee imageSrc="/qg/fond-cabinet.webp" />);

    await act(() => vi.advanceTimersByTimeAsync(NOIR_MIN_MS));
    expect(container.firstChild).not.toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(DUREE_OUVERTURE_MS + 200));
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/components/mobile/IrisTransition.test.tsx`
Expected: FAIL — module `./IrisTransition` introuvable.

- [ ] **Step 3: Implémenter le composant**

Créer `src/components/mobile/IrisTransition.tsx` :

```tsx
"use client";

/**
 * Iris « cinéma muet » : un trou circulaire à bord net dans un voile noir —
 * spec docs/superpowers/specs/2026-07-17-transition-iris-design.md.
 *
 * Technique : le trou est un div rond transparent dont le box-shadow étalé
 * (0 0 0 300vmax, sans flou = simple remplissage) peint le noir tout autour.
 * On anime width/height et PAS transform:scale : le box-shadow est rendu
 * APRÈS transform, donc à scale(0) l'ombre disparaîtrait avec l'élément et
 * l'écran ne serait jamais noir — alors qu'à width/height 0, l'ombre non
 * transformée couvre tout depuis un point.
 *
 * `prefers-reduced-motion` : simple fondu au noir / depuis le noir.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import {
  DUREE_FADE_REDUIT_MS,
  DUREE_FERMETURE_MS,
  DUREE_OUVERTURE_MS,
  NOIR_MIN_MS,
  effacerFlagIris,
  lireFlagIris,
  prechargerImage,
  prefersReducedMotion,
} from "@/lib/transitionIris";

/** Marge après la fin théorique de la transition CSS avant le callback. */
const MARGE_FIN_MS = 80;

const conteneurStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9000,
  overflow: "hidden",
  pointerEvents: "auto",
  touchAction: "none",
};

/** Diamètre couvrant tout l'écran depuis (cx, cy), coins compris. */
function diametreCouvrant(cx: number, cy: number): number {
  const dx = Math.max(cx, window.innerWidth - cx);
  const dy = Math.max(cy, window.innerHeight - cy);
  return 2 * Math.hypot(dx, dy);
}

function trouStyle(
  cx: number,
  cy: number,
  diametre: number,
  dureeMs: number,
  ease: string,
): CSSProperties {
  return {
    position: "absolute",
    left: cx,
    top: cy,
    transform: "translate(-50%, -50%)",
    width: diametre,
    height: diametre,
    borderRadius: "50%",
    boxShadow: "0 0 0 300vmax var(--forest-900)",
    transition: `width ${dureeMs}ms ${ease}, height ${dureeMs}ms ${ease}`,
  };
}

function voileStyle(opaque: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    background: "var(--forest-900)",
    opacity: opaque ? 1 : 0,
    transition: `opacity ${DUREE_FADE_REDUIT_MS}ms ease`,
  };
}

interface IrisFermetureProps {
  /** Centre du trou en px viewport — le point de la porte à l'écran. */
  cx: number;
  cy: number;
  /** Appelé une fois l'écran entièrement noir. */
  onNoir: () => void;
}

export function IrisFermeture({ cx, cy, onNoir }: IrisFermetureProps): JSX.Element {
  const [reduit] = useState(prefersReducedMotion);
  const [diametreOuvert] = useState(() => diametreCouvrant(cx, cy));
  const [ferme, setFerme] = useState(false);
  const onNoirRef = useRef(onNoir);
  useEffect(() => {
    onNoirRef.current = onNoir;
  }, [onNoir]);

  useEffect(() => {
    // L'état de départ (trou grand ouvert / voile transparent) doit être
    // peint avant de basculer, sinon la transition CSS ne se joue pas :
    // double rAF pour garantir un paint entre les deux états.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFerme(true));
    });
    const duree = reduit ? DUREE_FADE_REDUIT_MS : DUREE_FERMETURE_MS;
    const timer = setTimeout(() => onNoirRef.current(), duree + MARGE_FIN_MS);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [reduit]);

  return (
    <div style={conteneurStyle} aria-hidden>
      {reduit ? (
        <div style={voileStyle(ferme)} />
      ) : (
        <div
          style={trouStyle(
            cx,
            cy,
            ferme ? 0 : diametreOuvert,
            DUREE_FERMETURE_MS,
            "cubic-bezier(0.55, 0, 1, 0.45)",
          )}
        />
      )}
    </div>
  );
}

interface IrisArriveeProps {
  /** Image à précharger/décoder sous le noir avant d'ouvrir (fond du bureau). */
  imageSrc: string;
}

/**
 * Réouverture d'iris à l'arrivée au bureau. Ne rend rien si le flag
 * sessionStorage n'est pas posé (refresh, lien direct : comportement
 * actuel inchangé). Sinon : noir plein écran dès avant le premier paint,
 * préchargement de l'image de fond sous le noir, réouverture depuis le
 * centre de l'écran, puis démontage automatique.
 */
export function IrisArrivee({ imageSrc }: IrisArriveeProps): JSX.Element | null {
  const [actif, setActif] = useState(false);
  const [reduit] = useState(prefersReducedMotion);
  const [ouvert, setOuvert] = useState(false);
  const [fini, setFini] = useState(false);

  // Avant le premier paint : consomme le flag et couvre l'écran. Pas dans un
  // initializer de useState (le StrictMode de dev l'invoque deux fois, la
  // seconde lecture raterait le flag déjà consommé) ni dans un useEffect
  // (une frame de retard = flash de l'écran de chargement).
  useLayoutEffect(() => {
    if (!lireFlagIris()) return;
    effacerFlagIris();
    setActif(true);
  }, []);

  // Notre overlay React est en place (même commit, avant paint) : le voile
  // statique posé par le script preboot du layout racine peut partir.
  useLayoutEffect(() => {
    if (actif) document.getElementById("broc-iris-preboot")?.remove();
  }, [actif]);

  useEffect(() => {
    if (!actif) return;
    let annule = false;
    let timerFin: ReturnType<typeof setTimeout> | undefined;
    const noirMin = new Promise<void>((r) => setTimeout(r, NOIR_MIN_MS));
    void Promise.all([prechargerImage(imageSrc), noirMin]).then(() => {
      if (annule) return;
      setOuvert(true);
      timerFin = setTimeout(
        () => setFini(true),
        (reduit ? DUREE_FADE_REDUIT_MS : DUREE_OUVERTURE_MS) + MARGE_FIN_MS,
      );
    });
    return () => {
      annule = true;
      if (timerFin !== undefined) clearTimeout(timerFin);
    };
  }, [actif, imageSrc, reduit]);

  if (!actif || fini) return null;

  if (reduit) {
    return (
      <div style={conteneurStyle} aria-hidden>
        <div style={voileStyle(!ouvert)} />
      </div>
    );
  }

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  return (
    <div style={conteneurStyle} aria-hidden>
      <div
        style={trouStyle(
          cx,
          cy,
          ouvert ? diametreCouvrant(cx, cy) : 0,
          DUREE_OUVERTURE_MS,
          "cubic-bezier(0.16, 1, 0.3, 1)",
        )}
      />
    </div>
  );
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/components/mobile/IrisTransition.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/IrisTransition.tsx src/components/mobile/IrisTransition.test.tsx
git commit -m "feat(transition): composant IrisTransition (fermeture sur un point, réouverture avec préchargement)"
```

---

### Task 3: « Continuer » ferme l'iris avant de naviguer

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx` (mocks étendus + nouveaux tests)

**Interfaces:**
- Consumes : `IrisFermeture` (Task 2) ; `PORTE_CX_PCT`, `PORTE_CY_PCT`, `pointPorteEcran`, `poserFlagIris` (Task 1).
- Produces : helper interne `lancerIrisVers(apresNoir: () => void)` dans `TitleScreen`, réutilisé par la Task 4 pour le lancement de slot. État interne : `iris: { x: number; y: number; apresNoir: () => void } | null`.

- [ ] **Step 1: Étendre les mocks et ajouter les tests (échouants)**

Dans `src/app/page.test.tsx` :

1. Compléter la docstring du fichier : ajouter la phrase
   « Couvre aussi la transition iris de « Continuer » : fermeture d'abord (aucune navigation), puis au noir flag sessionStorage + navigation vers /bureau. »
2. Ajouter `beforeEach` à l'import vitest, puis après le bloc `afterEach` existant :

```tsx
beforeEach(() => {
  sessionStorage.clear();
});
```

3. Remplacer le mock de `GameContext` et ajouter les nouveaux mocks/état :

```tsx
const nouvellePartie = vi.fn();
const reset = vi.fn();
const detacherPartie = vi.fn();
let mockState: object | null = null;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    nouvellePartie,
    state: mockState,
    isHydrated: true,
    reset,
    detacherPartie,
  }),
  useGameActions: () => ({ reset }),
}));
```

   et dans le `afterEach` existant, ajouter `mockState = null;`.

4. Ajouter (après le mock d'IntroPorte) le mock d'IrisFermeture, l'import de `lireFlagIris` et le helper de navigation :

```tsx
import { lireFlagIris } from "@/lib/transitionIris";

let irisOnNoir: (() => void) | null = null;
vi.mock("@/components/mobile/IrisTransition", () => ({
  IrisFermeture: ({ onNoir }: { onNoir: () => void }) => {
    irisOnNoir = onNoir;
    return <div data-testid="iris-fermeture" />;
  },
}));

function mockLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: location,
  });
  return location;
}
```

5. Ajouter le describe :

```tsx
describe("TitleScreen — Continuer avec transition iris", () => {
  it("joue la fermeture d'iris SANS naviguer ni poser le flag immédiatement", () => {
    const location = mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);

    fireEvent.click(screen.getByText("Continuer"));

    expect(screen.getByTestId("iris-fermeture")).toBeTruthy();
    expect(location.href).toBe("");
    expect(lireFlagIris()).toBe(false);
  });

  it("au noir : pose le flag et navigue vers /bureau", () => {
    const location = mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);
    fireEvent.click(screen.getByText("Continuer"));

    irisOnNoir!();

    expect(lireFlagIris()).toBe(true);
    expect(location.href).toBe("/bureau");
  });

  it("second clic pendant la fermeture : ignoré (une seule fermeture)", () => {
    mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);

    fireEvent.click(screen.getByText("Continuer"));
    fireEvent.click(screen.getByText("Continuer"));

    expect(screen.getAllByTestId("iris-fermeture")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Vérifier que les nouveaux tests échouent**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL sur les 3 nouveaux tests (`iris-fermeture` introuvable) ; les 2 tests existants (bascule de slot différée) PASSENT toujours.

- [ ] **Step 3: Implémenter dans `page.tsx`**

1. Ajouter les imports :

```tsx
import { IrisFermeture } from "@/components/mobile/IrisTransition";
import {
  PORTE_CX_PCT,
  PORTE_CY_PCT,
  pointPorteEcran,
  poserFlagIris,
} from "@/lib/transitionIris";
```

2. Supprimer les constantes locales `DOOR_CX_PCT` / `DOOR_CY_PCT` et leur bloc de commentaire (lignes 20-26) ; remplacer leur usage dans l'`objectPosition` de la façade (ligne 276) par :

```tsx
objectPosition: `${PORTE_CX_PCT}% ${PORTE_CY_PCT}%`,
```

3. Dans `TitleScreen`, ajouter l'état et le helper (près des autres états) :

```tsx
// Fermeture d'iris en cours : point d'ancrage (la porte à l'écran) et
// action à jouer une fois l'écran noir. L'overlay IrisFermeture bloque
// toute interaction pendant la fermeture (pointer-events + z-index).
const [iris, setIris] = useState<{
  x: number;
  y: number;
  apresNoir: () => void;
} | null>(null);

const lancerIrisVers = (apresNoir: () => void) => {
  setIris({ ...pointPorteEcran(facadeRef.current), apresNoir });
};
```

4. Remplacer `onContinuer` :

```tsx
const onContinuer = () => {
  if (!aSauvegarde || iris) return;
  playClick();
  lancerIrisVers(() => {
    // Le flag déclenche la réouverture d'iris côté bureau (IrisArrivee) ;
    // le rechargement dur se déroule entièrement sous le noir.
    poserFlagIris();
    window.location.href = "/bureau";
  });
};
```

5. Juste avant la balise fermante `</main>`, ajouter :

```tsx
{iris && <IrisFermeture cx={iris.x} cy={iris.y} onNoir={iris.apresNoir} />}
```

- [ ] **Step 4: Vérifier que tous les tests passent**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(transition): Continuer ferme l'iris sur la porte avant de naviguer vers /bureau"
```

---

### Task 4: Lancement d'un slot via la même transition

**Files:**
- Modify: `src/components/mobile/PartiesModal.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/mobile/PartiesModal.test.tsx`, `src/app/page.test.tsx`

**Interfaces:**
- Consumes : `lancerIrisVers` et l'état `iris` de la Task 3 ; `poserFlagIris` (Task 1) ; `changerSlotActif`, `detacherPartie` (déjà importés dans `page.tsx`).
- Produces : `PartiesModal` remplace sa prop `onAvantBascule?: () => void` par **`onLancer: (slot: NumeroSlot) => void`** (requise) et ne fait PLUS ni bascule de slot ni navigation elle-même. L'orchestration (détacher → bascule → flag → navigation, sous l'iris) vit dans `TitleScreen.onLancerSlot`.

- [ ] **Step 1: Adapter les tests de PartiesModal (échouants)**

Dans `src/components/mobile/PartiesModal.test.tsx` :

1. Mettre à jour la docstring : la modal ne navigue plus ; « Lancer la partie » délègue au parent via `onLancer` (l'iris et l'ordre détacher/bascule/navigation sont testés dans `page.test.tsx`).
2. Ajouter la prop `onLancer={vi.fn()}` à **chaque** `render(<PartiesModal ...>)` du fichier (prop désormais requise), par exemple :

```tsx
render(
  <PartiesModal open onClose={vi.fn()} mode="gestion" onNouvellePartie={vi.fn()} onLancer={vi.fn()} />,
);
```

3. Dans le describe « sélection + Lancer la partie », REMPLACER les trois tests `« Lancer la partie » est grisé…`, `Lancer appelle onAvantBascule AVANT changerSlotActif…` et `onAvantBascule absent…` par :

```tsx
it("« Lancer la partie » est grisé sans sélection, puis appelle onLancer(slot choisi)", () => {
  const location = mockLocation();
  const onLancer = vi.fn();
  seedOccupe(1, { jour: 1, niveau: 1, budget: 0 });
  seedOccupe(2, { jour: 1, niveau: 1, budget: 0 });
  changerSlotActif(1);

  render(
    <PartiesModal
      open
      onClose={vi.fn()}
      mode="gestion"
      onNouvellePartie={vi.fn()}
      onLancer={onLancer}
    />,
  );

  const lancer = screen.getByRole("button", { name: "Lancer la partie" });
  expect(lancer).toHaveProperty("disabled", true);

  fireEvent.click(screen.getByRole("button", { name: "Choisir l'emplacement 2" }));
  expect(lancer).toHaveProperty("disabled", false);

  fireEvent.click(lancer);
  expect(onLancer).toHaveBeenCalledWith(2);
  // La modal ne bascule NI ne navigue elle-même : tout est délégué au
  // parent, qui orchestre l'iris (voir page.test.tsx).
  expect(chargerIndex().actif).toBe(1);
  expect(location.href).toBe("");
});
```

   (le test « la surbrillance suit le slot cliqué » est conservé tel quel, plus la prop `onLancer={vi.fn()}`).

- [ ] **Step 2: Ajouter le test d'orchestration côté titre (échouant)**

Dans `src/app/page.test.tsx`, ajouter le mock de PartiesModal (après celui d'IrisTransition) et le describe :

```tsx
import type { NumeroSlot } from "@/lib/storage/slots";

let partiesOnLancer: ((n: NumeroSlot) => void) | null = null;
vi.mock("@/components/mobile/PartiesModal", () => ({
  PartiesModal: ({ onLancer }: { onLancer: (n: NumeroSlot) => void }) => {
    partiesOnLancer = onLancer;
    return null;
  },
}));
```

```tsx
describe("TitleScreen — lancement d'un slot via la modal Parties", () => {
  it("onLancer : iris d'abord ; au noir, détacher → bascule → flag → navigation", () => {
    const location = mockLocation();
    render(<TitleScreen />);

    act(() => partiesOnLancer!(2));

    expect(screen.getByTestId("iris-fermeture")).toBeTruthy();
    expect(changerSlotActif).not.toHaveBeenCalled();
    expect(location.href).toBe("");

    irisOnNoir!();

    expect(detacherPartie).toHaveBeenCalledTimes(1);
    expect(changerSlotActif).toHaveBeenCalledWith(2);
    // Détachement STRICTEMENT avant la bascule : même course d'auto-
    // sauvegarde que l'ancien onJouer de PartiesModal.
    expect(detacherPartie.mock.invocationCallOrder[0]).toBeLessThan(
      changerSlotActif.mock.invocationCallOrder[0],
    );
    expect(lireFlagIris()).toBe(true);
    expect(location.href).toBe("/bureau");
  });
});
```

   (ajouter `act` à l'import de `@testing-library/react`).

- [ ] **Step 3: Vérifier que les tests échouent**

Run: `npx vitest run src/components/mobile/PartiesModal.test.tsx src/app/page.test.tsx`
Expected: FAIL — `onLancer` inexistante côté modal ; `partiesOnLancer` jamais peuplé côté titre.

- [ ] **Step 4: Implémenter**

Dans `src/components/mobile/PartiesModal.tsx` :

1. Props : supprimer `onAvantBascule?: () => void` (et sa JSDoc) ; ajouter :

```tsx
/**
 * « Lancer la partie » sur le slot choisi. La modal ne bascule NI ne
 * navigue elle-même : le parent (écran titre) orchestre la fermeture
 * d'iris puis, au noir, détacher → changerSlotActif → navigation —
 * même protection contre la course d'auto-sauvegarde que l'ancien
 * onJouer (voir onLancerSlot dans src/app/page.tsx).
 */
onLancer: (slot: NumeroSlot) => void;
```

2. Supprimer la fonction interne `onJouer` et l'import devenu inutile `changerSlotActif` ; le bouton « Lancer la partie » devient :

```tsx
onClick={() => {
  if (slotChoisi !== null) onLancer(slotChoisi);
}}
```

3. Mettre à jour la destructuration des props (`onLancer` au lieu de `onAvantBascule`).

Dans `src/app/page.tsx` :

4. Ajouter le handler (après `onContinuer`) :

```tsx
const onLancerSlot = (n: NumeroSlot) => {
  if (iris) return;
  playClick();
  setPartiesModal(null);
  lancerIrisVers(() => {
    // Ordre CRITIQUE (même course que l'ancien onJouer de PartiesModal) :
    // pendant la fermeture (~900 ms), le GameContext de cet écran reste
    // monté sur l'ANCIEN slot actif — la bascule n'a lieu qu'au noir,
    // détachement d'abord, navigation aussitôt après, pour qu'aucun tick
    // d'auto-sauvegarde ne puisse écrire dans le slot fraîchement activé.
    detacherPartie();
    changerSlotActif(n);
    poserFlagIris();
    window.location.href = "/bureau";
  });
};
```

5. Dans le JSX de `<PartiesModal>`, remplacer `onAvantBascule={detacherPartie}` par `onLancer={onLancerSlot}`.

- [ ] **Step 5: Vérifier que tous les tests passent**

Run: `npx vitest run src/components/mobile/PartiesModal.test.tsx src/app/page.test.tsx`
Expected: PASS (l'intégralité des deux fichiers).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/PartiesModal.tsx src/components/mobile/PartiesModal.test.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(transition): lancement d'un slot sous l'iris (bascule différée au noir, PartiesModal délègue via onLancer)"
```

---

### Task 5: Refonte d'IntroPorte — le zoom devient un iris

**Files:**
- Modify: `src/components/mobile/IntroPorte.tsx` (réécriture complète)
- Test: `src/components/mobile/IntroPorte.test.tsx` (nouveau)

**Interfaces:**
- Consumes : `IrisFermeture` (Task 2) ; `DUREE_FADE_REDUIT_MS`, `PORTE_CX_PCT`, `PORTE_CY_PCT`, `pointPorteEcran`, `poserFlagIris`, `prefersReducedMotion` (Task 1).
- Produces : signature publique INCHANGÉE — `IntroPorte({ onFini }: { onFini: () => void })`. Nouveau comportement : contemplation 600 ms → iris 900 ms (plus de zoom ×4 / 2,2 s) → pose du flag → `onFini`. `page.test.tsx` mocke IntroPorte : aucun impact.

- [ ] **Step 1: Écrire les tests (échouants)**

Créer `src/components/mobile/IntroPorte.test.tsx` :

```tsx
// @vitest-environment jsdom
/**
 * IntroPorte version iris : contemplation (600 ms) → fermeture d'iris sur la
 * porte → flag de réouverture posé → onFini. Le zoom ×4 a disparu. Le skip
 * (tap) termine immédiatement en posant aussi le flag : l'arrivée au bureau
 * joue la réouverture dans tous les cas.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntroPorte } from "./IntroPorte";
import { lireFlagIris } from "@/lib/transitionIris";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({ d: { qg: { passerIntroAria: "Passer l'introduction" } } }),
}));

let irisOnNoir: (() => void) | null = null;
vi.mock("@/components/mobile/IrisTransition", () => ({
  IrisFermeture: ({ onNoir }: { onNoir: () => void }) => {
    irisOnNoir = onNoir;
    return <div data-testid="iris-fermeture" />;
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  irisOnNoir = null;
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("IntroPorte — contemplation puis iris (plus de zoom)", () => {
  it("contemplation d'abord : pas d'iris avant 600 ms", () => {
    render(<IntroPorte onFini={vi.fn()} />);
    expect(screen.queryByTestId("iris-fermeture")).toBeNull();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByTestId("iris-fermeture")).toBeTruthy();
  });

  it("au noir de l'iris : pose le flag de réouverture PUIS onFini", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);
    act(() => vi.advanceTimersByTime(600));
    expect(lireFlagIris()).toBe(false);

    act(() => irisOnNoir!());

    expect(lireFlagIris()).toBe(true);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("le tap de skip pose aussi le flag et termine immédiatement", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Passer l'introduction" }),
    );

    expect(lireFlagIris()).toBe(true);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("onFini n'est jamais doublé (skip pendant l'iris puis onNoir)", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);
    act(() => vi.advanceTimersByTime(600));

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Passer l'introduction" }),
    );
    act(() => irisOnNoir!());

    expect(onFini).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/components/mobile/IntroPorte.test.tsx`
Expected: FAIL — pas de `iris-fermeture` (le composant actuel joue le zoom), flag jamais posé.

- [ ] **Step 3: Réécrire IntroPorte**

Remplacer intégralement le contenu de `src/components/mobile/IntroPorte.tsx` par :

```tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { IrisFermeture } from "@/components/mobile/IrisTransition";
import {
  DUREE_FADE_REDUIT_MS,
  PORTE_CX_PCT,
  PORTE_CY_PCT,
  pointPorteEcran,
  poserFlagIris,
  prefersReducedMotion,
} from "@/lib/transitionIris";

/**
 * Intro « iris sur la porte » — jouée au lancement d'une nouvelle partie.
 * Cadré large sur la façade (contemplation) → fermeture d'iris centrée sur
 * la porte → onFini(). La réouverture se joue côté bureau (IrisArrivee),
 * déclenchée par le flag sessionStorage posé ici — même transition que
 * « Continuer » et que le lancement d'un slot. Spec :
 * docs/superpowers/specs/2026-07-17-transition-iris-design.md.
 */
const DUREE_CONTEMPLATION_MS = 600;

type Phase = "contemplation" | "iris" | "fade-reduit";

interface IntroPorteProps {
  onFini: () => void;
}

const conteneurStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  overflow: "hidden",
  backgroundColor: "var(--forest-900)",
  touchAction: "none",
};

const imgWrapperStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

const imgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  // Même cadrage que l'écran titre : la porte (51 % / 66 % de l'image) est
  // ainsi à 51 % / 66 % de la boîte rendue — ce que lit pointPorteEcran.
  objectPosition: `${PORTE_CX_PCT}% ${PORTE_CY_PCT}%`,
  display: "block",
  userSelect: "none",
};

function scrimStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: "var(--forest-900)",
    opacity: visible ? 1 : 0,
    transition: `opacity ${DUREE_FADE_REDUIT_MS}ms ease`,
    pointerEvents: "none",
  };
}

const tapLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  cursor: "pointer",
};

export function IntroPorte({ onFini }: IntroPorteProps): JSX.Element {
  const { d } = useLangue();
  const [reduit] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(
    reduit ? "fade-reduit" : "contemplation",
  );
  const [pointIris, setPointIris] = useState<{ x: number; y: number } | null>(
    null,
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const finiRef = useRef(false);
  const onFiniRef = useRef(onFini);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    onFiniRef.current = onFini;
  }, [onFini]);

  // Pose le flag de réouverture AVANT de rendre la main : l'arrivée au
  // bureau (router.push de nouvellePartie) jouera l'iris d'ouverture,
  // exactement comme « Continuer ». Vaut aussi pour le skip et le mode
  // reduced-motion (fondu à la place du cercle, géré par IrisArrivee).
  const declencherFin = () => {
    if (finiRef.current) return;
    finiRef.current = true;
    poserFlagIris();
    onFiniRef.current();
  };

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    if (reduit) {
      schedule(declencherFin, DUREE_FADE_REDUIT_MS);
    } else {
      // La fermeture est déléguée à IrisFermeture (rendue en phase "iris"),
      // qui rappelle declencherFin via onNoir — pas de timer de fin ici.
      // Le point porte est mesuré au moment du basculement de phase.
      schedule(() => {
        setPointIris(pointPorteEcran(imgRef.current));
        setPhase("iris");
      }, DUREE_CONTEMPLATION_MS);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduit]);

  const onSkip = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    declencherFin();
  };

  return (
    <div style={conteneurStyle} role="presentation">
      <div style={imgWrapperStyle}>
        <img
          ref={imgRef}
          src="/qg/facade-accueil.webp"
          alt=""
          style={imgStyle}
          draggable={false}
        />
      </div>
      {reduit && <div aria-hidden style={scrimStyle(phase === "fade-reduit")} />}
      {phase === "iris" && pointIris && (
        <IrisFermeture
          cx={pointIris.x}
          cy={pointIris.y}
          onNoir={declencherFin}
        />
      )}
      <button
        type="button"
        style={tapLayerStyle}
        aria-label={d.qg.passerIntroAria}
        onPointerDown={onSkip}
      />
    </div>
  );
}
```

- [ ] **Step 4: Vérifier que les tests passent (y compris la non-régression du titre)**

Run: `npx vitest run src/components/mobile/IntroPorte.test.tsx src/app/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/IntroPorte.tsx src/components/mobile/IntroPorte.test.tsx
git commit -m "feat(transition): IntroPorte remplace le zoom par la fermeture d'iris (contemplation et skip conservés)"
```

---

### Task 6: Arrivée au bureau — voile preboot, réouverture, vérifications finales

**Files:**
- Modify: `src/app/layout.tsx` (script preboot)
- Modify: `src/app/(qg)/layout.tsx` (montage d'IrisArrivee)

**Interfaces:**
- Consumes : `IrisArrivee` (Task 2).
- Produces : rien de nouveau — câblage final. Contrat DOM entre les deux : le div `#broc-iris-preboot` créé par le script racine est retiré par `IrisArrivee`.

- [ ] **Step 1: Script preboot dans le layout racine**

Dans `src/app/layout.tsx`, ajouter comme PREMIER enfant de `<body>` (avant `<LangueProvider>`) :

```tsx
{/* Voile noir pré-hydratation de la transition iris : si on arrive d'un
    « Continuer »/« Lancer » (flag sessionStorage posé juste avant le
    window.location.href), couvre l'écran dès le parsing HTML — bien avant
    React — pour que le rechargement dur se déroule entièrement sous le
    noir. Retiré par IrisArrivee sitôt son overlay monté ; auto-retrait à
    6 s en filet de sécurité (page d'erreur, layout (qg) jamais monté).
    Clé du flag dupliquée en dur depuis src/lib/transitionIris.ts ;
    couleur = --forest-900 en dur (CSS pas forcément chargées ici). */}
<script
  dangerouslySetInnerHTML={{
    __html:
      '(function(){try{if(sessionStorage.getItem("broc.transition-iris")!=="1")return;var d=document.createElement("div");d.id="broc-iris-preboot";d.style.cssText="position:fixed;inset:0;z-index:9999;background:#0f1f18";document.body.appendChild(d);setTimeout(function(){var e=document.getElementById("broc-iris-preboot");if(e)e.remove();},6000);}catch(e){}})();',
  }}
/>
```

- [ ] **Step 2: Monter IrisArrivee dans le layout (qg)**

Dans `src/app/(qg)/layout.tsx` :

1. Ajouter l'import :

```tsx
import { IrisArrivee } from "@/components/mobile/IrisTransition";
```

2. Remplacer le corps de `QgLayout` (composant export default, en bas de fichier) par :

```tsx
export default function QgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <QgLayoutInner>{children}</QgLayoutInner>
      </Suspense>
      {/* Réouverture d'iris à l'arrivée (flag posé par Continuer, le
          lancement d'un slot ou l'intro de nouvelle partie) : montée HORS
          de QgLayoutInner pour couvrir aussi son early-return « ouverture
          du local… » pendant l'hydratation, et ne dépendre d'aucun état de
          jeu. Sans flag (refresh, lien direct), ne rend rien. */}
      <IrisArrivee imageSrc="/qg/fond-cabinet.webp" />
    </>
  );
}
```

- [ ] **Step 3: Filets complets — tests, lint, build**

Run, dans cet ordre :

```bash
npx vitest run
npx eslint src
npm run build
```

Expected: suite vitest entièrement verte ; eslint sans erreur (warnings préexistants tolérés) ; build Next (export statique) OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx "src/app/(qg)/layout.tsx"
git commit -m "feat(transition): réouverture d'iris à l'arrivée au bureau (voile preboot pré-hydratation + IrisArrivee)"
```

- [ ] **Step 5: Vérification sur simulateur iOS (manuelle, avec Guillaume)**

Lancer `scripts/ios-sim.sh` et vérifier :

1. **Continuer** : fermeture centrée sur la porte → noir → réouverture dans le bureau, pas de « pop » de l'image de fond (1ʳᵉ entrée image froide, puis entrées suivantes image en cache → noir plus court).
2. **Lancer un slot** depuis la modal Parties : même transition, la bonne partie est chargée.
3. **Nouvelle partie** : contemplation → iris (plus de zoom) → arrivée en iris ; le tap de skip fonctionne.
4. **Refresh / lien direct sur `/bureau`** : AUCUN iris, comportement actuel.
5. **Réglage iOS « Réduire les animations »** : fondus simples des deux côtés.

---

## Self-Review (fait à l'écriture du plan)

- **Couverture spec** : Continuer (T3), slots (T4), refonte IntroPorte (T5), réouverture + préchargement + flag consommé + timeout de secours (T2/T6), reduced-motion (T2/T5), pas de skip sur Continuer / skip conservé sur l'intro (T3/T5), vérif device (T6). ✓
- **Placeholders** : aucun — chaque étape porte son code complet. ✓
- **Cohérence des types** : `IrisFermeture{cx,cy,onNoir}` identique en T2/T3/T5 ; `IrisArrivee{imageSrc}` en T2/T6 ; `pointPorteEcran → {x,y}` étalé dans l'état `iris{x,y,apresNoir}` (T3) et `pointIris{x,y}` (T5) ; `onLancer(slot: NumeroSlot)` en T4 des deux côtés. ✓
