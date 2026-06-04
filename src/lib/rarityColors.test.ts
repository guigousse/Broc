import { describe, expect, it } from "vitest";
import type { Rarete } from "@/types/game";
import { getRarityColors } from "./rarityColors";

const RARETES: Rarete[] = ["commun", "rare", "legendaire"];

describe("getRarityColors — structure", () => {
  it.each(RARETES)("retourne tous les champs requis pour %s", (rarete) => {
    const c = getRarityColors(rarete);
    expect(c.outer).toMatch(/^#/);
    expect(c.inner).toMatch(/^#/);
    expect(c.accent).toMatch(/^#/);
    expect(c.shadow).toMatch(/^rgba\(/);
    expect(c.thumbBg).toContain("linear-gradient");
    expect(c.thumbIcon).toMatch(/^#/);
    expect(c.label).toBeTruthy();
    expect(c.prestige).toBeGreaterThanOrEqual(0);
    expect(c.prestige).toBeLessThanOrEqual(3);
  });

  it("retourne aussi tous les champs pour unique", () => {
    const c = getRarityColors("commun", true);
    expect(c.outer).toMatch(/^#/);
    expect(c.label).toBe("unique");
  });
});

describe("getRarityColors — prestige progressif", () => {
  it("commun(0) < rare(1) < legendaire(2) < unique(3)", () => {
    const c = getRarityColors("commun").prestige;
    const r = getRarityColors("rare").prestige;
    const l = getRarityColors("legendaire").prestige;
    const u = getRarityColors("commun", true).prestige;
    expect(c).toBeLessThan(r);
    expect(r).toBeLessThan(l);
    expect(l).toBeLessThan(u);
  });
});

describe("getRarityColors — unique a priorité sur la rareté", () => {
  it.each(RARETES)("unique=true écrase la rareté %s", (rarete) => {
    const c = getRarityColors(rarete, true);
    expect(c.label).toBe("unique");
    expect(c.prestige).toBe(3);
  });
});

describe("getRarityColors — labels", () => {
  it("a un label distinct par rareté", () => {
    const labels = new Set([
      getRarityColors("commun").label,
      getRarityColors("rare").label,
      getRarityColors("legendaire").label,
      getRarityColors("commun", true).label,
    ]);
    expect(labels.size).toBe(4);
  });
});
