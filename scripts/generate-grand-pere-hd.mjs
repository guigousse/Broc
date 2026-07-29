#!/usr/bin/env node
/**
 * Régénère les portraits du grand-père en HAUTE DÉFINITION pour les visuels
 * App Store — les originaux plafonnent à 446 px, le gabarit en demande ~1 200.
 *
 * Image-to-image depuis le portrait existant : c'est la SEULE façon de garder
 * le même personnage (une génération indépendante réinvente le visage).
 * Pipeline identique à generate-client-personas.mjs : fond magenta →
 * chroma-key → webp.
 *
 * N'écrase JAMAIS les originaux : sortie dans public/personas/grand-pere/hd/.
 * L'application continue d'utiliser les fichiers actuels.
 *
 * Clé : GEMINI_API_KEY dans .env.
 *
 * Usage :
 *   npm run gen:gp-hd                 # les expressions manquantes
 *   npm run gen:gp-hd -- --force      # tout régénérer
 *   npm run gen:gp-hd -- souriant     # une expression précise
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(PROJECT_ROOT, "public", "personas", "grand-pere");
const OUTPUT_DIR = path.join(SOURCE_DIR, "hd");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const MODEL = "gemini-3-pro-image-preview";

const EXPRESSIONS = ["souriant", "rieur", "emu", "songeur"];
/** Côté minimal acceptable en sortie ; en dessous, le gabarit sera mou. */
const COTE_MIN = 1536;

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
await loadDotEnv();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente (.env).");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIds = args.filter((a) => !a.startsWith("--"));

const ai = new GoogleGenAI({ apiKey });

/** Redessine à l'identique, en plus grand. Aucune liberté sur le personnage. */
function buildPrompt() {
  return [
    "Redraw the reference character illustration at MUCH HIGHER RESOLUTION and finer detail.",
    "Keep the EXACT SAME person — identical face shape, wrinkles, skin tone, hair, beard, glasses, hat, outfit, accessories, colors, pose, facial expression, framing and art style.",
    "This is an upscale and refinement, NOT a reinterpretation: do NOT add, remove or redesign anything, do NOT change the crop, the proportions or the mood.",
    "Preserve the warm watercolor and ink style with soft muted palette, gentle painterly shading and subtle paper grain.",
    "Render crisp clean edges suitable for cutting the subject out.",
    "Output on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO shadow on the background, NO gradient, NO texture, no text, no watermark, no frame.",
    "Strict square 1:1 aspect ratio, same composition as the reference.",
  ].join(" ");
}

async function generate(prompt, refPng) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: refPng.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    // 2K au lieu du 1K des personas du jeu : ces portraits sont affichés
    // jusqu'à ~1 200 px de large sur les visuels iPad.
    config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
    if (part.text) console.log(`💬  ${part.text.slice(0, 200)}`);
  }
  return null;
}

/** Détoure le fond magenta (#FF00FF) → alpha, bords adoucis + anti-spill. */
async function chromaKeyMagenta(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const magentaness = Math.min(r, b) - g;
    if (magentaness > 45) {
      data[i] = 150;
      data[i + 1] = 150;
      data[i + 2] = 150;
      data[i + 3] = 0;
    } else if (magentaness > 12) {
      const t = (magentaness - 12) / 33;
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      data[i] = Math.round(r - (r - g) * t);
      data[i + 2] = Math.round(b - (b - g) * t);
    }
  }
  const tmp = pngPath + ".tmp.png";
  await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toFile(tmp);
  await fs.rename(tmp, pngPath);
}

/** Contrairement aux personas du jeu : AUCUN redimensionnement à la baisse. */
async function toWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/, ".webp");
  const buf = await sharp(pngPath).webp({ quality: 92 }).toBuffer();
  await fs.writeFile(webpPath, buf);
  const { width } = await sharp(buf).metadata();
  console.log(`   → ${path.basename(webpPath)} (${width} px, ${Math.round(buf.length / 1024)} kB)`);
  if (width < COTE_MIN) {
    console.warn(`   ⚠ ${width} px seulement (< ${COTE_MIN}) — le grand-père sera mou sur iPad.`);
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const cibles = EXPRESSIONS.filter((e) => onlyIds.length === 0 || onlyIds.includes(e));
  if (cibles.length === 0) {
    console.error(`❌ Aucune expression ne correspond (connues : ${EXPRESSIONS.join(", ")}).`);
    process.exit(1);
  }

  let echecs = 0;
  for (const expression of cibles) {
    const webp = path.join(OUTPUT_DIR, `${expression}.webp`);
    if (!force && (await exists(webp))) {
      console.log(`✓ ${expression}.webp déjà présent`);
      continue;
    }
    const source = path.join(SOURCE_DIR, `${expression}.webp`);
    if (!(await exists(source))) {
      console.error(`❌ portrait source absent : ${source}`);
      echecs++;
      continue;
    }
    console.log(`🎨  grand-père ${expression} — génération HD…`);
    try {
      const refPng = await sharp(source).png().toBuffer();
      const png = await generate(buildPrompt(), refPng);
      if (!png) throw new Error("aucune image renvoyée par le modèle");
      const pngPath = path.join(OUTPUT_DIR, `${expression}.png`);
      await fs.writeFile(pngPath, png);
      await chromaKeyMagenta(pngPath);
      await toWebp(pngPath);
      await fs.unlink(pngPath);
    } catch (e) {
      console.error(`❌ ${expression} : ${e.message}`);
      echecs++;
    }
  }
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exitCode = 1;
});
