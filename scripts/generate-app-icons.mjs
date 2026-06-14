#!/usr/bin/env node
/**
 * Génère toutes les icônes de l'app (PWA / iOS / favicon / OpenGraph) à
 * partir d'un PNG source carré.
 *
 * Source : public/assets/broc-icon-source.png
 *
 * Sorties :
 *   - public/icon-192.png            (PWA)
 *   - public/icon-512.png            (PWA)
 *   - public/apple-touch-icon.png    (iOS, 180×180)
 *   - public/assets/broc-logo.png    (logo écran d'accueil, 512×512)
 *   - src/app/icon.png               (favicon Next.js, 32×32)
 *   - src/app/apple-icon.png         (Next.js, 180×180)
 *   - src/app/opengraph-image.png    (Next.js, 1200×630, padded forest)
 *
 * Usage :
 *   node scripts/generate-app-icons.mjs
 */

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "assets", "broc-icon-source.png");

// Couleur de fond pour l'image OG : forest-800 (cohérent avec theme_color
// et background de l'app).
const OG_BG = "#1a3326";

const TARGETS = [
  { out: "public/icon-192.png", size: 192 },
  { out: "public/icon-512.png", size: 512 },
  { out: "public/icon-1024.png", size: 1024 },
  { out: "public/apple-touch-icon.png", size: 180 },
  { out: "public/assets/broc-logo.png", size: 512 },
  { out: "src/app/icon.png", size: 32 },
  { out: "src/app/apple-icon.png", size: 180 },
];

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  // Source check.
  try {
    await fs.access(SRC);
  } catch {
    console.error(`❌ Source manquante : ${SRC}`);
    process.exit(1);
  }

  const meta = await sharp(SRC).metadata();
  console.log(`📐 Source : ${meta.width}×${meta.height} (${meta.format})`);

  for (const { out, size } of TARGETS) {
    const outPath = path.join(ROOT, out);
    await ensureDir(outPath);
    await sharp(SRC)
      .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(outPath);
    const stat = await fs.stat(outPath);
    console.log(`✅ ${out}  (${size}×${size}, ${Math.round(stat.size / 1024)} kB)`);
  }

  // OpenGraph 1200×630 — logo centré ~580×580 sur fond forest.
  const ogPath = path.join(ROOT, "src", "app", "opengraph-image.png");
  await ensureDir(ogPath);
  const logoBuf = await sharp(SRC)
    .resize(580, 580, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: OG_BG,
    },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(ogPath);
  const ogStat = await fs.stat(ogPath);
  console.log(`✅ src/app/opengraph-image.png  (1200×630, ${Math.round(ogStat.size / 1024)} kB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
