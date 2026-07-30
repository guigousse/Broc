/**
 * Non-régression du bug le plus grave du pipeline : les polices du jeu ne
 * s'appliquaient pas dans les visuels App Store — repli silencieux sur le
 * serif par défaut du navigateur, parce que `rendu.mjs` compose la page via
 * `page.setContent()` (origine `about:blank`), où Chromium refuse les
 * sous-ressources `file://`.
 *
 * `document.fonts.check()` répond « disponible » même quand la police n'est
 * pas réellement appliquée (il ne teste que le CSS Font Loading, pas le
 * rendu) — c'est pour ça que le bug a traversé plusieurs revues qui
 * vérifiaient le CSS extrait sans jamais vérifier les pixels. La seule
 * preuve qui vaille : mesurer la largeur d'un même texte rendu dans la
 * police visée et dans une famille dont le nom n'existe pas. Si la police
 * s'applique vraiment, les deux largeurs diffèrent (des glyphes différents
 * n'ont pas la même chasse) ; si elle a été refusée en silence, les deux
 * retombent sur le même repli et les largeurs sont identiques.
 *
 * Les blocs de mesure sont présents dans le HTML initial (comme le fait
 * `construireHtml` en production), pas injectés après coup : un `<span>`
 * ajouté après que `document.fonts.ready` s'est déjà résolu déclenche un
 * *nouveau* chargement dont ce même « ready » n'attend pas la fin, et donne
 * un faux négatif (les deux largeurs mesurées identiques, police ou pas).
 */
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHEMINS } from "./config.mjs";
import { chargerFontFaceCss } from "./polices.mjs";

const FAMILLE_BIDON = "PoliceQuiNexistePas";
const TEXTE_LATIN = "Dénichez des trésors oubliés";
// Réplique du grand-père (visuel 5, grec) : plus longue que les titres, elle
// donne un écart de largeur net et stable une fois embarquée. Sur les titres
// grecs courts, Cinzel et le serif système ont ponctuellement une chasse
// globale très proche (formes différentes, addition des largeurs voisine) —
// un faux négatif du seul fait du texte choisi, pas du mécanisme testé.
const TEXTE_GREC = "Να φυλάγεσαι απ' αυτόν που χαμογελάει πιο πολύ";

/** Une mesure par combinaison (famille, texte, italique) : bloc {id, famille, texte, italique}. */
const MESURES = [
  { id: "cinzel-latin", famille: "Cinzel", texte: TEXTE_LATIN },
  { id: "bidon-latin", famille: FAMILLE_BIDON, texte: TEXTE_LATIN },
  { id: "caveat-latin", famille: "Caveat", texte: TEXTE_LATIN },
  { id: "bidon-latin-2", famille: FAMILLE_BIDON, texte: TEXTE_LATIN },
  { id: "cinzel-grec", famille: "Cinzel", texte: TEXTE_GREC },
  { id: "bidon-grec", famille: FAMILLE_BIDON, texte: TEXTE_GREC },
  { id: "caveat-grec-italique", famille: "Caveat", texte: TEXTE_GREC, italique: true },
  { id: "bidon-grec-italique", famille: FAMILLE_BIDON, texte: TEXTE_GREC, italique: true },
];

let largeurs;

beforeAll(async () => {
  const css = await fs.readFile(CHEMINS.globalsCss, "utf8");
  const fontFaceCss = await chargerFontFaceCss(css, ["Cinzel", "Caveat"], CHEMINS.fonts);

  const corps = MESURES.map(
    ({ id, famille, texte, italique }) =>
      `<span id="${id}" style="position:absolute;white-space:nowrap;font-size:150px;` +
      `font-family:'${famille}';${italique ? "font-style:italic;" : ""}">${texte}</span>`,
  ).join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaceCss}</style></head>` +
    `<body>${corps}</body></html>`;

  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext();
  const page = await contexte.newPage();
  try {
    // Même mécanisme que rendu.mjs : setContent(), donc origine about:blank.
    // C'est exactement la condition qui faisait échouer les requêtes file://
    // avant l'embarquement des polices en base64.
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    largeurs = await page.evaluate((mesures) => {
      const r = {};
      for (const { id } of mesures) {
        r[id] = document.getElementById(id).getBoundingClientRect().width;
      }
      return r;
    }, MESURES);
  } finally {
    await contexte.close();
    await navigateur.close();
  }
}, 30000);

describe("les polices du jeu s'appliquent réellement au rendu (pas seulement au CSS)", () => {
  it("Cinzel change la largeur du texte par rapport à une famille inexistante", () => {
    expect(Math.abs(largeurs["cinzel-latin"] - largeurs["bidon-latin"])).toBeGreaterThan(20);
  });

  it("Caveat change la largeur du texte par rapport à une famille inexistante", () => {
    expect(Math.abs(largeurs["caveat-latin"] - largeurs["bidon-latin"])).toBeGreaterThan(20);
  });

  it("le repli grec de Cinzel (GFS Didot) s'applique aussi, pas seulement le latin", () => {
    // GFS Didot et le serif système ont des formes différentes mais une
    // chasse globale assez proche sur du texte grec : l'écart réel est bien
    // plus modeste qu'en latin (dizaines de px, pas centaines). Seuil abaissé
    // en conséquence, toujours largement au-dessus du bruit de mesure (0px
    // si la police ne s'appliquait pas du tout).
    expect(Math.abs(largeurs["cinzel-grec"] - largeurs["bidon-grec"])).toBeGreaterThan(15);
  });

  it("le repli grec de Caveat (italique EB Garamond) s'applique aussi", () => {
    expect(Math.abs(largeurs["caveat-grec-italique"] - largeurs["bidon-grec-italique"])).toBeGreaterThan(20);
  });

  it("la famille bidon est stable d'une mesure à l'autre (le test lui-même n'est pas bruité)", () => {
    expect(largeurs["bidon-latin"]).toBe(largeurs["bidon-latin-2"]);
  });
});
