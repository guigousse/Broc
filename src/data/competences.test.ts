import { describe, expect, it } from "vitest";
import {
  COMPETENCES,
  NIVEAU_BROCANTEUR_PALIER_2_GENERAL,
  NIVEAU_BROCANTEUR_PALIER_3,
  TREE_GENERAL,
} from "./competences";

describe("gating des paliers (pool global)", () => {
  it("96 compétences, IDs stables", () => {
    expect(COMPETENCES).toHaveLength(96);
    expect(COMPETENCES.some((c) => c.id === "cat.Musique.reparer.1")).toBe(true);
  });

  it("paliers thématiques : coutPoints 1/2/3, Brocanteur 0/0/12 (gate points + niveau seulement — décision 2026-07-06)", () => {
    const musique = COMPETENCES.filter((c) => c.treeId === "cat.Musique");
    for (const c of musique) {
      const attendu = [
        { niveauBrocanteurRequis: 0, coutPoints: 1 },
        { niveauBrocanteurRequis: 0, coutPoints: 2 },
        { niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_3, coutPoints: 3 },
      ][c.palierNumero - 1];
      expect({ niveauBrocanteurRequis: c.niveauBrocanteurRequis, coutPoints: c.coutPoints }).toEqual(attendu);
    }
  });

  it("paliers du général : Brocanteur 0/5/12", () => {
    const general = COMPETENCES.filter((c) => c.treeId === TREE_GENERAL);
    expect(general).toHaveLength(12);
    for (const c of general) {
      expect(c.niveauBrocanteurRequis).toBe(
        [0, NIVEAU_BROCANTEUR_PALIER_2_GENERAL, NIVEAU_BROCANTEUR_PALIER_3][c.palierNumero - 1],
      );
    }
  });

  it("prérequis en chaîne conservés", () => {
    const c = COMPETENCES.find((x) => x.id === "cat.Mode.passion.3")!;
    expect(c.prerequis).toEqual(["cat.Mode.passion.2"]);
  });
});
