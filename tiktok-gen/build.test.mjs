import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyserCatalogueCsv, copierDossier, filtrerAvecImages } from "./build.mjs";

const CSV = `﻿templateId;nom;categorie;rarete;unique;tierMin;prix_Mauvais;prix_Bon
br.marteau_menuisier;Marteau de menuisier;Bricolage;commun;;1;2;5
art.aquarelle_marine_xixe;"Aquarelle ""marine"" XIXe";Objets d'art;rare;;3;20;45
`;

describe("analyserCatalogueCsv", () => {
  it("lit id, nom, catégorie, rareté, prix (état bon) en ignorant le BOM et les guillemets", () => {
    expect(analyserCatalogueCsv(CSV)).toEqual([
      { id: "br.marteau_menuisier", nom: "Marteau de menuisier", categorie: "Bricolage", rarete: "commun", prix: 5 },
      { id: "art.aquarelle_marine_xixe", nom: 'Aquarelle "marine" XIXe', categorie: "Objets d'art", rarete: "rare", prix: 45 },
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

describe("copierDossier", () => {
  it("tolère un dossier source absent : crée quand même la destination sans jeter", async () => {
    const base = await fsp.mkdtemp(path.join(os.tmpdir(), "tiktok-gen-test-"));
    try {
      const dest = path.join(base, "dest");
      await copierDossier(path.join(base, "absent"), dest);
      const stat = await fsp.stat(dest);
      expect(stat.isDirectory()).toBe(true);
      expect(await fsp.readdir(dest)).toEqual([]);
    } finally {
      await fsp.rm(base, { recursive: true, force: true });
    }
  });
});
