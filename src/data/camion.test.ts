import { describe, it, expect } from "vitest";
import {
  CAMIONS,
  getCamion,
  getProchainCamion,
  getScaleCoffre,
} from "@/data/camion";

describe("camion", () => {
  it("CAMIONS contient 4 niveaux dans l'ordre", () => {
    expect(CAMIONS.map((c) => c.niveau)).toEqual([1, 2, 3, 4]);
  });

  it("getCamion(2) retourne le Break", () => {
    expect(getCamion(2).nom).toBe("Break");
  });

  it("getProchainCamion(4) retourne null", () => {
    expect(getProchainCamion(4)).toBeNull();
  });

  it("getProchainCamion(1) retourne le Break", () => {
    expect(getProchainCamion(1)?.nom).toBe("Break");
  });

  it("getScaleCoffre: XL en N1 ≈ 0.745", () => {
    // PLACES_PAR_TAILLE.XL = 5 ; côté = sqrt(5 / 9) ≈ 0.745
    expect(getScaleCoffre("XL", 9)).toBeCloseTo(0.745, 2);
  });

  it("getScaleCoffre: XS en N4 ≈ 0.144", () => {
    // PLACES_PAR_TAILLE.XS = 0.75 ; côté = sqrt(0.75 / 36) ≈ 0.1443
    expect(getScaleCoffre("XS", 36)).toBeCloseTo(0.144, 2);
  });
});
