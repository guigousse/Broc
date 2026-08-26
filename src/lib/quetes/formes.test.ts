import { describe, expect, test } from "vitest";
import {
  FAMILLE,
  FORMES_HEBDOMADAIRES,
  ICONE_FORME,
  contenuFormeChiffree,
  formeDepuisObjectif,
} from "./formes";
import { ciblesPourNiveau } from "./echelle";

const rngFixe = () => 0;

describe("familles", () => {
  test("chine et vente sont correctement réparties", () => {
    expect(FAMILLE.objet).toBe("chine");
    expect(FAMILLE.objetsRares).toBe("chine");
    expect(FAMILLE.beneficeCumule).toBe("vente");
    expect(FAMILLE.chiffreAffaires).toBe("vente");
    expect(FAMILLE.profitVente).toBe("vente");
    expect(FAMILLE.ventesCategorie).toBe("vente");
  });

  test("chaque forme déclare son icône ; seule la forme objet n'en a pas", () => {
    for (const f of FORMES_HEBDOMADAIRES) {
      if (f === "objet") expect(ICONE_FORME[f]).toBeNull();
      else expect(typeof ICONE_FORME[f]).toBe("string");
    }
  });

  test("les six formes sont éligibles à l'hebdomadaire", () => {
    expect([...FORMES_HEBDOMADAIRES].sort()).toEqual(
      ["beneficeCumule", "chiffreAffaires", "objet", "objetsRares", "profitVente", "ventesCategorie"].sort(),
    );
  });
});

describe("formeDepuisObjectif", () => {
  test("les cinq types chiffrés retrouvent leur forme", () => {
    expect(formeDepuisObjectif("objetsRares")).toBe("objetsRares");
    expect(formeDepuisObjectif("beneficeCumule")).toBe("beneficeCumule");
    expect(formeDepuisObjectif("ventesCumulees")).toBe("chiffreAffaires");
    expect(formeDepuisObjectif("profitVente")).toBe("profitVente");
    expect(formeDepuisObjectif("ventesCategorie")).toBe("ventesCategorie");
  });

  test("les types hors périmètre périodique n'ont pas de forme", () => {
    expect(formeDepuisObjectif("objet")).toBeNull();
    expect(formeDepuisObjectif("valeurCollection")).toBeNull();
    expect(formeDepuisObjectif("niveau")).toBeNull();
  });
});

describe("contenuFormeChiffree", () => {
  test("objetsRares : cible quotidienne et hebdomadaire distinctes", () => {
    const q = contenuFormeChiffree("objetsRares", "quotidienne", 3, ["Musique"], rngFixe);
    const h = contenuFormeChiffree("objetsRares", "hebdomadaire", 3, ["Musique"], rngFixe);
    expect(q?.objectifs).toEqual([{ type: "objetsRares", nombre: 2 }]);
    expect(h?.objectifs).toEqual([{ type: "objetsRares", nombre: 4 }]);
  });

  test("beneficeCumule : cible et récompense lues dans la table", () => {
    const c = ciblesPourNiveau(25);
    const r = contenuFormeChiffree("beneficeCumule", "hebdomadaire", 25, ["Musique"], rngFixe);
    expect(r?.objectifs).toEqual([{ type: "beneficeCumule", montant: c.beneficeSemaine }]);
    expect(r?.recompenseArgent).toBe(c.recompenseHebdo);
    expect(r?.gabaritParams).toEqual({ montant: c.beneficeSemaine });
  });

  test("chiffreAffaires : cible et récompense lues dans la table (nom de forme ≠ type d'objectif)", () => {
    // La forme s'appelle « chiffreAffaires » mais émet volontairement le type
    // d'objectif préexistant `ventesCumulees` — elle réutilise la mécanique
    // déjà utilisée par les chapitres de l'histoire. Ce n'est PAS une
    // incohérence à « corriger » : c'est le comportement attendu.
    const c = ciblesPourNiveau(25);
    const r = contenuFormeChiffree("chiffreAffaires", "hebdomadaire", 25, ["Musique"], rngFixe);
    expect(r?.objectifs).toEqual([{ type: "ventesCumulees", montant: c.chiffreAffairesSemaine }]);
    expect(r?.recompenseArgent).toBe(c.recompenseHebdo);
    expect(r?.gabaritParams).toEqual({ montant: c.chiffreAffairesSemaine });
  });

  test("profitVente : cible et récompense lues dans la table", () => {
    const c = ciblesPourNiveau(25);
    const r = contenuFormeChiffree("profitVente", "hebdomadaire", 25, ["Musique"], rngFixe);
    expect(r?.objectifs).toEqual([{ type: "profitVente", montant: c.profitVenteUnique }]);
    expect(r?.recompenseArgent).toBe(c.recompenseHebdo);
    expect(r?.gabaritParams).toEqual({ montant: c.profitVenteUnique });
  });

  test("ventesCategorie : la catégorie est tirée parmi celles fournies", () => {
    const r = contenuFormeChiffree("ventesCategorie", "hebdomadaire", 3, ["Mode"], rngFixe);
    expect(r?.objectifs).toEqual([{ type: "ventesCategorie", categorie: "Mode", nombre: 3 }]);
    expect(r?.gabaritParams).toEqual({ nombre: 3, categorie: "Mode" });
  });

  test("ventesCategorie sans catégorie disponible : repli null", () => {
    expect(contenuFormeChiffree("ventesCategorie", "hebdomadaire", 3, [], rngFixe)).toBeNull();
  });

  test("la récompense quotidienne diffère de l'hebdomadaire", () => {
    const c = ciblesPourNiveau(3);
    const q = contenuFormeChiffree("objetsRares", "quotidienne", 3, ["Musique"], rngFixe);
    expect(q?.recompenseArgent).toBe(c.recompenseQuotidienne);
  });

  test("chaque forme chiffrée annonce une clé de gabarit distincte", () => {
    const cles = (["objetsRares", "beneficeCumule", "chiffreAffaires", "profitVente", "ventesCategorie"] as const).map(
      (f) => contenuFormeChiffree(f, "hebdomadaire", 3, ["Musique"], rngFixe)?.gabaritCle,
    );
    expect(new Set(cles).size).toBe(cles.length);
    expect(cles.every((c) => typeof c === "string" && c.length > 0)).toBe(true);
  });
});

describe("ICONE_FORME", () => {
  test("chaque forme chiffrée porte une icône DISTINCTE des autres", () => {
    // Deux formes qui partagent une icône rendent deux lignes de quête
    // impossibles à distinguer d'un coup d'œil : dans le carnet, l'icône est
    // le gros visuel de gauche, le libellé d'objectif n'est qu'en dessous et
    // en petit. Propriété, pas littéral : le test survit au prochain
    // changement d'avis sur QUELLE icône va à quelle forme.
    const noms = Object.values(ICONE_FORME).filter((n): n is string => n !== null);
    expect(new Set(noms).size).toBe(noms.length);
  });

  test("seule la forme `objet` n'a pas d'icône — elle montre la photo de l'objet", () => {
    for (const [forme, nom] of Object.entries(ICONE_FORME)) {
      expect(nom === null).toBe(forme === "objet");
    }
  });
});

describe("catalogue élargi", () => {
  test("les deux nouvelles formes ont une famille et une icône", () => {
    expect(FAMILLE.objetLegendaire).toBe("chine");
    expect(FAMILLE.restauration).toBe("atelier");
    expect(ICONE_FORME.objetLegendaire).toBe("Crown");
    expect(ICONE_FORME.restauration).toBe("Hammer");
  });

  test("formeDepuisObjectif reconnaît les deux nouveaux types", () => {
    expect(formeDepuisObjectif("objetLegendaire")).toBe("objetLegendaire");
    expect(formeDepuisObjectif("restauration")).toBe("restauration");
  });

  test("les formes hebdomadaires restent les six d'origine", () => {
    expect(FORMES_HEBDOMADAIRES).toEqual([
      "objet", "objetsRares", "beneficeCumule",
      "chiffreAffaires", "profitVente", "ventesCategorie",
    ]);
  });
});
