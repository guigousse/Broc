#!/usr/bin/env node
/**
 * Convertit en WebP tous les PNG de `public/items/`, `public/brocantes/`
 * et `public/qg/`. Idempotent : skip si le WebP existe déjà ET est plus
 * récent que le PNG source.
 *
 * Quality 82 par défaut (bon compromis qualité/poids pour des illustrations).
 * À ajuster via `WEBP_QUALITY=90 npm run gen:webp` si besoin.
 *
 * Usage :
 *   npm run gen:webp                    # tout convertir
 *   FORCE=1 npm run gen:webp            # re-générer même si à jour
 *   WEBP_QUALITY=88 npm run gen:webp    # quality custom
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
  path.join(PROJECT_ROOT, "public", "qg"),
];
const QUALITY = Number(process.env.WEBP_QUALITY ?? 82);
const FORCE = process.env.FORCE === "1";

async function isWebpUpToDate(pngPath, webpPath) {
  try {
    const [pngStat, webpStat] = await Promise.all([
      fs.stat(pngPath),
      fs.stat(webpPath),
    ]);
    return webpStat.mtimeMs >= pngStat.mtimeMs;
  } catch {
    return false;
  }
}

async function processDir(dir) {
  let files;
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".png"));
  } catch {
    return { count: 0, beforeBytes: 0, afterBytes: 0 };
  }
  if (files.length === 0) return { count: 0, beforeBytes: 0, afterBytes: 0 };

  const rel = path.relative(PROJECT_ROOT, dir);
  console.log(`\n📁 ${rel}  (${files.length} PNG, quality=${QUALITY})`);

  let count = 0;
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const file of files) {
    const pngPath = path.join(dir, file);
    const webpPath = pngPath.replace(/\.png$/, ".webp");

    if (!FORCE && (await isWebpUpToDate(pngPath, webpPath))) {
      continue;
    }

    const pngStat = await fs.stat(pngPath);
    const buf = await fs.readFile(pngPath);
    const webpBuf = await sharp(buf).webp({ quality: QUALITY }).toBuffer();
    await fs.writeFile(webpPath, webpBuf);

    count += 1;
    beforeBytes += pngStat.size;
    afterBytes += webpBuf.length;
    const ratio = Math.round((1 - webpBuf.length / pngStat.size) * 100);
    const beforeKB = Math.round(pngStat.size / 1024);
    const afterKB = Math.round(webpBuf.length / 1024);
    console.log(
      `✅  ${file.replace(/\.png$/, ".webp")} : ${beforeKB} kB → ${afterKB} kB (−${ratio}%)`,
    );
  }

  if (count === 0) {
    console.log("⏭️  Tout est à jour (utilise FORCE=1 pour re-générer).");
  }
  return { count, beforeBytes, afterBytes };
}

async function main() {
  let total = { count: 0, before: 0, after: 0 };
  for (const dir of DIRS) {
    const { count, beforeBytes, afterBytes } = await processDir(dir);
    total.count += count;
    total.before += beforeBytes;
    total.after += afterBytes;
  }
  if (total.count > 0) {
    const beforeMB = (total.before / 1024 / 1024).toFixed(1);
    const afterMB = (total.after / 1024 / 1024).toFixed(1);
    const ratio = Math.round((1 - total.after / total.before) * 100);
    console.log(
      `\n📦 Total : ${total.count} fichier${total.count > 1 ? "s" : ""} convertis, ${beforeMB} MB → ${afterMB} MB (−${ratio}%)`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
