#!/usr/bin/env node
/**
 * Fabrique la façade de la borne d'arcade du Bazar.
 *
 * Deux modes :
 *   node scripts/generate-borne-arcade.mjs --from <fichier.png>   # détoure un tirage existant
 *   node scripts/generate-borne-arcade.mjs --generer [n]          # produit n nouveaux tirages
 *
 * DEUX PIÈGES PAYÉS COMPTANT, encodés ici :
 *
 * 1. On ne demande JAMAIS « fond transparent » à Gemini : il PEINT un damier
 *    et rend une image parfaitement opaque. On demande un aplat vert franc,
 *    qu'on découpe nous-mêmes. (Constaté le 2026-08-22, et déjà sur les
 *    profils de camions.)
 * 2. Le fond vert se découpe par DIFFUSION depuis les bords, jamais par
 *    sélection de couleur : le pupitre porte des boutons verts qu'une
 *    sélection globale percerait aussi. Le magenta de l'écran, lui, peut
 *    partir par sélection — il n'apparaît nulle part ailleurs.
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(ROOT, "public", "bazar", "borne-facade.webp");
const REFERENCE = path.join(ROOT, "public", "bazar", "borne-arcade.webp");

const args = process.argv.slice(2);
const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;
const generer = args.includes("--generer");

const PROMPT_INTRO =
  "Reference image (attached): an arcade cabinet drawn in the exact style to keep. " +
  "Preserve its identity down to the details — the same wooden body, the same warm brown and " +
  "terracotta palette, the same thick hand-inked cartoon outlines, the same soft cel shading, " +
  "the same amber ARCADE marquee with its swirling background, the same red ball-top joysticks " +
  "and the same clusters of round colored buttons. Redraw this same cabinet as described below.";

const PROMPT_SUJET = [
  "Front elevation of the same arcade cabinet, strictly frontal and straight-on, camera at screen",
  "height, both side panels hidden behind the front face, every horizontal edge perfectly horizontal",
  "and every vertical edge perfectly vertical.",
  "",
  "THE ONE CHANGE: the monitor is BIG. It is a wide 4:3 screen, wider than tall, and it fills almost",
  "the whole front of the cabinet: the bezel around it is a NARROW strip, a thin dark frame just a few",
  "centimetres wide on each side, so the glass reaches nearly to the left and right edges of the cabinet.",
  "The screen is the dominant feature of the image.",
  "",
  "Top to bottom: a slim illuminated marquee header with ARCADE in chunky amber letters; immediately",
  "below it the big 4:3 screen inside its thin bezel; below that the control panel with two ball-top",
  "joysticks and two clusters of round colored buttons. The image is cropped just below the control panel.",
  "",
  "The screen area is filled edge to edge with ONE single flat uniform saturated magenta (RGB 255, 0, 255),",
  "a smooth evenly lit block of pure color, exactly like a chroma-key screen on a film set.",
  "",
  "The area around the cabinet is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0),",
  "a smooth even backdrop, exactly like a chroma-key green screen. The cabinet keeps a crisp clean silhouette.",
].join(" ");

async function chargerEnv() {
  try {
    const contenu = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const ligne of contenu.split("\n")) {
      const l = ligne.trim();
      if (!l || l.startsWith("#")) continue;
      const eq = l.indexOf("=");
      if (eq < 0) continue;
      const k = l.slice(0, eq).trim();
      let v = l.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* pas de .env */
  }
}

async function tirages(n) {
  await chargerEnv();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const ref = await fs.readFile(REFERENCE);
  const contents = [
    {
      role: "user",
      parts: [
        { text: PROMPT_INTRO },
        { inlineData: { mimeType: "image/webp", data: ref.toString("base64") } },
        { text: `Subject: ${PROMPT_SUJET}` },
      ],
    },
  ];
  for (let i = 1; i <= n; i++) {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
      config: { imageConfig: { aspectRatio: "4:3", imageSize: "2K" } },
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) {
      console.log(`❌ tirage ${i} : pas d'image`);
      continue;
    }
    const out = path.join(ROOT, `borne-tirage-${i}.png`);
    await fs.writeFile(out, Buffer.from(img.inlineData.data, "base64"));
    console.log(`✅ ${out}`);
  }
  console.log("Choisir un tirage, puis relancer avec --from <fichier>.");
}

async function detourer(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const idx = (x, y) => (y * W + x) * 4;

  // 1. le fond vert, par diffusion depuis les bords (les boutons verts du
  //    pupitre ne sont reliés à aucun bord, ils survivent).
  const estVert = (x, y) => {
    const i = idx(x, y);
    return (
      data[i + 1] > 150 &&
      data[i] < 140 &&
      data[i + 2] < 140 &&
      data[i + 1] - Math.max(data[i], data[i + 2]) > 60
    );
  };
  const vu = new Uint8Array(W * H);
  const pile = [];
  for (let x = 0; x < W; x++) pile.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) pile.push([0, y], [W - 1, y]);
  while (pile.length) {
    const [x, y] = pile.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (vu[p] || !estVert(x, y)) continue;
    vu[p] = 1;
    data[idx(x, y) + 3] = 0;
    pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // 2. le magenta de l'écran, par sélection.
  let sx0 = W;
  let sy0 = H;
  let sx1 = -1;
  let sy1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (data[i] > 190 && data[i + 2] > 190 && data[i + 1] < 90) {
        data[i + 3] = 0;
        if (x < sx0) sx0 = x;
        if (x > sx1) sx1 = x;
        if (y < sy0) sy0 = y;
        if (y > sy1) sy1 = y;
      }
    }
  }

  // 3. rogner aux bornes du caisson.
  let ax0 = W;
  let ay0 = H;
  let ax1 = -1;
  let ay1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[idx(x, y) + 3] > 128) {
        if (x < ax0) ax0 = x;
        if (x > ax1) ax1 = x;
        if (y < ay0) ay0 = y;
        if (y > ay1) ay1 = y;
      }
    }
  }
  const cw = ax1 - ax0 + 1;
  const ch = ay1 - ay0 + 1;

  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: ax0, top: ay0, width: cw, height: ch })
    .resize({ width: 1000 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(SORTIE);

  const pct = (v, base, off) => +((100 * (v - off)) / base).toFixed(2);
  console.log(`✅ ${SORTIE}`);
  console.log(`   caisson  ${cw} × ${ch}  ratio ${(cw / ch).toFixed(3)}`);
  console.log("   ── à recopier dans borneArcadeLayout.ts ──");
  console.log(`   ratio : ${(cw / ch).toFixed(3)}`);
  console.log(
    `   trou  : left ${pct(sx0, cw, ax0)}  right ${(100 - pct(sx1 + 1, cw, ax0)).toFixed(2)}` +
      `  top ${pct(sy0, ch, ay0)}  bottom ${(100 - pct(sy1 + 1, ch, ay0)).toFixed(2)}`,
  );
}

if (generer) {
  const n = Number(args[args.indexOf("--generer") + 1]) || 3;
  await tirages(n);
} else if (from) {
  await detourer(from);
} else {
  console.error("Usage : --from <fichier.png>  |  --generer [n]");
  process.exit(1);
}
