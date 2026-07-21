import { describe, expect, it } from "vitest";
import {
  multiplicateurXPRarete,
  appliquerGainXPBrocanteur,
  detailProgressionBrocanteur,
  emptyBrocanteur,
  pointsOctroyables,
  POINTS_BONUS_CHAPITRE,
  progressionNiveauBrocanteur,
  xpRequisPourNiveauBrocanteur,
} from "./xp";
import { COUT_TOTAL_COMPETENCES } from "@/data/competences";

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

  it("l'incrément vaut N + 99 jusqu'au coude (N ≤ 30)", () => {
    for (const n of [1, 2, 5, 10, 25, 30]) {
      expect(
        xpRequisPourNiveauBrocanteur(n) - xpRequisPourNiveauBrocanteur(n - 1),
      ).toBe(n + 99);
    }
  });

  it("queue quadratique après le coude : N99→100 ≈ 689 XP", () => {
    // ΔXP(100) = 199 + 0,1·70² = 689 (±1 d'arrondi de la forme fermée).
    const delta =
      xpRequisPourNiveauBrocanteur(100) - xpRequisPourNiveauBrocanteur(99);
    expect(Math.abs(delta - 689)).toBeLessThanOrEqual(1);
    // Cumul N100 ≈ 26 630 (14 950 de base + 11 680 de queue).
    expect(xpRequisPourNiveauBrocanteur(100)).toBe(26630);
    // Le coude ne change rien avant N30.
    expect(xpRequisPourNiveauBrocanteur(30)).toBe(3435);
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
    // Plafond « à vie » (Task 2) : sans compétence débloquée (pointsDepenses
    // par défaut à 0), le total octroyable ne dépasse jamais
    // COUT_TOTAL_COMPETENCES, même en 100 niveaux gagnés d'un coup.
    expect(res.pointsDisponibles).toBe(96);
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

describe("multiplicateurXPRarete", () => {
  it("commun ×1, rare ×2, légendaire ×5, unique ×5", () => {
    expect(multiplicateurXPRarete("commun")).toBe(1);
    expect(multiplicateurXPRarete("rare")).toBe(2);
    expect(multiplicateurXPRarete("legendaire")).toBe(5);
    expect(multiplicateurXPRarete("commun", true)).toBe(5);
    expect(multiplicateurXPRarete("rare", true)).toBe(5);
  });
});

describe("plafond de points à vie (COUT_TOTAL_COMPETENCES)", () => {
  it("écrête l'octroi par niveau : octroi partiel puis nul", () => {
    // À 1 pt du plafond (disponibles 1 + dépensés 94 = 95), franchir 2 niveaux
    // n'octroie qu'1 point.
    const b = { xp: xpRequisPourNiveauBrocanteur(50), niveau: 50, pointsDisponibles: 1 };
    const gain = xpRequisPourNiveauBrocanteur(52) - b.xp;
    const apres = appliquerGainXPBrocanteur(b, gain, COUT_TOTAL_COMPETENCES - 2);
    expect(apres.niveau).toBe(52);
    expect(apres.pointsDisponibles).toBe(2);
  });

  it("XP et niveaux continuent après le plafond, points constants", () => {
    const b = { xp: xpRequisPourNiveauBrocanteur(60), niveau: 60, pointsDisponibles: 0 };
    const gain = xpRequisPourNiveauBrocanteur(62) - b.xp;
    const apres = appliquerGainXPBrocanteur(b, gain, COUT_TOTAL_COMPETENCES);
    expect(apres.niveau).toBe(62);
    expect(apres.pointsDisponibles).toBe(0);
    expect(apres.xp).toBe(b.xp + gain);
  });

  it("sans 3ᵉ argument, comportement historique (plafond loin)", () => {
    const b = { xp: 0, niveau: 0, pointsDisponibles: 0 };
    const apres = appliquerGainXPBrocanteur(b, xpRequisPourNiveauBrocanteur(3));
    expect(apres.pointsDisponibles).toBe(3);
  });

  it("pointsOctroyables clampe le bonus de chapitre", () => {
    const b = { xp: 0, niveau: 0, pointsDisponibles: 0 };
    expect(pointsOctroyables(b, COUT_TOTAL_COMPETENCES - 1, POINTS_BONUS_CHAPITRE)).toBe(1);
    expect(pointsOctroyables(b, COUT_TOTAL_COMPETENCES, POINTS_BONUS_CHAPITRE)).toBe(0);
    expect(pointsOctroyables(b, 0, POINTS_BONUS_CHAPITRE)).toBe(POINTS_BONUS_CHAPITRE);
  });
});
