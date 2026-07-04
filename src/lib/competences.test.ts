import { describe, expect, it } from "vitest";
import type {
  CompetenceDef,
  CompetenceId,
  CompetenceTreeState,
} from "@/types/game";
import { aCompetence, etatCompetence } from "./competences";

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

function tree(
  niveau: number,
  pointsDisponibles: number,
  xp = 0,
): CompetenceTreeState {
  return { xp, niveau, pointsDisponibles };
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
  it("retourne debloquee si l'id est déjà dans la liste, quel que soit l'arbre", () => {
    const c = comp("general.charisme.1");
    expect(
      etatCompetence(c, ["general.charisme.1"] as CompetenceId[], undefined),
    ).toBe("debloquee");
  });
});

describe("etatCompetence — verrouillee par prérequis", () => {
  it("retourne verrouillee si un prérequis manque", () => {
    const c = comp("general.charisme.2", { prerequis: ["general.charisme.1"] });
    expect(etatCompetence(c, [] as CompetenceId[], tree(99, 99))).toBe(
      "verrouillee",
    );
  });

  it("retourne disponible si tous les prérequis sont satisfaits", () => {
    const c = comp("general.charisme.2", {
      prerequis: ["general.charisme.1"],
      niveauBrocanteurRequis: 1,
      coutPoints: 1,
    });
    expect(
      etatCompetence(
        c,
        ["general.charisme.1"] as CompetenceId[],
        tree(1, 1),
      ),
    ).toBe("disponible");
  });
});

describe("etatCompetence — verrouillee par arbre manquant", () => {
  it("retourne verrouillee si tree est undefined (et pas de prérequis manquant)", () => {
    const c = comp("general.charisme.1");
    expect(etatCompetence(c, [] as CompetenceId[], undefined)).toBe(
      "verrouillee",
    );
  });
});

describe("etatCompetence — verrouillee par niveau insuffisant", () => {
  it("retourne verrouillee si tree.niveau < niveauBrocanteurRequis", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 3, coutPoints: 1 });
    expect(etatCompetence(c, [] as CompetenceId[], tree(2, 5))).toBe(
      "verrouillee",
    );
  });

  it("retourne disponible si tree.niveau == niveauBrocanteurRequis", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 3, coutPoints: 1 });
    expect(etatCompetence(c, [] as CompetenceId[], tree(3, 5))).toBe(
      "disponible",
    );
  });
});

describe("etatCompetence — verrouillee par points insuffisants", () => {
  it("retourne verrouillee si pointsDisponibles < coutPoints", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 1, coutPoints: 3 });
    expect(etatCompetence(c, [] as CompetenceId[], tree(5, 2))).toBe(
      "verrouillee",
    );
  });

  it("retourne disponible si pointsDisponibles == coutPoints", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 1, coutPoints: 3 });
    expect(etatCompetence(c, [] as CompetenceId[], tree(5, 3))).toBe(
      "disponible",
    );
  });
});

describe("etatCompetence — ordre de priorité", () => {
  it("debloquee gagne sur verrouillee même si niveau/points insuffisants", () => {
    const c = comp("general.charisme.1", { niveauBrocanteurRequis: 99, coutPoints: 99 });
    expect(
      etatCompetence(
        c,
        ["general.charisme.1"] as CompetenceId[],
        tree(0, 0),
      ),
    ).toBe("debloquee");
  });

  it("prerequis manquant ⇒ verrouillee même si tree est OK", () => {
    const c = comp("general.charisme.2", {
      prerequis: ["general.charisme.1"],
      niveauBrocanteurRequis: 1,
      coutPoints: 0,
    });
    expect(etatCompetence(c, [] as CompetenceId[], tree(99, 99))).toBe(
      "verrouillee",
    );
  });
});
