#!/usr/bin/env node
/**
 * Génère les 24 visuels de compétences (réclames litho années 20).
 *
 * Usage :
 *   npm run gen:competences                          # tout (skip ceux déjà présents)
 *   npm run gen:competences -- general.negociation.1 # une ou plusieurs précises
 *   npm run gen:competences -- --force               # regénère même les présents
 *
 * Pipeline : Gemini pro 1:1 2K → composite du cadre SVG unique
 * (scripts/competences-frame.svg) → WebP 1024×1024 q85 dans public/competences/.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "competences");
const CONFIG_PATH = path.join(__dirname, "competences-prompts.json");
const FRAME_PATH = path.join(__dirname, "competences-frame.svg");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const GEN_SIZE = 2048;
const OUT_SIZE = 1024;

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

// Brief maison — copie de STYLE_BRIEF_BASE (generate-qg-images.mjs), litho douce.
const STYLE_BRIEF = [
  "Vintage Art Déco illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Cream parchment background with subtle paper grain texture.",
  "Soft warm directional light from the upper-left.",
  "No text overlays, no captions, no watermark.",
].join(" ");

// Personnage récurrent : identique sur les 24 visuels.
const CHARACTER =
  "Recurring protagonist (must look identical across the whole series): a warm, " +
  "charismatic French antique dealer in his mid-thirties — neat moustache, " +
  "side-parted chestnut hair, three-piece brown tweed suit, white shirt with " +
  "rolled-up sleeves. Setting: 1920s France, flea-market world.";

// Contraintes de cadrage : la scène est générée SANS cadre (composité ensuite).
const FRAMING =
  "Square 1:1 composition, one single scene, main subject centered with generous " +
  "parchment breathing room toward the edges. NO border, NO frame, NO decorative " +
  "edge of any kind (a frame is composited later). ABSOLUTELY NO TEXT: no letters, " +
  "no words, no numbers, no signage, no watermark.";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun visuel à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }

  // Cadre rasterisé une seule fois, réutilisé pour tous les composites.
  const frame = await sharp(FRAME_PATH, { density: 96 })
    .resize(GEN_SIZE, GEN_SIZE)
    .png()
    .toBuffer();

  console.log(`📋  ${todo.length} visuel(s) de compétence à traiter\n`);
  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const outPath = path.join(OUTPUT_DIR, `${item.id}.webp`);
    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${item.id}.webp déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // absent → à générer
      }
    }

    const prompt = `${STYLE_BRIEF}\n\n${CHARACTER}\n\nScene: ${item.description}\n\n${FRAMING}`;
    console.log(`🎨  ${item.id} — génération (${MODEL}, 1:1, 2K)…`);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p) => p.inlineData?.data);
      if (!img) {
        console.error(`❌  ${item.id} : pas d'image dans la réponse`);
        failed++;
        continue;
      }
      const raw = Buffer.from(img.inlineData.data, "base64");
      // ATTENTION sharp : resize s'applique toujours AVANT composite dans une
      // même chaîne (l'ordre des appels ne compte pas) → deux passes distinctes,
      // sinon « Image to composite must have same dimensions or smaller ».
      const composed = await sharp(raw)
        .resize(GEN_SIZE, GEN_SIZE)
        .composite([{ input: frame }])
        .png()
        .toBuffer();
      const buf = await sharp(composed)
        .resize(OUT_SIZE, OUT_SIZE)
        .webp({ quality: 85 })
        .toBuffer();
      await fs.writeFile(outPath, buf);
      console.log(`✅  ${item.id}.webp (${Math.round(buf.length / 1024)} kB)`);
      ok++;
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(`\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
