import { describe, expect, it } from "vitest";
import {
  appliquerGainXPBrocanteur,
  detailProgressionBrocanteur,
  emptyBrocanteur,
  progressionNiveauBrocanteur,
  xpRequisPourNiveauBrocanteur,
} from "./xp";

const freshBrocanteur = () => ({ xp: 0, niveau: 0, pointsDisponibles: 0 });

describe("xpRequisPourNiveauBrocanteur — courbe quasi plate 0,5N²+99,5N (échelle 100 niveaux, 2026-07-10)", () => {
  it("seuils cumulés post-aplatissement", () => {
    expect(xpRequisPourNiveauBrocanteur(0)).toBe(0);
    expect(xpRequisPourNiveauBrocanteur(1)).toBe(100);
    expect(xpRequisPourNiveauBrocanteur(2)).toBe(201);
    expect(xpRequisPourNiveauBrocanteur(3)).toBe(303);
    expect(xpRequisPourNiveauBrocanteur(5)).toBe(510);
    expect(xpRequisPourNiveauBrocanteur(10)).toBe(1045);
    expect(xpRequisPourNiveauBrocanteur(20)).toBe(2190);
    expect(xpRequisPourNiveauBrocanteur(30)).toBe(3435);
  });

  it("l'incrément entre niveaux vaut N + 99", () => {
    for (const n of [1, 2, 5, 10, 25, 100]) {
      expect(
        xpRequisPourNiveauBrocanteur(n) - xpRequisPourNiveauBrocanteur(n - 1),
      ).toBe(n + 99);
    }
  });

  it("niveaux négatifs traités comme 0", () => {
    expect(xpRequisPourNiveauBrocanteur(-3)).toBe(0);
  });
});

describe("appliquerGainXPBrocanteur", () => {
  it("gain sous le seuil : pas de level-up", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 99);
    expect(res).toEqual({ xp: 99, niveau: 0, pointsDisponibles: 0 });
  });

  it("level-up simple : +1 niveau, +1 point", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 100);
    expect(res).toEqual({ xp: 100, niveau: 1, pointsDisponibles: 1 });
  });

  it("multi-level-up en un seul gain (480 XP → niveau 4, 4 points)", () => {
    // Cumuls : N1 100 · N2 201 · N3 303 · N4 406 · N5 510.
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 480);
    expect(res.niveau).toBe(4);
    expect(res.pointsDisponibles).toBe(4);
  });

  it("plafond : l'XP au-delà du niveau 100 ne fait plus monter", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 1_000_000);
    expect(res.niveau).toBe(100);
    expect(res.pointsDisponibles).toBe(100);
  });

  it("conserve les points déjà présents", () => {
    const res = appliquerGainXPBrocanteur(
      { xp: 100, niveau: 1, pointsDisponibles: 5 },
      160,
    );
    expect(res).toEqual({ xp: 260, niveau: 2, pointsDisponibles: 6 });
  });

  it("gain nul ou négatif : état inchangé", () => {
    const b = { xp: 300, niveau: 2, pointsDisponibles: 1 };
    expect(appliquerGainXPBrocanteur(b, 0)).toEqual(b);
    expect(appliquerGainXPBrocanteur(b, -10)).toEqual(b);
  });
});

describe("progressionNiveauBrocanteur", () => {
  it("0 juste après un level-up, 0.5 à mi-chemin", () => {
    expect(progressionNiveauBrocanteur({ xp: 100, niveau: 1, pointsDisponibles: 0 })).toBe(0);
    // niveau 1 → 2 : seuils 100 → 201, span 101 ; 100+50,5=150,5 → 0.5
    expect(progressionNiveauBrocanteur({ xp: 150.5, niveau: 1, pointsDisponibles: 0 })).toBe(0.5);
  });
});

describe("detailProgressionBrocanteur", () => {
  it("état frais (xp 0, niveau 0) : rien accumulé, palier 1 = 100", () => {
    expect(detailProgressionBrocanteur(freshBrocanteur())).toEqual({
      dansNiveau: 0,
      requisNiveau: 100,
      manquant: 100,
    });
  });

  it("mi-niveau (xp 150, niveau 1) : seuil(1)=100, seuil(2)=201", () => {
    expect(
      detailProgressionBrocanteur({ xp: 150, niveau: 1, pointsDisponibles: 0 }),
    ).toEqual({ dansNiveau: 50, requisNiveau: 101, manquant: 51 });
  });

  it("pile au seuil (xp === seuil(n)) : dansNiveau à 0", () => {
    expect(
      detailProgressionBrocanteur({ xp: 100, niveau: 1, pointsDisponibles: 0 }),
    ).toEqual({ dansNiveau: 0, requisNiveau: 101, manquant: 101 });
  });
});

describe("états initiaux Brocanteur", () => {
  it("emptyBrocanteur : tout à zéro", () => {
    expect(emptyBrocanteur()).toEqual({ xp: 0, niveau: 0, pointsDisponibles: 0 });
  });
});
