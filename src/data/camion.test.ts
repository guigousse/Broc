import { describe, it, expect } from "vitest";
import {
  CAMIONS,
  getCamion,
  getProchainCamion,
  getScaleCoffre,
} from "@/data/camion";

describe("camion", () => {
  it("CAMIONS contient 3 niveaux dans l'ordre", () => {
    expect(CAMIONS.map((c) => c.niveau)).toEqual([1, 2, 3]);
  });

  it("getCamion(2) retourne le Break", () => {
    expect(getCamion(2).nom).toBe("Break");
  });

  it("getProchainCamion(3) retourne null", () => {
    expect(getProchainCamion(3)).toBeNull();
  });

  it("getProchainCamion(1) retourne le Break", () => {
    expect(getProchainCamion(1)?.nom).toBe("Break");
  });

  it("getScaleCoffre: XL en N1 ≈ 0.745", () => {
    expect(getScaleCoffre("XL", 9)).toBeCloseTo(0.745, 2);
  });

  it("getScaleCoffre: XL en Utilitaire ≈ 0.577", () => {
    // Base √(5/9), shrinkFactor = (9/25)^0.25 ≈ 0.7746 → 0.577
    expect(getScaleCoffre("XL", 25)).toBeCloseTo(0.577, 2);
  });

  it("getScaleCoffre: XS en Utilitaire décroît modérément (~0.224)", () => {
    // Base √(0.75/9) × (9/25)^0.25 ≈ 0.289 × 0.775 ≈ 0.224
    expect(getScaleCoffre("XS", 25)).toBeCloseTo(0.224, 2);
  });
});
