// Régénère les assets optimisés du site vitrine (site/assets) depuis les
// sources marketing/ et public/. Usage : node scripts/site/gen-assets.mjs
// Prérequis : les badges EN/ES/EL officiels sont déjà commités dans site/assets.
import sharp from "sharp";
import { mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = join(REPO, "site");
const A = join(SITE, "assets");

for (const lang of ["fr", "en", "es", "el"]) mkdirSync(join(A, "shots", lang), { recursive: true });
mkdirSync(join(A, "fonts"), { recursive: true });

// Héros : l'illustration « nue » de l'affiche, deux tailles
const hero = join(REPO, "marketing/poster/candidats/illustration-2.png");
await sharp(hero).resize({ width: 1600 }).webp({ quality: 78 }).toFile(join(A, "hero-1600.webp"));
await sharp(hero).resize({ width: 900 }).webp({ quality: 76 }).toFile(join(A, "hero-900.webp"));

// Captures App Store : 4 langues × 6, 560 px de large
for (const lang of ["fr", "en", "es", "el"]) {
  const dir = join(REPO, "marketing/appstore", lang, "iphone-6.5");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".png")).sort()) {
    await sharp(join(dir, f)).resize({ width: 560 }).webp({ quality: 80 })
      .toFile(join(A, "shots", lang, f.replace(/\.png$/, ".webp")));
  }
}

// Icône et Open Graph
const icon = join(REPO, "public/icon-512.png");
await sharp(icon).resize(180, 180).png().toFile(join(SITE, "apple-touch-icon.png"));
await sharp(icon).resize(120, 120).webp({ quality: 90 }).toFile(join(A, "icon-120.webp"));
await sharp(icon).resize(48, 48).png().toFile(join(SITE, "favicon.png"));
await sharp(join(REPO, "marketing/poster/broc-teasing-fr.png"))
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .jpeg({ quality: 82 })
  .toFile(join(A, "og.jpg"));

// Copies telles quelles (le badge FR vient de marketing/, app-ads.txt de public/)
const copies = [
  [join(REPO, "marketing/poster/badge-app-store-fr.svg"), join(A, "badge-fr.svg")],
  [join(REPO, "public/app-ads.txt"), join(SITE, "app-ads.txt")],
];
const fonts = ["g04", "g05", "g09", "g10", "g14", "g15", "g18", "g19", "g26", "g27"].map((g) => `${g}.woff2`)
  .concat(["gfs-didot-greek.woff2", "gfs-didot-greek-ext.woff2", "eb-garamond-greek.woff2", "eb-garamond-greek-ext.woff2"]);
for (const f of fonts) copies.push([join(REPO, "public/fonts/google", f), join(A, "fonts", f)]);
for (const [src, dst] of copies) copyFileSync(src, dst);
console.log("assets du site régénérés");
