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
  it("commun jamais croisé → apparition + découverte", () => {
    expect(
      sonsRevelation({ kind: "item", estRareOuPlus: false, estNouveau: true }),
    ).toEqual(["apparition", "decouverte"]);
  });
  it("rare jamais croisé → les deux sons se cumulent", () => {
    expect(
      sonsRevelation({ kind: "item", estRareOuPlus: true, estNouveau: true }),
    ).toEqual(["apparition", "rarete", "decouverte"]);
  });
  it("vendeur mystère ne joue jamais la découverte", () => {
    expect(sonsRevelation({ kind: "mystere", estNouveau: true })).toEqual([
      "apparition",
      "mystere",
    ]);
  });
});
