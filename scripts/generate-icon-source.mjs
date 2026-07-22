#!/usr/bin/env node
// Génère l'illustration source de l'icône BROC via Gemini, avec les items
// réels de l'app en images de référence. Sortie : candidates dans le scratchpad.

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = "/Users/guillaume/dev/Projet Broc V2";
const OUT_DIR = process.argv[2] ?? path.dirname(new URL(import.meta.url).pathname);
const TAG = process.argv[3] ?? "v1";

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
  ["uniq.ma.vase_ming_dynasty.webp", "REF 1 — Ming porcelain vase with dragon motif on a dark wooden stand"],
  ["uniq.mus.violon_paganini.webp", "REF 2 — antique master violin, warm brown varnish, dark green fittings"],
  ["uniq.art.toile_monet_inedite.webp", "REF 3 — impressionist water-lilies painting in an ornate gilded frame"],
  ["uniq.mo.bijou_marie_antoinette.webp", "REF 4 — royal pearl-and-diamond pendant jewel with bow motif"],
  ["mus.33tours_jazz_1.webp", "REF 5 — jazz vinyl LP sleeve, cream paper with abstract trumpet artwork; show the black vinyl record sliding out of it"],
  ["jx.cartouche_bluebot_8_bit.webp", "REF 6 — retro green 8-bit video game cartridge with a small running robot on its label"],
  ["mo.montre_doree_vintage.webp", "REF 7 — vintage gold wristwatch with brown leather strap, cream dial"],
];

const PROMPT = `Square app icon illustration for "BROC", a cozy French flea-market (brocante) game.

STYLE: rich vintage painted illustration, warm and detailed, like a hand-painted antique shop sign. Deep forest green background (#1c3a2a). Thin elegant gold filigree border running along the four edges of the square, understated.

TITLE — THE MOST IMPORTANT ELEMENT: the word "BROC" in HUGE ornate gold serif capital letters, spanning the FULL WIDTH of the icon edge-to-edge across the top third, gold metallic letters with fine engraved details and subtle highlights, slightly arched or straight, dominating the composition. The title must stay perfectly legible when the icon is shrunk very small. No other text anywhere.

BELOW THE TITLE: a lush flea-market still-life pile filling the lower two thirds, composed of EXACTLY these seven objects, redrawn faithfully from the attached reference images but unified in the painted style:
${REFS.map(([, d]) => `- ${d}`).join("\n")}
Composition: the Ming vase (REF 1) as the tall centerpiece; the violin (REF 2) leaning diagonally on one side; the framed water-lilies painting (REF 3) behind on the other side; the vinyl record and its sleeve (REF 5) tucked at the base; the green cartridge (REF 6) and the gold wristwatch (REF 7) in the foreground; the pearl pendant (REF 4) resting in front on a small green velvet cushion. A few scattered antique gold coins tie the pile together. Warm soft lighting, gentle shadows on the green background.

FULL-BLEED square composition, no outer margin, no rounded corners, no watermark, no signature.`;

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) { console.error("clé absente"); process.exit(1); }

const parts = [{ text: PROMPT }];
for (const [file] of REFS) {
  const data = await fs.readFile(path.join(ROOT, "public", "items", file));
  parts.push({ inlineData: { mimeType: "image/webp", data: data.toString("base64") } });
}

const ai = new GoogleGenAI({ apiKey });
console.log("🎨 génération…");
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
