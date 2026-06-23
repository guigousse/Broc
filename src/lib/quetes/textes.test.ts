import { describe, expect, it } from "vitest";
import { genererTexte } from "./textes";

describe("genererTexte", () => {
  it("insère le nom de l'objet et renvoie titre + corps", () => {
    const t = genererTexte("mode", ["Veste en jean délavée"], undefined, () => 0);
    expect(t.titre.length).toBeGreaterThan(0);
    expect(t.corps.join(" ")).toContain("Veste en jean délavée");
  });

  it("gère un commanditaire inconnu via le gabarit générique", () => {
    const t = genererTexte("inconnu", ["Lampe"], undefined, () => 0);
    expect(t.corps.join(" ")).toContain("Lampe");
  });
});
