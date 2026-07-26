#!/usr/bin/env node
/**
 * Génère les profils de véhicules (boutons de concession) via Gemini Image API.
 *
 * Usage :
 *   npm run gen:camions                       # les 3
 *   npm run gen:camions -- --force            # regénère même les présents
 *   npm run gen:camions -- rogers-profil      # un seul
 *   npm run gen:camions -- --model=pro        # Nano Banana Pro
 *
 * Écrit directement `public/coffre/{id}.webp` : `generate-webp.mjs` ne couvre
 * pas ce dossier, et un PNG résiduel dans `public/` partirait dans le bundle.
 *
 * Chaque entrée porte `reference: "<id>"` — le script charge
 * `public/coffre/<id>.webp` (la vue arrière déjà en place) et l'envoie comme
 * image de référence, pour que le profil soit LE MÊME véhicule sous un autre
 * angle et non une voiture cousine.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "coffre");
const CONFIG_PATH = path.join(__dirname, "camions-profil-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const WEBP_QUALITY = 82;

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

// Style des assets de véhicules déjà en place (rogers/break/utilitaire) —
// volontairement différent du brief Art Déco du QG.
const STYLE_BRIEF = [
  "Clean vector-style illustration of a single vehicle, in the style of a game asset sheet.",
  "Thin dark ink outlines, flat colour fills with soft cel shading, muted and slightly desaturated palette.",
  "Fully transparent background, crisp clean edges around the subject for compositing.",
  "No ground shadow, no scenery, no background elements, no text, no captions, no watermark.",
].join(" ");

const REFERENCE_INTRO =
  "Reference image (first image, attached): the SAME vehicle, seen from the rear. Match its exact body colour, trim colour, wheel design, era, proportions, line weight and rendering style. Output the same vehicle seen in strict side profile, isolated on a transparent background — do NOT redraw the rear view.";

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
// Une voiture de profil est un format allongé : 3:2 évite de la tasser.
const aspectRatio = flagValue("aspect", "3:2");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

/** Charge une référence webp depuis `public/coffre/`. */
async function loadReferenceImage(refId) {
  const refPath = path.join(OUTPUT_DIR, `${refId}.webp`);
  try {
    const buf = await fs.readFile(refPath);
    return { mimeType: "image/webp", data: buf.toString("base64") };
  } catch (err) {
    throw new Error(
      `référence "${refId}.webp" introuvable dans ${OUTPUT_DIR}. Cause: ${err.message ?? err}`,
    );
  }
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun profil à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} profil(s) à traiter\n`);

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const filename = `${item.id}.webp`;
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${filename} déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // pas encore généré
      }
    }

    const promptText = `${STYLE_BRIEF}\n\nSubject: ${item.description}`;

    let contents;
    try {
      const parts = [
        { text: REFERENCE_INTRO },
        { inlineData: await loadReferenceImage(item.reference) },
        { text: promptText },
      ];
      contents = [{ role: "user", parts }];
      console.log(
        `🎨  ${item.id} — génération en cours (${model}, ${aspectRatio}, ref: ${item.reference})…`,
      );
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
      continue;
    }

    if (verbose) console.log(`  prompt → ${promptText}`);

    const requestConfig =
      modelKey === "pro"
        ? { model, contents, config: { imageConfig: { aspectRatio, imageSize } } }
        : { model, contents };

    try {
      const response = await ai.models.generateContent(requestConfig);
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let saved = false;
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buf = Buffer.from(part.inlineData.data, "base64");
          await sharp(buf).webp({ quality: WEBP_QUALITY }).toFile(outPath);
          const { size } = await fs.stat(outPath);
          console.log(`✅  ${filename} (${Math.round(size / 1024)} kB)`);
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

  console.log(`\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
