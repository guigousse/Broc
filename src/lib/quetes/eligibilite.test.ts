import { describe, expect, it } from "vitest";
import { brocanteTier4Debloquee, formeEligible } from "./eligibilite";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { ID_GRANDE_BRADERIE, prochaineBraderie } from "@/lib/evenements";
import { CATEGORIES } from "@/data/categories";
import { catTreeId } from "@/data/competences";
import type { CompetenceId } from "@/types/game";

describe("brocanteTier4Debloquee", () => {
  it("est faux sur une partie neuve", () => {
    expect(brocanteTier4Debloquee(createMockGameState())).toBe(false);
  });

  it("la Grande Braderie ouverte ne débloque PAS le tier 4", () => {
    // La braderie s'ouvre sur `estJourBraderie(jourActuel)` : sur une partie
    // neuve elle est FERMÉE, et un test posé là n'exercerait pas l'exclusion
    // qu'il prétend couvrir. On se cale donc sur son jour.
    const state = createMockGameState({ jourActuel: prochaineBraderie(1) });
    const tier4 = calculerBrocantesDebloqueesParTier(state).get(4) ?? new Set<string>();
    // Le test n'a de sens que si la braderie est ouverte ce jour-là ET seule.
    expect([...tier4]).toEqual([ID_GRANDE_BRADERIE]);
    expect(brocanteTier4Debloquee(state)).toBe(false);
  });
});

describe("formeEligible", () => {
  it("une forme sans verrou est toujours éligible", () => {
    const state = createMockGameState();
    for (const f of ["objet", "objetsRares", "beneficeCumule", "chiffreAffaires", "profitVente", "ventesCategorie"] as const) {
      expect(formeEligible(f, state)).toBe(true);
    }
  });

  it("la restauration attend la première compétence Réparer", () => {
    expect(formeEligible("restauration", createMockGameState())).toBe(false);
    const state = createMockGameState({
      competencesDebloquees: [`${catTreeId(CATEGORIES[0])}.reparer.1`] as CompetenceId[],
    });
    expect(formeEligible("restauration", state)).toBe(true);
  });

  it("la pièce légendaire attend une brocante tier 4", () => {
    expect(formeEligible("objetLegendaire", createMockGameState())).toBe(false);
  });
});
