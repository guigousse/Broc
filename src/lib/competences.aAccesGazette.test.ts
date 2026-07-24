import { describe, expect, it } from "vitest";
import { aAccesGazette } from "./competences";

describe("aAccesGazette", () => {
  it("faux sans aucune compétence", () => {
    expect(aAccesGazette({ competencesDebloquees: [] })).toBe(false);
  });

  it("faux avec des compétences sans lien avec la gazette", () => {
    expect(
      aAccesGazette({
        competencesDebloquees: [
          "cat.Musique.reparer.1",
          "general.negociation.1",
          "general.presentation.2",
        ],
      }),
    ).toBe(false);
  });

  it("vrai avec un Veilleur (Connaisseur palier 1, n'importe quelle catégorie)", () => {
    expect(
      aAccesGazette({ competencesDebloquees: ["cat.Musique.connaisseur.1"] }),
    ).toBe(true);
    expect(
      aAccesGazette({ competencesDebloquees: ["cat.Mode.connaisseur.1"] }),
    ).toBe(true);
  });

  it("vrai avec n'importe quel palier de Vision du marché", () => {
    expect(aAccesGazette({ competencesDebloquees: ["general.vision.1"] })).toBe(true);
    expect(aAccesGazette({ competencesDebloquees: ["general.vision.3"] })).toBe(true);
  });
});
