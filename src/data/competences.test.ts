import { describe, expect, it } from "vitest";
import {
  COMPETENCES,
  COUT_TOTAL_COMPETENCES,
  NIVEAU_BROCANTEUR_PALIER_2,
  NIVEAU_BROCANTEUR_PALIER_3,
  pointsDepensesCompetences,
  TREE_GENERAL,
  TREES as ALL_TREES,
} from "./competences";

describe("gating des paliers (pool global)", () => {
  it("96 compétences, IDs stables", () => {
    expect(COMPETENCES).toHaveLength(96);
    expect(COMPETENCES.some((c) => c.id === "cat.Musique.reparer.1")).toBe(true);
  });

  it("paliers thématiques : coutPoints 1 partout, Brocanteur 0/10/30 (refonte 2026-07-21)", () => {
    const musique = COMPETENCES.filter((c) => c.treeId === "cat.Musique");
    for (const c of musique) {
      const attendu = [
        { niveauBrocanteurRequis: 0, coutPoints: 1 },
        { niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_2, coutPoints: 1 },
        { niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_3, coutPoints: 1 },
      ][c.palierNumero - 1];
      expect({ niveauBrocanteurRequis: c.niveauBrocanteurRequis, coutPoints: c.coutPoints }).toEqual(attendu);
    }
  });

  it("paliers du général : Brocanteur 0/10/30 (mêmes seuils que les thématiques)", () => {
    const general = COMPETENCES.filter((c) => c.treeId === TREE_GENERAL);
    expect(general).toHaveLength(12);
    for (const c of general) {
      expect(c.niveauBrocanteurRequis).toBe(
        [0, NIVEAU_BROCANTEUR_PALIER_2, NIVEAU_BROCANTEUR_PALIER_3][c.palierNumero - 1],
      );
    }
  });

  it("prérequis en chaîne conservés", () => {
    const c = COMPETENCES.find((x) => x.id === "cat.Mode.passion.3")!;
    expect(c.prerequis).toEqual(["cat.Mode.passion.2"]);
  });
});

describe("refonte des coûts (1 pt par palier)", () => {
  it("chaque palier coûte exactement 1 point", () => {
    for (const tree of ALL_TREES)
      for (const b of tree.branches)
        for (const p of b.paliers) expect(p.coutPoints, `${tree.id}.${b.id}.${p.numero}`).toBe(1);
  });
  it("COUT_TOTAL_COMPETENCES = nombre total de paliers (96)", () => {
    let n = 0;
    for (const tree of ALL_TREES) for (const b of tree.branches) n += b.paliers.length;
    expect(COUT_TOTAL_COMPETENCES).toBe(n);
    expect(COUT_TOTAL_COMPETENCES).toBe(96);
  });
  it("pointsDepensesCompetences somme les coûts des ids connus, ignore les inconnus", () => {
    expect(pointsDepensesCompetences(["general.negociation.1", "general.negociation.2"])).toBe(2);
    expect(pointsDepensesCompetences(["id.inconnu.9"])).toBe(0);
    expect(pointsDepensesCompetences([])).toBe(0);
  });
});
