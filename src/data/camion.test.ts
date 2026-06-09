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

  it("getScaleCoffre: XS en N4 ≈ 0.175", () => {
    // PLACES_PAR_TAILLE.XS = 1.10 ; côté = sqrt(1.10 / 36) ≈ 0.1748
    expect(getScaleCoffre("XS", 36)).toBeCloseTo(0.175, 2);
  });

  it("ratio côté entre tailles successives ≈ 1.3", () => {
    const cap = 9;
    const xs = getScaleCoffre("XS", cap);
    const s = getScaleCoffre("S", cap);
    const m = getScaleCoffre("M", cap);
    const l = getScaleCoffre("L", cap);
    const xl = getScaleCoffre("XL", cap);
    expect(s / xs).toBeCloseTo(1.3, 1);
    expect(m / s).toBeCloseTo(1.3, 1);
    expect(l / m).toBeCloseTo(1.3, 1);
    expect(xl / l).toBeCloseTo(1.3, 1);
  });
});
