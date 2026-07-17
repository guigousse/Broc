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
