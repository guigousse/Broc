import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHEMINS, LANGUES, VISUELS } from "./config.mjs";
import { BULLE, LIBELLE_NEGOCIER, LIBELLE_SUIVANT, MEDAILLON_PLUS, PORTRAITS_GALERIE, TITRES } from "./textes.mjs";

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

  // Garde : le chiffre « 31 » du titre n'était vérifié que contre lui-même
  // (une chaîne recopiée dans TITRES), jamais contre les portraits qui
  // existent réellement sur le disque — un ajout/retrait de personnage
  // pouvait faire mentir la fiche App Store sans qu'aucun test ne bronche.
  it("le chiffre annoncé correspond aux portraits présents sous public/personas", () => {
    function compterPortraits(dossier) {
      let n = 0;
      for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
        if (entree.isDirectory()) {
          // Portraits du grand-père lui-même (joueur), pas un personnage
          // qu'on rencontre en jeu — déjà exclu de PORTRAITS_GALERIE.
          if (entree.name === "grand-pere") continue;
          n += compterPortraits(path.join(dossier, entree.name));
          continue;
        }
        if (!/\.(webp|png|jpe?g)$/i.test(entree.name)) continue;
        if (entree.name.includes("-fache")) continue;
        if (entree.name === "vendeur-mystere.webp") continue;
        if (entree.name === "client-inconnu.webp") continue;
        n++;
      }
      return n;
    }

    const compte = compterPortraits(CHEMINS.personas);
    for (const l of LANGUES) {
      expect(TITRES.personnages[l], l).toContain(String(compte));
    }
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

  // Garde : `--carte=N` clique la flèche « suivant », dont le libellé
  // accessible vient lui aussi du jeu (`d.sheets.suivant`).
  it("reprend exactement le libellé « Suivant » de chaque fichier i18n", () => {
    for (const l of LANGUES) {
      const src = fs.readFileSync(
        path.join(CHEMINS.racine, `src/lib/i18n/ui/${l}.ts`), "utf8",
      );
      const trouve = src.match(/^\s*suivant:\s*"([^"]+)"/m);
      expect(trouve, `pas de clé suivant dans ${l}.ts`).toBeTruthy();
      expect(LIBELLE_SUIVANT[l]).toBe(trouve[1]);
    }
  });
});
