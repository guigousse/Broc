#!/usr/bin/env node
/**
 * Feature graphic du Play Store — 1024×500, sans alpha.
 *
 * Google l'exige pour publier une fiche : sans lui, pas de fiche, donc pas de
 * piste de test fermé, donc pas de compteur de 14 jours. C'est un prérequis
 * bloquant du sous-projet D, pas un ornement.
 *
 * Piège connu du projet (cf. mémoire « Visuels App Store — pipeline ») : sous
 * `setContent`, les `file://` sont bloqués — polices ET images doivent être
 * embarquées en base64. On réutilise donc le chargeur de polices de la chaîne
 * App Store plutôt que d'en réinventer un.
 *
 * Play recadre ce visuel selon les surfaces : rien d'essentiel dans les marges.
 *
 * Usage : node scripts/play/generate-feature-graphic.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

import { chargerFontFaceCss } from "../appstore/polices.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SORTIE = path.join(RACINE, "marketing/play/feature-graphic-1024x500.png");

const LARGEUR = 1024;
const HAUTEUR = 500;

// Palette du jeu (src/app/globals.css).
const FOREST_900 = "#0F1F18";
const BRASS_100 = "#F1E3BF";
const BRASS_300 = "#D9C07A";

async function dataUri(chemin, mime) {
  const buf = await fs.readFile(chemin);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  await fs.mkdir(path.dirname(SORTIE), { recursive: true });

  // La façade fait 2048×1374 : on en tire une bande panoramique. `position: top`
  // garde le ciel et les toits, la partie qui respire ; le bas de l'image est
  // occupé par le pavé, qui ne dit rien à cette taille.
  const fond = await sharp(path.join(RACINE, "public/qg/facade-accueil.webp"))
    .resize(LARGEUR, HAUTEUR, { fit: "cover", position: "top" })
    .png()
    .toBuffer();

  const css = await fs.readFile(path.join(RACINE, "src/app/globals.css"), "utf8");
  const polices = await chargerFontFaceCss(
    css,
    ["Cinzel"],
    path.join(RACINE, "public"),
  );
  const verve = await dataUri(path.join(RACINE, "public/fonts/VerveShadow.ttf"), "font/ttf");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${polices}
@font-face { font-family: 'Verve Shadow'; src: url('${verve}') format('truetype'); }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${LARGEUR}px; height: ${HAUTEUR}px; overflow: hidden; }
.scene { position: relative; width: ${LARGEUR}px; height: ${HAUTEUR}px; }
.fond { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
/* Voile vert forêt : le texte doit rester lisible par-dessus une illustration
   claire, et Play superpose parfois ses propres éléments. */
.voile {
  position: absolute; inset: 0;
  background:
    linear-gradient(90deg, ${FOREST_900}F2 0%, ${FOREST_900}D9 42%, ${FOREST_900}33 72%, ${FOREST_900}00 100%),
    linear-gradient(180deg, ${FOREST_900}55 0%, ${FOREST_900}00 30%);
}
.texte {
  position: absolute; left: 68px; top: 50%; transform: translateY(-50%);
  width: 560px;
}
.titre {
  /* inline-block : la largeur épouse le texte, ce qui rend la police mesurable
     (un bloc prendrait la largeur du parent, quelle que soit la police). */
  display: inline-block;
  font-family: 'Verve Shadow', Georgia, serif;
  font-size: 132px; line-height: 0.92; color: ${BRASS_100};
  letter-spacing: 0.02em;
  text-shadow: 0 6px 22px rgba(0,0,0,0.55);
}
.trait { width: 128px; height: 3px; background: ${BRASS_300}; margin: 22px 0 20px; opacity: 0.9; }
.accroche {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 30px; line-height: 1.32; color: ${BRASS_100};
  letter-spacing: 0.06em; text-shadow: 0 2px 10px rgba(0,0,0,0.6);
}
.sous {
  margin-top: 14px;
  font-family: 'Cinzel', Georgia, serif;
  font-size: 20px; color: ${BRASS_300};
  letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.92;
}
</style></head><body>
  <div class="scene">
    <img class="fond" src="data:image/png;base64,${fond.toString("base64")}" />
    <div class="voile"></div>
    <div class="texte">
      <div class="titre">BROC</div>
      <div class="trait"></div>
      <div class="accroche">Chinez, restaurez, revendez.</div>
      <div class="sous">Jeu de brocante cosy</div>
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
  // largeur du titre avec la police attendue, puis avec un repli. Si les deux
  // sont égales, la police n'a pas été appliquée.
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

  await page.waitForTimeout(200);
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
