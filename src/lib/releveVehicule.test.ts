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
