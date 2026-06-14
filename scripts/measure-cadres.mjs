#!/usr/bin/env node
/**
 * Mesure pour chaque `public/cadres/cadre-N.webp` la bounding box du trou
 * intérieur (zone transparente) et écrit le résultat dans
 * `src/components/mobile/brocante-pano/cadreHoles.generated.ts`.
 *
 * Le composant BrocanteFrame utilise ces valeurs (en %) pour positionner
 * l'illustration EXACTEMENT à l'intérieur du cadre, sans débordement.
 *
 * Usage : npm run measure:cadres
 */

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "public", "cadres");
const OUT = path.join(
  ROOT,
  "src",
  "components",
  "mobile",
  "brocante-pano",
  "cadreHoles.generated.ts",
);

const IDS = [1, 2, 3, 4, 5];

async function measure(id) {
  const src = path.join(DIR, `cadre-${id}.webp`);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Pixel "trou" si alpha quasi-nul.
      if (data[(y * W + x) * 4 + 3] < 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`Aucun pixel transparent dans cadre-${id}`);
  // Inset léger pour qu'on ne voie pas la frange anti-aliasée du bois.
  const PAD = 1;
  minX = Math.max(0, minX + PAD);
  minY = Math.max(0, minY + PAD);
  maxX = Math.min(W - 1, maxX - PAD);
  maxY = Math.min(H - 1, maxY - PAD);
  return {
    id,
    left: (minX / W) * 100,
    top: (minY / H) * 100,
    width: ((maxX - minX + 1) / W) * 100,
    height: ((maxY - minY + 1) / H) * 100,
    cadreAspect: W / H,
  };
}

async function main() {
  const results = [];
  for (const id of IDS) {
    const r = await measure(id);
    console.log(
      `cadre-${id} : hole left ${r.left.toFixed(2)}%, top ${r.top.toFixed(2)}%, width ${r.width.toFixed(2)}%, height ${r.height.toFixed(2)}%  | aspect cadre ${r.cadreAspect.toFixed(3)}`,
    );
    results.push(r);
  }

  const lines = [
    "/**",
    " * Bounding box du TROU intérieur (zone transparente) de chaque cadre",
    " * bois, exprimée en pourcentage du cadre lui-même.",
    " *",
    " * Généré par `npm run measure:cadres` — NE PAS éditer à la main.",
    " */",
    "",
    "export interface CadreHole {",
    "  /** En % du cadre. */",
    "  left: number;",
    "  /** En % du cadre. */",
    "  top: number;",
    "  /** En % du cadre. */",
    "  width: number;",
    "  /** En % du cadre. */",
    "  height: number;",
    "  /** Ratio width/height du cadre entier — utile pour calculer l'aspect du slot. */",
    "  cadreAspect: number;",
    "}",
    "",
    "export const CADRE_HOLES: Record<1 | 2 | 3 | 4 | 5, CadreHole> = {",
    ...results.map(
      (r) =>
        `  ${r.id}: { left: ${r.left.toFixed(2)}, top: ${r.top.toFixed(2)}, width: ${r.width.toFixed(2)}, height: ${r.height.toFixed(2)}, cadreAspect: ${r.cadreAspect.toFixed(4)} },`,
    ),
    "};",
    "",
  ];
  await fs.writeFile(OUT, lines.join("\n"));
  console.log(`\n✅ écrit ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
