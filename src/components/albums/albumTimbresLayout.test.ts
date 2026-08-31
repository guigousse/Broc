/**
 * albumTimbresLayout — géométrie pure des 5 lignes aimantées de l'album de
 * timbres (pas de DOM : testable en environnement `node`).
 */
import { describe, expect, it } from "vitest";
import {
  HAUTEUR_PAGE_RATIO,
  TAILLE_TIMBRE,
  bandeDeLigne,
  ligneLaPlusProche,
  positionDepuisPointeur,
  xBorne,
  yDeLigne,
} from "./albumTimbresLayout";

describe("albumTimbresLayout", () => {
  it("aimante à la ligne la plus proche et borne x à la demi-largeur du timbre", () => {
    expect(ligneLaPlusProche(0.02)).toBe(0);
    expect(ligneLaPlusProche(0.5)).toBe(2);
    expect(ligneLaPlusProche(0.99)).toBe(4);
    expect(xBorne(-1)).toBeCloseTo(1 / 12);
    expect(xBorne(2)).toBeCloseTo(11 / 12);
    const rect = { left: 100, top: 200, width: 300, height: 390 };
    expect(positionDepuisPointeur(rect, 250, 395)).toEqual({
      ligne: 2,
      x: 0.5,
    });
    expect(positionDepuisPointeur(rect, 50, 395)).toBeNull();
  });
});

describe("bandeDeLigne — le bandeau translucide d'une ligne", () => {
  it("ne recouvre que le tiers bas du timbre et reste dans sa ligne", () => {
    const demiTimbre = TAILLE_TIMBRE / 2 / HAUTEUR_PAGE_RATIO; // en fraction de hauteur
    for (const l of [0, 1, 2, 3, 4] as const) {
      const centre = yDeLigne(l);
      const b = bandeDeLigne(l);
      expect(b.top).toBeGreaterThan(centre); // commence SOUS le centre du timbre…
      expect(b.top).toBeLessThan(centre + demiTimbre); // …mais avant son bord bas
      expect(b.top + b.hauteur).toBeGreaterThan(centre + demiTimbre); // dépasse sous le timbre
      expect(b.top + b.hauteur).toBeLessThan((l + 1) / 5); // sans mordre la ligne suivante
    }
  });
});

describe("positionDepuisPointeur — tolérance autour de la page", () => {
  const rect = { left: 0, top: 0, width: 300, height: 390 };
  it("un point juste au-dessus de la page, dans la tolérance, est ramené sur la ligne 0", () => {
    expect(positionDepuisPointeur(rect, 150, -10, 25)).toEqual({
      ligne: 0,
      x: 0.5,
    });
  });
  it("un point au-delà de la tolérance reste hors page", () => {
    expect(positionDepuisPointeur(rect, 150, -40, 25)).toBeNull();
  });
  it("sans tolérance, le comportement strict est conservé", () => {
    expect(positionDepuisPointeur(rect, 150, -1)).toBeNull();
  });
});
