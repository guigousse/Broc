/**
 * Non-régression des deux défauts de mise en page les plus graves du
 * gabarit : un filet doré à position fixe qui traversait le titre dès qu'il
 * passait à trois lignes, et une fonte de médaillon calculée sur la largeur
 * du visuel plutôt que sur celle de la cellule (débordement du cercle sur
 * iPad). Cinq revues avaient validé le CSS de `gabarit.mjs` sans jamais
 * mesurer une boîte rendue — ce fichier mesure les boîtes.
 *
 * Rendu réel via Playwright (comme `rendu.mjs`), polices du jeu embarquées
 * (comme `polices-rendues.test.mjs`) : un simple survol du CSS ne suffit pas
 * à voir ces défauts, il faut le layout final avec la vraie police (Cinzel),
 * dont la chasse détermine le nombre de lignes du titre.
 */
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { APPAREILS, CHEMINS, LANGUES, VISUELS } from "./config.mjs";
import { construireHtml } from "./gabarit.mjs";
import { chargerFontFaceCss } from "./polices.mjs";

const FAUX = "data:image/webp;base64,AAAA";
// Le visuel « personnages » est le seul à porter titre, filet ET médaillon
// « et + » en même temps — un seul rendu par combinaison suffit donc à
// couvrir les deux défauts.
const VISUEL_PERSONNAGES = VISUELS.find((v) => v.cle === "personnages");

let navigateur;
let fontFaceCss;

beforeAll(async () => {
  const css = await fs.readFile(CHEMINS.globalsCss, "utf8");
  fontFaceCss = await chargerFontFaceCss(css, ["Cinzel", "Caveat"], CHEMINS.fonts);
  navigateur = await chromium.launch();
}, 30000);

afterAll(async () => {
  await navigateur.close();
});

async function mesurerGeometrie(langue, appareilId) {
  const appareil = APPAREILS[appareilId];
  const html = construireHtml({
    visuel: VISUEL_PERSONNAGES,
    langue,
    appareil,
    fontFaceCss,
    captureDataUri: null,
    grandPereDataUri: FAUX,
    portraitsDataUri: Array.from({ length: 19 }, () => FAUX),
  });

  const contexte = await navigateur.newContext({
    viewport: appareil.sortie,
    deviceScaleFactor: 1,
  });
  const page = await contexte.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate(() => {
      const titre = document.querySelector(".titre").getBoundingClientRect();
      const filet = document.querySelector(".filet").getBoundingClientRect();
      const cercle = document.querySelector(".case.plus").getBoundingClientRect();
      const span = document.querySelector(".plus span").getBoundingClientRect();
      return {
        titreBottom: titre.bottom,
        filetTop: filet.top,
        cercleLargeur: cercle.width,
        cercleHauteur: cercle.height,
        spanLargeur: span.width,
        spanHauteur: span.height,
      };
    });
  } finally {
    await contexte.close();
  }
}

describe("géométrie rendue du gabarit App Store", () => {
  const combinaisons = LANGUES.flatMap((l) => Object.keys(APPAREILS).map((a) => [l, a]));

  it.each(combinaisons)(
    "le bloc de titre reste au-dessus du filet, quel que soit son nombre de lignes (%s / %s)",
    async (langue, appareilId) => {
      const m = await mesurerGeometrie(langue, appareilId);
      expect(
        m.titreBottom,
        `titre (bas à ${m.titreBottom}px) chevauche le filet (haut à ${m.filetTop}px)`,
      ).toBeLessThanOrEqual(m.filetTop);
    },
    20000,
  );

  it.each(combinaisons)(
    "le contenu du médaillon « et + » tient dans son cercle (%s / %s)",
    async (langue, appareilId) => {
      const m = await mesurerGeometrie(langue, appareilId);
      // Largeur : une ligne de texte centrée dans un cercle peut occuper tout
      // son diamètre au niveau de l'axe horizontal médian — la marge de 5 %
      // couvre la bordure du médaillon, pas une contrainte de fond.
      expect(
        m.spanLargeur,
        `médaillon (${m.spanLargeur}px) plus large que sa cellule (${m.cercleLargeur}px)`,
      ).toBeLessThanOrEqual(m.cercleLargeur * 0.95);
      // Hauteur : si le texte est passé à la ligne (l'ancien bug), la boîte
      // du <span> double de hauteur — ce seuil le détecte sans dépendre
      // d'une taille de fonte précise.
      expect(
        m.spanHauteur,
        `médaillon sur plus d'une ligne (hauteur ${m.spanHauteur}px pour une cellule de ${m.cercleHauteur}px)`,
      ).toBeLessThanOrEqual(m.cercleHauteur * 0.6);
    },
    20000,
  );
});
