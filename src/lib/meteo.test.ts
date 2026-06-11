import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JOURS_SEMAINE,
  indexJourSemaine,
  meteoDuJour,
  tirerMeteo,
  tirerMeteoSemaine,
} from "./meteo";
import { PERIODE_TENDANCES_JOURS } from "./tendances";
import { createMockGameState } from "./__test-fixtures__/gameState";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tirerMeteo", () => {
  it("retourne une valeur valide", () => {
    vi.restoreAllMocks();
    const valides = new Set(["ensoleille", "nuageux", "pluvieux", "orageux"]);
    for (let i = 0; i < 20; i++) {
      expect(valides.has(tirerMeteo())).toBe(true);
    }
  });

  it("random=0 → première météo (ensoleille, p=0.4)", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    expect(tirerMeteo()).toBe("ensoleille");
  });

  it("random=0.99 → orageux (cumul atteint à la fin)", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99);
    expect(tirerMeteo()).toBe("orageux");
  });

  it("distribution conforme aux probas sur 1000 tirages", () => {
    vi.restoreAllMocks();
    const counts: Record<string, number> = {};
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const m = tirerMeteo();
      counts[m] = (counts[m] ?? 0) + 1;
    }
    // ensoleille p=0.4 → attendu ~400, tolérance ±100
    expect(counts.ensoleille).toBeGreaterThan(300);
    expect(counts.ensoleille).toBeLessThan(500);
    // orageux p=0.1 → attendu ~100, tolérance ±60
    expect(counts.orageux ?? 0).toBeGreaterThan(40);
    expect(counts.orageux ?? 0).toBeLessThan(160);
  });
});

describe("tirerMeteoSemaine", () => {
  it("retourne PERIODE_TENDANCES_JOURS météos", () => {
    expect(tirerMeteoSemaine().length).toBe(PERIODE_TENDANCES_JOURS);
  });

  it("toutes valides", () => {
    vi.restoreAllMocks();
    const valides = new Set(["ensoleille", "nuageux", "pluvieux", "orageux"]);
    const week = tirerMeteoSemaine();
    for (const m of week) expect(valides.has(m)).toBe(true);
  });
});

describe("indexJourSemaine", () => {
  it("Jour 1 = vendredi = index 4", () => {
    expect(indexJourSemaine(1)).toBe(4);
  });

  it("alias de indexJourSemaineReel (cycle 7 jours)", () => {
    for (let j = 1; j < 30; j++) {
      expect(indexJourSemaine(j + 7)).toBe(indexJourSemaine(j));
    }
  });
});

describe("meteoDuJour", () => {
  it("renvoie la météo correspondant à l'index du jour", () => {
    const state = createMockGameState({
      jourActuel: 4, // index 0 = lundi
      meteoSemaine: ["ensoleille", "nuageux", "pluvieux", "orageux", "ensoleille", "nuageux", "pluvieux"],
    });
    expect(meteoDuJour(state)).toBe("ensoleille");
  });

  it("fallback nuageux si meteoSemaine est vide", () => {
    const state = createMockGameState({ jourActuel: 1, meteoSemaine: [] });
    expect(meteoDuJour(state)).toBe("nuageux");
  });
});

describe("JOURS_SEMAINE", () => {
  it("a 7 entrées dans l'ordre lundi-dimanche", () => {
    expect(JOURS_SEMAINE.length).toBe(7);
    expect(JOURS_SEMAINE[0]).toBe("Lun");
    expect(JOURS_SEMAINE[6]).toBe("Dim");
  });
});
