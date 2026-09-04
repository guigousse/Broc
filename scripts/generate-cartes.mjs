#!/usr/bin/env node
/**
 * L'ART DES 50 CARTES — même principe que les timbres (2026-09-02, décision
 * Guillaume : « plusieurs sur 1 page puis redécoupage précis » pour limiter
 * les générations), refondu le 2026-09-04 quand le cadre est devenu un FOND
 * PEINT par rareté (`generate-fonds-cartes.mjs`) composé à l'écran par
 * `CarteDuel` :
 *
 *   1. PLANCHES 2×2 (`grille` du JSON ; 3×3 jusqu'au 2026-09-04 : trop petit,
 *      les monstres y perdaient leur caractère) générées par Gemini en 4:3 — PAYSAGE, le ratio de la
 *      fenêtre d'illustration des fonds —, tous les objets PERSONNIFIÉS en
 *      petits monstres mignons → scripts/carte-sheets/<nom>.png.
 *   2. DÉCOUPE (marge rognée contre la gouttière) → public/cartes/<id>.webp,
 *      l'ILLUSTRATION SEULE. Plus de gabarit ici : cadre, chiffres, nom et
 *      texte sont écrits par le composant, en 4 langues, sur les stats du
 *      moment. Le webp ne contient rien qui puisse se périmer.
 *
 * Usage :
 *   node generate-cartes.mjs                    # tout (planches manquantes + découpe)
 *   node generate-cartes.mjs --sheet=planche1   # une planche
 *   node generate-cartes.mjs --slice-only       # re-découpe sans regénérer
 *   node generate-cartes.mjs --force            # regénère les planches existantes
 *   node generate-cartes.mjs --single=carte.x   # UNE carte seule (retouche) → carte-sheets/singles/carte.x.png,
 *                                               # prioritaire sur la cellule de planche à la découpe
 *   node generate-cartes.mjs --model=flash      # (défaut : pro)
 *
 * Après coup : remplir PIECES_AVEC_IMAGE (src/lib/pieceImages.ts) — la
 * découpe imprime la liste à coller.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SHEETS_DIR = path.join(__dirname, "carte-sheets");
/** Les retouches à l'unité : une planche entière regénérée pour une case
 *  refusée perdrait les huit voisines validées (timbres 2026-09-02, même
 *  leçon). Un single ici REMPLACE la cellule de planche à la découpe. */
const SINGLES_DIR = path.join(SHEETS_DIR, "singles");
const CONFIG_PATH = path.join(__dirname, "carte-prompts.json");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "cartes");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

/** Une illustration livrée : 4:3, de quoi remplir la fenêtre d'une fiche
 *  à 2× sans peser (la fenêtre fait ~70 % de la carte, ~300 px en fiche). */
const ILLU_W = 640;
const ILLU_H = 480;

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

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const sliceOnly = args.includes("--slice-only");
function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}
const modelKey = flagValue("model", "pro");
const seuleSheet = flagValue("sheet", null);
const single = flagValue("single", null);

/* ── Prompt d'une planche ── */
const EN_LETTRES = { 2: "TWO", 3: "THREE" };
function promptPlanche(sheet, style, grille) {
  const sujets = sheet.cases.map((c, i) => `${i + 1}. ${c.sujet}`).join("\n");
  const n = EN_LETTRES[grille];
  return [
    `One single landscape image (4:3) containing a grid of EXACTLY ${n} COLUMNS and EXACTLY ${n} ROWS — ${grille * grille} equal landscape panels, no more, no fewer — separated by clean, thin, pure-white gutters (about 2% of the image width) and a pure-white outer margin of the same width.`,
    style,
    "Each illustration completely fills its own panel edge to edge (full bleed), the character centered, large, and entirely visible inside its panel — nothing cut by the panel edge.",
    "No text, no letters, no numbers, no logos, no frames inside the panels — the card frame is added separately later.",
    `Row by row, left to right, the ${grille * grille} panels depict:`,
    sujets,
  ].join("\n");
}

/* ── Prompt d'une carte seule (retouche) ── */
function promptSingle(sujet, style) {
  return [
    "One single landscape illustration (4:3), full bleed, no border, no frame.",
    style,
    "The character centered, large, and entirely visible — nothing cut by the edge.",
    "No text, no letters, no numbers, no logos.",
    `It depicts: ${sujet}`,
  ].join("\n");
}

/* ── Garde de grille ── */
/** Compte les colonnes et lignes de cases en repérant les gouttières :
 *  une colonne (ligne) de pixels quasi tous blancs, hors marge extérieure. */
async function compterGrille(src, W, H) {
  const { data } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const blanc = (i) => data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
  const colBlanche = new Array(W).fill(0);
  const ligBlanche = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (blanc((y * W + x) * 3)) { colBlanche[x]++; ligBlanche[y]++; }
    }
  }
  const runs = (tab, total) => {
    // Une gouttière = série contiguë de colonnes blanches à ≥ 92 %, qui ne
    // touche pas le bord (la marge). Les cases = les intervalles entre.
    const estG = tab.map((n) => n / total >= 0.92);
    let n = 0, dedans = false, debut = 0;
    for (let i = 0; i < estG.length; i++) {
      if (estG[i] && !dedans) { dedans = true; debut = i; }
      if (!estG[i] && dedans) { dedans = false; if (debut > 0) n++; }
    }
    return n + 1;
  };
  return { colonnes: runs(colBlanche, H), lignes: runs(ligBlanche, W) };
}

/* ── Découpe ── */
async function decouperPlanche(sheet, G) {
  const sheetPath = path.join(SHEETS_DIR, `${sheet.nom}.png`);
  let src;
  try {
    src = await fs.readFile(sheetPath);
  } catch {
    console.error(`❌  planche absente : ${sheetPath}`);
    return [];
  }
  const { width: W, height: H } = await sharp(src).metadata();
  // Garde : Gemini a déjà rendu une planche en 4×3 malgré la consigne
  // (2026-09-04, planches 5 et 6). Une découpe en tiers y serait fausse
  // partout : on compte les gouttières blanches avant de couper.
  const grille = await compterGrille(src, W, H);
  if (grille.colonnes !== G || grille.lignes !== G) {
    console.error(`❌  ${sheet.nom} : grille ${grille.colonnes}×${grille.lignes} au lieu de ${G}×${G} — à regénérer (--force --sheet=${sheet.nom})`);
    process.exitCode = 1;
    return [];
  }
  const cellW = Math.floor(W / G);
  const cellH = Math.floor(H / G);
  // Rognage : la gouttière blanche n'est jamais exactement à 2 %, et Gemini
  // dessine parfois un liseré au bord de la case malgré la consigne.
  const inset = Math.round(cellW * 0.05);

  const ids = [];
  for (let i = 0; i < sheet.cases.length; i++) {
    const { id } = sheet.cases[i];
    if (!id) continue;
    const col = i % G;
    const row = Math.floor(i / G);
    let source = sharp(src).extract({
      left: col * cellW + inset,
      top: row * cellH + inset,
      width: cellW - 2 * inset,
      height: cellH - 2 * inset,
    });
    try {
      const singleBuf = await fs.readFile(path.join(SINGLES_DIR, `${id}.png`));
      // Même rognage que la cellule : Gemini borde parfois d'un liseré.
      const m = await sharp(singleBuf).metadata();
      const ins = Math.round(m.width * 0.03);
      source = sharp(singleBuf).extract({ left: ins, top: ins, width: m.width - 2 * ins, height: m.height - 2 * ins });
      console.log(`  🔁 ${id} : single (retouche) à la place de la cellule`);
    } catch {
      // pas de single : la cellule de planche
    }
    const rendu = await source
      .resize(ILLU_W, ILLU_H, { fit: "cover" })
      .webp({ quality: 88 })
      .toBuffer();
    await fs.writeFile(path.join(OUTPUT_DIR, `${id}.webp`), rendu);
    console.log(`  ✂️  ${id}.webp (${Math.round(rendu.length / 1024)} kB)`);
    ids.push(id);
  }
  return ids;
}

/* ── Main ── */
async function main() {
  await loadDotEnv();
  await fs.mkdir(SHEETS_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  // 2×2 depuis le 2026-09-04 soir : en 3×3 chaque monstre tenait sur un
  // neuvième de l'image et perdait son caractère (13 planches au lieu de 6).
  const grille = config.grille ?? 3;
  let sheets = config.sheets;
  if (seuleSheet) {
    sheets = sheets.filter((s) => s.nom === seuleSheet);
    if (sheets.length === 0) {
      console.error(`❌  --sheet="${seuleSheet}" inconnue.`);
      process.exit(1);
    }
  }

  if (single) {
    const cas = config.sheets.flatMap((sh) => sh.cases).find((c) => c.id === single);
    if (!cas) { console.error(`❌  --single="${single}" inconnue.`); process.exit(1); }
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = MODEL_IDS[modelKey];
    if (!apiKey || !model) { console.error("❌  GEMINI_API_KEY ou modèle manquant."); process.exit(1); }
    const ai = new GoogleGenAI({ apiKey });
    console.log(`🎨  single ${single} — génération (${model})…`);
    const response = await ai.models.generateContent({
      model,
      contents: promptSingle(cas.sujet, config.style),
      ...(modelKey === "pro" ? { config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } } } : {}),
    });
    const part = (response.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
    if (!part) { console.error("❌  pas d'image dans la réponse"); process.exit(1); }
    await fs.mkdir(SINGLES_DIR, { recursive: true });
    await fs.writeFile(path.join(SINGLES_DIR, `${single}.png`), Buffer.from(part.inlineData.data, "base64"));
    console.log(`✅  singles/${single}.png`);
    // Puis la découpe de SA planche seulement, qui prendra le single.
    sheets = config.sheets.filter((sh) => sh.cases.some((c) => c.id === single));
  }

  if (!sliceOnly && !single) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("❌  GEMINI_API_KEY absente (cf. .env).");
      process.exit(1);
    }
    const model = MODEL_IDS[modelKey];
    if (!model) {
      console.error(`❌  --model="${modelKey}" inconnu (pro | flash).`);
      process.exit(1);
    }
    const ai = new GoogleGenAI({ apiKey });

    for (const sheet of sheets) {
      const sheetPath = path.join(SHEETS_DIR, `${sheet.nom}.png`);
      if (!force) {
        try {
          await fs.access(sheetPath);
          console.log(`⏭️  planche ${sheet.nom} déjà là (--force pour refaire)`);
          continue;
        } catch {
          // à générer
        }
      }
      console.log(`🎨  planche ${sheet.nom} — génération (${model})…`);
      const requestConfig = {
        model,
        contents: promptPlanche(sheet, config.style, grille),
        ...(modelKey === "pro"
          ? { config: { imageConfig: { aspectRatio: "4:3", imageSize: "2K" } } }
          : {}),
      };
      const response = await ai.models.generateContent(requestConfig);
      const part = (response.candidates?.[0]?.content?.parts ?? []).find(
        (p) => p.inlineData?.data,
      );
      if (!part) {
        console.error(`❌  ${sheet.nom} : pas d'image dans la réponse`);
        process.exitCode = 1;
        continue;
      }
      const buf = Buffer.from(part.inlineData.data, "base64");
      await fs.writeFile(sheetPath, buf);
      console.log(`✅  ${sheet.nom}.png (${Math.round(buf.length / 1024)} kB)`);
    }
  }

  const ids = [];
  for (const sheet of sheets) {
    console.log(`— découpe ${sheet.nom} —`);
    ids.push(...(await decouperPlanche(sheet, grille)));
  }
  console.log(`\n${ids.length} illustration(s) écrites dans public/cartes/`);
  if (!seuleSheet) {
    console.log("\nÀ coller dans PIECES_AVEC_IMAGE (src/lib/pieceImages.ts) :");
    console.log(ids.sort().map((id) => `  "${id}",`).join("\n"));
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
