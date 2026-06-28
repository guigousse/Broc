#!/usr/bin/env node
/**
 * Génère des vignettes des items pour la grille de collection.
 *
 * Source  : public/items/{id}.webp        (plein format, ~1600 px)
 * Sortie  : public/items/thumbs/{id}.webp  (max 384 px, contain, fond transparent)
 *
 * Pourquoi : la grille affiche des centaines de stickers dans des cellules de
 * ~100 px. Charger le plein format (~1600 px) fait décoder ~10 Mo de bitmap par
 * image en mémoire → sous iOS le WebView finit par recharger la page. Une
 * vignette 384 px se décode en ~0,5 Mo : mémoire divisée par ~20, qualité
 * largement suffisante (l'overlay détail, lui, garde le plein format).
 *
 * Idempotent : skip si la vignette existe déjà ET est plus récente que la
 * source. `FORCE=1` pour tout régénérer.
 *
 * Usage :
 *   npm run gen:thumbs
 *   FORCE=1 npm run gen:thumbs
 *   THUMB_MAX=320 THUMB_QUALITY=78 npm run gen:thumbs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(PROJECT_ROOT, "public", "items");
const OUT_DIR = path.join(SRC_DIR, "thumbs");
const MAX = Number(process.env.THUMB_MAX ?? 384);
const QUALITY = Number(process.env.THUMB_QUALITY ?? 80);
const FORCE = process.env.FORCE === "1";

async function isUpToDate(srcPath, outPath) {
  try {
    const [srcStat, outStat] = await Promise.all([
      fs.stat(srcPath),
      fs.stat(outPath),
    ]);
    return outStat.mtimeMs >= srcStat.mtimeMs;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(SRC_DIR)).filter((f) => f.endsWith(".webp"));
  console.log(`📁 ${files.length} images source (max=${MAX}px, quality=${QUALITY})`);

  let count = 0;
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, file);

    if (!FORCE && (await isUpToDate(srcPath, outPath))) continue;

    const srcStat = await fs.stat(srcPath);
    const buf = await fs.readFile(srcPath);
    const outBuf = await sharp(buf)
      .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    await fs.writeFile(outPath, outBuf);

    count += 1;
    beforeBytes += srcStat.size;
    afterBytes += outBuf.length;
  }

  if (count === 0) {
    console.log("⏭️  Tout est à jour (utilise FORCE=1 pour régénérer).");
    return;
  }
  const beforeMB = (beforeBytes / 1024 / 1024).toFixed(1);
  const afterMB = (afterBytes / 1024 / 1024).toFixed(1);
  const ratio = Math.round((1 - afterBytes / beforeBytes) * 100);
  console.log(
    `📦 ${count} vignette${count > 1 ? "s" : ""} générée${count > 1 ? "s" : ""}, ${beforeMB} MB → ${afterMB} MB (−${ratio}%)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
