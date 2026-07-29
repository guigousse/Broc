import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHEMINS, LANGUES, VISUELS } from "./config.mjs";
import { BULLE, LIBELLE_NEGOCIER, MEDAILLON_PLUS, PORTRAITS_GALERIE, TITRES } from "./textes.mjs";

describe("textes des visuels App Store", () => {
  it("donne un titre non vide pour chaque visuel et chaque langue", () => {
    for (const v of VISUELS) {
      for (const l of LANGUES) {
        expect(TITRES[v.cle]?.[l], `${v.cle}/${l}`).toBeTruthy();
      }
    }
  });

  it("annonce 31 personnages dans les quatre langues", () => {
    for (const l of LANGUES) expect(TITRES.personnages[l]).toContain("31");
  });

  it("donne une bulle et un libellé « et + » dans chaque langue", () => {
    for (const l of LANGUES) {
      expect(BULLE[l]).toBeTruthy();
      expect(MEDAILLON_PLUS[l]).toBeTruthy();
    }
  });

  it("liste 19 portraits, tous existants sur le disque", () => {
    expect(PORTRAITS_GALERIE).toHaveLength(19);
    expect(new Set(PORTRAITS_GALERIE).size).toBe(19);
    for (const p of PORTRAITS_GALERIE) {
      expect(fs.existsSync(path.join(CHEMINS.personas, p)), p).toBe(true);
    }
  });

  it("n'utilise aucune silhouette de repli dans la galerie", () => {
    for (const p of PORTRAITS_GALERIE) {
      expect(p).not.toContain("vendeur-mystere");
      expect(p).not.toContain("client-inconnu");
      expect(p).not.toContain("-fache");
    }
  });

  // Garde : le pipeline clique un bouton dont le libellé vient du jeu.
  it("reprend exactement le libellé « Négocier » de chaque fichier i18n", () => {
    for (const l of LANGUES) {
      const src = fs.readFileSync(
        path.join(CHEMINS.racine, `src/lib/i18n/ui/${l}.ts`), "utf8",
      );
      const trouve = src.match(/^\s*negocier:\s*"([^"]+)"/m);
      expect(trouve, `pas de clé negocier dans ${l}.ts`).toBeTruthy();
      expect(LIBELLE_NEGOCIER[l]).toBe(trouve[1]);
    }
  });
});
