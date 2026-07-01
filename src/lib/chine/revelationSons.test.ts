import { describe, it, expect } from "vitest";
import { sonsRevelation } from "./revelationSons";

describe("sonsRevelation", () => {
  it("item commun → apparition seule", () => {
    expect(sonsRevelation({ kind: "item", estRareOuPlus: false })).toEqual([
      "apparition",
    ]);
  });
  it("item rare/lég./unique → apparition + rareté", () => {
    expect(sonsRevelation({ kind: "item", estRareOuPlus: true })).toEqual([
      "apparition",
      "rarete",
    ]);
  });
  it("vendeur mystère → apparition + mystère (jamais rareté)", () => {
    expect(sonsRevelation({ kind: "mystere" })).toEqual([
      "apparition",
      "mystere",
    ]);
  });
});
