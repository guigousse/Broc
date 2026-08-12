// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { zonesSuresNatives } from "./zoneSureAndroid";

/** Installe (ou retire) le pont natif exposé par MainActivity.kt. */
function pont(mesures: { hautPx: () => number; basPx: () => number } | null) {
  if (mesures === null) {
    delete (window as unknown as Record<string, unknown>).BrocInsets;
    return;
  }
  (window as unknown as Record<string, unknown>).BrocInsets = mesures;
}

/** Raccourci : deux valeurs constantes. */
function pontFixe(haut: number, bas: number) {
  pont({ hautPx: () => haut, basPx: () => bas });
}

afterEach(() => {
  pont(null);
  vi.unstubAllGlobals();
});

describe("zonesSuresNatives", () => {
  it("rend null quand le pont natif est absent (iOS, web, tests)", () => {
    expect(zonesSuresNatives()).toBeNull();
  });

  it("rend les deux hauteurs mesurées par Android, en pixels CSS", () => {
    pontFixe(49, 24);
    expect(zonesSuresNatives()).toEqual({ haut: 49, bas: 24 });
  });

  it("rend 0 là où l'appareil n'a pas de barre", () => {
    pontFixe(0, 0);
    expect(zonesSuresNatives()).toEqual({ haut: 0, bas: 0 });
  });

  it("suit le mode trois boutons, plus haut que la barre de gestes", () => {
    pontFixe(49, 48);
    expect(zonesSuresNatives()?.bas).toBe(48);
  });

  it("arrondit vers le haut — Android rend des flottants, et un pixel de trop vaut mieux qu'un de moins", () => {
    pontFixe(48.761905670166016, 23.2);
    expect(zonesSuresNatives()).toEqual({ haut: 49, bas: 24 });
  });

  it("rend null si une seule des deux mesures n'est pas un nombre fini", () => {
    pontFixe(Number.NaN, 24);
    expect(zonesSuresNatives()).toBeNull();
  });

  it("rend null plutôt que de laisser remonter une erreur du pont", () => {
    pont({
      hautPx: () => {
        throw new Error("pont mort");
      },
      basPx: () => 24,
    });
    expect(zonesSuresNatives()).toBeNull();
  });

  it("refuse une valeur aberrante — un pont qui déraille ne doit pas manger l'écran", () => {
    pontFixe(49, 400);
    expect(zonesSuresNatives()).toBeNull();
  });

  it("refuse une valeur négative", () => {
    pontFixe(-1, 24);
    expect(zonesSuresNatives()).toBeNull();
  });

  it("rend null si le pont est incomplet — une ancienne version de l'app native", () => {
    (window as unknown as Record<string, unknown>).BrocInsets = { basPx: () => 24 };
    expect(zonesSuresNatives()).toBeNull();
  });
});
