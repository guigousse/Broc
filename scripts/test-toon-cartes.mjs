/* Essai de toonification sur quelques objets AVANT de figer la liste des 50
 * (demande Guillaume 2026-09-04) : une planche 2×2 dans le style des cartes,
 * → scripts/carte-tests/<nom>.png + découpe en 4 PNG.
 *   node test-toon-cartes.mjs <nom> "sujet 1" "sujet 2" "sujet 3" "sujet 4"
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "carte-tests");
const [nom, ...sujets] = process.argv.slice(2);
if (!nom || sujets.length !== 4) { console.error("usage : nom + 4 sujets"); process.exit(1); }
const env = await fs.readFile(path.join(__dirname, "..", ".env"), "utf8");
const key = /GEMINI_API_KEY=(.+)/.exec(env)?.[1]?.trim().replace(/^"|"$/g, "");
const { style } = JSON.parse(await fs.readFile(path.join(__dirname, "carte-prompts.json"), "utf8"));
const prompt = [
  "One single landscape image (4:3) containing a grid of EXACTLY TWO COLUMNS and EXACTLY TWO ROWS — four equal landscape panels — separated by clean, thin, pure-white gutters (about 2% of the image width) and a pure-white outer margin of the same width.",
  style,
  "Each illustration completely fills its own panel edge to edge, the character centered, large, and entirely visible inside its panel.",
  "No text, no letters, no numbers, no logos, no frames inside the panels.",
  "Row by row, left to right, the four panels depict:",
  ...sujets.map((s, i) => `${i + 1}. ${s}`),
].join("\n");
const ai = new GoogleGenAI({ apiKey: key });
const r = await ai.models.generateContent({ model: "gemini-3-pro-image-preview", contents: prompt, config: { imageConfig: { aspectRatio: "4:3", imageSize: "2K" } } });
const part = (r.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
if (!part) { console.error("pas d'image"); process.exit(1); }
await fs.mkdir(OUT, { recursive: true });
const buf = Buffer.from(part.inlineData.data, "base64");
await fs.writeFile(path.join(OUT, `${nom}.png`), buf);
const { width: W, height: H } = await sharp(buf).metadata();
const cw = Math.floor(W / 2), ch = Math.floor(H / 2), inset = Math.round(cw * 0.04);
for (let i = 0; i < 4; i++) {
  await sharp(buf).extract({ left: (i % 2) * cw + inset, top: Math.floor(i / 2) * ch + inset, width: cw - 2 * inset, height: ch - 2 * inset }).png().toFile(path.join(OUT, `${nom}-${i + 1}.png`));
}
console.log(`✅ ${nom}.png + 4 cellules dans scripts/carte-tests/`);
