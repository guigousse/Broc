#!/usr/bin/env node
// Génère l'illustration source de l'icône BROC via Gemini, avec les items
// réels de l'app en images de référence. Sortie : candidates dans le scratchpad.
//
// Usage : node scripts/generate-icon-source.mjs <outDir> <tag> [caps|mixed]
//
// v2 (2026-07-30) — mot-image centré, le O est un 33 tours, et surtout AUCUN
// ornement au bord : le masque squircle d'iOS rognait la bordure art déco de
// la v1 et la faisait apparaître tranchée.

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = "/Users/guillaume/dev/Projet Broc V2";
const OUT_DIR = process.argv[2] ?? path.dirname(new URL(import.meta.url).pathname);
const TAG = process.argv[3] ?? "v1";
const CASE = process.argv[4] ?? "caps";

// .env
const envContent = await fs.readFile(path.join(ROOT, ".env"), "utf8");
for (const line of envContent.split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0 && !line.trim().startsWith("#")) {
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const REFS = [
  ["public/items/uniq.ma.vase_ming_dynasty.webp", "REF 1 — Ming porcelain vase with dragon motif on a dark wooden stand"],
  ["public/items/uniq.mus.violon_paganini.webp", "REF 2 — antique master violin, warm brown varnish, dark green fittings"],
  ["public/items/uniq.art.toile_monet_inedite.webp", "REF 3 — impressionist water-lilies painting in an ornate gilded frame"],
  ["public/items/uniq.mo.bijou_marie_antoinette.webp", "REF 4 — royal pearl-and-diamond pendant jewel with bow motif, on a green velvet cushion"],
  ["public/items/mus.33tours_jazz_1.webp", "REF 5 — jazz vinyl LP: the black 33rpm record itself, fine concentric grooves, small gold centre label"],
  ["public/items/jx.cartouche_bluebot_8_bit.webp", "REF 6 — retro green 8-bit video game cartridge with a small running robot on its label"],
  ["public/items/mo.montre_doree_vintage.webp", "REF 7 — vintage gold wristwatch with brown leather strap, cream dial"],
  ["scripts/icon-style-ref.png", "REF 8 — lettering style to imitate: bevelled gold serif letters with a warm inner gradient, a bright gold outline and a dark green keyline, sitting on a deep green ground. Copy only this metal-and-keyline treatment from it; the letters and the layout of the icon are described in the text above and take precedence."],
];

const WORD = CASE === "mixed" ? "Broc" : "BROC";
const LETTERS =
  CASE === "mixed"
    ? `the word "Broc" — one capital B followed by lowercase r, o, c — in ornate serif letterforms`
    : `the word "BROC" spelled with four ornate serif CAPITAL letters of equal height — capital B, capital R, capital O, capital C — an all-uppercase wordmark`;
const RING = CASE === "mixed" ? "the lowercase o" : "the letter O";

const PROMPT = `Square mobile app icon illustration for "${WORD}", a cozy French flea-market (brocante) game. Rich vintage painted illustration, warm and finely detailed, like a hand-painted antique shop sign.

BACKGROUND: deep forest green, a soft radial gradient from #2a7556 at the upper left to #12362a at the lower right. This green ground extends continuously all the way to the four edges and right into the four corners of the square. The four corners hold plain green background only, because the finished icon will be masked into a rounded squircle shape and anything sitting in a corner would be cut away.

THE WORDMARK — THE MOST IMPORTANT ELEMENT: ${LETTERS}, vertically centred and spanning about 88% of the icon width, dominating the composition. Massive bevelled gold letterforms with a warm gold inner gradient, a bright polished gold outline and a dark green keyline that lifts them off the background. ${RING} is a vinyl record (REF 5): its rim is the gold letterform, and its interior is a black 33rpm record with fine concentric grooves and a small gold centre label. The wordmark stays perfectly legible when the icon is shrunk to 60 pixels. This is the only text in the image.

THE STILL LIFE: antique flea-market treasures crowd in behind and around the wordmark so the whole square feels full, redrawn faithfully from the attached reference images and unified in the painted style. Each object appears exactly once, in one single place:
- the Ming vase (REF 1) stands upright directly behind the middle of the wordmark, its shoulder and mouth rising above the letters into the upper centre, its foot and wooden stand emerging below them.
- the violin (REF 2) lies along the lower left diagonal, its whole body resting below the letters at the bottom left and its neck and scroll running up the left side towards the upper left.
- the framed water-lilies painting (REF 3) leans in the upper right behind the last letter, tilted slightly, its gilded top and left edges visible above and beside the letters.
- the pearl pendant on its green velvet cushion (REF 4) sits at the bottom centre, in front of everything.
- the green cartridge (REF 6) is propped at the lower right, leaning against the base of the pile.
- the gold wristwatch (REF 7) lies flat at the bottom centre right, its strap curling.
- a scatter of antique gold coins settles along the base and catches the light.
All of these objects stay well inside the square, clear of the corners and of the outer edge, gathered around the centre.

LIGHTING: warm soft light from the upper left, gentle shadows falling onto the green ground behind the pile.

FULL-BLEED square composition, the artwork filling the entire square frame edge to edge, no watermark, no signature.`;

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) { console.error("clé absente"); process.exit(1); }

const parts = [{ text: PROMPT }];
for (const [file] of REFS) {
  const data = await fs.readFile(path.join(ROOT, file));
  const mimeType = file.endsWith(".png") ? "image/png" : "image/webp";
  parts.push({ inlineData: { mimeType, data: data.toString("base64") } });
}

const ai = new GoogleGenAI({ apiKey });
console.log(`🎨 génération ${TAG} (${CASE})…`);
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [{ role: "user", parts }],
  config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
});
const img = (response.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
if (!img) { console.error("pas d'image dans la réponse"); process.exit(1); }
const out = path.join(OUT_DIR, `icon-${TAG}.png`);
await fs.writeFile(out, Buffer.from(img.inlineData.data, "base64"));
console.log("✅", out);
