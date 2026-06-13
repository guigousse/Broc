#!/usr/bin/env node
/**
 * Génère les illustrations des SCÈNES + FILLERS de transition du panorama
 * de brocantes (4 scènes + 3 fillers entre tiers).
 *
 * Convention : chaque scène / filler est une "vue de mur de galerie" avec
 * une fine marge de sol en bas et de plafond en haut. La surface du mur
 * (zone centrale ~75 %) doit rester quasi vide — les cadres de brocantes
 * seront positionnés en CSS par-dessus.
 *
 * Usage :
 *   npm run gen:scenes                              # tout
 *   npm run gen:scenes -- --force                   # regénère même si présent
 *   npm run gen:scenes -- scene-tier-1              # une ou plusieurs précises
 *   npm run gen:scenes -- --model=pro               # passe sur Nano Banana Pro
 *   npm run gen:scenes -- --aspect=9:16             # change l'aspect ratio
 *
 * Les PNG sont écrits dans public/brocantes/scenes/{id}.png.
 * Le code (BrocanteScene.tsx) bascule automatiquement sur l'image dès
 * qu'elle existe — sinon, dégradé stub.
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "brocantes", "scenes");
const CONFIG_PATH = path.join(__dirname, "brocante-scenes-prompts.json");
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

/**
 * Style commun aux 4 scènes + 3 fillers. Repris à l'identique de la
 * pipeline brocante existante pour rester cohérent avec le reste du
 * panorama (QG, atelier, illustrations de brocantes).
 */
const STYLE_BRIEF = [
  "Vintage Art Déco scene illustration in a museum catalog style.",
  "Elegant sepia ink line-art with soft forest-green color wash on cream parchment paper.",
  "Color palette: warm sepia, forest green, brass, and warm wood tones — same palette as the headquarters cabinet panorama. Avoid bright neons or high-saturation colors.",
  "Cream parchment background with subtle paper grain texture visible across the whole image.",
  "Soft directional lighting, no harsh shadows.",
  "Absolutely no people, no text, no captions, no signatures, no watermark, no UI elements.",
  "No transparent areas — the image is fully opaque cream parchment.",
].join(" ");

/**
 * Contraintes de composition critiques pour que les scènes restent
 * compatibles avec le moteur de cadres CSS qui les surcouchent.
 */
const COMPOSITION_BRIEF = [
  "CRITICAL composition constraint:",
  "the image is a WALL VIEW seen straight on at eye level (no angle, no perspective tilt).",
  "The wall surface occupies roughly the middle 75 % of the image height; a thin horizontal strip of FLOOR runs along the bottom 12 % of the image, and a thin horizontal strip of CEILING / cornice runs along the top 12 %.",
  "The wall area in the middle must remain VISUALLY UNCLUTTERED — no paintings, no frames, no posters, no portraits, no merchandise, no hanging objects.",
  "Frames will be composited on top of this image later, so the central wall region must read as plain wall.",
  "Architectural details (picture rail, baseboard, cornice, panel mouldings, pillars, archway) must run NEAR THE EDGES (top, bottom, sides) and not invade the central wall area.",
].join(" ");

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
const aspectRatio = flagValue("aspect", "9:16");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucune scène à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(
    `📋  ${todo.length} scène(s) / filler(s) à traiter — modèle ${model}, aspect ${aspectRatio}\n`,
  );

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0,
    skipped = 0,
    failed = 0;

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

    const prompt = `${STYLE_BRIEF}\n\n${COMPOSITION_BRIEF}\n\nScene: ${item.description}.`;
    if (verbose) console.log(`  prompt → ${prompt}`);
    console.log(`🎨  ${item.id} — génération en cours…`);

    const requestConfig =
      modelKey === "pro"
        ? {
            model,
            contents: prompt,
            config: { imageConfig: { aspectRatio, imageSize } },
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
        console.error(`❌  ${item.id} : pas d'image dans la réponse`);
        failed++;
      }
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(
    `\n— ${ok} générées, ${skipped} déjà présentes, ${failed} échecs —`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
