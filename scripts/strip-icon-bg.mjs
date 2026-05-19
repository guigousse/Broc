#!/usr/bin/env node
/**
 * Découpe le fond blanc d'une icône carrée à coins arrondis :
 *  1. trim() pour retirer la marge blanche
 *  2. resize 1024×1024 carré sans déformer
 *  3. masque squircle/coins arrondis appliqué en alpha (dest-in)
 *
 * Usage : node scripts/strip-icon-bg.mjs <input.png> <output.png> [radius]
 */
import sharp from "sharp";
import path from "node:path";

const [, , inPath, outPath, radiusArg] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: strip-icon-bg.mjs <input> <output> [cornerRadius=180]");
  process.exit(1);
}

const SIZE = 1024;
const radius = Number(radiusArg ?? 180);

const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
     <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#fff"/>
   </svg>`,
);

const trimmed = await sharp(path.resolve(inPath))
  // Retire la marge blanche autour du squircle
  .trim({ background: "#ffffff", threshold: 12 })
  // Recadre/agrandit au format carré en gardant le sujet centré sur fond transparent
  .resize(SIZE, SIZE, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp(trimmed)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toFile(path.resolve(outPath));

console.log(`✓ ${outPath}`);
