#!/usr/bin/env node
/**
 * Génère les illustrations d'items via Gemini Image API ("Nano Banana" / "Nano Banana Pro").
 *
 * Modèles disponibles (drapeau --model) :
 *   - `pro`  → gemini-3-pro-image-preview  (Nano Banana Pro, défaut, meilleure qualité)
 *   - `flash`→ gemini-2.5-flash-image      (Nano Banana, plus rapide / économique)
 *
 * Usage :
 *   GEMINI_API_KEY=xxx npm run gen:images                                     # par défaut Nano Banana Pro
 *   GEMINI_API_KEY=xxx npm run gen:images -- --model=flash                    # bascule sur Nano Banana
 *   GEMINI_API_KEY=xxx npm run gen:images -- --force                          # regénère tous
 *   GEMINI_API_KEY=xxx npm run gen:images -- mus.diapason_acier               # un seul item
 *   GEMINI_API_KEY=xxx npm run gen:images -- --resolution=2K --aspect=1:1     # surcharge format (Pro uniquement)
 *
 * Le config est lu depuis scripts/item-prompts.json
 * Les PNG sont écrits dans public/items/{templateId}.png
 *
 * Pour qu'un item s'affiche dans l'app, ajouter son templateId dans
 * `src/lib/itemImages.ts → ITEMS_WITH_IMAGE`.
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "items");
const CONFIG_PATH = path.join(__dirname, "item-prompts.json");

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

const STYLE_BRIEF = [
  "Vintage Art Déco product illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Centered single object, isolated on a cream parchment background with subtle paper grain texture.",
  "Soft directional lighting, no harsh shadows, no text, no captions, no watermark.",
  "Clean geometric composition.",
  "Style of 1920s-1930s French decorative arts.",
].join(" ");

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error(
    "❌ Variable GEMINI_API_KEY (ou GOOGLE_API_KEY) absente. Obtiens une clé sur https://aistudio.google.com/apikey",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const verbose = args.includes("--verbose");

function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const modelKey = flagValue("model", "pro");
const model = MODEL_IDS[modelKey];
if (!model) {
  console.error(`❌ --model="${modelKey}" inconnu. Valeurs : pro | flash`);
  process.exit(1);
}
const aspectRatio = flagValue("aspect", "1:1");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.templateId))
    : config;

  if (todo.length === 0) {
    console.error("Aucun item à générer.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of todo) {
    const filename = `${item.templateId}.png`;
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${filename} déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // file doesn't exist, proceed
      }
    }

    const prompt = `${STYLE_BRIEF}\n\nSubject: ${item.description}.`;
    if (verbose) console.log(`  prompt → ${prompt}`);
    console.log(`🎨  ${item.templateId} — génération en cours (${model})…`);

    const requestConfig =
      modelKey === "pro"
        ? {
            model,
            contents: prompt,
            config: {
              imageConfig: { aspectRatio, imageSize },
            },
          }
        : { model, contents: prompt };

    try {
      const response = await ai.models.generateContent(requestConfig);

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let saved = false;
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buf = Buffer.from(part.inlineData.data, "base64");
          await fs.writeFile(outPath, buf);
          console.log(`✅  ${filename} (${Math.round(buf.length / 1024)} kB)`);
          saved = true;
          ok++;
          break;
        } else if (part.text && verbose) {
          console.log(`💬  modèle : ${part.text.slice(0, 240)}`);
        }
      }
      if (!saved) {
        console.error(`❌  ${item.templateId} : pas d'image dans la réponse`);
        failed++;
      }
    } catch (err) {
      console.error(`❌  ${item.templateId} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(`\n— ${ok} générées, ${skipped} déjà présentes, ${failed} échecs —`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
