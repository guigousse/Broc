#!/usr/bin/env node
/**
 * Génère l'image de FIN de la vidéo promo : reprend l'illustration nue du
 * poster teasing (candidat aube n°2, celle du poster final) en image-to-image
 * et y ajoute un jeune garçon de trois-quarts dos, face au tourne-disque,
 * la pochette du vinyle en main, en train d'écouter la musique.
 *
 * L'image de DÉBUT de la vidéo est l'illustration inchangée :
 *   marketing/poster/candidats/illustration-2.png
 *
 * Usage :
 *   node scripts/poster/generate-poster-video-fin.mjs            # 3 candidats
 *   node scripts/poster/generate-poster-video-fin.mjs --count=5
 *   node scripts/poster/generate-poster-video-fin.mjs --force
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const BASE_IMAGE = path.join(
  PROJECT_ROOT,
  "marketing",
  "poster",
  "candidats",
  "illustration-2.png",
);
const OUTPUT_DIR = path.join(PROJECT_ROOT, "marketing", "poster", "video");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";

const PROMPT = [
  "The attached image is the exact base scene: a French flea-market stall",
  "illustration in vintage Art Déco museum-catalog style (sepia ink line-art,",
  "soft washes, cream parchment grain).",
  "Reproduce this scene IDENTICALLY — same composition, same camera angle, same",
  "objects in the same places, same lighting, same style — with ONE addition:",
  "a young boy, about 9 years old, standing in the foreground in front of the",
  "table, seen from behind at a three-quarter back angle, facing the turntable.",
  "He wears simple vintage clothes (short-sleeved shirt, shorts, flat cap).",
  "He has picked up the jazz vinyl record sleeve that was leaning against the",
  "wooden crate, and now holds it in his hands while he listens, enchanted, to",
  "the music playing on the spinning turntable, his head slightly tilted toward",
  "it. The tonearm rests on the spinning record. Because he took the sleeve,",
  "the wooden crate behind the turntable now shows its bare wooden slats: the",
  "sleeve appears exactly ONCE in the whole image, held in the boy's hands.",
  "His body partly overlaps the front edge of the table, drawn in the very same",
  "ink-and-wash style as the rest of the scene.",
  "Everything else stays untouched. No text, no watermark.",
].join(" ");

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
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const countArg = args.find((a) => a.startsWith("--count="));
const count = countArg ? Number(countArg.slice("--count=".length)) : 3;

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const baseBuf = await fs.readFile(BASE_IMAGE);
  const parts = [
    { inlineData: { mimeType: "image/png", data: baseBuf.toString("base64") } },
    { text: PROMPT },
  ];

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0;

  for (let i = 1; i <= count; i++) {
    const nom = `fin-garcon-${i}.png`;
    const outPath = path.join(OUTPUT_DIR, nom);
    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${nom} déjà présent (--force pour regénérer)`);
        continue;
      } catch {
        // absent → à générer
      }
    }
    console.log(`🎨  fin ${i}/${count} — génération (${MODEL}, 4:5, 2K)…`);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
      });
      const outParts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = outParts.find((p) => p.inlineData?.data);
      if (!imagePart) {
        console.error(`❌  candidat ${i} : pas d'image dans la réponse`);
        continue;
      }
      const buf = Buffer.from(imagePart.inlineData.data, "base64");
      await fs.writeFile(outPath, buf);
      console.log(`✅  ${nom} (${Math.round(buf.length / 1024)} kB)`);
      ok++;
    } catch (err) {
      console.error(`❌  candidat ${i} : ${err.message ?? err}`);
    }
  }

  console.log(`\n— ${ok} candidat(s) généré(s) dans ${path.relative(PROJECT_ROOT, OUTPUT_DIR)} —`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
