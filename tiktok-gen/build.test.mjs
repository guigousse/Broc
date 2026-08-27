import { describe, expect, it } from "vitest";
import { analyserCatalogueCsv, filtrerAvecImages } from "./build.mjs";

const CSV = `﻿templateId;nom;categorie;rarete;unique;tierMin;prix_Mauvais
br.marteau_menuisier;Marteau de menuisier;Bricolage;commun;;1;2
art.aquarelle_marine_xixe;"Aquarelle ""marine"" XIXe";Objets d'art;rare;;3;20
`;

describe("analyserCatalogueCsv", () => {
  it("lit id, nom, catégorie, rareté en ignorant le BOM et les guillemets", () => {
    expect(analyserCatalogueCsv(CSV)).toEqual([
      { id: "br.marteau_menuisier", nom: "Marteau de menuisier", categorie: "Bricolage", rarete: "commun" },
      { id: "art.aquarelle_marine_xixe", nom: 'Aquarelle "marine" XIXe', categorie: "Objets d'art", rarete: "rare" },
    ]);
  });
});

describe("filtrerAvecImages", () => {
  it("écarte les objets sans webp et les liste", () => {
    const entrees = analyserCatalogueCsv(CSV);
    const { gardes, manquants } = filtrerAvecImages(entrees, new Set(["br.marteau_menuisier"]));
    expect(gardes.map((e) => e.id)).toEqual(["br.marteau_menuisier"]);
    expect(manquants).toEqual(["art.aquarelle_marine_xixe"]);
  });
});
