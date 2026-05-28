#!/usr/bin/env node
/**
 * Optimise les PNG de public/items/ : redimensionnement 1024×1024 max +
 * compression PNG avec palette. Idempotent ; ne touche pas aux fichiers déjà
 * inférieurs au seuil de taille.
 *
 * Usage :
 *   npm run opt:images
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIRS = [
  path.join(PROJECT_ROOT, "public", "items"),
  path.join(PROJECT_ROOT, "public", "brocantes"),
];
const MAX_SIDE = 1024;
const ALREADY_OPTIMIZED_KB = 400;

async function processDir(dir) {
  let files;
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".png"));
  } catch {
    return;
  }
  if (files.length === 0) return;
  const rel = path.relative(PROJECT_ROOT, dir);
  console.log(`\n📁 ${rel}`);

  for (const file of files) {
    const src = path.join(dir, file);
    const stat = await fs.stat(src);
    const beforeKB = Math.round(stat.size / 1024);
    if (beforeKB < ALREADY_OPTIMIZED_KB) {
      console.log(`⏭️  ${file} (${beforeKB} kB, déjà optimisé)`);
      continue;
    }

    const buf = await fs.readFile(src);
    const optimized = await sharp(buf)
      .resize(MAX_SIDE, MAX_SIDE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toBuffer();
    await fs.writeFile(src, optimized);
    const afterKB = Math.round(optimized.length / 1024);
    console.log(
      `✅  ${file} : ${beforeKB} kB → ${afterKB} kB (−${Math.round((1 - afterKB / beforeKB) * 100)}%)`,
    );
  }
}

async function main() {
  for (const dir of DIRS) await processDir(dir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
