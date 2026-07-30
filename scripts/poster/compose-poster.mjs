#!/usr/bin/env node
/**
 * Compose l'affiche de teasing App Store : illustration générée en fond,
 * wordmark BROC + ornement en haut, accroche + badge App Store officiel en
 * bas sur un dégradé sépia. Rendu HTML → PNG via Playwright, fontes du jeu
 * embarquées en base64 (jamais de file:// sous setContent).
 *
 * Usage :
 *   node scripts/poster/compose-poster.mjs                 # candidat 1
 *   node scripts/poster/compose-poster.mjs --illustration=2
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { chargerFontFaceCss } from "../appstore/polices.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const POSTER_DIR = path.join(PROJECT_ROOT, "marketing", "poster");

const LARGEUR = 1080;
const HAUTEUR = 1350;

const args = process.argv.slice(2);
const illuArg = args.find((a) => a.startsWith("--illustration="));
const illuNum = illuArg ? illuArg.slice("--illustration=".length) : "1";

const MIMES = { png: "image/png", webp: "image/webp", svg: "image/svg+xml" };

async function dataUri(filePath) {
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return `data:${MIMES[ext]};base64,${buf.toString("base64")}`;
}

async function main() {
  const [illustration, divider, grain, globalsCss] = await Promise.all([
    dataUri(path.join(POSTER_DIR, "candidats", `illustration-${illuNum}.png`)),
    dataUri(path.join(PUBLIC_DIR, "assets", "deco-divider.svg")),
    dataUri(path.join(PUBLIC_DIR, "assets", "paper-grain.svg")),
    fs.readFile(path.join(PROJECT_ROOT, "src", "app", "globals.css"), "utf8"),
  ]);

  const fontFaces = await chargerFontFaceCss(
    globalsCss,
    ["Cinzel", "Verve Shadow"],
    PUBLIC_DIR,
  );

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${fontFaces}
* { margin: 0; padding: 0; box-sizing: border-box; }
.affiche {
  position: relative; width: ${LARGEUR}px; height: ${HAUTEUR}px;
  overflow: hidden; background: #241B12;
}
.illustration {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
}
/* Voiles haut et bas pour asseoir la typo sans éteindre l'illustration. */
.voile-haut {
  position: absolute; inset: 0 0 auto 0; height: 32%;
  background: linear-gradient(to bottom,
    rgba(59, 42, 24, 0.42) 0%, rgba(59, 42, 24, 0.2) 55%, rgba(59, 42, 24, 0) 100%);
}
.voile-bas {
  position: absolute; inset: auto 0 0 0; height: 40%;
  background: linear-gradient(to top,
    rgba(31, 21, 11, 0.92) 0%, rgba(31, 21, 11, 0.6) 48%, rgba(31, 21, 11, 0) 100%);
}
.grain {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0.28; mix-blend-mode: multiply; pointer-events: none;
}
.haut {
  position: absolute; top: 64px; left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center;
}
/* Même habillage que le titre de l'écran titre de l'appli (page.tsx). */
.titre {
  font-family: 'Verve Shadow', 'Cinzel', Georgia, serif; font-weight: 400;
  font-size: 190px; letter-spacing: 0.04em; line-height: 1;
  color: #FBF7EE; text-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}
.bas {
  position: absolute; bottom: 50px; left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}
.accroche {
  font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: 44px; color: #F1E3BF; letter-spacing: 0.05em;
  text-align: center;
  text-shadow: 0 2px 6px rgba(24, 17, 10, 0.9), 0 0 24px rgba(24, 17, 10, 0.7);
}
.divider { width: 420px; }
.dispo {
  font-family: 'Cinzel', Georgia, serif; font-weight: 600;
  font-size: 33px; color: #F1E3BF; letter-spacing: 0.09em;
  padding: 18px 40px; border: 2px solid #C5A059; border-radius: 999px;
  background: rgba(24, 17, 10, 0.35);
  text-shadow: 0 2px 6px rgba(24, 17, 10, 0.9);
}
</style></head>
<body>
  <div class="affiche">
    <img class="illustration" src="${illustration}" alt="">
    <div class="voile-haut"></div>
    <div class="voile-bas"></div>
    <img class="grain" src="${grain}" alt="">
    <div class="haut">
      <div class="titre">Broc</div>
    </div>
    <div class="bas">
      <div class="accroche">Chinez. Négociez.<br>Collectionnez.</div>
      <img class="divider" src="${divider}" alt="">
      <div class="dispo">Disponible gratuitement dans l&rsquo;App&nbsp;Store</div>
    </div>
  </div>
</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: LARGEUR, height: HAUTEUR },
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const outPath = path.join(POSTER_DIR, "broc-teasing-fr.png");
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log(`✅  ${path.relative(PROJECT_ROOT, outPath)} (2160×2700, candidat ${illuNum})`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
