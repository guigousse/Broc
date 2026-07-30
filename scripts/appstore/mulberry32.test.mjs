import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry32.mjs";

describe("mulberry32", () => {
  it("refuse une graine non finie", () => {
    expect(() => mulberry32(NaN)).toThrow(/graine invalide/);
    expect(() => mulberry32(Infinity)).toThrow(/graine invalide/);
  });

  it("produit toujours la même séquence pour une même graine", () => {
    const suite = (graine) => {
      const rng = mulberry32(graine);
      return [rng(), rng(), rng(), rng()];
    };
    expect(suite(12345)).toEqual(suite(12345));
  });

  it("produit une séquence différente pour deux graines différentes", () => {
    const suite = (graine) => {
      const rng = mulberry32(graine);
      return [rng(), rng(), rng(), rng()];
    };
    expect(suite(1)).not.toEqual(suite(2));
  });

  it("produit des valeurs dans [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
