import { describe, expect, it } from "vitest";
import type { CompetenceDef, CompetenceId, GameState } from "@/types/game";
import {
  aCompetence,
  bonusToleranceCategorie,
  bonusToleranceNegoGeneral,
  contexteDepuisState,
  etatCompetence,
} from "./competences";
import { getCompetence } from "@/data/competences";
import { emptyAffinites } from "@/lib/xp";

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
    affiniteRequise: 0,
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
        affinites: emptyAffinites(),
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
        affinites: emptyAffinites(),
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
        affinites: emptyAffinites(),
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
        affinites: emptyAffinites(),
      }),
    ).toBe("verrouillee");
  });

  it("retourne disponible si niveauBrocanteur == niveauBrocanteurRequis", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 3, coutPoints: 1 });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 5,
        niveauBrocanteur: 3,
        affinites: emptyAffinites(),
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
        affinites: emptyAffinites(),
      }),
    ).toBe("verrouillee");
  });

  it("retourne disponible si pointsDisponibles == coutPoints", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 1, coutPoints: 3 });
    expect(
      etatCompetence(c, [] as CompetenceId[], {
        pointsDisponibles: 3,
        niveauBrocanteur: 5,
        affinites: emptyAffinites(),
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
        affinites: emptyAffinites(),
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
        affinites: emptyAffinites(),
      }),
    ).toBe("verrouillee");
  });
});

const ctx = (over: Partial<ReturnType<typeof contexteDepuisState>> = {}) => ({
  pointsDisponibles: 10,
  niveauBrocanteur: 20,
  affinites: { ...emptyAffinites(), Musique: 60 },
  ...over,
});

describe("etatCompetence v2 — pool global", () => {
  const p1 = getCompetence("cat.Musique.reparer.1")!;
  const p2 = getCompetence("cat.Musique.reparer.2")!;
  const p3 = getCompetence("cat.Musique.reparer.3")!;
  const gen3 = getCompetence("general.negociation.3")!;

  it("palier 1 : disponible avec 1 point, sans autre condition", () => {
    expect(etatCompetence(p1, [], ctx({ niveauBrocanteur: 0, affinites: emptyAffinites() }))).toBe("disponible");
    expect(etatCompetence(p1, [], ctx({ pointsDisponibles: 0, niveauBrocanteur: 0, affinites: emptyAffinites() }))).toBe("verrouillee");
  });

  it("palier 2 : exige palier 1 + affinité 20", () => {
    expect(etatCompetence(p2, [], ctx())).toBe("verrouillee"); // prérequis manquant
    expect(etatCompetence(p2, [p1.id], ctx({ affinites: { ...emptyAffinites(), Musique: 19 } }))).toBe("verrouillee");
    expect(etatCompetence(p2, [p1.id], ctx({ affinites: { ...emptyAffinites(), Musique: 20 } }))).toBe("disponible");
  });

  it("palier 3 : exige palier 2 + affinité 50 + Brocanteur N12", () => {
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ niveauBrocanteur: 11 }))).toBe("verrouillee");
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ niveauBrocanteur: 12 }))).toBe("disponible");
    expect(etatCompetence(p3, [p1.id, p2.id], ctx({ affinites: { ...emptyAffinites(), Musique: 49 } }))).toBe("verrouillee");
  });

  it("général palier 3 : Brocanteur N12, jamais d'affinité", () => {
    const base = ctx({ affinites: emptyAffinites() });
    expect(etatCompetence(gen3, ["general.negociation.1", "general.negociation.2"], { ...base, niveauBrocanteur: 12 })).toBe("disponible");
    expect(etatCompetence(gen3, ["general.negociation.1", "general.negociation.2"], { ...base, niveauBrocanteur: 11 })).toBe("verrouillee");
  });

  it("déjà débloquée prime sur tout", () => {
    expect(etatCompetence(p3, [p1.id, p2.id, p3.id], ctx({ pointsDisponibles: 0, niveauBrocanteur: 0 }))).toBe("debloquee");
  });
});

describe("bonusToleranceCategorie — Œil aiguisé", () => {
  it("retourne 0 sans compétence débloquée", () => {
    expect(bonusToleranceCategorie(stateAvec([]), "Musique")).toBe(0);
  });

  it("retourne 0.10 au palier 1", () => {
    expect(
      bonusToleranceCategorie(
        stateAvec(["cat.Musique.oeil_aiguise.1" as CompetenceId]),
        "Musique",
      ),
    ).toBe(0.10);
  });

  it("retourne 0.20 au palier 2 (écrase le palier 1)", () => {
    expect(
      bonusToleranceCategorie(
        stateAvec([
          "cat.Musique.oeil_aiguise.1" as CompetenceId,
          "cat.Musique.oeil_aiguise.2" as CompetenceId,
        ]),
        "Musique",
      ),
    ).toBe(0.20);
  });

  it("retourne 0.30 au palier 3 (écrase les paliers inférieurs)", () => {
    expect(
      bonusToleranceCategorie(
        stateAvec([
          "cat.Musique.oeil_aiguise.1" as CompetenceId,
          "cat.Musique.oeil_aiguise.2" as CompetenceId,
          "cat.Musique.oeil_aiguise.3" as CompetenceId,
        ]),
        "Musique",
      ),
    ).toBe(0.30);
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
