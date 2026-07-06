import { describe, expect, it } from "vitest";
import { prixSuggere } from "./prixSuggere";

describe("prixSuggere", () => {
  const obj = { prixReferenceReel: 200, prixAchat: 60, prixVenteSouhaite: undefined };
  it("marché connu : ancré sur la référence × facteur", () => {
    expect(prixSuggere(obj, true, 1)).toBe(200);
    expect(prixSuggere(obj, true, 1.4)).toBe(280);
  });
  it("marché inconnu : ancré sur le prix d'achat × 1.5, arrondi à la dizaine — la référence ne fuit pas", () => {
    expect(prixSuggere(obj, false, 1)).toBe(90);
    expect(prixSuggere(obj, false, 1.4)).toBe(90); // le facteur ref ne s'applique qu'au marché connu
  });
  it("marché inconnu sans prix d'achat : référence grossièrement arrondie à la dizaine", () => {
    expect(prixSuggere({ ...obj, prixAchat: undefined }, false, 1)).toBe(200); // 200 déjà rond
    expect(prixSuggere({ prixReferenceReel: 187, prixAchat: undefined }, false, 1)).toBe(190);
  });
  it("prixVenteSouhaite prime toujours", () => {
    expect(prixSuggere({ ...obj, prixVenteSouhaite: 42 }, false, 1)).toBe(42);
  });
});
