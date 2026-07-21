#!/usr/bin/env node
/**
 * Génère les 5 illustrations recto des cartes postales de l'épilogue
 * (prompts : docs/art/prompts-cartes-postales.md).
 *
 * Usage :
 *   npm run gen:cartes-postales                # tout (skip ceux déjà présents)
 *   npm run gen:cartes-postales -- venise      # une ou plusieurs précises
 *   npm run gen:cartes-postales -- --force     # regénère même les présents
 *
 * Pipeline : Gemini pro 3:2 2K → WebP 1200×800 q85 dans public/cartes-postales/.
 * Les teintes d'accent reprennent `couleurTimbre` (src/data/cartesPostales.ts)
 * pour que recto et timbre du verso restent accordés.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "cartes-postales");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const OUT_W = 1200;
const OUT_H = 800;
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

const STYLE_BRIEF = [
  "Vintage travel postcard illustration, landscape orientation.",
  "Watercolor and light ink, soft washed colors, gentle pencil sketch under",
  "the color washes, no hard black outlines. Reminiscent of 1940s French",
  "travel postcards and magazine illustrations. Subtle aged paper grain.",
  "Base palette of earthy tones — ochre (#C9A04A), warm browns (#6B4A2B),",
  "off-white (#F4EFE6) — with the destination's own accent colors kept muted,",
  "never neon or saturated.",
].join(" ");

// Motif récurrent : le grand-père voyageur, petit dans la scène, toujours de dos.
const CHARACTER =
  "In the scene, small and seen from behind, an elderly gentleman traveler in " +
  "1940s clothes (hat, walking cane, small suitcase) — never facing the viewer.";

const FRAMING =
  "FULL-BLEED landscape 3:2 composition: the painted scene fills the ENTIRE " +
  "frame edge to edge. NO empty paper margins, NO border, NO frame, NO " +
  "decorative edge of any kind. ABSOLUTELY NO TEXT: no letters, no words, no " +
  "numbers, no signage, no stamps, no watermark.";

const CARTES = [
  {
    id: "venise",
    description:
      "Venice under gentle rain. A quiet canal with gondolas moored along " +
      "mossy poles, ochre and faded rose facades. The water mirrors the city " +
      "almost perfectly — the reflection as detailed as the buildings, two " +
      "Venices in one image. The elderly traveler stands on a small stone " +
      "bridge under an umbrella, watching the reflections. Accent colors: " +
      "lagoon blue-grey (#5a7d9a), muted rose plaster. Rain rendered as soft " +
      "washes, luminous grey sky.",
  },
  {
    id: "lisbonne",
    description:
      "Lisbon, a steep narrow street in Alfama. A vintage yellow tram climbs " +
      "the hill between houses covered in blue-and-white azulejo tiles, " +
      "laundry strung between windows, warm afternoon light. The elderly " +
      "traveler walks up the cobbled sidewalk beside the rails, suitcase in " +
      "hand. Accent colors: tram yellow-ochre (#c98a3d), azulejo blue kept " +
      "soft and chalky. Terracotta rooftops descending toward a glimpse of " +
      "the Tagus river.",
  },
  {
    id: "marrakech",
    description:
      "Marrakech souk alley, canvas awnings filtering warm sunlight into " +
      "stripes. Stalls overflowing with brass and silver teapots, lanterns " +
      "and woven rugs. In the foreground corner, a low table with two glasses " +
      "of mint tea and an ornate teapot. The elderly traveler sits at the " +
      "table with a merchant, mid-negotiation, both seen from behind/profile " +
      "at a distance. Accent colors: terracotta (#b5533c), saffron, warm " +
      "shadow tones. Dust motes in the light beams.",
  },
  {
    id: "kyoto",
    description:
      "Kyoto, a quiet artisan workshop opening onto a small zen garden with " +
      "a red maple. On a low wooden table in the foreground, a ceramic bowl " +
      "repaired with kintsugi — thin luminous gold seams across its dark " +
      "glaze — beside brushes and a small pot of gold lacquer. The elderly " +
      "traveler kneels at the table, seen from behind, head bowed toward the " +
      "bowl. Accent colors: matcha green (#7d9a6a), dark clay, one restrained " +
      "touch of gold. Soft paper lantern light.",
  },
  {
    id: "sans-timbre",
    description:
      "A small countryside railway platform at dawn, seen from the platform " +
      "edge. A vintage steam train pulls away into rolling open fields, its " +
      "smoke trailing into a pale sky — destination unknown, no signs, no " +
      "station name. On the empty platform remain a leather suitcase and a " +
      "hat resting on a bench. The elderly traveler leans out of the last " +
      "carriage window, seen from behind, waving. Accent colors: dawn gold, " +
      "soft grey-green fields, warm brown carriage wood. Mood: peaceful, " +
      "unhurried, slightly wistful.",
  },
];

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
  const todo = onlyIds.length
    ? CARTES.filter((c) => onlyIds.includes(c.id))
    : CARTES;

  if (todo.length === 0) {
    console.error("Aucune carte à générer (ids inconnus ?).");
    process.exit(1);
  }

  console.log(`📋  ${todo.length} carte(s) postale(s) à traiter\n`);
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

    const prompt = `${STYLE_BRIEF}\n\n${CHARACTER}\n\nSCENE: ${item.description}\n\n${FRAMING}`;
    console.log(`🎨  ${item.id} — génération (${MODEL}, 3:2, 2K)…`);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { imageConfig: { aspectRatio: "3:2", imageSize: "2K" } },
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
        .resize(OUT_W, OUT_H, { fit: "cover" })
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
