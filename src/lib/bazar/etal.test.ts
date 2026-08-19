import { describe, expect, it } from "vitest";
import { genererEtal, prixEnJetons, NB_LOTS_PIECES } from "@/lib/bazar/etal";

/** RNG déterministe : une suite fixe, rejouée en boucle. */
function rngFixe(suite: number[]): () => number {
  let i = 0;
  return () => suite[i++ % suite.length];
}

describe("prixEnJetons", () => {
  it("arrondit au supérieur, jamais en dessous de 1", () => {
    expect(prixEnJetons(250)).toBe(10);
    expect(prixEnJetons(260)).toBe(11);
    expect(prixEnJetons(9)).toBe(1);
  });
});

describe("genererEtal", () => {
  it("présente trois lots de pièces, de trois catégories distinctes", () => {
    const etal = genererEtal("2026-W34", rngFixe([0.1, 0.4, 0.7, 0.2]));
    expect(etal.lotsPieces).toHaveLength(NB_LOTS_PIECES);
    const cats = etal.lotsPieces.map((l) => l.categorie);
    expect(new Set(cats).size).toBe(NB_LOTS_PIECES);
  });

  it("chaque lot coûte 1 jeton et donne 5 pièces", () => {
    for (const lot of genererEtal("2026-W34", rngFixe([0.3])).lotsPieces) {
      expect(lot.prix).toBe(1);
      expect(lot.quantite).toBe(5);
    }
  });

  it("la vitrine porte un objet dont le prix de base tient dans la fourchette", () => {
    const etal = genererEtal("2026-W34", rngFixe([0.42]));
    expect(etal.vitrine).not.toBeNull();
    expect(etal.vitrine!.valeurBase).toBeGreaterThanOrEqual(100);
    expect(etal.vitrine!.valeurBase).toBeLessThanOrEqual(400);
    expect(etal.vitrine!.prix).toBe(prixEnJetons(etal.vitrine!.valeurBase));
  });

  it("est déterministe à rng identique", () => {
    const a = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    const b = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    expect(b).toEqual(a);
  });
});
