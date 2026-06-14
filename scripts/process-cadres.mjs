#!/usr/bin/env node
/**
 * Traite les cadres bois de `public/cadres/cadre-N-raw.webp` :
 *  - applique un chroma-key sur le blanc (intérieur du cadre) → alpha 0
 *  - re-encode en WebP propre vers `public/cadres/cadre-N.webp`
 *
 * Pour anti-aliasing : on utilise un seuil bas (transparent total) et
 * un seuil haut (alpha gradué) pour préserver les bords légèrement
 * teintés du bois sans halo blanc.
 *
 * Usage : npm run process:cadres
 */

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "public", "cadres");

const SOURCES = [
  "cadre-1-raw.webp",
  "cadre-2-raw.webp",
  "cadre-3-raw.webp",
  "cadre-4-raw.webp",
  "cadre-5-raw.webp",
];

/**
 * Chroma-key gradué : pour chaque pixel, alpha croît linéairement entre
 * la cible (alpha = 0, blanc → transparent) et `looseThreshold` (alpha = 255,
 * loin du blanc → opaque). On utilise la distance L1 sur RGB (0–765).
 *
 *   distance ≤ tight → transparent (le blanc / l'intérieur du cadre)
 *   distance ≥ loose → opaque (le bois)
 *   entre les deux  → alpha gradué (anti-aliasing du bord)
 */
async function chromaKeyGradient(srcPath, outPath, target, { tight, loose }) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [tr, tg, tb] = target;
  let cleared = 0;
  let faded = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb);
    if (dist <= tight) {
      data[i + 3] = 0;
      cleared++;
    } else if (dist < loose) {
      const t = (dist - tight) / (loose - tight); // 0..1 (0 = proche blanc, 1 = loin)
      data[i + 3] = Math.round(data[i + 3] * t);
      faded++;
    }
    // sinon : dist ≥ loose → alpha intact (bois opaque)
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(outPath);
  return { cleared, faded, total: info.width * info.height };
}

async function main() {
  for (const name of SOURCES) {
    const src = path.join(DIR, name);
    try {
      await fs.access(src);
    } catch {
      console.error(`❌ source manquante : ${name}`);
      continue;
    }
    const out = path.join(DIR, name.replace(/-raw\.webp$/, ".webp"));
    const { cleared, faded, total } = await chromaKeyGradient(
      src,
      out,
      [255, 255, 255],
      // Distance L1 du pixel à (255,255,255).
      // <= 30 : très blanc → transparent total (intérieur du cadre).
      // 30..90 : zone d'AA → alpha gradué (préserve les bords doux).
      // >= 90 : bois clair / textures → opaque.
      { tight: 30, loose: 90 },
    );
    const stat = await fs.stat(out);
    console.log(
      `✅ ${path.basename(out)} (${Math.round(stat.size / 1024)} kB) — ${cleared} clear, ${faded} faded / ${total}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
