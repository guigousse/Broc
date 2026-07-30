#!/usr/bin/env node
/**
 * Génère l'illustration de fond de l'affiche de teasing App Store
 * (spec : docs/superpowers/specs/2026-07-30-poster-teasing-appstore-design.md).
 *
 * Envoie à Gemini une scène existante comme référence de STYLE, plus des
 * items du jeu comme références d'OBJETS, et demande un étal de brocante
 * au petit matin cadré portrait 4:5 avec le tiers supérieur calme (réservé
 * au titre composé ensuite en CSS).
 *
 * Usage :
 *   node scripts/poster/generate-poster-illustration.mjs            # 3 candidats
 *   node scripts/poster/generate-poster-illustration.mjs --count=5
 *   node scripts/poster/generate-poster-illustration.mjs --force
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "marketing", "poster", "candidats");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";

const STYLE_REF = path.join(
  PROJECT_ROOT,
  "public",
  "brocantes",
  "disquaire-independant.webp",
);

/** Items du jeu posés sur l'étal, avec leur description pour ancrer le prompt. */
const ITEM_REFS = [
  ["mus.tourne_disque_a_courroie_vintage.webp", "a vintage belt-drive turntable"],
  ["mus.33tours_jazz_1.webp", "a jazz vinyl record sleeve"],
  ["ma.lampe_bureau_artdeco.webp", "an Art Déco desk lamp"],
  ["ma.horloge_carillon_westminster.webp", "a Westminster chime mantel clock"],
  ["ma.miroir_dore_fronton.webp", "a gilded mirror with a carved fronton"],
].map(([file, label]) => [path.join(PROJECT_ROOT, "public", "items", file), label]);

const STYLE_INTRO = [
  "First attached image: STYLE reference only.",
  "Match its rendering style exactly — vintage Art Déco museum-catalog illustration,",
  "elegant sepia ink line-art with soft forest-green and brass color washes on cream",
  "parchment paper, subtle paper grain. Do not copy its layout or objects.",
].join(" ");

const ITEMS_INTRO = [
  "The following attached images are OBJECTS from the game.",
  "Reproduce each of these exact objects faithfully (same shapes, same materials,",
  "same colors), arranged naturally on the market stall described below:",
].join(" ");

const SCENE_PROMPT = [
  "PORTRAIT poster illustration, 4:5 vertical canvas.",
  "A charming French flea-market stall at dawn: a wooden trestle table under a",
  "canvas awning, overflowing with the antique treasures listed above plus a few",
  "supporting objects (stacked old books, a small brass candlestick, framed",
  "engravings leaning against a crate).",
  "The stall and its objects occupy the LOWER TWO-THIRDS of the canvas.",
  "The TOP THIRD of the canvas is a calm, quiet background — pale warm morning",
  "sky over soft out-of-focus market silhouettes — kept visually empty because a",
  "title will be overlaid there later.",
  "Warm golden early-morning light rakes across the stall from the side, long",
  "soft shadows, gentle glints on the brass.",
  "The image bleeds edge to edge on all four sides.",
  "No people, no text, no watermark.",
].join(" ");

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
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const countArg = args.find((a) => a.startsWith("--count="));
const count = countArg ? Number(countArg.slice("--count=".length)) : 3;

async function inlineImage(filePath) {
  const buf = await fs.readFile(filePath);
  const mimeType = filePath.endsWith(".webp") ? "image/webp" : "image/png";
  return { inlineData: { mimeType, data: buf.toString("base64") } };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const parts = [{ text: STYLE_INTRO }, await inlineImage(STYLE_REF), { text: ITEMS_INTRO }];
  for (const [file, label] of ITEM_REFS) {
    parts.push({ text: `Object: ${label}.` });
    parts.push(await inlineImage(file));
  }
  parts.push({ text: SCENE_PROMPT });

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0;

  for (let i = 1; i <= count; i++) {
    const outPath = path.join(OUTPUT_DIR, `illustration-${i}.png`);
    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  illustration-${i}.png déjà présent (--force pour regénérer)`);
        continue;
      } catch {
        // absent → à générer
      }
    }
    console.log(`🎨  candidat ${i}/${count} — génération (${MODEL}, 4:5, 2K)…`);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
      });
      const outParts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = outParts.find((p) => p.inlineData?.data);
      if (!imagePart) {
        console.error(`❌  candidat ${i} : pas d'image dans la réponse`);
        continue;
      }
      const buf = Buffer.from(imagePart.inlineData.data, "base64");
      await fs.writeFile(outPath, buf);
      console.log(`✅  illustration-${i}.png (${Math.round(buf.length / 1024)} kB)`);
      ok++;
    } catch (err) {
      console.error(`❌  candidat ${i} : ${err.message ?? err}`);
    }
  }

  console.log(`\n— ${ok} candidat(s) généré(s) dans ${path.relative(PROJECT_ROOT, OUTPUT_DIR)} —`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
