import { describe, expect, it } from "vitest";
import { journalSolMode } from "./gazette";
import { indexJourSemaineReel } from "./calendrier";

/** Premier jour de jeu ≥ 1 qui tombe un lundi / mardi. */
function jour(idxSemaine: number): number {
  for (let j = 1; j < 15; j++) {
    if (indexJourSemaineReel(j) === idxSemaine) return j;
  }
  throw new Error("introuvable");
}
const LUNDI = jour(0);
const MARDI = jour(1);

const base = {
  competencesDebloquees: ["cat.Musique.connaisseur.1"],
  tutoGazette: "faite" as const,
  gazetteAchetee: false,
  gazetteRefusee: false,
  jourActuel: LUNDI,
};

describe("journalSolMode", () => {
  it("null tant qu'aucune compétence gazette n'est débloquée", () => {
    expect(journalSolMode({ ...base, competencesDebloquees: [] })).toBe(null);
    expect(
      journalSolMode({
        ...base,
        competencesDebloquees: [],
        tutoGazette: "aFaire",
      }),
    ).toBe(null);
  });

  it("mode tuto dès le déblocage, quel que soit le jour, tant que le tuto n'est pas fait", () => {
    expect(journalSolMode({ ...base, tutoGazette: "aFaire", jourActuel: MARDI })).toBe("tuto");
    expect(journalSolMode({ ...base, tutoGazette: undefined, jourActuel: MARDI })).toBe("tuto");
  });

  it("mode tuto prioritaire même un lundi", () => {
    expect(journalSolMode({ ...base, tutoGazette: "aFaire" })).toBe("tuto");
  });

  it("mode achat le lundi, tuto fait, ni achetée ni refusée", () => {
    expect(journalSolMode(base)).toBe("achat");
  });

  it("null le lundi si édition déjà achetée", () => {
    expect(journalSolMode({ ...base, gazetteAchetee: true })).toBe(null);
  });

  it("null le lundi si édition refusée", () => {
    expect(journalSolMode({ ...base, gazetteRefusee: true })).toBe(null);
  });

  it("null le mardi (édition manquée, disparition automatique)", () => {
    expect(journalSolMode({ ...base, jourActuel: MARDI })).toBe(null);
  });
});
