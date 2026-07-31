#!/usr/bin/env node
/**
 * Génère les 6 médaillons d'atouts du dock (laiton frappé, touche d'émail).
 *
 * Usage :
 *   npm run gen:atouts                    # tout (skip ceux déjà présents)
 *   npm run gen:atouts -- atout.flair     # une ou plusieurs médailles précises
 *   npm run gen:atouts -- --force         # regénère même les présents
 *
 * Pipeline : Gemini pro 1:1 2K → rognage 3,5 %/bord → WebP 512×512 q85
 * dans public/competences/ (chemins attendus par SkillDock via ClientPage).
 * Spec : docs/superpowers/specs/2026-07-31-atouts-medaillons-design.md
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "competences");
const CONFIG_PATH = path.join(__dirname, "atouts-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const OUT_SIZE = 512;
// Le modèle dessine parfois un fin liseré malgré la consigne full-bleed :
// rognage déterministe de ~3,5 % par bord avant le resize.
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

// Matière commune aux 6 médailles : laiton frappé plein cadre, une touche d'émail.
const STYLE_BRIEF = [
  "Struck brass medal artwork in bas-relief, Art Deco style, 1920s France.",
  "The polished brass surface fills the ENTIRE square edge to edge, as if the",
  "camera were closer than the medal's rim — warm golden brass, soft raking",
  "light from the upper-left, crisp specular highlights on the raised relief,",
  "gentle darker patina pooled in the recesses, very subtle circular brushed",
  "texture in the flat field.",
  "The motif is struck in raised relief, small and compact, centered in the",
  "middle third of the square with generous flat brass breathing room all",
  "around it on every side — like a coin's mint mark, not a poster filling the",
  "frame — so its full silhouette, tip to tip, stays safely inside a circle",
  "whose diameter is about 55% of the square's width.",
  "Exactly one small enamel color inlay on the single detail named in the",
  "motif; every other element stays monochrome brass.",
  "Plain flat brass field only: no rim, no border, no text, no full human figure.",
].join(" ");

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
    console.error("Aucune médaille à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }

  console.log(`📋  ${todo.length} médaillon(s) d'atout à traiter\n`);
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

    const prompt = `${STYLE_BRIEF}\n\n${item.description}`;
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
