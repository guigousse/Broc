import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/data/categories";
import {
  NB_TENDANCES,
  PERIODE_TENDANCES_JOURS,
  PRIX_GAZETTE,
  genererTendances,
  modificateurTendance,
  numeroEdition,
  numeroSemaine,
} from "./tendances";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("constantes", () => {
  it("PERIODE_TENDANCES_JOURS = 7", () => {
    expect(PERIODE_TENDANCES_JOURS).toBe(7);
  });

  it("NB_TENDANCES <= nombre total de catégories", () => {
    expect(NB_TENDANCES).toBeLessThanOrEqual(CATEGORIES.length);
    expect(NB_TENDANCES).toBeGreaterThan(0);
  });

  it("PRIX_GAZETTE > 0", () => {
    expect(PRIX_GAZETTE).toBeGreaterThan(0);
  });
});

describe("genererTendances", () => {
  it("retourne NB_TENDANCES éléments", () => {
    const t = genererTendances();
    expect(t.length).toBe(NB_TENDANCES);
  });

  it("toutes les tendances ont une catégorie distincte", () => {
    const t = genererTendances();
    const cats = new Set(t.map((x) => x.categorie));
    expect(cats.size).toBe(t.length);
  });

  it("delta dans [-25, 25]", () => {
    // Run plusieurs fois avec random varié pour couvrir la plage
    vi.restoreAllMocks();
    for (let run = 0; run < 10; run++) {
      const t = genererTendances();
      for (const x of t) {
        expect(x.delta).toBeGreaterThanOrEqual(-25);
        expect(x.delta).toBeLessThanOrEqual(25);
      }
    }
  });

  it("delta jamais exactement 0 (remplacé par ±5)", () => {
    vi.restoreAllMocks();
    for (let run = 0; run < 20; run++) {
      const t = genererTendances();
      for (const x of t) {
        expect(x.delta).not.toBe(0);
      }
    }
  });

  it("avec garantirPositifFort, au moins une tendance >= +15", () => {
    vi.restoreAllMocks();
    for (let run = 0; run < 5; run++) {
      const t = genererTendances({ garantirPositifFort: true });
      const max = Math.max(...t.map((x) => x.delta));
      expect(max).toBeGreaterThanOrEqual(15);
    }
  });
});

describe("modificateurTendance", () => {
  it("retourne 1 + delta/100 si la catégorie est dans la liste", () => {
    expect(
      modificateurTendance("Musique", [{ categorie: "Musique", delta: 25 }]),
    ).toBeCloseTo(1.25);
    expect(
      modificateurTendance("Musique", [{ categorie: "Musique", delta: -10 }]),
    ).toBeCloseTo(0.9);
  });

  it("retourne 1 si la catégorie n'est pas dans la liste", () => {
    expect(modificateurTendance("Musique", [])).toBe(1);
    expect(
      modificateurTendance("Musique", [{ categorie: "Mode", delta: 20 }]),
    ).toBe(1);
  });
});

describe("numeroEdition / numeroSemaine", () => {
  it("jour 1 → édition 047, semaine 1", () => {
    expect(numeroEdition(1)).toBe("047");
    expect(numeroSemaine(1)).toBe(1);
  });

  it("jour 7 → semaine 1, jour 8 → semaine 2", () => {
    expect(numeroSemaine(7)).toBe(1);
    expect(numeroSemaine(8)).toBe(2);
  });

  it("numeroEdition est zero-padded à 3 chiffres", () => {
    const s = numeroEdition(1);
    expect(s).toMatch(/^\d{3}$/);
  });

  it("numeroEdition croît d'un par semaine", () => {
    const e1 = parseInt(numeroEdition(1));
    const e2 = parseInt(numeroEdition(8));
    expect(e2 - e1).toBe(1);
  });
});
