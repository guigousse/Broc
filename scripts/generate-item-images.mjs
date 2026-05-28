#!/usr/bin/env node
/**
 * Génère les illustrations d'items via Gemini Image API ("Nano Banana" / "Nano Banana Pro").
 *
 * Modèles disponibles (drapeau --model) :
 *   - `pro`  → gemini-3-pro-image-preview  (Nano Banana Pro, défaut, meilleure qualité)
 *   - `flash`→ gemini-2.5-flash-image      (Nano Banana, plus rapide / économique)
 *
 * La clé API peut être passée en variable d'env (GEMINI_API_KEY) ou écrite
 * dans un fichier `.env` à la racine du projet (gitignoré). Voir `.env.example`.
 *
 * Usage :
 *   npm run gen:images                                     # par défaut Nano Banana Pro, tous les items
 *   npm run gen:images -- --model=flash                    # bascule sur Nano Banana (rapide / éco)
 *   npm run gen:images -- --force                          # regénère même si fichier déjà présent
 *   npm run gen:images -- mus.diapason_acier               # un ou plusieurs items précis
 *   npm run gen:images -- --prefix=mus.                    # tous les items dont l'ID commence par "mus."
 *   npm run gen:images -- --resolution=2K --aspect=1:1     # surcharge format (Pro uniquement)
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
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

// Charge les variables d'un fichier .env (KEY=VALUE par ligne) si présent.
// Les variables déjà définies dans process.env ne sont pas écrasées.
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
    // pas de .env, on continue avec les variables d'environnement existantes
  }
}
await loadDotEnv();

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

// Fond papier coloré en fonction de la rareté de l'item.
// Restera très clair pour ne pas alourdir la composition.
function backgroundPhrase(rarete) {
  switch (rarete) {
    case "rare":
      return "very pale dove gray-blue paper, near white with only a faint cool tint";
    case "legendaire":
      return "very pale ivory paper, near white with only a hint of warm gold";
    case "unique":
      return "very pale frost-blue paper, near white with only a subtle icy tint";
    case "commun":
    default:
      return "cream parchment, light and neutral";
  }
}

function buildStyleBrief(rarete) {
  return [
    "Vintage Art Déco product illustration in a museum catalog style.",
    "Elegant ink line-art with subtle sepia and forest green color wash.",
    `Centered single object, isolated on a ${backgroundPhrase(rarete)} background with subtle paper grain texture.`,
    "Soft directional lighting, no harsh shadows, no text, no captions, no watermark.",
    "Composition: subject positioned slightly above center, occupying the upper two-thirds of the frame ; the bottom third must be empty background (a circular medallion will be placed there at display time).",
    "Strict square 1:1 aspect ratio composition.",
    "Style of 1920s-1930s French decorative arts.",
  ].join(" ");
}

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
const prefix = flagValue("prefix", null);
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);
  let todo = config;
  if (onlyIds.length) {
    todo = config.filter((c) => onlyIds.includes(c.templateId));
  } else if (prefix) {
    todo = config.filter((c) => c.templateId.startsWith(prefix));
  }

  if (todo.length === 0) {
    console.error("Aucun item à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} item(s) à traiter\n`);

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

    const rarete = item.rarete ?? "commun";
    const styleBrief = buildStyleBrief(rarete);
    const prompt = `${styleBrief}\n\nSubject: ${item.description}.`;
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
