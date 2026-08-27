import { describe, expect, test } from "vitest";
import { ciblesPourNiveau, type CiblesNiveau } from "./echelle";
import { ETATS_ORDRE } from "@/lib/etat";

// Énumérée à la main : toutes les cibles ne sont pas des nombres depuis que
// `restaurationEtatMin` (EtatObjet) existe. Une liste dérivée automatiquement
// de `keyof CiblesNiveau` y ré-introduirait une chaîne, cassant le test de monotonie.
const CLES = [
  "beneficeSemaine",
  "chiffreAffairesSemaine",
  "profitVenteUnique",
  "ventesCategorie",
  "objetsRaresQuotidien",
  "objetsRaresHebdo",
  "recompenseHebdo",
  "recompenseQuotidienne",
  "chiffreAffairesJour",
  "beneficeJour",
  "profitVenteJour",
  "ventesCategorieJour",
] as const satisfies readonly (keyof CiblesNiveau)[];

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
      chiffreAffairesJour: 150,
      beneficeJour: 75,
      profitVenteJour: 30,
      ventesCategorieJour: 2,
      restaurationEtatMin: "Bon",
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
      chiffreAffairesJour: 250,
      beneficeJour: 125,
      profitVenteJour: 50,
      ventesCategorieJour: 2,
      restaurationEtatMin: "Bon",
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
      chiffreAffairesJour: 425,
      beneficeJour: 215,
      profitVenteJour: 85,
      ventesCategorieJour: 3,
      restaurationEtatMin: "Très bon",
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
      chiffreAffairesJour: 650,
      beneficeJour: 325,
      profitVenteJour: 130,
      ventesCategorieJour: 3,
      restaurationEtatMin: "Très bon",
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
      chiffreAffairesJour: 900,
      beneficeJour: 450,
      profitVenteJour: 180,
      ventesCategorieJour: 4,
      restaurationEtatMin: "Très bon",
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

describe("barème quotidien", () => {
  const NIVEAUX = [0, 10, 20, 40, 70];

  test("chaque cible quotidienne chiffrée croît d'un palier au suivant", () => {
    for (const champ of ["chiffreAffairesJour", "beneficeJour", "profitVenteJour"] as const) {
      for (let i = 1; i < NIVEAUX.length; i++) {
        const avant = ciblesPourNiveau(NIVEAUX[i - 1])[champ];
        const apres = ciblesPourNiveau(NIVEAUX[i])[champ];
        expect(apres, `${champ} au niveau ${NIVEAUX[i]}`).toBeGreaterThan(avant);
      }
    }
  });

  test("les ventes par catégorie ne décroissent jamais", () => {
    for (let i = 1; i < NIVEAUX.length; i++) {
      expect(ciblesPourNiveau(NIVEAUX[i]).ventesCategorieJour).toBeGreaterThanOrEqual(
        ciblesPourNiveau(NIVEAUX[i - 1]).ventesCategorieJour,
      );
    }
  });

  test("la cible quotidienne reste sous la cible hebdomadaire correspondante", () => {
    for (const n of NIVEAUX) {
      const c = ciblesPourNiveau(n);
      expect(c.chiffreAffairesJour).toBeLessThan(c.chiffreAffairesSemaine);
      expect(c.beneficeJour).toBeLessThan(c.beneficeSemaine);
      expect(c.profitVenteJour).toBeLessThan(c.profitVenteUnique);
      expect(c.ventesCategorieJour).toBeLessThanOrEqual(c.ventesCategorie);
    }
  });

  test("la restauration quotidienne demande un état entre Bon et Très bon inclus", () => {
    // Bornée dans les DEUX sens via `ETATS_ORDRE` (source unique de l'ordre
    // des états) : pas « Pristin état » (4 h de temps réel, et il faut déjà
    // posséder une pièce en Très bon — infaisable dans la fenêtre d'une
    // journée), mais pas « Mauvais » non plus, qui passerait ce même test
    // sans être un palier crédible pour une restauration quotidienne.
    const iBon = ETATS_ORDRE.indexOf("Bon");
    const iTresBon = ETATS_ORDRE.indexOf("Très bon");
    for (const n of NIVEAUX) {
      const i = ETATS_ORDRE.indexOf(ciblesPourNiveau(n).restaurationEtatMin);
      expect(i).toBeGreaterThanOrEqual(iBon);
      expect(i).toBeLessThanOrEqual(iTresBon);
    }
  });
});
