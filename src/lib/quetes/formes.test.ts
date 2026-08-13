import { describe, expect, test } from "vitest";
import { FAMILLE, FORMES_HEBDOMADAIRES, ICONE_FORME, contenuFormeChiffree } from "./formes";
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
