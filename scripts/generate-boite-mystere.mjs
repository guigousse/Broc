#!/usr/bin/env node
/**
 * Génère la boîte mystère (fermée + ouverte) via Gemini Image API
 * ("Nano Banana Pro", gemini-3-pro-image-preview), dans le style de l'app.
 *
 * La fermée est générée en text-to-image ; l'ouverte en image-to-image à
 * partir de la fermée (même boîte, seul le couvercle change → cohérence).
 *
 * Sorties :
 *   public/items/boite-mystere.png           (fermée, sticker)
 *   public/items/boite-mystere-ouverte.png   (ouverte, pour l'overlay)
 * Puis converties en .webp (sharp).
 *
 * Clé : GEMINI_API_KEY dans .env (comme scripts/generate-item-images.mjs).
 *
 * Usage :
 *   node scripts/generate-boite-mystere.mjs            # génère ce qui manque
 *   node scripts/generate-boite-mystere.mjs --force    # regénère tout
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "items");
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

const force = process.argv.slice(2).includes("--force");
// Ne régénère que la boîte OUVERTE, en repartant de la fermée existante comme réf.
const openOnly = process.argv.slice(2).includes("--open-only");

const STYLE = [
  "Vintage museum-catalog product illustration, elegant ink line-art with a subtle watercolor wash.",
  "Warm muted palette: sepia and aged cream, deep forest-green accents, and polished brass/gold fittings. No neon, no high-saturation colors.",
  "Subject: an ornate antique treasure box — dark aged wood reinforced with engraved brass corners and a brass latch, Art-Nouveau / Art-Déco ornamentation, aged patina, cozy nostalgic mood.",
  "Placed on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO checkerboard, NO transparency pattern, NO gradient, NO paper, NO floor, NO shadow plate, no decorative border, no frame, no text, no watermark. The magenta must fill every pixel around the object.",
  "Subject perfectly centered, occupying ~70% of the frame, slight 3/4 top-down angle. Soft directional lighting.",
  "Strict square 1:1 aspect ratio.",
].join(" ");

const PROMPT_FERMEE = [
  STYLE,
  "State: the box is CLOSED. Lid shut with a brass latch/lock. An elegant ornamental brass emblem on the lid with a discreet question-mark motif. A faint magical golden shimmer escaping from the lid seams, hinting at hidden treasures inside. Mysterious yet inviting.",
].join(" ");

const EDIT_OUVERTE = [
  "Using the provided reference image of a closed antique treasure box, keep the box's BODY exactly identical — same aged wood, brass corner fittings, green Art-Nouveau side panels, engraved floral front panel, brass front latch, ornamentation, colors, proportions, the same 3/4 top-down viewing angle, lighting and framing.",
  "Change ONLY the lid: the lid is clearly OPEN, tilted BACKWARD by about 45 degrees, pivoting on brass hinges running along the REAR top edge of the box (hinge side at the back, opposite the front latch). The raised lid reveals the open interior.",
  "A soft warm golden glow with a few small sparkles rises from INSIDE the open box, staying strictly CONTAINED within the box opening and just around its inner rim. It must NOT spill out into the surrounding background. No purple or lavender smudges anywhere.",
  "CRITICAL BACKGROUND RULE: the entire area around the box silhouette must be a PERFECTLY UNIFORM, FLAT, PURE MAGENTA (#FF00FF) — absolutely no light rays, no sparkles, no glow, no smudges, no horizontal lines, no scanlines, no banding, no gradient and no texture outside the box.",
  "Same vintage illustration aesthetic, strict square 1:1 composition.",
].join(" ");

const ai = new GoogleGenAI({ apiKey });

async function generate(contents) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
    if (part.text) console.log(`💬  ${part.text.slice(0, 200)}`);
  }
  return null;
}

/** Détoure le fond magenta (#FF00FF) → alpha, avec bords adoucis + anti-spill. */
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
    const magentaness = Math.min(r, b) - g; // élevé sur le magenta
    if (magentaness > 45) {
      // Fond : transparent + RGB neutralisé (gris) pour ne laisser AUCUN
      // résidu magenta/strie visible, même dans un viewer qui ignore l'alpha.
      data[i] = 150;
      data[i + 1] = 150;
      data[i + 2] = 150;
      data[i + 3] = 0;
    } else if (magentaness > 12) {
      const t = (magentaness - 12) / 33; // 0..1 zone de bord
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      data[i] = Math.round(r - (r - g) * t); // anti-spill magenta
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
  console.log(`   → détouré (chroma-key magenta)`);
}

async function toWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/, ".webp");
  const buf = await sharp(pngPath).webp({ quality: 90 }).toBuffer();
  await fs.writeFile(webpPath, buf);
  console.log(`   → ${path.basename(webpPath)} (${Math.round(buf.length / 1024)} kB)`);
}

/** Aplati une image (transparente) sur fond magenta → base64 PNG, pour servir
 *  de référence image-to-image cohérente avec le keying. */
async function refOverMagenta(imgPath) {
  const buf = await sharp(imgPath)
    .flatten({ background: "#FF00FF" })
    .png()
    .toBuffer();
  return buf.toString("base64");
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const fermeePng = path.join(OUTPUT_DIR, "boite-mystere.png");
  const ouvertePng = path.join(OUTPUT_DIR, "boite-mystere-ouverte.png");
  const fermeeWebp = path.join(OUTPUT_DIR, "boite-mystere.webp");

  // Mode --open-only : garde la fermée existante, ne régénère que l'ouverte.
  let refB64;
  if (openOnly) {
    console.log("↻  Mode open-only : réf = boite-mystere.webp existante");
    refB64 = await refOverMagenta(fermeeWebp);
  } else {
    // 1) Boîte fermée (text-to-image), fond magenta.
    console.log(`🎨  Boîte FERMÉE — génération (${MODEL})…`);
    const fermeeBuf = await generate(PROMPT_FERMEE);
    if (!fermeeBuf) {
      console.error("❌ Pas d'image (fermée).");
      process.exit(1);
    }
    console.log(`✅  fermée (${Math.round(fermeeBuf.length / 1024)} kB)`);
    await fs.writeFile(fermeePng, fermeeBuf);
    refB64 = fermeeBuf.toString("base64");
  }

  // 2) Boîte ouverte (image-to-image), réf = la fermée sur fond magenta.
  console.log(`🎨  Boîte OUVERTE — génération image-to-image…`);
  const ouverteBuf = await generate([
    { inlineData: { mimeType: "image/png", data: refB64 } },
    { text: EDIT_OUVERTE },
  ]);
  if (!ouverteBuf) {
    console.error("❌ Pas d'image (ouverte).");
    process.exit(1);
  }
  console.log(`✅  ouverte (${Math.round(ouverteBuf.length / 1024)} kB)`);

  // 3) Détoure (chroma-key magenta) + webp. La fermée n'est retouchée que hors open-only.
  if (!openOnly) {
    await chromaKeyMagenta(fermeePng);
    await toWebp(fermeePng);
  }
  await fs.writeFile(ouvertePng, ouverteBuf);
  await chromaKeyMagenta(ouvertePng);
  await toWebp(ouvertePng);

  console.log("\n— Terminé —");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
