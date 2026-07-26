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
  xpDuNiveauBrocanteur,
  XP_COUDE_NIVEAU,
  XP_CIBLE_AU_COUDE,
} from "./xp";
import { COUT_TOTAL_COMPETENCES } from "@/data/competences";

const freshBrocanteur = () => ({ xp: 0, niveau: 0, pointsDisponibles: 0 });

describe("xpRequisPourNiveauBrocanteur — courbe log 100→250 au coude N30 (2026-07-26)", () => {
  it("seuils cumulés", () => {
    expect(xpRequisPourNiveauBrocanteur(0)).toBe(0);
    expect(xpRequisPourNiveauBrocanteur(1)).toBe(100);
    expect(xpRequisPourNiveauBrocanteur(2)).toBe(231);
    expect(xpRequisPourNiveauBrocanteur(5)).toBe(711);
    expect(xpRequisPourNiveauBrocanteur(10)).toBe(1667);
    expect(xpRequisPourNiveauBrocanteur(20)).toBe(3867);
    expect(xpRequisPourNiveauBrocanteur(30)).toBe(6292);
  });

  it("les deux ancres de la courbe : 100 XP au niveau 1, 250 au coude", () => {
    expect(xpDuNiveauBrocanteur(1)).toBe(100);
    expect(xpDuNiveauBrocanteur(XP_COUDE_NIVEAU)).toBe(XP_CIBLE_AU_COUDE);
  });

  it("le coût de chaque niveau croît, mais de moins en moins vite", () => {
    // Concavité : c'est ce qui rend le début franc et la suite exigeante
    // sans jamais donner l'impression d'un mur.
    for (let n = 2; n <= XP_COUDE_NIVEAU; n++) {
      const croissance = xpDuNiveauBrocanteur(n) - xpDuNiveauBrocanteur(n - 1);
      expect(croissance).toBeGreaterThan(0);
      if (n > 2) {
        const precedente =
          xpDuNiveauBrocanteur(n - 1) - xpDuNiveauBrocanteur(n - 2);
        // +1 de tolérance : les coûts sont arrondis à l'entier, deux
        // incréments voisins peuvent donc se croiser d'une unité.
        expect(croissance).toBeLessThanOrEqual(precedente + 1);
      }
    }
  });

  it("queue quadratique après le coude : N100 ≈ 793 XP", () => {
    const delta =
      xpRequisPourNiveauBrocanteur(100) - xpRequisPourNiveauBrocanteur(99);
    expect(Math.abs(delta - 793)).toBeLessThanOrEqual(1);
    expect(xpRequisPourNiveauBrocanteur(100)).toBe(37721);
    // La queue ne touche rien avant le coude.
    expect(xpDuNiveauBrocanteur(30)).toBe(250);
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

  it("multi-level-up en un seul gain (711 XP → niveau 5, 5 points)", () => {
    // Cumuls : N1 100 · N2 231 · N3 379 · N4 540 · N5 711.
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 711);
    expect(res.niveau).toBe(5);
    expect(res.pointsDisponibles).toBe(5);
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
    // niveau 1 → 2 : seuils 100 → 231, span 131 ; 100+65,5=165,5 → 0.5
    expect(progressionNiveauBrocanteur({ xp: 165.5, niveau: 1, pointsDisponibles: 0 })).toBe(0.5);
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

  it("mi-niveau (xp 150, niveau 1) : seuil(1)=100, seuil(2)=231", () => {
    expect(
      detailProgressionBrocanteur({ xp: 150, niveau: 1, pointsDisponibles: 0 }),
    ).toEqual({ dansNiveau: 50, requisNiveau: 131, manquant: 81 });
  });

  it("pile au seuil (xp === seuil(n)) : dansNiveau à 0", () => {
    expect(
      detailProgressionBrocanteur({ xp: 100, niveau: 1, pointsDisponibles: 0 }),
    ).toEqual({ dansNiveau: 0, requisNiveau: 131, manquant: 131 });
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
