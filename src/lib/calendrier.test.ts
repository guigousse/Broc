import { describe, expect, it } from "vitest";
import {
  ANNEE_DEBUT,
  DATE_JOUR_1,
  dateForJour,
  formatDateLongue,
  indexJourSemaineReel,
  infosMois,
  jourForDate,
  labelJourCourt,
  labelJourLong,
  prochainLundi,
} from "./calendrier";

describe("DATE_JOUR_1", () => {
  it("correspond au vendredi 6 juin 1924 UTC", () => {
    expect(DATE_JOUR_1.getUTCFullYear()).toBe(1924);
    expect(DATE_JOUR_1.getUTCMonth()).toBe(5); // juin (0-indexed)
    expect(DATE_JOUR_1.getUTCDate()).toBe(6);
    expect(ANNEE_DEBUT).toBe(1924);
  });
});

describe("dateForJour ⇄ jourForDate", () => {
  it("Jour 1 = 6 juin 1924", () => {
    const d = dateForJour(1);
    expect(d.getUTCFullYear()).toBe(1924);
    expect(d.getUTCMonth()).toBe(5);
    expect(d.getUTCDate()).toBe(6);
  });

  it("Jour 2 = 7 juin 1924", () => {
    const d = dateForJour(2);
    expect(d.getUTCDate()).toBe(7);
  });

  it("dateForJour et jourForDate sont inverses", () => {
    for (const j of [1, 2, 7, 30, 100, 365, 1000]) {
      expect(jourForDate(dateForJour(j))).toBe(j);
    }
  });

  it("jourForDate normalise l'heure du jour (insensible à l'heure)", () => {
    const matin = new Date(Date.UTC(1924, 5, 10, 3, 15));
    const soir = new Date(Date.UTC(1924, 5, 10, 23, 59));
    expect(jourForDate(matin)).toBe(jourForDate(soir));
  });
});

describe("indexJourSemaineReel", () => {
  it("Jour 1 (6 juin 1924) est un vendredi (index 4)", () => {
    expect(indexJourSemaineReel(1)).toBe(4);
  });

  it("Jour 2 est samedi (5), Jour 3 dimanche (6), Jour 4 lundi (0)", () => {
    expect(indexJourSemaineReel(2)).toBe(5);
    expect(indexJourSemaineReel(3)).toBe(6);
    expect(indexJourSemaineReel(4)).toBe(0);
  });

  it("revient à zéro tous les 7 jours", () => {
    for (let j = 1; j < 30; j++) {
      expect(indexJourSemaineReel(j + 7)).toBe(indexJourSemaineReel(j));
    }
  });

  it("ne renvoie jamais hors de [0, 6]", () => {
    for (let j = 1; j <= 365; j++) {
      const idx = indexJourSemaineReel(j);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(6);
    }
  });
});

describe("labelJourCourt / labelJourLong", () => {
  it("Jour 1 = Vendredi / VEN", () => {
    expect(labelJourCourt(1)).toBe("VEN");
    expect(labelJourLong(1)).toBe("Vendredi");
  });

  it("Jour 4 = Lundi / LUN", () => {
    expect(labelJourCourt(4)).toBe("LUN");
    expect(labelJourLong(4)).toBe("Lundi");
  });
});

describe("formatDateLongue", () => {
  it("formate le Jour 1", () => {
    expect(formatDateLongue(1)).toBe("Vendredi 6 juin 1924");
  });

  it("traverse un changement de mois", () => {
    // Jour 26 = 1er juillet 1924 (juin a 30 jours, J1 = 6 juin → J26 = 1 juillet)
    expect(formatDateLongue(26)).toBe("Mardi 1 juillet 1924");
  });
});

describe("prochainLundi", () => {
  it("retourne le jour lui-même s'il tombe déjà un lundi", () => {
    // Jour 4 est un lundi (cf. test indexJourSemaineReel)
    expect(prochainLundi(4)).toBe(4);
    expect(prochainLundi(11)).toBe(11);
  });

  it("avance jusqu'au prochain lundi", () => {
    // Jour 1 = vendredi → prochain lundi = jour 4
    expect(prochainLundi(1)).toBe(4);
    // Jour 5 = mardi → prochain lundi = jour 11
    expect(prochainLundi(5)).toBe(11);
  });

  it("le résultat tombe toujours un lundi", () => {
    for (let j = 1; j <= 60; j++) {
      expect(indexJourSemaineReel(prochainLundi(j))).toBe(0);
    }
  });
});

describe("infosMois", () => {
  it("Jour 1 → juin 1924, 30 jours, décalage 5 (1er juin = dimanche)", () => {
    const info = infosMois(1);
    expect(info.mois).toBe(5);
    expect(info.annee).toBe(1924);
    expect(info.nbJours).toBe(30);
    // 1er juin 1924 est un dimanche → index lundi-based = 6
    expect(info.decalageDebut).toBe(6);
  });

  it("février 1924 (année bissextile) a 29 jours", () => {
    // Trouver un jour de jeu en février 1924 — Jour 1 = 6 juin 1924, donc il
    // faudrait remonter avant le début du jeu. On crée une date directement.
    const feb1924 = new Date(Date.UTC(1924, 1, 15));
    const jour = jourForDate(feb1924);
    expect(infosMois(jour).nbJours).toBe(29);
  });

  it("décalageDebut est dans [0, 6]", () => {
    for (const j of [1, 30, 60, 100, 365]) {
      const info = infosMois(j);
      expect(info.decalageDebut).toBeGreaterThanOrEqual(0);
      expect(info.decalageDebut).toBeLessThanOrEqual(6);
    }
  });
});
