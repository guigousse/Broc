#!/usr/bin/env node
/**
 * Génère les illustrations de brocantes via Gemini Image API.
 *
 * Usage :
 *   npm run gen:brocantes                                # toutes les brocantes
 *   npm run gen:brocantes -- --force                     # regénère même les présentes
 *   npm run gen:brocantes -- vide-grenier-quartier       # une ou plusieurs précises
 *   npm run gen:brocantes -- --model=pro                 # bascule sur Nano Banana Pro
 *
 * Les PNG sont écrits dans public/brocantes/{brocanteId}.png.
 * Pour qu'une brocante s'affiche, ajouter son id dans
 * src/lib/brocanteImages.ts → BROCANTES_WITH_IMAGE.
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "brocantes");
const CONFIG_PATH = path.join(__dirname, "brocante-prompts.json");
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

const STYLE_BRIEF = [
  "An oil painting on canvas by an old master, a genre painting of everyday life, museum quality.",
  "Visible confident brushwork, translucent glazes over a warm earth-toned underpainting, chiaroscuro lighting, a slightly ambered varnish and a very faint craquelure.",
  "Overall palette rooted in warm sepia, raw umber, forest green, brass gold and cream (the world of the game), with the scene's accent colours used as small precise glazes so the image reads clearly even as a tiny thumbnail.",
  "The scene is inhabited: people are doing things, browsing, bargaining, examining objects, painted as real characters with faces and gestures, integrated naturally into the composition.",
  "Objects are painted with precision and love, as in a still life: they must be recognisable at small size.",
  "FULL-BLEED COMPOSITION: the painting fills the entire image edge to edge. No painted frame, no border, no margin, no mat, no canvas edge, no vignette darkening the corners. The picture will be shown inside its own frame later.",
  "No text, no lettering, no signature, no caption, no watermark.",
  "Square 1:1 composition, main subject centred so that a tight crop keeps it.",
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
const aspectRatio = flagValue("aspect", "1:1");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucune brocante à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} brocante(s) à traiter\n`);

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

    const prompt = [
      STYLE_BRIEF,
      item.maitre ? `Painted in the manner of ${item.maitre}.` : "",
      item.accent ? `Accent colours: ${item.accent}.` : "",
      `Scene: ${item.description}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (verbose) console.log(`  prompt → ${prompt}`);
    console.log(`🎨  ${item.id} — génération en cours (${model})…`);

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
