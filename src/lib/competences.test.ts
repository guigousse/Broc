import { describe, expect, it } from "vitest";
import type { CompetenceDef, CompetenceId, GameState } from "@/types/game";
import {
  aCompetence,
  aCompetenceReparation,
  aSpecialisteCategorie,
  bonusPassionCategorie,
  bonusMarchandageCategorie,
  bonusToleranceNegoGeneral,
  contexteDepuisState,
  etatCompetence,
} from "./competences";
import { getCompetence, catTreeId } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";

function stateAvec(debloquees: CompetenceId[]): GameState {
  return { competencesDebloquees: debloquees } as GameState;
}

function comp(
  id: string,
  opts: {
    niveauBrocanteurRequis?: number;
    coutPoints?: number;
    prerequis?: string[];
  } = {},
): CompetenceDef {
  return {
    id: id as CompetenceId,
    treeId: "general",
    brancheId: "test",
    palierNumero: 1,
    nom: id,
    description: "",
    niveauBrocanteurRequis: opts.niveauBrocanteurRequis ?? 1,
    coutPoints: opts.coutPoints ?? 1,
    prerequis: (opts.prerequis ?? []) as CompetenceId[],
  };
}

describe("aCompetence", () => {
  const debloquees = ["general.charisme.1", "general.charisme.2"] as CompetenceId[];

  it("retourne true si l'id est dans la liste", () => {
    expect(aCompetence("general.charisme.1" as CompetenceId, debloquees)).toBe(true);
  });

  it("retourne false si l'id n'est pas dans la liste", () => {
    expect(aCompetence("general.charisme.3" as CompetenceId, debloquees)).toBe(false);
  });

  it("retourne false sur liste vide", () => {
    expect(aCompetence("general.charisme.1" as CompetenceId, [])).toBe(false);
  });
});

describe("etatCompetence — debloquee", () => {
  it("retourne debloquee si l'id est déjà dans la liste, quel que soit le contexte", () => {
    const c = comp("general.charisme.1");
    expect(
      etatCompetence(c, ["general.charisme.1"] as CompetenceId[], {
        pointsDisponibles: 0,
        niveauBrocanteur: 0,
      }),
    ).toBe("debloquee");
  });
});

describe("etatCompetence — verrouillee par prérequis", () => {
  it("retourne verrouillee si un prérequis manque", () => {
    const c = comp("general.charisme.2", { prerequis: ["general.charisme.1"] });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 99,
        niveauBrocanteur: 99,
      }),
    ).toBe("verrouillee");
  });

  it("retourne disponible si tous les prérequis sont satisfaits", () => {
    const c = comp("general.charisme.2", {
      prerequis: ["general.charisme.1"],
      niveauBrocanteurRequis: 1,
      coutPoints: 1,
    });
    expect(
      etatCompetence(c, ["general.charisme.1"] as CompetenceId[], {
        pointsDisponibles: 1,
        niveauBrocanteur: 1,
      }),
    ).toBe("disponible");
  });
});

describe("etatCompetence — verrouillee par niveau insuffisant", () => {
  it("retourne verrouillee si niveauBrocanteur < niveauBrocanteurRequis", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 3, coutPoints: 1 });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 5,
        niveauBrocanteur: 2,
      }),
    ).toBe("verrouillee");
  });

  it("retourne disponible si niveauBrocanteur == niveauBrocanteurRequis", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 3, coutPoints: 1 });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 5,
        niveauBrocanteur: 3,
      }),
    ).toBe("disponible");
  });
});

describe("etatCompetence — verrouillee par points insuffisants", () => {
  it("retourne verrouillee si pointsDisponibles < coutPoints", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 1, coutPoints: 3 });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 2,
        niveauBrocanteur: 5,
      }),
    ).toBe("verrouillee");
  });

  it("retourne disponible si pointsDisponibles == coutPoints", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 1, coutPoints: 3 });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 3,
        niveauBrocanteur: 5,
      }),
    ).toBe("disponible");
  });
});

describe("etatCompetence — ordre de priorité", () => {
  it("debloquee gagne sur verrouillee même si niveau/points insuffisants", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 99, coutPoints: 99 });
    expect(
      etatCompetence(c, ["general.charisme.1"] as CompetenceId[], {
        pointsDisponibles: 0,
        niveauBrocanteur: 0,
      }),
    ).toBe("debloquee");
  });

  it("prerequis manquant ⇒ verrouillee même si contexte est OK", () => {
    const c = comp("general.charisme.2", {
      prerequis: ["general.charisme.1"],
      niveauBrocanteurRequis: 1,
      coutPoints: 0,
    });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 99,
        niveauBrocanteur: 99,
      }),
    ).toBe("verrouillee");
  });
});

const ctx = (over: Partial<ReturnType<typeof contexteDepuisState>> = {}) => ({
  pointsDisponibles: 10,
  niveauBrocanteur: 20,
  ...over,
});

describe("etatCompetence v2 — pool global (paliers gatés par points + niveau seulement — décision 2026-07-06)", () => {
  const p1 = getCompetence("cat.Musique.reparer.1")!;
  const p2 = getCompetence("cat.Musique.reparer.2")!;
  const p3 = getCompetence("cat.Musique.reparer.3")!;
  const gen3 = getCompetence("general.negociation.3")!;

  it("palier 1 : disponible avec 1 point, sans autre condition", () => {
    expect(etatCompetence(p1, [], ctx({ niveauBrocanteur: 0 }))).toBe("disponible");
    expect(etatCompetence(p1, [], ctx({ pointsDisponibles: 0, niveauBrocanteur: 0 }))).toBe("verrouillee");
  });

  it("palier 2 : exige palier 1 + points, aucune autre condition", () => {
    expect(etatCompetence(p2, [], ctx())).toBe("verrouillee"); // prérequis manquant
    expect(etatCompetence(p2, [p1.id], ctx({ pointsDisponibles: 0 }))).toBe("verrouillee");
    expect(etatCompetence(p2, [p1.id], ctx())).toBe("disponible");
  });

  it("palier 3 : exige palier 2 + Brocanteur N30", () => {
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ niveauBrocanteur: 29 }))).toBe("verrouillee");
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ niveauBrocanteur: 30 }))).toBe("disponible");
  });

  it("général palier 3 : Brocanteur N30", () => {
    expect(etatCompetence(gen3, ["general.negociation.1", "general.negociation.2"], ctx({ niveauBrocanteur: 30 }))).toBe("disponible");
    expect(etatCompetence(gen3, ["general.negociation.1", "general.negociation.2"], ctx({ niveauBrocanteur: 29 }))).toBe("verrouillee");
  });

  it("déjà débloquée prime sur tout", () => {
    expect(etatCompetence(p3, [p1.id, p2.id, p3.id], ctx({ pointsDisponibles: 0, niveauBrocanteur: 0 }))).toBe("debloquee");
  });
});

describe("bonusPassionCategorie — Passion", () => {
  it("retourne 0 sans compétence débloquée", () => {
    expect(bonusPassionCategorie(stateAvec([]), "Musique")).toBe(0);
  });

  it("retourne 0.05 au palier 1", () => {
    expect(
      bonusPassionCategorie(
        stateAvec(["cat.Musique.passion.1" as CompetenceId]),
        "Musique",
      ),
    ).toBe(0.05);
  });

  it("retourne 0.10 au palier 2 (écrase le palier 1)", () => {
    expect(
      bonusPassionCategorie(
        stateAvec([
          "cat.Musique.passion.1" as CompetenceId,
          "cat.Musique.passion.2" as CompetenceId,
        ]),
        "Musique",
      ),
    ).toBe(0.10);
  });

  it("retourne 0.20 au palier 3 (écrase les paliers inférieurs)", () => {
    expect(
      bonusPassionCategorie(
        stateAvec([
          "cat.Musique.passion.1" as CompetenceId,
          "cat.Musique.passion.2" as CompetenceId,
          "cat.Musique.passion.3" as CompetenceId,
        ]),
        "Musique",
      ),
    ).toBe(0.20);
  });

  it("ne déborde pas sur une autre catégorie", () => {
    expect(
      bonusPassionCategorie(
        stateAvec(["cat.Musique.passion.3" as CompetenceId]),
        "Mode",
      ),
    ).toBe(0);
  });
});

describe("aSpecialisteCategorie — compat palier ≥ 2", () => {
  it("faux au palier 1, vrai dès le palier 2", () => {
    expect(
      aSpecialisteCategorie(
        stateAvec(["cat.Musique.passion.1" as CompetenceId]),
        "Musique",
      ),
    ).toBe(false);
    expect(
      aSpecialisteCategorie(
        stateAvec(["cat.Musique.passion.2" as CompetenceId]),
        "Musique",
      ),
    ).toBe(true);
  });
});

describe("bonusMarchandageCategorie — Marchandage", () => {
  it("retourne 0 sans compétence débloquée", () => {
    expect(bonusMarchandageCategorie(stateAvec([]), "Musique")).toBe(0);
  });

  it("retourne 0.04 au palier 1", () => {
    expect(
      bonusMarchandageCategorie(
        stateAvec(["cat.Musique.marchandage.1" as CompetenceId]),
        "Musique",
      ),
    ).toBe(0.04);
  });

  it("retourne 0.08 au palier 2 (écrase le palier 1)", () => {
    expect(
      bonusMarchandageCategorie(
        stateAvec([
          "cat.Musique.marchandage.1" as CompetenceId,
          "cat.Musique.marchandage.2" as CompetenceId,
        ]),
        "Musique",
      ),
    ).toBe(0.08);
  });

  it("retourne 0.12 au palier 3 (écrase les paliers inférieurs)", () => {
    expect(
      bonusMarchandageCategorie(
        stateAvec([
          "cat.Musique.marchandage.1" as CompetenceId,
          "cat.Musique.marchandage.2" as CompetenceId,
          "cat.Musique.marchandage.3" as CompetenceId,
        ]),
        "Musique",
      ),
    ).toBe(0.12);
  });

  it("ne déborde pas sur une autre catégorie", () => {
    expect(
      bonusMarchandageCategorie(
        stateAvec(["cat.Musique.marchandage.3" as CompetenceId]),
        "Mode",
      ),
    ).toBe(0);
  });
});

describe("bonusToleranceNegoGeneral — Verbe haut / Verbe d'or", () => {
  it("retourne 0 sans compétence débloquée", () => {
    expect(bonusToleranceNegoGeneral(stateAvec([]))).toBe(0);
  });

  it("retourne 0.20 avec Verbe haut", () => {
    expect(
      bonusToleranceNegoGeneral(stateAvec(["general.negociation.1" as CompetenceId])),
    ).toBe(0.20);
  });

  it("retourne 0.40 avec Verbe d'or (écrase Verbe haut)", () => {
    expect(
      bonusToleranceNegoGeneral(
        stateAvec([
          "general.negociation.1" as CompetenceId,
          "general.negociation.2" as CompetenceId,
        ]),
      ),
    ).toBe(0.40);
  });
});

/**
 * Ouverture de l'Atelier (2026-08-19) : l'onglet reste affiché dès le début
 * mais cadenassé, et c'est la PREMIÈRE compétence Réparer — n'importe
 * laquelle — qui le libère.
 */
describe("aCompetenceReparation", () => {
  it("faux tant qu'aucune branche Réparer n'est ouverte", () => {
    const s = stateAvec([]);
    expect(aCompetenceReparation(s)).toBe(false);
  });

  it("vrai dès un apprenti, quelle que soit la catégorie", () => {
    for (const cat of CATEGORIES) {
      const s = stateAvec([`${catTreeId(cat)}.reparer.1` as CompetenceId]);
      expect(aCompetenceReparation(s), cat).toBe(true);
    }
  });

  it("un palier supérieur SEUL ne compte pas — l'apprenti est le prérequis réel", () => {
    // Défensif : une save trafiquée pourrait porter reparer.2 sans reparer.1.
    // L'atelier ne s'ouvre que sur le palier qui rend une restauration possible.
    const s = stateAvec([`${catTreeId(CATEGORIES[0])}.reparer.2` as CompetenceId]);
    expect(aCompetenceReparation(s)).toBe(false);
  });

  it("les compétences d'autres branches n'ouvrent rien", () => {
    const s = stateAvec([
      "general.presentation.1" as CompetenceId,
      `${catTreeId(CATEGORIES[0])}.connaisseur.1` as CompetenceId,
    ]);
    expect(aCompetenceReparation(s)).toBe(false);
  });
});
