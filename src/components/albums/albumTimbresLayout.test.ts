/**
 * albumTimbresLayout — géométrie pure des 5 lignes aimantées de l'album de
 * timbres (pas de DOM : testable en environnement `node`).
 */
import { describe, expect, it } from "vitest";
import { ligneLaPlusProche, positionDepuisPointeur, xBorne } from "./albumTimbresLayout";

describe("albumTimbresLayout", () => {
  it("aimante à la ligne la plus proche et borne x à la demi-largeur du timbre", () => {
    expect(ligneLaPlusProche(0.02)).toBe(0);
    expect(ligneLaPlusProche(0.5)).toBe(2);
    expect(ligneLaPlusProche(0.99)).toBe(4);
    expect(xBorne(-1)).toBeCloseTo(1 / 12);
    expect(xBorne(2)).toBeCloseTo(11 / 12);
    const rect = { left: 100, top: 200, width: 300, height: 390 };
    expect(positionDepuisPointeur(rect, 250, 395)).toEqual({ ligne: 2, x: 0.5 });
    expect(positionDepuisPointeur(rect, 50, 395)).toBeNull();
  });
});
