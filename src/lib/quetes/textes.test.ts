import { describe, expect, it } from "vitest";
import { genererTexte } from "./textes";

describe("genererTexte", () => {
  it("insère le nom de l'objet et renvoie titre + corps + gabaritId", () => {
    const t = genererTexte("mode", ["Veste en jean délavée"], undefined, () => 0);
    expect(t.titre.length).toBeGreaterThan(0);
    expect(t.corps.join(" ")).toContain("Veste en jean délavée");
    expect(t.gabaritId).toBe("mode#0");
  });

  it("gère un commanditaire inconnu via le gabarit générique", () => {
    const t = genererTexte("inconnu", ["Lampe"], undefined, () => 0);
    expect(t.corps.join(" ")).toContain("Lampe");
    expect(t.gabaritId).toBe("generique#0");
  });

  it("trace la variante tirée par le RNG dans le gabaritId", () => {
    // rng ≈ 0.99 → dernière variante de « jeux-video » (2 variantes → index 1).
    const t = genererTexte("jeux-video", ["Manette"], "Bon", () => 0.99);
    expect(t.gabaritId).toBe("jeux-video#1");
  });
});
