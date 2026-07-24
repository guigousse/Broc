#!/usr/bin/env node
/**
 * Génère les illustrations des ACHETEURS (archétypes clients de la vente)
 * via Gemini Image API — pipeline identique à generate-cachet-cire.mjs :
 * fond magenta → chroma-key → webp. Le style est calé sur les vendeurs du
 * chinage en passant une illustration existante comme référence.
 *
 * Une illustration par archétype (`client-<id>.webp`) dans
 * public/personas/clients/, plus une variante fâchée (`client-<id>-fache.webp`)
 * générée en IMAGE-TO-IMAGE depuis le portrait calme (flag `--fache`) : le
 * portrait calme est envoyé comme référence d'identité et seul le visage
 * change — c'est la seule façon de garder le même personnage entre les deux
 * (une génération indépendante réinvente tenue et accessoires).
 *
 * Clé : GEMINI_API_KEY dans .env.
 *
 * Usage :
 *   npm run gen:clients                        # portraits calmes manquants
 *   npm run gen:clients -- --force             # regénère tous les calmes
 *   npm run gen:clients -- etudiant_fauche     # un ou plusieurs ids précis
 *   npm run gen:clients -- --fache             # variantes fâchées manquantes
 *   npm run gen:clients -- --fache galeriste   # fâchée d'ids précis
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "personas", "clients");
const CONFIG_PATH = path.join(__dirname, "clients-prompts.json");
const STYLE_REF = path.join(PROJECT_ROOT, "public", "personas", "vendeur-bonhomme.webp");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const MODEL = "gemini-3-pro-image-preview";

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
  console.error("❌ GEMINI_API_KEY absente (.env).");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const modeFache = args.includes("--fache");
const onlyIds = args.filter((a) => !a.startsWith("--"));

const ai = new GoogleGenAI({ apiKey });

/** Prompt fâché : le portrait calme est joint comme référence d'IDENTITÉ. */
function buildPromptFache() {
  return [
    "Edit the reference character illustration: keep the EXACT SAME person — identical face shape, skin tone, hair, outfit, accessories, colors, framing, art style and background treatment.",
    "ONLY change the facial expression and slight body language to ANGRY: deep frown, knitted eyebrows, tight displeased mouth, slightly flushed cheeks, tense shoulders.",
    "Do NOT add, remove or redesign any clothing item or accessory. Do NOT change the crop or proportions.",
    "Output on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO shadow, NO gradient, no text, no watermark.",
    "Strict square 1:1 aspect ratio, same composition as the reference.",
  ].join(" ");
}

function buildPrompt(desc) {
  return [
    "Character illustration for a cozy French flea-market game, matching EXACTLY the art style of the reference image: warm watercolor and ink, soft muted palette, gentle painterly shading, subtle paper grain, slightly caricatured friendly proportions.",
    `Waist-up portrait of ${desc}.`,
    "Natural friendly pose and expression matching the description.",
    "STRICTLY NO real-world brand names, band names or logos anywhere — any patch, badge, pin or print must be generic or invented, ideally without readable text at all.",
    "Placed on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO shadow on the background, NO gradient, NO texture, no text, no watermark, no frame.",
    "Subject centered, occupying ~85% of the frame height. Strict square 1:1 aspect ratio.",
  ].join(" ");
}

async function generate(prompt, styleRefPng) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: styleRefPng.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
    if (part.text) console.log(`💬  ${part.text.slice(0, 200)}`);
  }
  return null;
}

/** Détoure le fond magenta (#FF00FF) → alpha, bords adoucis + anti-spill. */
async function chromaKeyMagenta(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const magentaness = Math.min(r, b) - g;
    if (magentaness > 45) {
      data[i] = 150;
      data[i + 1] = 150;
      data[i + 2] = 150;
      data[i + 3] = 0;
    } else if (magentaness > 12) {
      const t = (magentaness - 12) / 33;
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      data[i] = Math.round(r - (r - g) * t);
      data[i + 2] = Math.round(b - (b - g) * t);
    }
  }
  const tmp = pngPath + ".tmp.png";
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .png()
    .toFile(tmp);
  await fs.rename(tmp, pngPath);
}

async function toWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/, ".webp");
  // 512 px max : même gabarit que les vendeurs (affichage ≤ ~180 px).
  const buf = await sharp(pngPath)
    .resize(512, 512, { fit: "inside" })
    .webp({ quality: 85 })
    .toBuffer();
  await fs.writeFile(webpPath, buf);
  console.log(`   → ${path.basename(webpPath)} (${Math.round(buf.length / 1024)} kB)`);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const styleRefPng = await sharp(STYLE_REF).png().toBuffer();

  const cibles = config.filter((c) => onlyIds.length === 0 || onlyIds.includes(c.id));
  if (cibles.length === 0) {
    console.error(`❌ Aucun id ne correspond (connus : ${config.map((c) => c.id).join(", ")}).`);
    process.exit(1);
  }

  let ok = 0;
  let echecs = 0;
  for (const { id, desc } of cibles) {
    const base = modeFache ? `client-${id}-fache` : `client-${id}`;
    const webp = path.join(OUTPUT_DIR, `${base}.webp`);
    if (!force && (await exists(webp))) {
      console.log(`✓ ${base}.webp déjà présent`);
      continue;
    }
    console.log(`🎨  ${base} — génération…`);
    try {
      let prompt;
      let refPng;
      if (modeFache) {
        // Image-to-image depuis le portrait calme : référence d'identité.
        const calme = path.join(OUTPUT_DIR, `client-${id}.webp`);
        if (!(await exists(calme))) {
          console.error(`❌ ${base} : portrait calme absent (générer d'abord client-${id}.webp).`);
          echecs += 1;
          continue;
        }
        refPng = await sharp(calme)
          .flatten({ background: "#ffffff" })
          .png()
          .toBuffer();
        prompt = buildPromptFache();
      } else {
        refPng = styleRefPng;
        prompt = buildPrompt(desc);
      }
      const buf = await generate(prompt, refPng);
      if (!buf) {
        console.error(`❌ ${base} : pas d'image dans la réponse.`);
        echecs += 1;
        continue;
      }
      const png = path.join(OUTPUT_DIR, `${base}.png`);
      await fs.writeFile(png, buf);
      await chromaKeyMagenta(png);
      await toWebp(png);
      await fs.unlink(png);
      ok += 1;
    } catch (err) {
      console.error(`❌ ${base} : ${err.message ?? err}`);
      echecs += 1;
    }
  }

  console.log(`\n— Terminé : ${ok} générées, ${echecs} échecs —`);
  if (echecs > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
