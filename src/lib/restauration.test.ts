import { describe, it, expect } from "vitest";
import {
  DUREE_RESTAURATION_MS,
  FENETRE_PUB_MS,
  dureeRestaurationMs,
  restantMs,
  progression,
  estPret,
  peutTerminerImmediat,
} from "./restauration";
import type { GameState } from "@/types/game";

const H = 60 * 60 * 1000;
const CAT = "Livres & Papeterie";

// État minimal : `aMaitreReparer` lit competencesDebloquees.
function stateSansMaitre(): GameState {
  return { competencesDebloquees: [] } as unknown as GameState;
}
function stateMaitre(): GameState {
  // aMaitreReparer(state, "Livres & Papeterie") teste "cat.Livres & Papeterie.reparer.3".
  return {
    competencesDebloquees: ["cat.Livres & Papeterie.reparer.3"],
  } as unknown as GameState;
}

describe("dureeRestaurationMs", () => {
  it("durées par état de départ (sans maître)", () => {
    const s = stateSansMaitre();
    expect(dureeRestaurationMs(s, CAT, "Mauvais")).toBe(1 * H);
    expect(dureeRestaurationMs(s, CAT, "Bon")).toBe(2 * H);
    expect(dureeRestaurationMs(s, CAT, "Très bon")).toBe(4 * H);
  });

  it("Maître Réparer réduit la durée de 30 min", () => {
    expect(dureeRestaurationMs(stateMaitre(), CAT, "Mauvais")).toBe(
      1 * H - 30 * 60 * 1000,
    );
    expect(dureeRestaurationMs(stateMaitre(), CAT, "Bon")).toBe(
      2 * H - 30 * 60 * 1000,
    );
  });
});

describe("restant / progression / prêt", () => {
  const enRest = { etatCible: "Bon" as const, debutMs: 1000, finMs: 1000 + 2 * H };

  it("restantMs décroît, plancher à 0", () => {
    expect(restantMs(enRest, 1000)).toBe(2 * H);
    expect(restantMs(enRest, 1000 + 2 * H + 5000)).toBe(0);
  });

  it("progression va de 0 à 1", () => {
    expect(progression(enRest, 1000)).toBe(0);
    expect(progression(enRest, 1000 + H)).toBeCloseTo(0.5, 5);
    expect(progression(enRest, 1000 + 3 * H)).toBe(1);
  });

  it("estPret quand now >= finMs", () => {
    expect(estPret(enRest, 1000 + 2 * H - 1)).toBe(false);
    expect(estPret(enRest, 1000 + 2 * H)).toBe(true);
  });
});

describe("peutTerminerImmediat (fenêtre pub)", () => {
  const enRest = { etatCible: "Bon" as const, debutMs: 0, finMs: 10 * H };

  it("faux si > 30 min restantes", () => {
    expect(peutTerminerImmediat(enRest, 10 * H - FENETRE_PUB_MS - 1)).toBe(false);
  });
  it("vrai si 0 < restant <= 30 min", () => {
    expect(peutTerminerImmediat(enRest, 10 * H - FENETRE_PUB_MS)).toBe(true);
    expect(peutTerminerImmediat(enRest, 10 * H - 1)).toBe(true);
  });
  it("faux si déjà fini (restant = 0)", () => {
    expect(peutTerminerImmediat(enRest, 10 * H)).toBe(false);
  });
});

it("DUREE_RESTAURATION_MS couvre tous les états", () => {
  expect(DUREE_RESTAURATION_MS["Mauvais"]).toBe(1 * H);
  expect(DUREE_RESTAURATION_MS["Pristin état"]).toBe(0);
});
