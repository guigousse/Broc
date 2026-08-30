import { describe, expect, it } from "vitest";
import {
  GAMMES_BAZAR,
  genererEtal,
  prixEnJetons,
  poolDeGamme,
  NB_LOTS_PIECES,
} from "@/lib/bazar/etal";

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
  it("présente un lot de pièces", () => {
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

  it("présente trois articles, un par gamme, dans l'ordre de l'étagère", () => {
    const etal = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    expect(etal.articles).toHaveLength(GAMMES_BAZAR.length);
    etal.articles.forEach((article, i) => {
      expect(article).not.toBeNull();
      expect(article!.valeurBase).toBeGreaterThanOrEqual(GAMMES_BAZAR[i].min);
      expect(article!.valeurBase).toBeLessThanOrEqual(GAMMES_BAZAR[i].max);
      expect(article!.prix).toBe(prixEnJetons(article!.valeurBase));
    });
  });

  it("les trois articles sont des objets distincts", () => {
    const etal = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    const ids = etal.articles.map((a) => a!.templateId);
    expect(new Set(ids).size).toBe(3);
  });

  // Le prix monte le long de la planche : trouvaille modeste, vitrine de la
  // semaine, pièce de caractère. C'est ce qui donne au Bazar un horizon
  // au-delà du premier mois — à ~14 jetons de revenu hebdomadaire, la
  // troisième case demande deux à trois semaines d'épargne.
  it("les gammes montent en prix et ne se chevauchent pas", () => {
    const bornes = GAMMES_BAZAR.map((g) => [g.min, g.max]);
    expect(bornes).toEqual([
      [25, 99],
      [100, 400],
      [401, 1000],
    ]);
    for (let i = 1; i < GAMMES_BAZAR.length; i++) {
      expect(GAMMES_BAZAR[i].min).toBeGreaterThan(GAMMES_BAZAR[i - 1].max);
    }
  });

  it("est déterministe à rng identique", () => {
    const a = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    const b = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    expect(b).toEqual(a);
  });
});

// Une gamme dont le pool serait vide poserait une case morte à l'étal toutes
// les semaines, en silence. Le catalogue évolue (objets ajoutés, prix
// retouchés) : c'est le test qui doit crier, pas le joueur qui doit le voir.
describe("poolDeGamme — le catalogue nourrit les trois gammes", () => {
  it("aucune gamme n'est à sec, et chacune couvre les sept catégories", () => {
    for (const gamme of GAMMES_BAZAR) {
      const pool = poolDeGamme(gamme);
      expect(pool.length).toBeGreaterThan(10);
      const categories = new Set(pool.map((t) => t.categorie));
      expect(categories.size).toBe(7);
    }
  });

  it("un template n'appartient qu'à une seule gamme", () => {
    const vus = new Set<string>();
    for (const gamme of GAMMES_BAZAR) {
      for (const t of poolDeGamme(gamme)) {
        expect(vus.has(t.templateId)).toBe(false);
        vus.add(t.templateId);
      }
    }
  });
});
