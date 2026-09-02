#!/usr/bin/env node
/**
 * L'ARTICLE « ALBUM DE TIMBRES » du Bazar — style des items du jeu
 * (catalogue de musée : trait d'encre, lavis sépia/vert), inspiré du
 * classeur Lindner de la photo de référence de Guillaume (2026-09-02) :
 * cuir bleu profond, doubles filets or en haut et en bas, filet vertical
 * central, petit losange or frappé près du bas.
 *
 * Fond VERT PUR à la génération, ôté par DIFFUSION depuis les bords (jamais
 * par sélection globale — même recette que la borne d'arcade), rogné aux
 * bornes opaques → public/bazar/albums/album-timbres.webp.
 *
 * Usage : node generate-album-item.mjs [--force] [--detour-only]
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const BRUT = path.join(__dirname, "album-item-brut.png");
const SORTIE = path.join(PROJECT_ROOT, "public", "bazar", "albums", "album-timbres.webp");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

async function loadDotEnv() {
  try {
    const content = await fs.readFile(ENV_PATH, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // pas de .env
  }
}

const PROMPT = [
  // Le style des items du jeu (cf. buildStyleBrief de generate-item-images).
  "Vintage product illustration in a museum catalog style, elegant ink line-art with subtle sepia and forest green color wash.",
  "Single object: a classic stamp collector's stockbook album, standing upright, seen at a slight three-quarter angle.",
  "Deep navy blue textured leatherette cover. Two thin horizontal gold fillet lines near the top of the cover and two more near the bottom, continuing onto the spine. One thin vertical gold line running down the center of the front cover. A small gold diamond-shaped emblem stamped near the bottom center of the cover. Cream-white page edges visible on the open side.",
  "Soft directional lighting, no harsh shadows, no text, no captions, no watermark, no labels.",
  "Composition: subject perfectly centered, scaled to occupy roughly 75% of the frame.",
  "The area around the object is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0), edge to edge, with no gradient, no texture, no shadow cast on it.",
  "Strict square 1:1 aspect ratio composition.",
].join(" ");

/** Fond vert ôté par diffusion depuis les bords (jamais par sélection). */
async function detourer() {
  const { data, info } = await sharp(BRUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const idx = (x, y) => (y * W + x) * 4;
  const estVert = (x, y) => {
    const i = idx(x, y);
    return (
      data[i + 1] > 150 &&
      data[i] < 140 &&
      data[i + 2] < 140 &&
      data[i + 1] - Math.max(data[i], data[i + 2]) > 60
    );
  };
  const vu = new Uint8Array(W * H);
  const pile = [];
  for (let x = 0; x < W; x++) pile.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) pile.push([0, y], [W - 1, y]);
  while (pile.length) {
    const [x, y] = pile.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (vu[p] || !estVert(x, y)) continue;
    vu[p] = 1;
    data[idx(x, y) + 3] = 0;
    pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // Bornes opaques, puis rognage.
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[idx(x, y) + 3] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  await fs.mkdir(path.dirname(SORTIE), { recursive: true });
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize({ width: 800 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(SORTIE);
  console.log(`✅ ${path.relative(PROJECT_ROOT, SORTIE)} (${x1 - x0 + 1}×${y1 - y0 + 1})`);
}

async function main() {
  await loadDotEnv();
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const detourOnly = args.includes("--detour-only");

  let existe = true;
  try {
    await fs.access(BRUT);
  } catch {
    existe = false;
  }
  if (!detourOnly && (!existe || force)) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY absente (cf. .env).");
      process.exit(1);
    }
    const ai = new GoogleGenAI({ apiKey });
    console.log("🎨 album-timbres — génération (gemini-3-pro-image-preview)…");
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: PROMPT,
      config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
    });
    const part = (response.candidates?.[0]?.content?.parts ?? []).find(
      (p) => p.inlineData?.data,
    );
    if (!part) {
      console.error("❌ pas d'image dans la réponse");
      process.exit(1);
    }
    await fs.writeFile(BRUT, Buffer.from(part.inlineData.data, "base64"));
  }
  await detourer();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
