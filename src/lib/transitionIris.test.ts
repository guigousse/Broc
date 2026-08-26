// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DUREE_FADE_REDUIT_MS,
  DUREE_FERMETURE_MS,
  DUREE_OUVERTURE_MS,
  PORTE_CX_PCT,
  PORTE_CY_PCT,
  TIMEOUT_PRECHARGEMENT_MS,
  dureesIris,
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
  it("poser puis lire retourne la variante ; effacer le fait retomber à null", () => {
    expect(lireFlagIris()).toBe(null);
    poserFlagIris();
    expect(lireFlagIris()).toBe("long");
    effacerFlagIris();
    expect(lireFlagIris()).toBe(null);
  });

  it("lire ne consomme PAS le flag (la consommation est du ressort de l'appelant)", () => {
    poserFlagIris();
    lireFlagIris();
    expect(lireFlagIris()).toBe("long");
  });

  // Le flag ne dit plus seulement « il y a un iris à rouvrir » mais LEQUEL :
  // le bureau est atteint aussi bien depuis l'écran-titre (iris long) que
  // depuis le Bazar (iris court), et c'est le même `IrisArrivee` qui l'ouvre.
  it("retient la variante courte du passage bureau ↔ Bazar", () => {
    poserFlagIris("court");
    expect(lireFlagIris()).toBe("court");
  });

  // ⚠ Le script preboot du layout racine (src/app/layout.tsx) teste la valeur
  // « 1 » EN DUR pour peindre son voile noir avant le premier paint. Deux
  // conséquences, toutes deux voulues : la variante longue doit garder cette
  // valeur exacte (rechargement dur depuis l'écran-titre), et la variante
  // courte doit en prendre une autre — le passage bureau ↔ Bazar est une
  // navigation douce, sans rechargement, donc sans voile preboot à poser.
  it("la variante longue s'écrit « 1 », la courte non — le voile preboot ne vaut que pour le rechargement dur", () => {
    poserFlagIris();
    expect(sessionStorage.getItem("broc.transition-iris")).toBe("1");
    poserFlagIris("court");
    expect(sessionStorage.getItem("broc.transition-iris")).not.toBe("1");
  });
});

// « Il faut juste que cette animation soit plus courte de 30 % » : le passage
// bureau ↔ Bazar rejoue exactement le même iris que l'écran-titre, à 70 % de
// sa durée. Un seul facteur, appliqué aux trois durées — y compris au fondu
// de `prefers-reduced-motion`, pour que le raccourci se voie aussi là.
describe("durées d'iris par variante", () => {
  it("la variante longue est celle de l'écran-titre, inchangée", () => {
    expect(dureesIris("long")).toEqual({
      fermeture: DUREE_FERMETURE_MS,
      ouverture: DUREE_OUVERTURE_MS,
      fadeReduit: DUREE_FADE_REDUIT_MS,
    });
  });

  it("la variante courte retire 30 % à chacune des trois durées", () => {
    expect(dureesIris("court")).toEqual({
      fermeture: 1260,
      ouverture: 980,
      fadeReduit: 280,
    });
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
