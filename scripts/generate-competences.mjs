#!/usr/bin/env node
/**
 * Génère les 24 visuels de compétences (réclames litho années 20).
 *
 * Usage :
 *   npm run gen:competences                          # tout (skip ceux déjà présents)
 *   npm run gen:competences -- general.negociation.1 # une ou plusieurs précises
 *   npm run gen:competences -- --force               # regénère même les présents
 *
 * Pipeline : Gemini pro 1:1 2K → WebP 1024×1024 q85 dans public/competences/.
 * Les assets sont livrés SANS cadre et plein cadre bord à bord (décision
 * 2026-07-07) : le cadre Art déco (scripts/competences-frame.svg) sera posé
 * en overlay côté UI, pas incrusté dans les images.
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
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const OUT_SIZE = 1024;
// Le modèle dessine parfois un fin liseré/marge malgré la consigne full-bleed :
// recadrage déterministe de ~3,5 % par bord sur le master avant le resize.
const EDGE_CROP_RATIO = 0.035;

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

// Contraintes de cadrage : plein cadre bord à bord, aucun cadre dessiné
// (le cadre Art déco sera posé en overlay côté UI).
const FRAMING =
  "FULL-BLEED square 1:1 composition: the painted scene fills the ENTIRE square " +
  "edge to edge — the environment (walls, street, stalls, sky) extends past all " +
  "four edges as if cropped by the picture edge. NO empty paper margins, NO " +
  "vignette of blank parchment around the subject, NO border, NO frame, NO " +
  "decorative edge of any kind. ABSOLUTELY NO TEXT: no letters, no words, no " +
  "numbers, no signage, no watermark.";

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
      const meta = await sharp(raw).metadata();
      const cropX = Math.round(meta.width * EDGE_CROP_RATIO);
      const cropY = Math.round(meta.height * EDGE_CROP_RATIO);
      const buf = await sharp(raw)
        .extract({
          left: cropX,
          top: cropY,
          width: meta.width - 2 * cropX,
          height: meta.height - 2 * cropY,
        })
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
