import { describe, expect, it } from "vitest";
import type { EtatObjet } from "@/types/game";
import {
  ETAT_STARS,
  ETAT_STARS_MAX,
  FACTEUR_ETAT,
  etatSuivant,
  etoileCount,
  recalculerPrixReference,
} from "./etat";

describe("ETAT_STARS", () => {
  it("mappe chaque état à un nombre d'étoiles entre 0 et ETAT_STARS_MAX", () => {
    for (const stars of Object.values(ETAT_STARS)) {
      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(ETAT_STARS_MAX);
    }
  });

  it("est strictement croissant Mauvais → Pristin état", () => {
    expect(ETAT_STARS.Mauvais).toBeLessThan(ETAT_STARS.Bon);
    expect(ETAT_STARS.Bon).toBeLessThan(ETAT_STARS["Très bon"]);
    expect(ETAT_STARS["Très bon"]).toBeLessThan(ETAT_STARS["Pristin état"]);
  });
});

describe("etoileCount", () => {
  it("retourne le nombre d'étoiles pour chaque état défini", () => {
    expect(etoileCount("Mauvais")).toBe(0);
    expect(etoileCount("Bon")).toBe(1);
    expect(etoileCount("Très bon")).toBe(2);
    expect(etoileCount("Pristin état")).toBe(3);
  });

  it("retourne 0 pour undefined", () => {
    expect(etoileCount(undefined)).toBe(0);
  });
});

describe("FACTEUR_ETAT", () => {
  it("est strictement croissant Mauvais → Pristin état", () => {
    expect(FACTEUR_ETAT.Mauvais).toBeLessThan(FACTEUR_ETAT.Bon);
    expect(FACTEUR_ETAT.Bon).toBeLessThan(FACTEUR_ETAT["Très bon"]);
    expect(FACTEUR_ETAT["Très bon"]).toBeLessThan(FACTEUR_ETAT["Pristin état"]);
  });

  it("considère Très bon comme la référence (facteur 1)", () => {
    expect(FACTEUR_ETAT["Très bon"]).toBe(1);
  });
});

describe("etatSuivant", () => {
  it("avance d'un cran dans l'échelle", () => {
    expect(etatSuivant("Mauvais")).toBe("Bon");
    expect(etatSuivant("Bon")).toBe("Très bon");
    expect(etatSuivant("Très bon")).toBe("Pristin état");
  });

  it("retourne null au sommet de l'échelle", () => {
    expect(etatSuivant("Pristin état")).toBeNull();
  });
});

describe("recalculerPrixReference", () => {
  it("monte le prix quand on monte l'état (Mauvais → Bon)", () => {
    const prixBon = recalculerPrixReference(30, "Mauvais", "Bon");
    expect(prixBon).toBeGreaterThan(30);
  });

  it("descend le prix quand on descend l'état (Très bon → Bon)", () => {
    const prixBon = recalculerPrixReference(100, "Très bon", "Bon");
    expect(prixBon).toBeLessThan(100);
  });

  it("conserve approximativement la valeur de base sur un aller-retour", () => {
    const tresBon = 100;
    const bon = recalculerPrixReference(tresBon, "Très bon", "Bon");
    const retour = recalculerPrixReference(bon, "Bon", "Très bon");
    expect(Math.abs(retour - tresBon)).toBeLessThanOrEqual(2);
  });

  it("ne descend jamais sous 1", () => {
    const prix = recalculerPrixReference(1, "Pristin état", "Mauvais");
    expect(prix).toBeGreaterThanOrEqual(1);
  });

  it("retourne un entier", () => {
    const prix = recalculerPrixReference(37, "Bon", "Pristin état");
    expect(Number.isInteger(prix)).toBe(true);
  });

  it("est cohérent avec FACTEUR_ETAT (Très bon → Pristin état = ×1.4)", () => {
    const prix = recalculerPrixReference(100, "Très bon", "Pristin état");
    expect(prix).toBe(140);
  });
});

describe("intégration EtatObjet (exhaustiveness)", () => {
  it("tous les états ont une entrée dans chaque table", () => {
    const etats: EtatObjet[] = [
      "Mauvais",
      "Bon",
      "Très bon",
      "Pristin état",
    ];
    for (const etat of etats) {
      expect(ETAT_STARS[etat]).toBeDefined();
      expect(FACTEUR_ETAT[etat]).toBeDefined();
    }
  });
});
