#!/usr/bin/env node
/**
 * Génère les illustrations du QG (panorama + objets) via Gemini Image API.
 *
 * Usage :
 *   npm run gen:qg                                  # tout
 *   npm run gen:qg -- --force                       # regénère même les présents
 *   npm run gen:qg -- fond-cabinet porte            # une ou plusieurs précises
 *   npm run gen:qg -- --model=pro                   # Nano Banana Pro
 *   npm run gen:qg -- --aspect=16:9 fond-cabinet    # forcer un aspect en Pro
 *
 * Les PNG sont écrits dans public/qg/{id}.png.
 *
 * Si une entrée a un champ `reference: "<id>"`, le script charge
 * `public/qg/<id>.png` et l'envoie comme image de référence à Gemini pour
 * caler la perspective / la lumière / l'échelle. Le fichier de référence
 * doit exister, sinon l'asset échoue.
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "qg");
const CONFIG_PATH = path.join(__dirname, "qg-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

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

const STYLE_BRIEF_BASE = [
  "Vintage Art Déco illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Cream parchment background with subtle paper grain texture.",
  "Soft warm directional light from the upper-left, consistent across all assets so pieces composite naturally on top of each other.",
  "No text overlays, no captions, no watermark.",
].join(" ");

const STYLE_BRIEF_TRANSPARENT =
  "PNG with transparent background where instructed. Crisp clean edges around the subject for clean compositing.";

const REFERENCE_INTRO =
  "Reference image (first image, attached): the scene where the requested subject will be composited. Match the reference's perspective, eye-level/camera angle, scale, lighting direction (soft warm light from upper-left), color palette and Art Déco rendering style. Output only the requested isolated subject on a transparent background (or as instructed) — do NOT redraw the reference scene; just produce the subject that would composite naturally on top of it.";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
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

const modelKey = flagValue("model", "flash");
const model = MODEL_IDS[modelKey];
if (!model) {
  console.error(`❌ --model="${modelKey}" inconnu. Valeurs : pro | flash`);
  process.exit(1);
}
// Gemini Pro accepte : 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9.
// 21:9 ≈ 2.33:1 — le plus large ratio "landscape standard", idéal pour notre panorama.
const defaultAspect = flagValue("aspect", "21:9");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function loadReferenceImage(refId) {
  const refPath = path.join(OUTPUT_DIR, `${refId}.png`);
  try {
    const buf = await fs.readFile(refPath);
    return { mimeType: "image/png", data: buf.toString("base64") };
  } catch (err) {
    throw new Error(
      `référence "${refId}.png" introuvable dans ${OUTPUT_DIR} (génère d'abord cet asset). Cause: ${err.message ?? err}`,
    );
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun asset QG à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} asset(s) QG à traiter\n`);

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const filename = `${item.id}.png`;
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${filename} déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // file doesn't exist
      }
    }

    const briefParts = [STYLE_BRIEF_BASE];
    if (item.transparent) briefParts.push(STYLE_BRIEF_TRANSPARENT);
    const promptText = `${briefParts.join(" ")}\n\nSubject: ${item.description}`;
    const aspectRatio = item.id === "fond-cabinet" || item.id === "exterieur-jour"
      ? defaultAspect
      : "1:1";

    let contents;
    try {
      if (item.reference) {
        const refImage = await loadReferenceImage(item.reference);
        contents = [
          {
            role: "user",
            parts: [
              { text: REFERENCE_INTRO },
              { inlineData: refImage },
              { text: promptText },
            ],
          },
        ];
        console.log(
          `🎨  ${item.id} — génération en cours (${model}, ${aspectRatio}, ref: ${item.reference})…`,
        );
      } else {
        contents = promptText;
        console.log(
          `🎨  ${item.id} — génération en cours (${model}, ${aspectRatio})…`,
        );
      }
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
      continue;
    }

    if (verbose) console.log(`  prompt → ${promptText}`);

    const requestConfig =
      modelKey === "pro"
        ? {
            model,
            contents,
            config: { imageConfig: { aspectRatio, imageSize } },
          }
        : { model, contents };

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
        console.error(`❌  ${item.id} : pas d'image dans la réponse`);
        failed++;
      }
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(
    `\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
