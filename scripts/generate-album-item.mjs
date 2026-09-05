#!/usr/bin/env node
/**
 * LES ARTICLES D'ALBUM du Bazar — style des items du jeu (catalogue de
 * musée : trait d'encre, lavis sépia/vert).
 *
 *   - album-timbres : classeur Lindner de la photo de référence de
 *     Guillaume (2026-09-02) — cuir bleu profond, doubles filets or,
 *     filet vertical central, losange frappé.
 *   - classeur-cartes : classeur de cartes à collectionner (2026-09-02),
 *     couverture rouge avec une CHAISE TOONIFIÉE schématique — le motif
 *     du jeu, aucune marque.
 *
 * Fond VERT PUR à la génération, ôté par DIFFUSION depuis les bords (jamais
 * par sélection globale — même recette que la borne d'arcade), rogné aux
 * bornes opaques → public/bazar/albums/<id>.webp.
 *
 * Usage : node generate-album-item.mjs [--force] [--detour-only] [--item=<id>]
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SORTIE_DIR = path.join(PROJECT_ROOT, "public", "bazar", "albums");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

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

// Le style des items du jeu (cf. buildStyleBrief de generate-item-images),
// et le studio vert du détourage, partagés par tous les articles.
const STYLE = [
  "Vintage product illustration in a museum catalog style, elegant ink line-art with subtle sepia and forest green color wash.",
  "Soft directional lighting, no harsh shadows, no text, no captions, no watermark, no labels.",
  "Composition: subject perfectly centered, scaled to occupy roughly 75% of the frame.",
  "The area around the object is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0), edge to edge, with no gradient, no texture, no shadow cast on it.",
  "Strict square 1:1 aspect ratio composition.",
];

/** Deux timbres livrés, en référence de style pour la couverture de l'album. */
const TIMBRE_REF_A = "timbre.arenes_de_nimes.webp";
const TIMBRE_REF_B = "timbre.ballon_monte_1870.webp";

const ITEMS = [
  {
    id: "album-timbres",
    // Refonte 2026-09-05 : le MÊME classeur à anneaux que celui des cartes
    // (référence = son dessin brut), en BLEU, « TIMBRES » à la place du
    // mot-image, et un bouquet de timbres au centre de la couverture.
    refs: [
      ["album-item-classeur-cartes-brut.png", "REF 1 — the card binder: copy its exact shape, angle, spine with rivets, sleeve pages peeking out, gold Art Deco frame and the bevelled gold lettering treatment; only the colour, the word and the centre change."],
      ["../public/timbres/" + TIMBRE_REF_A, "REF 2 — one of the game's stamps, for the style of the stamps drawn on the cover."],
      ["../public/timbres/" + TIMBRE_REF_B, "REF 3 — another of the game's stamps."],
    ],
    sujet: [
      "Single object: a stamp collector's RING BINDER identical in shape to REF 1 (same three-quarter angle, same thick square spine with three round metal rivets and a small gold label holder, same sleeve pages peeking out).",
      "Textured DEEP BLUE cover (navy to royal blue) instead of red, with the same polished gold Art Deco frame: stepped geometric border, fan motifs in the corners, fine parallel gold fillets.",
      'Printed on the front cover, upper part: the word "TIMBRES" — seven ornate serif capital letters T, I, M, B, R, E, S on one line, spanning about 75% of the cover width, in the same bevelled gold lettering with a dark keyline as REF 1.',
      "Below the word, centred: a small fanned cluster of three or four postage stamps, drawn in the style of REF 2 and REF 3 (perforated edges, engraved look, muted vintage inks), slightly overlapping and tilted, as if pinned on the cover.",
      "This is the only text in the image.",
    ],
  },
  {
    id: "classeur-cartes",
    // Refonte 2026-09-05 (retour Guillaume) : un CLASSEUR À ANNEAUX Brocomon
    // dans le MÊME FORMAT que l'album de timbres (référence = son dessin
    // brut : angle, taille, dos à rivets, pochettes), en vermillon, avec le
    // VINYLE À ŒIL du dos de carte au centre et le mot-image du paquet.
    refs: [
      ["album-item-album-timbres-brut.png", "REF 1 — the stamp binder: copy its EXACT shape, size, three-quarter angle, thick square spine with rivets and label holder, sleeve pages peeking out, gold Art Deco frame and bevelled gold lettering treatment; only the colour, the word and the centre change."],
      ["paquet-cartes/dos-brut.png", "REF 2 — the card back: copy its centre — the black vinyl record whose label is a single golden eye — as the emblem on the cover."],
      ["paquet-cartes/paquet-brut.png", "REF 3 — the booster pack: the BROCOMON wordmark to copy (same eight letters, same bevelled gold treatment) and the vermilion-and-gold palette."],
    ],
    sujet: [
      "Single object: a trading-card collector's RING BINDER identical in shape, size and angle to REF 1 (same three-quarter view, same thick square spine with three round metal rivets and a small gold label holder, same sleeve pages peeking out at the top).",
      "Textured VERMILION RED cover instead of blue, with the same polished gold Art Deco frame: stepped geometric border, fan motifs in the corners, fine parallel gold fillets.",
      'Printed on the front cover, upper part: the BROCOMON wordmark copied from REF 3 — eight ornate serif capital letters B, R, O, C, O, M, O, N on one line, spanning about 75% of the cover width, in the same bevelled gold lettering with a dark keyline as REF 1\'s word.',
      "Below the wordmark, centred: the emblem from REF 2 — a black vinyl record seen from above, fine concentric grooves, whose round gold label is a single wide-open golden EYE with a black vertical pupil, ringed by a thin gold rim — about 45% of the cover width.",
      "This is the only text in the image.",
    ],
  },
];

/** Fond vert ôté par diffusion depuis les bords (jamais par sélection). */
async function detourer(brut, sortie) {
  const { data, info } = await sharp(brut)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const idx = (x, y) => (y * W + x) * 4;
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

  // Bornes opaques, puis rognage.
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[idx(x, y) + 3] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  await fs.mkdir(path.dirname(sortie), { recursive: true });
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize({ width: 800 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(sortie);
  console.log(`✅ ${path.relative(PROJECT_ROOT, sortie)} (${x1 - x0 + 1}×${y1 - y0 + 1})`);
}

async function main() {
  await loadDotEnv();
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const detourOnly = args.includes("--detour-only");
  const seulItem = (args.find((a) => a.startsWith("--item=")) ?? "").slice(7);
  // `--candidat=<n>` : un essai de plus, rangé dans scripts/album-candidats/
  // sans toucher au webp livré (on compare, puis on copie celui qu'on garde).
  const candidat = (args.find((a) => a.startsWith("--candidat=")) ?? "").slice(11);

  for (const item of ITEMS) {
    if (seulItem && item.id !== seulItem) continue;
    const suffixe = candidat ? `-c${candidat}` : "";
    const brut = path.join(__dirname, candidat ? "album-candidats" : "", `album-item-${item.id}${suffixe}-brut.png`);
    const sortie = candidat
      ? path.join(__dirname, "album-candidats", `${item.id}${suffixe}.webp`)
      : path.join(SORTIE_DIR, `${item.id}.webp`);
    if (candidat) await fs.mkdir(path.join(__dirname, "album-candidats"), { recursive: true });

    let existe = true;
    try {
      await fs.access(brut);
    } catch {
      existe = false;
    }
    if (!detourOnly && (!existe || force)) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.error("❌ GEMINI_API_KEY absente (cf. .env).");
        process.exit(1);
      }
      const ai = new GoogleGenAI({ apiKey });
      console.log(`🎨 ${item.id} — génération (gemini-3-pro-image-preview)…`);
      const parts = [{ text: [STYLE[0], ...item.sujet, ...STYLE.slice(1)].join(" ") }];
      for (const [ref, legende] of item.refs ?? []) {
        const file = path.join(__dirname, ref);
        parts.push({ text: legende });
        parts.push({ inlineData: { mimeType: file.endsWith(".png") ? "image/png" : "image/webp", data: (await fs.readFile(file)).toString("base64") } });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts }],
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
      });
      const part = (response.candidates?.[0]?.content?.parts ?? []).find(
        (p) => p.inlineData?.data,
      );
      if (!part) {
        console.error(`❌ ${item.id} : pas d'image dans la réponse`);
        process.exitCode = 1;
        continue;
      }
      await fs.writeFile(brut, Buffer.from(part.inlineData.data, "base64"));
    }
    await detourer(brut, sortie);
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
