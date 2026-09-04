#!/usr/bin/env node
/**
 * LES 3 FONDS DE CARTE DU DUEL (commun / rare / légendaire) — 2026-09-04.
 *
 * Décision Guillaume : le fond est un CADRE Art Déco de plus en plus épique
 * avec la rareté, qui RÉSERVE des zones vides pour ce que le composant
 * `CarteDuel` écrit par-dessus (nom, coût, série, attaque, PV, texte
 * d'effet, numéro). Rien de textuel n'est cuit dans l'image : les textes
 * existent en 4 langues et les stats bougent encore à l'équilibrage.
 *
 *   1. Gemini génère UN cadre par rareté sur fond blanc pur, avec ses zones
 *      vides remplies d'UN crème uniforme (c'est ce crème plat qui rend les
 *      zones DÉTECTABLES à l'étape 3).
 *   2. Rognage de la marge blanche, redimensionnement en 5:7 (1000×1400),
 *      → public/cartes/fond-<rarete>.webp (+ PNG de travail dans
 *      scripts/carte-fonds/).
 *   3. `--zones` : détecte les plages crème uniformes (composantes connexes)
 *      et imprime leurs rectangles en % de la carte — le point de départ de
 *      `src/data/duel/gabaritCarte.ts`, à ajuster à l'œil.
 *
 * Usage :
 *   node generate-fonds-cartes.mjs                  # les 3 (manquants)
 *   node generate-fonds-cartes.mjs --rarete=rare    # un seul
 *   node generate-fonds-cartes.mjs --force          # regénère
 *   node generate-fonds-cartes.mjs --zones          # mesure seulement
 *   node generate-fonds-cartes.mjs --model=flash    # (défaut : pro)
 *   node generate-fonds-cartes.mjs --variante=v2    # un jeu alternatif → carte-fonds/v2/ (pas livré)
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORK_DIR = path.join(__dirname, "carte-fonds");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "cartes");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

/** 5:7, le format d'une vraie carte à jouer (63 × 88 mm). */
export const LARGEUR = 1000;
export const HAUTEUR = 1400;

const CREME = "#F4ECD6";

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

/* ── Les trois cadres ──────────────────────────────────────────────────── */

const COMMUN = [
  "Restrained and elegant: thin bronze and brass fillet lines on warm parchment paper,",
  "simple stepped Art Deco corners, one subtle geometric border, matte finish, no gems, no rays.",
  "Palette: parchment cream, bronze, a touch of sage green.",
].join(" ");

const RARE = [
  "Richer and cooler: a double frame in polished silver and steel-blue enamel,",
  "Art Deco chevrons and fan (sunburst) motifs in the corners, a fine geometric lattice pattern",
  "in the margins around the picture window, a small pale-blue gem at the top center.",
  "Palette: steel blue, silver, ivory.",
].join(" ");

const LEGENDAIRE = [
  "Opulent and epic, the most ornate of a series: polished gold on black lacquer,",
  "radiating golden sunburst rays behind the top banner, stepped ziggurat corners,",
  "small ruby gems set at the four corners and the top center, engraved geometric filigree in the margins,",
  "a faint golden glow along the inner edge of the picture window.",
  "Palette: gold, black lacquer, deep crimson.",
].join(" ");

/* ── Variantes (2026-09-04 soir, retour Guillaume sur le 1er jeu : « le
   légendaire doit être plus désaturé, pas noir ») — deux jeux de plus,
   rangés dans carte-fonds/<variante>/ pour être comparés côte à côte. ── */
const VARIANTES = {
  // Le jeu d'origine.
  v1: { commun: COMMUN, rare: RARE, legendaire: LEGENDAIRE },
  // « Champagne » : le légendaire en ivoire et or pâle, tout en lumière.
  v2: {
    commun: [
      "Restrained and elegant: thin bronze fillet lines on warm parchment paper,",
      "simple stepped Art Deco corners, one subtle geometric border, matte finish, no gems, no rays.",
      "Palette: parchment cream, soft bronze, a touch of olive green.",
    ].join(" "),
    rare: [
      "Richer: a double frame in brushed silver and dusty teal enamel,",
      "Art Deco chevrons and fan motifs in the corners, a fine geometric lattice in the margins around the picture window,",
      "a small pale-blue gem at the top center. Muted, desaturated palette: dusty teal, silver, ivory.",
    ].join(" "),
    legendaire: [
      "Opulent but LIGHT and desaturated, the most ornate of a series: pale champagne gold and ivory enamel,",
      "soft radiating sunburst rays behind the top banner in muted gold, stepped ziggurat corners,",
      "small pearl and pale-amber gems at the four corners and the top center, engraved geometric filigree in the margins.",
      "NO black, no dark lacquer: the whole card stays luminous. Palette: ivory, champagne gold, warm grey, a hint of dusty rose.",
    ].join(" "),
  },
  // « Vert-de-gris » : le légendaire en bronze patiné et vert de gris sur ivoire.
  v3: {
    commun: [
      "Restrained and elegant: thin sepia and pale copper fillet lines on aged cream paper,",
      "simple stepped Art Deco corners, one subtle geometric border, matte finish, no gems, no rays.",
      "Palette: aged cream, pale copper, sepia.",
    ].join(" "),
    rare: [
      "Richer: a double frame in pewter and muted slate-blue enamel,",
      "Art Deco chevrons and fan motifs in the corners, a fine geometric lattice in the margins around the picture window,",
      "a small moonstone gem at the top center. Desaturated palette: slate blue, pewter, ivory.",
    ].join(" "),
    legendaire: [
      "Opulent but desaturated and LIGHT, the most ornate of a series: patinated antique bronze and verdigris enamel on ivory,",
      "soft radiating sunburst rays behind the top banner in muted bronze, stepped ziggurat corners,",
      "small muted garnet gems at the four corners and the top center, engraved geometric filigree in the margins.",
      "NO black, no dark lacquer: the whole card stays pale and luminous. Palette: ivory, antique bronze, verdigris green, muted garnet.",
    ].join(" "),
  },
};

function promptCadre(rarete) {
  return [
    "A single blank collectible trading-card FRAME, portrait orientation, seen straight on,",
    "centered on a pure white background with a clean white margin around the card.",
    "Art Deco style (1925 Paris exhibition): symmetrical geometry, stepped forms, fan motifs, fine parallel fillets.",
    STYLE_PAR_RARETE[rarete],
    "",
    "The frame is a TEMPLATE and must leave these areas completely EMPTY, each filled with ONE flat, uniform,",
    `unshaded cream color (${CREME}) with no texture, no gradient, no pattern and nothing drawn inside:`,
    "1. a horizontal NAME BANNER (cartouche) across the top, between the two top medallions;",
    "2. a large rectangular PICTURE WINDOW in the upper-middle, spanning most of the width, about 45% of the card height;",
    "3. a rectangular TEXT PANEL across the lower part, below the window, between the two bottom medallions, about 20% of the card height;",
    "4. four round MEDALLIONS, one in each corner of the card, each with an empty flat cream center (the ornate ring only).",
    "The ornaments live ONLY in the margins between these empty areas and along the edges.",
    "Absolutely no text, no letters, no numbers, no illustration, no character, no logo anywhere.",
    "Rounded card corners. Flat 2D vector-like illustration, crisp edges, no perspective, no shadow outside the card.",
  ].join("\n");
}

/* ── Environnement ── */
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

const args = process.argv.slice(2);
const force = args.includes("--force");
const zonesOnly = args.includes("--zones");
function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}
const modelKey = flagValue("model", "pro");
const seuleRarete = flagValue("rarete", null);
const variante = flagValue("variante", "v1");
if (!VARIANTES[variante]) { console.error(`❌  --variante="${variante}" inconnue (${Object.keys(VARIANTES).join(" | ")}).`); process.exit(1); }
const STYLE_PAR_RARETE = VARIANTES[variante];
/** v1 = les fonds livrés à l'app ; une autre variante reste dans son dossier de travail. */
const VARIANTE_DIR = variante === "v1" ? WORK_DIR : path.join(WORK_DIR, variante);

/* ── Rognage de la marge blanche + 5:7 ─────────────────────────────────── */
async function cadrerEnCarte(brut) {
  const { data, info } = await sharp(brut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Non-blanc = de la carte. Seuil large : le blanc de Gemini n'est pas 255 partout.
      if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
  }
  if (maxx < 0) throw new Error("image entièrement blanche");
  const bw = maxx - minx + 1, bh = maxy - miny + 1;
  const ratio = bw / bh;
  console.log(`  cadre détecté ${bw}×${bh} (ratio ${ratio.toFixed(3)}, cible ${(LARGEUR / HAUTEUR).toFixed(3)})`);
  // `fill` : une déformation de quelques % sur des ornements géométriques
  // ne se voit pas ; rogner couperait le cadre lui-même.
  const cadre = await sharp(brut)
    .extract({ left: minx, top: miny, width: bw, height: bh })
    .resize(LARGEUR, HAUTEUR, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return sharp(evider(cadre, LARGEUR, HAUTEUR), { raw: { width: LARGEUR, height: HAUTEUR, channels: 4 } });
}

/**
 * Les COINS ARRONDIS : Gemini peint le hors-carte en blanc. Tout blanc
 * connexe au bord de l'image devient transparent (remplissage depuis les
 * quatre bords), avec un liseré adouci d'un pixel pour ne pas crénelér.
 * Le blanc INTÉRIEUR (un ornement clair) n'est pas touché : il n'est pas
 * relié au bord.
 */
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
  // Liseré : un pixel opaque voisin d'un transparent passe à demi-alpha.
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = px[p * 4 + 3];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (alpha[p] === 0) continue;
    if (alpha[p - 1] === 0 || alpha[p + 1] === 0 || alpha[p - W] === 0 || alpha[p + W] === 0) px[p * 4 + 3] = 128;
  }
  return px;
}

/* ── Détection des zones crème ─────────────────────────────────────────── */
async function mesurerZones(png) {
  const S = 4; // mesure au quart : 250×350, largement assez
  const w = LARGEUR / S, h = HAUTEUR / S;
  const { data } = await sharp(png).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const cible = [0xf4, 0xec, 0xd6];
  const estCreme = (i) => Math.abs(data[i] - cible[0]) < 22 && Math.abs(data[i + 1] - cible[1]) < 22 && Math.abs(data[i + 2] - cible[2]) < 22;
  const vu = new Uint8Array(w * h);
  const zones = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (vu[p] || !estCreme(p * 3)) continue;
      // BFS
      const pile = [p];
      vu[p] = 1;
      let n = 0, minx = x, maxx = x, miny = y, maxy = y;
      while (pile.length) {
        const q = pile.pop();
        n++;
        const qx = q % w, qy = (q - qx) / w;
        if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const r = ny * w + nx;
          if (vu[r] || !estCreme(r * 3)) continue;
          vu[r] = 1;
          pile.push(r);
        }
      }
      const aire = n / (w * h);
      if (aire > 0.004) {
        const bw = maxx - minx + 1, bh = maxy - miny + 1;
        zones.push({
          x: +((minx / w) * 100).toFixed(1), y: +((miny / h) * 100).toFixed(1),
          w: +((bw / w) * 100).toFixed(1), h: +((bh / h) * 100).toFixed(1),
          aire: +(aire * 100).toFixed(1), plein: +((n / (bw * bh)) * 100).toFixed(0),
        });
      }
    }
  }
  zones.sort((a, b) => a.y - b.y || a.x - b.x);
  return zones;
}

/* ── Main ── */
async function main() {
  await loadDotEnv();
  await fs.mkdir(VARIANTE_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const raretes = seuleRarete ? [seuleRarete] : ["commun", "rare", "legendaire"];
  for (const r of raretes) if (!STYLE_PAR_RARETE[r]) { console.error(`❌ rareté inconnue : ${r}`); process.exit(1); }

  if (!zonesOnly) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) { console.error("❌  GEMINI_API_KEY absente (cf. .env)."); process.exit(1); }
    const model = MODEL_IDS[modelKey];
    if (!model) { console.error(`❌  --model="${modelKey}" inconnu (pro | flash).`); process.exit(1); }
    const ai = new GoogleGenAI({ apiKey });
    for (const rarete of raretes) {
      const brutPath = path.join(VARIANTE_DIR, `${rarete}-brut.png`);
      let brut = null;
      if (!force) { try { brut = await fs.readFile(brutPath); console.log(`⏭️  ${rarete} : brut déjà là (--force pour refaire)`); } catch { /* à générer */ } }
      if (!brut) {
        console.log(`🎨  fond ${rarete} — génération (${model})…`);
        const response = await ai.models.generateContent({
          model,
          contents: promptCadre(rarete),
          ...(modelKey === "pro" ? { config: { imageConfig: { aspectRatio: "3:4", imageSize: "2K" } } } : {}),
        });
        const part = (response.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
        if (!part) { console.error(`❌  ${rarete} : pas d'image dans la réponse`); process.exitCode = 1; continue; }
        brut = Buffer.from(part.inlineData.data, "base64");
        await fs.writeFile(brutPath, brut);
        console.log(`✅  ${rarete}-brut.png (${Math.round(brut.length / 1024)} kB)`);
      }
      const carte = await cadrerEnCarte(brut);
      const png = await carte.clone().png().toBuffer();
      await fs.writeFile(path.join(VARIANTE_DIR, `${rarete}.png`), png);
      if (variante === "v1") {
        const webp = await sharp(png).webp({ quality: 88 }).toBuffer();
        await fs.writeFile(path.join(OUTPUT_DIR, `fond-${rarete}.webp`), webp);
        console.log(`  💾 public/cartes/fond-${rarete}.webp (${Math.round(webp.length / 1024)} kB)`);
      }
    }
  }

  for (const rarete of raretes) {
    let png;
    try { png = await fs.readFile(path.join(VARIANTE_DIR, `${rarete}.png`)); } catch { console.error(`❌  ${rarete}.png absent`); continue; }
    const zones = await mesurerZones(png);
    console.log(`\n— zones crème de ${rarete} (en % de la carte, triées haut→bas, gauche→droite) —`);
    for (const z of zones) console.log(`  x=${z.x} y=${z.y} w=${z.w} h=${z.h}  aire=${z.aire}%  rempli=${z.plein}%`);
  }
}

main().catch((err) => { console.error("Erreur fatale :", err); process.exit(1); });
