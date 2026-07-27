import { describe, expect, it } from "vitest";
import { coutClip, coutEpisode, coutImage, formaterDollars } from "./couts.mjs";

describe("coutClip", () => {
  it("chiffre un plan de 8 s en lite 720p", () => {
    expect(coutClip({ palier: "lite", definition: "720p", secondes: 8 })).toBeCloseTo(0.4, 5);
  });

  it("chiffre un plan de 8 s en fast 1080p", () => {
    expect(coutClip({ palier: "fast", definition: "1080p", secondes: 8 })).toBeCloseTo(0.96, 5);
  });

  it("chiffre un plan de 8 s en pro", () => {
    expect(coutClip({ palier: "pro", definition: "1080p", secondes: 8 })).toBeCloseTo(3.2, 5);
  });

  it("refuse un palier inconnu en le nommant", () => {
    expect(() => coutClip({ palier: "ultra", definition: "720p", secondes: 8 })).toThrow(/ultra/);
  });

  it("refuse une définition inconnue en la nommant", () => {
    expect(() => coutClip({ palier: "lite", definition: "4k", secondes: 8 })).toThrow(/4k/);
  });
});

describe("coutEpisode", () => {
  it("compte les deux plans", () => {
    expect(coutEpisode({ palier: "fast", definition: "1080p", plans: 2 })).toBeCloseTo(1.92, 5);
  });
});

describe("coutImage", () => {
  it("chiffre une image pro", () => {
    expect(coutImage("pro")).toBeCloseTo(0.134, 5);
  });

  it("chiffre une image flash", () => {
    expect(coutImage("flash")).toBeCloseTo(0.039, 5);
  });

  it("refuse un palier inconnu en le nommant", () => {
    expect(() => coutImage("ultra")).toThrow(/ultra/);
  });
});

describe("formaterDollars", () => {
  it("formate à la française avec deux décimales", () => {
    expect(formaterDollars(1.9200001)).toBe("1,92 $");
    expect(formaterDollars(0.4)).toBe("0,40 $");
  });
});
