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
const ITEMS_DIR = path.resolve(__dirname, "..", "public", "items");
const MAX_SIDE = 1024;
const ALREADY_OPTIMIZED_KB = 400;

async function main() {
  const files = (await fs.readdir(ITEMS_DIR)).filter((f) => f.endsWith(".png"));
  if (files.length === 0) {
    console.log("Aucun PNG dans public/items/");
    return;
  }

  for (const file of files) {
    const src = path.join(ITEMS_DIR, file);
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
