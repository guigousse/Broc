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

  it("getScaleCoffre: XL en N1 = 1.0", () => {
    expect(getScaleCoffre("XL", 9)).toBeCloseTo(1.0, 3);
  });

  it("getScaleCoffre: XS en N4 ≈ 0.167", () => {
    expect(getScaleCoffre("XS", 36)).toBeCloseTo(0.167, 2);
  });
});
