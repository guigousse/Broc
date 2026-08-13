#!/usr/bin/env node
/**
 * Feature graphic « éventail d'écrans » — 1024×500, sans alpha.
 *
 * Variante de `generate-feature-graphic.mjs` : au lieu de la seule façade, on
 * montre le jeu lui-même. Quatre écrans de jeu en éventail (chiner, vendre,
 * collection, musiques) et une bande de médaillons pour les personnages —
 * les cinq visuels App Store 01/03/04/05/06 sont ainsi représentés.
 *
 * Trois contraintes commandent la mise en page :
 *
 * 1. **Play recadre ce visuel selon les surfaces** et superpose un bouton
 *    lecture au centre s'il existe une vidéo promo. Rien d'essentiel dans les
 *    marges : l'écran le plus important (chiner) est au centre, et le bloc de
 *    titre reste à distance du bord gauche.
 * 2. **1024×500 est petit.** Les titres des visuels App Store (« DÉNICHEZ DES
 *    TRÉSORS OUBLIÉS »…) tomberaient à ~10 px de haut. On repart donc des
 *    captures BRUTES (`marketing/appstore/.captures/`) et on ne garde qu'un
 *    seul titre pour toute l'image.
 * 3. Piège connu du projet (mémoire « Visuels App Store — pipeline ») : sous
 *    `setContent`, les `file://` sont bloqués — polices ET images doivent être
 *    embarquées en base64.
 *
 * Usage : node scripts/play/generate-feature-graphic-ecrans.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

import { chargerFontFaceCss } from "../appstore/polices.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// C'est CE fichier qui est déposé dans Play Console. La variante « façade »
// (generate-feature-graphic.mjs) est conservée mais n'est plus l'image retenue.
const SORTIE = path.join(RACINE, "marketing/play/feature-graphic-1024x500.png");
const CAPTURES = path.join(RACINE, "marketing/appstore/.captures");
const PERSONAS = path.join(RACINE, "public/personas");

const LARGEUR = 1024;
const HAUTEUR = 500;

// Palette du jeu (src/app/globals.css).
const FOREST_900 = "#0F1F18";
const BRASS_100 = "#F1E3BF";
const BRASS_300 = "#D9C07A";

/**
 * L'éventail, de l'arrière-plan vers l'avant. `x` est le centre horizontal,
 * `h` la hauteur rendue ; la largeur en découle (les captures font 1242×2688,
 * soit un ratio de 0,462). Les deux écrans du centre sont les plus grands et
 * les plus droits : ce sont eux qui survivent à tous les recadrages.
 */
const EVENTAIL = [
  { cle: "musiques", x: 448, y: 266, h: 356, rot: -12, z: 1 },
  { cle: "collection", x: 830, y: 266, h: 356, rot: 12, z: 2, zoom: 1.55 },
  { cle: "vendre", x: 578, y: 246, h: 428, rot: -5, z: 3 },
  { cle: "chiner", x: 706, y: 246, h: 428, rot: 5, z: 4 },
];

const RATIO = 1242 / 2688;

/** Cinq têtes du visuel 06, dans l'ordre de lecture. */
const MEDAILLONS = [
  "vendeur-antiquaire.webp",
  "clients/client-bibliophile-0.webp",
  "vendeur-disquaire.webp",
  "clients/client-passionnee_artdeco-0.webp",
  "vendeur-mamie.webp",
];

async function dataUri(chemin, mime) {
  const buf = await fs.readFile(chemin);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  await fs.mkdir(path.dirname(SORTIE), { recursive: true });

  // Fond : la même façade que la variante d'origine, mais assombrie et floutée.
  // Elle ne doit plus être le sujet — juste une matière qui empêche un aplat.
  const fond = await sharp(path.join(RACINE, "public/qg/facade-accueil.webp"))
    .resize(LARGEUR, HAUTEUR, { fit: "cover", position: "top" })
    .blur(8)
    .modulate({ brightness: 0.62 })
    .png()
    .toBuffer();

  const ecrans = {};
  for (const { cle } of EVENTAIL) {
    ecrans[cle] = await dataUri(path.join(CAPTURES, `fr-iphone-6.5-${cle}.png`), "image/png");
  }

  const medaillons = await Promise.all(
    MEDAILLONS.map((p) => dataUri(path.join(PERSONAS, p), "image/webp")),
  );

  const css = await fs.readFile(path.join(RACINE, "src/app/globals.css"), "utf8");
  const polices = await chargerFontFaceCss(css, ["Cinzel"], path.join(RACINE, "public"));
  const verve = await dataUri(path.join(RACINE, "public/fonts/VerveShadow.ttf"), "font/ttf");

  const cadres = EVENTAIL.map((e) => {
    const w = Math.round(e.h * RATIO);
    // `zoom` recadre sur le haut de l'écran. La collection en a besoin : ses
    // dernières rangées sont des objets non découverts, dessinés en noir plein,
    // qui à cette taille passent pour des images cassées.
    const style = e.zoom
      ? `width:${e.zoom * 100}%; height:${e.zoom * 100}%; ` +
        `margin-left:${((1 - e.zoom) / 2) * 100}%; margin-top:0;`
      : "width:100%; height:100%;";
    return `<div class="cadre" style="
      left:${e.x - w / 2}px; top:${e.y - e.h / 2}px;
      width:${w}px; height:${e.h}px;
      transform: rotate(${e.rot}deg); z-index:${e.z};">
      <img style="${style}" src="${ecrans[e.cle]}" alt="">
    </div>`;
  }).join("\n    ");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${polices}
@font-face { font-family: 'Verve Shadow'; src: url('${verve}') format('truetype'); }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${LARGEUR}px; height: ${HAUTEUR}px; overflow: hidden; }
.scene { position: relative; width: ${LARGEUR}px; height: ${HAUTEUR}px; background: ${FOREST_900}; }
.fond { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
/* Voile : le titre doit rester lisible, et les écrans doivent se détacher du
   fond sans que celui-ci disparaisse tout à fait. */
.voile {
  position: absolute; inset: 0;
  background:
    linear-gradient(90deg, ${FOREST_900}FA 0%, ${FOREST_900}F0 30%, ${FOREST_900}A6 52%, ${FOREST_900}8C 100%),
    radial-gradient(120% 90% at 68% 50%, ${FOREST_900}00 30%, ${FOREST_900}99 100%);
}
/* z-index : l'éventail est resserré vers la gauche, le titre doit rester devant. */
.texte { position: absolute; left: 52px; top: 50%; transform: translateY(-50%); width: 300px; z-index: 10; }
/* inline-block : la largeur épouse le texte, ce qui rend la police mesurable
   (un bloc prendrait la largeur du parent, quelle que soit la police). */
.titre {
  display: inline-block;
  font-family: 'Verve Shadow', Georgia, serif;
  font-size: 108px; line-height: 0.92; color: ${BRASS_100};
  letter-spacing: 0.02em; text-shadow: 0 6px 22px rgba(0,0,0,0.65);
}
.trait { width: 108px; height: 3px; background: ${BRASS_300}; margin: 18px 0 16px; opacity: 0.9; }
.accroche {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 25px; line-height: 1.3; color: ${BRASS_100};
  letter-spacing: 0.04em; text-shadow: 0 2px 10px rgba(0,0,0,0.7);
}
.sous {
  margin-top: 12px;
  font-family: 'Cinzel', Georgia, serif;
  font-size: 15px; color: ${BRASS_300};
  letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.92;
}
/* Les personnages du visuel 06, en bande sous le titre : un rappel du casting
   sans disputer la place à l'éventail. */
.casting { display: flex; margin-top: 20px; }
.medaillon {
  width: 46px; height: 46px; border-radius: 50%;
  border: 2px solid ${BRASS_300}; margin-right: -12px;
  overflow: hidden; box-shadow: 0 3px 10px rgba(0,0,0,0.5);
  background: ${FOREST_900};
}
/* Les portraits n'ont pas tous le même format : on cadre sur le haut du buste. */
.medaillon img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 8%; }
.cadre {
  position: absolute;
  border-radius: 16px; border: 2px solid rgba(217,192,122,0.55);
  overflow: hidden; background: ${FOREST_900};
  box-shadow: 0 18px 40px rgba(0,0,0,0.65), 0 2px 0 rgba(241,227,191,0.15) inset;
}
.cadre img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style></head><body>
  <div class="scene">
    <img class="fond" src="data:image/png;base64,${fond.toString("base64")}" />
    <div class="voile"></div>
    ${cadres}
    <div class="texte">
      <div class="titre">BROC</div>
      <div class="trait"></div>
      <div class="accroche">Chinez, restaurez, revendez.</div>
      <div class="sous">Jeu de brocante cosy</div>
      <div class="casting">
        ${medaillons.map((m) => `<div class="medaillon"><img src="${m}" alt=""></div>`).join("\n        ")}
      </div>
    </div>
  </div>
</body></html>`;

  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({
    viewport: { width: LARGEUR, height: HAUTEUR },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: "load" });

  // `document.fonts.check()` ment (piège relevé le 2026-07-30) : on MESURE la
  // largeur du titre avec la police attendue, puis avec un repli.
  const mesure = await page.evaluate(() => {
    const el = document.querySelector(".titre");
    const avant = el.getBoundingClientRect().width;
    const familleOrigine = getComputedStyle(el).fontFamily;
    el.style.fontFamily = "Georgia, serif";
    const apres = el.getBoundingClientRect().width;
    el.style.fontFamily = familleOrigine;
    return { avant, apres };
  });
  if (Math.abs(mesure.avant - mesure.apres) < 1) {
    throw new Error(
      `La police du titre n'est pas appliquée (largeur identique au repli : ${mesure.avant}px).`,
    );
  }

  // Les captures sont lourdes : on s'assure qu'elles sont bien décodées avant
  // de photographier, sinon on capture des cadres vides.
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))),
    ),
  );
  await page.waitForTimeout(300);
  const brut = await page.screenshot({ type: "png" });
  await navigateur.close();

  // Play refuse la transparence : on aplatit sur le vert forêt.
  await sharp(brut).flatten({ background: FOREST_900 }).png({ compressionLevel: 9 }).toFile(SORTIE);

  const meta = await sharp(SORTIE).metadata();
  const taille = (await fs.stat(SORTIE)).size;
  console.log(
    `✅ ${path.relative(RACINE, SORTIE)} — ${meta.width}×${meta.height}, ` +
      `canaux ${meta.channels}, alpha ${meta.hasAlpha}, ${(taille / 1024).toFixed(0)} Ko`,
  );
  console.log(`   police du titre : largeur ${mesure.avant.toFixed(0)}px vs repli ${mesure.apres.toFixed(0)}px`);
  if (meta.width !== LARGEUR || meta.height !== HAUTEUR) {
    throw new Error("Dimensions incorrectes — Play exige exactement 1024×500.");
  }
  if (meta.hasAlpha) throw new Error("Le fichier a un canal alpha — Play le refuse.");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
