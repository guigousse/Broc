#!/usr/bin/env node
/**
 * Génère le cachet de cire du certificat de level up via Gemini Image API
 * ("Nano Banana Pro", gemini-3-pro-image-preview), pipeline identique à
 * scripts/generate-boite-mystere.mjs : fond magenta → chroma-key → webp.
 *
 * Sortie : public/ui/cachet-cire.webp
 *
 * Clé : GEMINI_API_KEY dans .env.
 *
 * Usage :
 *   node scripts/generate-cachet-cire.mjs           # génère si absent
 *   node scripts/generate-cachet-cire.mjs --force   # regénère
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "ui");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const MODEL = "gemini-3-pro-image-preview";

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

const force = process.argv.slice(2).includes("--force");

const PROMPT = [
  "Vintage museum-catalog illustration of a single round WAX SEAL stamp, viewed from directly above.",
  "Deep crimson-red sealing wax with organic irregular drippy edges, glossy highlights, engraved in the center with an ornate Art-Deco monogram letter « B » surrounded by a thin decorative ring.",
  "Warm muted palette consistent with sepia/cream/brass aesthetics. No neon colors.",
  "Placed on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO shadow, NO gradient, NO texture, no text besides the monogram, no watermark.",
  "Subject perfectly centered, occupying ~80% of the frame. Strict square 1:1 aspect ratio.",
].join(" ");

const ai = new GoogleGenAI({ apiKey });

async function generate(contents) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
    if (part.text) console.log(`💬  ${part.text.slice(0, 200)}`);
  }
  return null;
}

/** Détoure le fond magenta (#FF00FF) → alpha, avec bords adoucis + anti-spill. */
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
    const magentaness = Math.min(r, b) - g; // élevé sur le magenta
    if (magentaness > 45) {
      data[i] = 150;
      data[i + 1] = 150;
      data[i + 2] = 150;
      data[i + 3] = 0;
    } else if (magentaness > 12) {
      const t = (magentaness - 12) / 33; // 0..1 zone de bord
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      data[i] = Math.round(r - (r - g) * t); // anti-spill magenta
      data[i + 2] = Math.round(b - (b - g) * t);
    }
  }
  const tmp = pngPath + ".tmp.png";
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .png()
    .toFile(tmp);
  await fs.rename(tmp, pngPath);
  console.log(`   → détouré (chroma-key magenta)`);
}

async function toWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/, ".webp");
  const buf = await sharp(pngPath).webp({ quality: 90 }).toBuffer();
  await fs.writeFile(webpPath, buf);
  console.log(`   → ${path.basename(webpPath)} (${Math.round(buf.length / 1024)} kB)`);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const png = path.join(OUTPUT_DIR, "cachet-cire.png");
  const webp = path.join(OUTPUT_DIR, "cachet-cire.webp");

  if (!force) {
    try {
      await fs.access(webp);
      console.log("✓ cachet-cire.webp existe déjà (utiliser --force pour regénérer).");
      return;
    } catch {
      // absent → on génère
    }
  }

  console.log(`🎨  Cachet de cire — génération (${MODEL})…`);
  const buf = await generate(PROMPT);
  if (!buf) {
    console.error("❌ Pas d'image.");
    process.exit(1);
  }
  console.log(`✅  généré (${Math.round(buf.length / 1024)} kB)`);
  await fs.writeFile(png, buf);
  await chromaKeyMagenta(png);
  await toWebp(png);
  await fs.unlink(png);

  console.log("\n— Terminé —");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
