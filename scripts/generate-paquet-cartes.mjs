#!/usr/bin/env node
/**
 * LE PAQUET « BROCOMON » ET LE DOS DES CARTES — 2026-09-04.
 *
 * Deux visuels pour la cérémonie d'ouverture de paquet (et l'étagère du
 * Bazar, où le paquet remplace l'icône placeholder) :
 *
 *   - paquet : un booster scellé, portrait, sur studio VERT PUR → détouré par
 *     diffusion depuis les bords (même recette que les articles d'album),
 *     → public/cartes/paquet.webp. Porte le mot-image BROCOMON (lettrage
 *     copié de la référence de l'icône BROC) et le monstre du tourne-disque
 *     (référence : l'illustration LIVRÉE de la carte, pour rester dans le
 *     style des 50).
 *   - dos : le dos de carte 5:7 sur fond blanc → rogné, 1000×1400, coins
 *     arrondis évidés (même recette que les fonds de carte),
 *     → public/cartes/dos.webp. Sa référence est le PAQUET BRUT (le dessin
 *     d'origine complet, jamais l'asset dérivé) pour reprendre exactement le
 *     même logo.
 *
 * Usage :
 *   node generate-paquet-cartes.mjs                 # les deux (manquants)
 *   node generate-paquet-cartes.mjs --asset=dos     # un seul
 *   node generate-paquet-cartes.mjs --force         # regénère
 *   node generate-paquet-cartes.mjs --detour-only   # ne rappelle pas Gemini
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORK_DIR = path.join(__dirname, "paquet-cartes");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "cartes");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const MODEL = "gemini-3-pro-image-preview";

/** 5:7, le format des cartes (cf. generate-fonds-cartes.mjs). */
const LARGEUR = 1000;
const HAUTEUR = 1400;

const REF_LETTRAGE = path.join(__dirname, "icon-style-ref.png");
const REF_MONSTRE = path.join(OUTPUT_DIR, "carte.tourne_disque_a_courroie_vintage.webp");

const LETTRAGE = [
  'THE WORDMARK — THE MOST IMPORTANT ELEMENT: the word "BROCOMON" spelled with eight ornate serif CAPITAL letters',
  "of equal height — B, R, O, C, O, M, O, N — on ONE single line, an all-uppercase wordmark.",
  "Massive bevelled gold letterforms with a warm gold inner gradient, a bright polished gold outline and a dark keyline",
  "that lifts them off the background (letter treatment copied from REF 1 — copy only the metal-and-keyline treatment,",
  "the letters themselves are the eight letters spelled above). The wordmark stays perfectly legible when shrunk to 80 pixels wide.",
  "This is the only text in the image.",
].join(" ");

const ART_DECO = [
  "Art Deco style (1925 Paris exhibition): symmetrical geometry, stepped forms, fan and sunburst motifs, fine parallel gold fillets.",
  "Flat 2D vector-like illustration with crisp edges.",
].join(" ");

const REF_ALBUM_TIMBRES = path.join(__dirname, "album-item-album-timbres-brut.png");
const OUTPUT_TIMBRES = path.join(PROJECT_ROOT, "public", "timbres");

const ASSETS = {
  // La POCHETTE DE TIMBRES (2026-09-05) : une enveloppe philatélique fermée
  // en papier bleu, RABAT DROIT sur le haut (c'est lui que le joueur soulève
  // d'un glisser vers le haut à l'ouverture), mot-image « TIMBRES » repris de
  // l'album. Studio vert détouré comme le paquet → public/timbres/pochette.webp.
  pochette: {
    refs: [
      [REF_ALBUM_TIMBRES, "REF 1 — the stamp album: copy its deep blue paper colour, its gold Art Deco frame and its « TIMBRES » lettering (seven bevelled gold serif capitals T, I, M, B, R, E, S with a dark keyline)."],
      [path.join(WORK_DIR, "paquet-brut.png"), "REF 2 — the card booster pack: same illustration style, same size and same straight-on view."],
    ],
    prompt: [
      "A single CLOSED philatelic envelope pouch, portrait orientation, standing upright, seen straight on,",
      "made of textured deep blue paper, slightly taller than wide (about 5:7), with softly rounded corners.",
      "A STRAIGHT rectangular FLAP folds down over the top of the front: its bottom edge is a clean horizontal line at about",
      "28% of the envelope height, with a small round gold wax seal at the centre of that edge holding the flap closed.",
      ART_DECO,
      "Below the flap, on the body of the envelope: a polished gold Art Deco frame (stepped border, fan motifs in the corners, fine parallel gold fillets),",
      'and centred in the frame the word "TIMBRES" — seven ornate serif CAPITAL letters T, I, M, B, R, E, S on ONE line, spanning about 75% of the envelope width,',
      "bevelled gold with a warm inner gradient, a polished gold outline and a dark keyline (letter treatment copied from REF 1).",
      "Under the word, a small gold Art Deco cartouche, empty. This is the only text in the image. No stamp visible: the envelope is sealed.",
      "Soft directional lighting, a faint paper grain.",
      "The area around the envelope is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0), edge to edge,",
      "with no gradient, no texture, no shadow cast on it.",
    ].join(" "),
    aspectRatio: "3:4",
  },
  paquet: {
    refs: [
      [REF_LETTRAGE, "REF 1 — lettering style to imitate."],
      [REF_MONSTRE, "REF 2 — the featured creature, to redraw faithfully in the same style."],
    ],
    prompt: [
      "A single sealed collectible trading-card BOOSTER PACK, portrait orientation, standing upright, seen straight on,",
      "a soft foil wrapper slightly taller than a playing card, with a crimped serrated seal strip along the top edge",
      "and another along the bottom edge, and gentle wrinkles of the foil.",
      "Glossy foil wrapper in deep vermilion red with polished gold ornaments.",
      ART_DECO,
      "Layout from top to bottom: the crimped seal strip; then the wordmark spanning about 85% of the pack width;",
      "then, filling the middle and lower part of the pack, a gold sunburst of radiating rays behind the featured creature:",
      "the record-player monster from REF 2 (a vintage belt-drive turntable whose spinning record is its single glowing eye",
      "and whose tonearm and cables are its limbs), large, bursting forward toward the viewer, painterly with clean dark outlines;",
      "then a small empty gold Art Deco cartouche near the bottom; then the bottom seal strip.",
      LETTRAGE,
      "Soft directional lighting with a subtle foil sheen.",
      "The area around the pack is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0), edge to edge,",
      "with no gradient, no texture, no shadow cast on it.",
    ].join(" "),
    aspectRatio: "3:4",
  },
  dos: {
    // v2 (2026-09-05, retour Guillaume) : le centre devient un VINYLE dont le
    // label est un ŒIL, et BROCOMON s'écrit en ARC au-dessus et au-dessous
    // du centre (façon dos de carte Pokémon). Tout le reste du v1 est gardé :
    // la référence est le dos v1 BRUT (le dessin d'origine complet).
    refs: [
      ["dos-v1-brut.png", "REF 1 — the previous card back: keep its vermilion ground, gold lattice, stepped border and corner sunburst fans EXACTLY as they are; only the centre changes as described."],
      ["paquet-brut.png", "REF 2 — the booster pack: the BROCOMON wordmark to copy (same eight letters, same bevelled gold treatment)."],
    ],
    prompt: [
      "The BACK of a single collectible trading card, portrait orientation, seen straight on,",
      "centered on a pure white background with a clean white margin around the card. Rounded card corners.",
      "Deep vermilion red ground with polished gold ornaments, perfectly symmetric left/right, identical to REF 1",
      "(same stepped gold Art Deco border, same corner sunburst fans, same fine gold lattice).",
      ART_DECO,
      "THE CENTRE: a large black VINYL RECORD seen from above, with fine concentric grooves catching a gold light,",
      "and in its middle a round gold record label that is a single wide-open EYE — a gold iris with a black vertical pupil and a glint,",
      "ringed by a thin gold rim. The record fills about 40% of the card width.",
      'THE WORDMARK — the word "BROCOMON" (letters copied from REF 2: eight ornate serif capitals B, R, O, C, O, M, O, N, bevelled gold with a dark keyline)',
      "appears TWICE, curved along the record: once ABOVE it, bending along an arc that follows the top of the record (letters upright, the word arching like a rainbow),",
      "and once BELOW it, bending along an arc that follows the bottom of the record (letters upright, the word curving like a smile).",
      "Each wordmark spans about 70% of the card width. This is the only text in the image.",
      "No illustration other than the record and the eye, no other text anywhere. No perspective, no shadow outside the card.",
    ].join(" "),
    aspectRatio: "3:4",
  },
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // pas de .env
  }
}

/* ── Détourage du studio vert (paquet) ─────────────────────────────────── */
async function detourerVert(brut, sortie) {
  const { data, info } = await sharp(brut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const idx = (x, y) => (y * W + x) * 4;
  const estVert = (x, y) => {
    const i = idx(x, y);
    return data[i + 1] > 150 && data[i] < 140 && data[i + 2] < 140 && data[i + 1] - Math.max(data[i], data[i + 2]) > 60;
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
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[idx(x, y) + 3] > 128) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: w, height: h })
    .resize({ width: 900 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(sortie);
  console.log(`✅ ${path.relative(PROJECT_ROOT, sortie)} (${w}×${h}, ratio ${(w / h).toFixed(3)})`);
}

/* ── Rognage blanc + 5:7 + coins évidés (dos) — cf. generate-fonds-cartes ── */
async function cadrerEnCarte(brut, sortie) {
  const { data, info } = await sharp(brut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) {
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  if (maxx < 0) throw new Error("image entièrement blanche");
  const bw = maxx - minx + 1, bh = maxy - miny + 1;
  console.log(`  carte détectée ${bw}×${bh} (ratio ${(bw / bh).toFixed(3)}, cible ${(LARGEUR / HAUTEUR).toFixed(3)})`);
  const px = await sharp(brut)
    .extract({ left: minx, top: miny, width: bw, height: bh })
    .resize(LARGEUR, HAUTEUR, { fit: "fill" })
    .ensureAlpha().raw().toBuffer();
  evider(px, LARGEUR, HAUTEUR);
  await sharp(px, { raw: { width: LARGEUR, height: HAUTEUR, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(sortie);
  console.log(`✅ ${path.relative(PROJECT_ROOT, sortie)} (${LARGEUR}×${HAUTEUR})`);
}

function evider(px, W, H) {
  const blanc = (i) => px[i] > 225 && px[i + 1] > 225 && px[i + 2] > 225;
  const vu = new Uint8Array(W * H);
  const pile = [];
  const pousser = (x, y) => {
    const p = y * W + x;
    if (vu[p] || !blanc(p * 4)) return;
    vu[p] = 1;
    pile.push(p);
  };
  for (let x = 0; x < W; x++) { pousser(x, 0); pousser(x, H - 1); }
  for (let y = 0; y < H; y++) { pousser(0, y); pousser(W - 1, y); }
  while (pile.length) {
    const p = pile.pop();
    const x = p % W, y = (p - x) / W;
    if (x > 0) pousser(x - 1, y);
    if (x < W - 1) pousser(x + 1, y);
    if (y > 0) pousser(x, y - 1);
    if (y < H - 1) pousser(x, y + 1);
  }
  for (let p = 0; p < W * H; p++) if (vu[p]) px[p * 4 + 3] = 0;
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = px[p * 4 + 3];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (alpha[p] === 0) continue;
    if (alpha[p - 1] === 0 || alpha[p + 1] === 0 || alpha[p - W] === 0 || alpha[p + W] === 0) px[p * 4 + 3] = 128;
  }
}

/* ── Main ── */
const args = process.argv.slice(2);
const force = args.includes("--force");
const detourOnly = args.includes("--detour-only");
const seulAsset = (args.find((a) => a.startsWith("--asset=")) ?? "").slice(8);

async function main() {
  await loadDotEnv();
  await fs.mkdir(WORK_DIR, { recursive: true });
  const ids = seulAsset ? [seulAsset] : ["paquet", "dos"];
  for (const id of ids) if (!ASSETS[id]) { console.error(`❌ --asset="${id}" inconnu (paquet | dos | pochette).`); process.exit(1); }

  for (const id of ids) {
    const asset = ASSETS[id];
    const brutPath = path.join(WORK_DIR, `${id}-brut.png`);
    let existe = true;
    try { await fs.access(brutPath); } catch { existe = false; }

    if (!detourOnly && (!existe || force)) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) { console.error("❌ GEMINI_API_KEY absente (cf. .env)."); process.exit(1); }
      const ai = new GoogleGenAI({ apiKey });
      const parts = [{ text: asset.prompt }];
      for (const [ref, legende] of asset.refs) {
        const file = path.isAbsolute(ref) ? ref : path.join(WORK_DIR, ref);
        const data = await fs.readFile(file);
        parts.push({ text: legende });
        parts.push({ inlineData: { mimeType: file.endsWith(".png") ? "image/png" : "image/webp", data: data.toString("base64") } });
      }
      console.log(`🎨 ${id} — génération (${MODEL})…`);
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: { imageConfig: { aspectRatio: asset.aspectRatio, imageSize: "2K" } },
      });
      const part = (response.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
      if (!part) { console.error(`❌ ${id} : pas d'image dans la réponse`); process.exitCode = 1; continue; }
      await fs.writeFile(brutPath, Buffer.from(part.inlineData.data, "base64"));
      console.log(`  💾 ${path.relative(PROJECT_ROOT, brutPath)}`);
    }

    const sortie = id === "pochette" ? path.join(OUTPUT_TIMBRES, "pochette.webp") : path.join(OUTPUT_DIR, `${id}.webp`);
    if (id === "paquet" || id === "pochette") await detourerVert(brutPath, sortie);
    else await cadrerEnCarte(brutPath, sortie);
  }
}

main().catch((err) => { console.error("Erreur fatale :", err); process.exit(1); });
