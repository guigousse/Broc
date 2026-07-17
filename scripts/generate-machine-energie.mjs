#!/usr/bin/env node
/**
 * Génère l'illustration de la machine à énergie du savant fou (modale recharge).
 * Usage : node scripts/generate-machine-energie.mjs [--force]
 * Pipeline : Gemini pro 3:4 2K → WebP 1024×1365 q85 dans public/qg/.
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(PROJECT_ROOT, "public", "qg", "machine-energie.webp");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const EDGE_CROP_RATIO = 0.035;
const OUT_W = 1024;
const OUT_H = 1365;

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch { /* pas de .env */ }
}
await loadDotEnv();

const STYLE_BRIEF = [
  "Vintage Art Déco illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Warm brass, dark wood and cream tones. Subtle paper grain texture.",
  "Soft warm directional light from the upper-left.",
  "No text overlays, no captions, no watermark.",
].join(" ");

const SCENE =
  "A fantastical mad scientist's electricity machine from the 1920s, seen strictly " +
  "front-on, filling the frame: a tall dark walnut cabinet with riveted brass " +
  "fittings, twin Tesla coils on top crackling with small electric arcs, coiled " +
  "copper wires, glass vacuum tubes glowing faintly amber. AT THE TOP CENTER of " +
  "the cabinet: ONE large round gauge with a COMPLETELY PLAIN EMPTY cream face — " +
  "no needle, no numbers, no tick marks, no markings of any kind, just a blank " +
  "cream disc in a brass bezel. ON THE RIGHT SIDE at mid-height: one BIG brass " +
  "lever with a turned wooden handle, in neutral upright position. The bottom " +
  "half of the cabinet is calm and dark (panels, dials-free), leaving visual " +
  "room. Moody workshop atmosphere behind, kept dark and simple.";

const FRAMING =
  "FULL-BLEED portrait 3:4 composition: the machine fills the ENTIRE frame edge " +
  "to edge. NO empty paper margins, NO border, NO frame. ABSOLUTELY NO TEXT: no " +
  "letters, no words, no numbers, no dials with digits, no signage, no watermark.";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const force = process.argv.includes("--force");
try {
  if (!force) {
    await fs.access(OUT_PATH);
    console.log("⏭️  machine-energie.webp déjà présent (--force pour regénérer)");
    process.exit(0);
  }
} catch { /* absent → générer */ }

const ai = new GoogleGenAI({ apiKey });
const prompt = `${STYLE_BRIEF}\n\nScene: ${SCENE}\n\n${FRAMING}`;
console.log(`🎨  machine-energie — génération (${MODEL}, 3:4, 2K)…`);
const response = await ai.models.generateContent({
  model: MODEL,
  contents: prompt,
  config: { imageConfig: { aspectRatio: "3:4", imageSize: "2K" } },
});
const parts = response.candidates?.[0]?.content?.parts ?? [];
const img = parts.find((p) => p.inlineData?.data);
if (!img) {
  console.error("❌  pas d'image dans la réponse");
  process.exit(1);
}
const raw = Buffer.from(img.inlineData.data, "base64");
const meta = await sharp(raw).metadata();
const cropX = Math.round(meta.width * EDGE_CROP_RATIO);
const cropY = Math.round(meta.height * EDGE_CROP_RATIO);
const buf = await sharp(raw)
  .extract({ left: cropX, top: cropY, width: meta.width - 2 * cropX, height: meta.height - 2 * cropY })
  .resize(OUT_W, OUT_H)
  .webp({ quality: 85 })
  .toBuffer();
await fs.writeFile(OUT_PATH, buf);
console.log(`✅  machine-energie.webp (${Math.round(buf.length / 1024)} kB)`);
