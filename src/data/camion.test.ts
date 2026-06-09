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
    // Base √(5/9), shrinkFactor = 1 → 0.745
    expect(getScaleCoffre("XL", 9)).toBeCloseTo(0.745, 2);
  });

  it("getScaleCoffre: XL en N4 ≈ 0.527", () => {
    // Base √(5/9), shrinkFactor = (9/36)^0.25 = 0.707 → 0.527
    expect(getScaleCoffre("XL", 36)).toBeCloseTo(0.527, 2);
  });

  it("getScaleCoffre: XS en N4 décroît modérément (~0.204)", () => {
    // Base √(0.75/9) × (9/36)^0.25 = 0.289 × 0.707 ≈ 0.204
    expect(getScaleCoffre("XS", 36)).toBeCloseTo(0.204, 2);
  });
});
