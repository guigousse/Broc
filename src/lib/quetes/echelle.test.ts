import { describe, expect, test } from "vitest";
import { ciblesPourNiveau, type CiblesNiveau } from "./echelle";

const CLES: (keyof CiblesNiveau)[] = [
  "beneficeSemaine",
  "chiffreAffairesSemaine",
  "profitVenteUnique",
  "ventesCategorie",
  "objetsRaresQuotidien",
  "objetsRaresHebdo",
  "recompenseHebdo",
  "recompenseQuotidienne",
];

describe("table de paliers", () => {
  test("palier d'entrée (niveau 3, ouverture des quêtes)", () => {
    expect(ciblesPourNiveau(3)).toEqual({
      beneficeSemaine: 300,
      chiffreAffairesSemaine: 600,
      profitVenteUnique: 60,
      ventesCategorie: 3,
      objetsRaresQuotidien: 2,
      objetsRaresHebdo: 4,
      recompenseHebdo: 75,
      recompenseQuotidienne: 25,
    });
  });

  test("palier (niveauMin 10)", () => {
    expect(ciblesPourNiveau(10)).toEqual({
      beneficeSemaine: 500,
      chiffreAffairesSemaine: 1000,
      profitVenteUnique: 100,
      ventesCategorie: 4,
      objetsRaresQuotidien: 2,
      objetsRaresHebdo: 5,
      recompenseHebdo: 125,
      recompenseQuotidienne: 40,
    });
  });

  test("palier (niveauMin 20)", () => {
    expect(ciblesPourNiveau(20)).toEqual({
      beneficeSemaine: 850,
      chiffreAffairesSemaine: 1700,
      profitVenteUnique: 170,
      ventesCategorie: 5,
      objetsRaresQuotidien: 3,
      objetsRaresHebdo: 6,
      recompenseHebdo: 210,
      recompenseQuotidienne: 70,
    });
  });

  test("palier (niveauMin 40)", () => {
    expect(ciblesPourNiveau(40)).toEqual({
      beneficeSemaine: 1300,
      chiffreAffairesSemaine: 2600,
      profitVenteUnique: 260,
      ventesCategorie: 6,
      objetsRaresQuotidien: 3,
      objetsRaresHebdo: 7,
      recompenseHebdo: 325,
      recompenseQuotidienne: 110,
    });
  });

  test("palier terminal (niveau 100, plafond)", () => {
    expect(ciblesPourNiveau(100)).toEqual({
      beneficeSemaine: 1800,
      chiffreAffairesSemaine: 3600,
      profitVenteUnique: 360,
      ventesCategorie: 8,
      objetsRaresQuotidien: 4,
      objetsRaresHebdo: 9,
      recompenseHebdo: 450,
      recompenseQuotidienne: 150,
    });
  });

  test("les bornes de palier basculent au bon niveau", () => {
    expect(ciblesPourNiveau(9).beneficeSemaine).toBe(300);
    expect(ciblesPourNiveau(10).beneficeSemaine).toBe(500);
    expect(ciblesPourNiveau(19).beneficeSemaine).toBe(500);
    expect(ciblesPourNiveau(20).beneficeSemaine).toBe(850);
    expect(ciblesPourNiveau(39).beneficeSemaine).toBe(850);
    expect(ciblesPourNiveau(40).beneficeSemaine).toBe(1300);
    expect(ciblesPourNiveau(69).beneficeSemaine).toBe(1300);
    expect(ciblesPourNiveau(70).beneficeSemaine).toBe(1800);
  });

  test("monotone : aucun palier n'est plus facile que le précédent", () => {
    for (const cle of CLES) {
      for (let n = 1; n <= 100; n++) {
        expect(ciblesPourNiveau(n)[cle]).toBeGreaterThanOrEqual(ciblesPourNiveau(n - 1)[cle]);
      }
    }
  });

  test("un niveau hors bornes retombe sur un palier valide", () => {
    expect(ciblesPourNiveau(0)).toEqual(ciblesPourNiveau(1));
    expect(ciblesPourNiveau(999)).toEqual(ciblesPourNiveau(100));
  });
});
