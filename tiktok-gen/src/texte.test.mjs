import { describe, it, expect } from "vitest";
import { nomCourt, formaterDuree, formaterFenetre, formaterInfos, consigneCourte } from "./texte.js";

describe("nomCourt", () => {
  it("retire l'article défini et met l'initiale en minuscule", () => {
    expect(nomCourt("La lampe Art déco")).toBe("lampe Art déco");
    expect(nomCourt("Le marteau de menuisier")).toBe("marteau de menuisier");
    expect(nomCourt("Les vinyles rares")).toBe("vinyles rares");
  });

  it("retire l'article élidé, avec apostrophe droite ou courbe", () => {
    expect(nomCourt("L'horloge")).toBe("horloge");
    expect(nomCourt("L’horloge comtoise")).toBe("horloge comtoise");
  });

  it("retire les articles indéfinis", () => {
    expect(nomCourt("Un buffet Henri II")).toBe("buffet Henri II");
    expect(nomCourt("Une aquarelle marine XIXe")).toBe("aquarelle marine XIXe");
    expect(nomCourt("Des cartes postales")).toBe("cartes postales");
  });

  it("se contente de la minuscule initiale s'il n'y a pas d'article", () => {
    expect(nomCourt("Vinyle")).toBe("vinyle");
    expect(nomCourt("Aquarelle marine XIXe")).toBe("aquarelle marine XIXe");
  });

  it("ne confond pas un mot qui commence comme un article", () => {
    expect(nomCourt("Lampe à pétrole")).toBe("lampe à pétrole");
    expect(nomCourt("Description d'un lot")).toBe("description d'un lot");
    expect(nomCourt("Unéclair")).toBe("unéclair");
  });

  it("tolère le vide et les espaces superflus", () => {
    expect(nomCourt("")).toBe("");
    expect(nomCourt(null)).toBe("");
    expect(nomCourt("  La   lampe  ")).toBe("lampe");
  });
});

describe("formaterDuree", () => {
  it("affiche une décimale avec la virgule française", () => {
    expect(formaterDuree(12)).toBe("12,0 s");
    expect(formaterDuree(9.6)).toBe("9,6 s");
    expect(formaterDuree(9.64)).toBe("9,6 s");
  });
  it("renvoie un tiret si la durée est inconnue", () => {
    expect(formaterDuree(null)).toBe("—");
    expect(formaterDuree(NaN)).toBe("—");
  });
});

describe("formaterFenetre", () => {
  it("tronque les millisecondes", () => {
    expect(formaterFenetre(133.33)).toBe("133 ms");
    expect(formaterFenetre(266.66)).toBe("266 ms");
  });
  it("renvoie un tiret si la fenêtre est inconnue", () => {
    expect(formaterFenetre(undefined)).toBe("—");
  });
});

describe("formaterInfos", () => {
  it("formate les deux champs à partir d'un résultat de roulette", () => {
    expect(formaterInfos({ duree: 12, fenetrePauseMs: 133.33 })).toEqual({ duree: "12,0 s", fenetre: "133 ms" });
  });
  it("renvoie des tirets quand la roulette n'est pas calculable", () => {
    expect(formaterInfos(null)).toEqual({ duree: "—", fenetre: "—" });
  });
});

describe("consigneCourte", () => {
  it("rend la consigne complète quand elle tient dans la limite", () => {
    expect(consigneCourte("Le vinyle rare")).toBe("Mets pause sur vinyle rare !");
    expect(consigneCourte("Une aquarelle marine XIXe")).toBe("Mets pause sur aquarelle marine XIXe !");
  });

  it("garde la consigne complète quand elle fait pile la limite", () => {
    const consigne = consigneCourte("Aquarelle marine XIXe s");
    expect(consigne).toBe("Mets pause sur aquarelle marine XIXe s !");
    expect(consigne).toHaveLength(40);
  });

  it("condense un nom trop long sur les premiers mots entiers", () => {
    const consigne = consigneCourte("Plat en céramique de Vallauris signé Picassiette");
    expect(consigne).toBe("Mets pause sur plat en céramique de … !");
    expect(consigne.length).toBeLessThanOrEqual(40);
  });

  it("coupe dans le premier mot s'il dépasse à lui seul", () => {
    const consigne = consigneCourte("Anticonstitutionnellement grand vase");
    expect(consigne).toBe("Mets pause sur anticonstitutionnelle … !");
    expect(consigne).toHaveLength(40);
  });

  it("respecte une limite personnalisée", () => {
    const consigne = consigneCourte("Plat en céramique de Vallauris signé Picassiette", 30);
    expect(consigne).toBe("Mets pause sur plat en … !");
    expect(consigne.length).toBeLessThanOrEqual(30);
  });

  it("retombe sur la consigne par défaut si le nom est vide", () => {
    expect(consigneCourte("")).toBe("Mets pause sur …");
    expect(consigneCourte(null)).toBe("Mets pause sur …");
  });
});
