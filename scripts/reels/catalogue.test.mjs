import { describe, expect, it } from "vitest";
import { analyserCsv, chargerCatalogue } from "./catalogue.mjs";

const ENTETE =
  "templateId;nom;categorie;rarete;unique;tierMin;prix_Mauvais;prix_Bon;prix_TresBon;prix_PristinEtat";

describe("analyserCsv", () => {
  it("retire le BOM de la première cellule", () => {
    const lignes = analyserCsv("﻿" + ENTETE);
    expect(lignes[0][0]).toBe("templateId");
  });

  it("découpe une ligne simple", () => {
    const texte = `${ENTETE}\nart.aquarelle_marine_xixe;Aquarelle marine du XIXe;Objets d'art;commun;;2;11;21;35;49`;
    expect(analyserCsv(texte)[1]).toEqual([
      "art.aquarelle_marine_xixe",
      "Aquarelle marine du XIXe",
      "Objets d'art",
      "commun",
      "",
      "2",
      "11",
      "21",
      "35",
      "49",
    ]);
  });

  it("respecte les champs entre guillemets et les guillemets doublés", () => {
    const texte = `${ENTETE}\nuniq.mus.violon_paganini;"Violon ""Il Cannone"" de Paganini";Musique;legendaire;oui;;2700;5400;9000;12600`;
    expect(analyserCsv(texte)[1][1]).toBe('Violon "Il Cannone" de Paganini');
  });

  it("tolère les fins de ligne Windows et les lignes vides", () => {
    const texte = `${ENTETE}\r\nbr.marteau_menuisier;Marteau;Bricolage;commun;;1;2;5;8;11\r\n\r\n`;
    const lignes = analyserCsv(texte);
    expect(lignes).toHaveLength(2);
    expect(lignes[1][0]).toBe("br.marteau_menuisier");
  });

  it("traite un guillemet en milieu de cellule comme un caractère littéral", () => {
    const texte = `${ENTETE}\nvinyle_12"pouces;autre`;
    const lignes = analyserCsv(texte);
    expect(lignes).toHaveLength(2);
    expect(lignes[1][0]).toBe('vinyle_12"pouces');
    expect(lignes[1][1]).toBe('autre');
  });

  it("rejette un guillemet ouvert en milieu de cellule qui mangerait le séparateur", () => {
    const texte = `${ENTETE}\nab"cd;c`;
    const lignes = analyserCsv(texte);
    expect(lignes).toHaveLength(2);
    expect(lignes[1][0]).toBe('ab"cd');
    expect(lignes[1][1]).toBe('c');
  });
});

describe("chargerCatalogue", () => {
  const texte = "﻿" + ENTETE + "\nart.aquarelle_marine_xixe;Aquarelle marine du XIXe;Objets d'art;commun;;2;11;21;35;49";

  it("indexe les objets par templateId", () => {
    const catalogue = chargerCatalogue(texte);
    expect(catalogue.get("art.aquarelle_marine_xixe")).toEqual({
      id: "art.aquarelle_marine_xixe",
      nom: "Aquarelle marine du XIXe",
      categorie: "Objets d'art",
      rarete: "commun",
      prixTresBon: 35,
    });
  });

  it("expose la cote comme un nombre, pas une chaîne", () => {
    const cote = chargerCatalogue(texte).get("art.aquarelle_marine_xixe").prixTresBon;
    expect(typeof cote).toBe("number");
  });
});
