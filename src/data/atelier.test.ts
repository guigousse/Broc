import { describe, expect, it } from "vitest";
import {
  ATELIER_SLOTS,
  ATELIER_UPGRADES,
  getProchaineUpgrade,
  getCapaciteAtelier,
} from "./atelier";

describe("modèle atelier 0..3", () => {
  it("capacité = niveau (0 slot de base, max 3)", () => {
    expect(ATELIER_SLOTS).toEqual({ 0: 0, 1: 1, 2: 2, 3: 3 });
    expect(getCapaciteAtelier(0)).toBe(0);
    expect(getCapaciteAtelier(3)).toBe(3);
  });

  it("upgrades : 0→1 100 €, 1→2 200 €, 2→3 500 €", () => {
    expect(ATELIER_UPGRADES).toEqual([
      { niveauActuel: 0, niveauCible: 1, cout: 100 },
      { niveauActuel: 1, niveauCible: 2, cout: 200 },
      { niveauActuel: 2, niveauCible: 3, cout: 500 },
    ]);
    expect(getProchaineUpgrade(0)?.cout).toBe(100);
    expect(getProchaineUpgrade(2)?.cout).toBe(500);
    expect(getProchaineUpgrade(3)).toBeNull();
  });
});
