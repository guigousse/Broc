#!/usr/bin/env node
/**
 * Finalisation des images d'items après passage de l'Action Rapide macOS
 * "Supprimer l'arrière-plan" depuis le Finder.
 *
 * Pour chaque fichier `<prefix> avec arrière-plan supprimé.<rest>.png` :
 *   1. Archive l'original `<prefix>.<rest>.png` dans `archives/items-original-bg/`
 *   2. Trim aux bornes des pixels non-transparents
 *   3. Re-centre dans un canvas carré transparent (côté = max(w, h))
 *   4. Écrit le résultat en `public/items/<prefix>.<rest>.png`
 *   5. Supprime le fichier avec suffixe
 *
 * Usage :
 *   node scripts/finalize-item-bg.mjs --one <prefix>.<rest>.png   # test sur 1
 *   node scripts/finalize-item-bg.mjs                              # batch tout
 *   node scripts/finalize-item-bg.mjs --dry                        # simulation
 */
import { readdir, rename, unlink, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ITEMS_DIR = path.resolve("public/items");
const ARCHIVE_DIR = path.resolve("archives/items-original-bg");
const SUFFIX_RE = /^([^ ]+) avec .*supprim[^.]*\.(.+)$/u;

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const onlyArg = args.includes("--one")
  ? args[args.indexOf("--one") + 1]
  : null;

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function deriveTemplateName(suffixedName) {
  const m = suffixedName.match(SUFFIX_RE);
  if (!m) return null;
  return `${m[1]}.${m[2]}`;
}

async function processOne(suffixedName) {
  const templateName = deriveTemplateName(suffixedName);
  if (!templateName) throw new Error(`pattern inattendu : ${suffixedName}`);

  const suffixedPath = path.join(ITEMS_DIR, suffixedName);
  const originalPath = path.join(ITEMS_DIR, templateName);
  const archivePath = path.join(ARCHIVE_DIR, templateName);

  // 1. Archive
  if (await exists(originalPath)) {
    if (!dry) await rename(originalPath, archivePath);
  }

  // 2. + 3. Trim + carré
  const trimmed = await sharp(suffixedPath)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .toBuffer();

  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width, meta.height);
  const dx = Math.floor((side - meta.width) / 2);
  const dy = Math.floor((side - meta.height) / 2);

  const finalBuffer = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left: dx, top: dy }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  // 4. Écriture finale (sur le chemin du templateId)
  if (!dry) await sharp(finalBuffer).toFile(originalPath);

  // 5. Suppression du fichier suffixé
  if (!dry) await unlink(suffixedPath);

  return { templateName, side, w: meta.width, h: meta.height };
}

async function main() {
  if (!dry) await mkdir(ARCHIVE_DIR, { recursive: true });

  const all = await readdir(ITEMS_DIR);
  let candidates = all.filter((n) => SUFFIX_RE.test(n));

  if (onlyArg) {
    // Cherche le sans-fond correspondant au templateId fourni
    const target = candidates.find(
      (c) => deriveTemplateName(c) === onlyArg,
    );
    if (!target) {
      console.error(`Aucun sans-fond trouvé pour ${onlyArg}`);
      process.exit(1);
    }
    candidates = [target];
  }

  console.log(
    `${candidates.length} fichier(s) à finaliser${dry ? " (DRY)" : ""}`,
  );

  let ok = 0;
  let fail = 0;
  const t0 = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const name = candidates[i];
    const idx = `[${i + 1}/${candidates.length}]`;
    try {
      const res = await processOne(name);
      ok++;
      const verbose = candidates.length <= 5;
      if (verbose) {
        console.log(
          `${idx} ✓ ${res.templateName} (${res.w}×${res.h} → ${res.side}²)`,
        );
      } else if ((i + 1) % 25 === 0 || i === candidates.length - 1) {
        console.log(`${idx} ${res.templateName}`);
      }
    } catch (err) {
      fail++;
      console.error(`${idx} ✗ ${name} : ${err.message}`);
    }
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nTerminé en ${dt}s — ${ok} OK, ${fail} échec(s)`);
  if (!dry && ok > 0)
    console.log(`Originaux archivés dans : ${path.relative(process.cwd(), ARCHIVE_DIR)}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
