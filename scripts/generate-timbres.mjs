#!/usr/bin/env node
/**
 * L'ART DES 50 TIMBRES — pipeline « 9 par image » (décision Guillaume
 * 2026-09-02, pour économiser la génération) :
 *
 *   1. GABARIT commun à tous les timbres, dessiné ICI en SVG (pas par
 *      Gemini, qui n'encode pas l'alpha) : papier crème dentelé, liseré
 *      laiton, FENÊTRE CENTRALE TRANSPARENTE où vient l'illustration.
 *   2. PLANCHES 3×3 générées par Gemini (scripts/timbre-prompts.json :
 *      5 planches thématiques de 9 + 1 planche des 5 légendaires), une
 *      seule image par planche → scripts/timbre-sheets/<nom>.png.
 *   3. DÉCOUPE de chaque planche en 9 cellules (marge intérieure rognée
 *      pour éviter la gouttière), insertion dans le gabarit, sortie
 *      public/timbres/<id>.webp (alpha conservé).
 *
 * Usage :
 *   node generate-timbres.mjs                    # tout (planches manquantes + découpe)
 *   node generate-timbres.mjs --sheet=faune      # une planche
 *   node generate-timbres.mjs --slice-only       # re-découpe sans regénérer
 *   node generate-timbres.mjs --template-only    # écrit juste le gabarit PNG
 *   node generate-timbres.mjs --force            # regénère les planches existantes
 *   node generate-timbres.mjs --model=flash      # Nano Banana éco (défaut : pro)
 *
 * Après coup : remplir PIECES_AVEC_IMAGE (src/lib/pieceImages.ts).
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SHEETS_DIR = path.join(__dirname, "timbre-sheets");
const TEMPLATE_PATH = path.join(__dirname, "timbre-template.png");
const CONFIG_PATH = path.join(__dirname, "timbre-prompts.json");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "timbres");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

/* ── Gabarit ─────────────────────────────────────────────────────────────
   512×512, viewBox 100. Dentelure : 8 demi-cercles par côté + les 4 coins,
   percés en ALPHA (masque). Fenêtre : carré 13..87 transparent, liseré
   laiton juste autour. L'illustration est composée SOUS le gabarit, en
   384 px posés à (64,64) : elle déborde de ~2,5 px sous le papier de
   chaque côté, jamais au-delà. */
const TAILLE = 512;
const FENETRE_PX = 384; // (87-13)% de 512 ≈ 379, +bleed sous le papier
const FENETRE_POS = 64; // (512-384)/2

function svgGabarit() {
  const dents = [];
  for (let i = 0; i < 8; i++) {
    const p = 6.25 + i * 12.5;
    dents.push([p, 0], [p, 100], [0, p], [100, p]);
  }
  dents.push([0, 0], [0, 100], [100, 0], [100, 100]);
  const cercles = dents
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="black"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TAILLE}" height="${TAILLE}" viewBox="0 0 100 100">
  <defs>
    <mask id="m">
      <rect width="100" height="100" fill="white"/>
      ${cercles}
      <rect x="13" y="13" width="74" height="74" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#m)">
    <rect width="100" height="100" fill="#f2e8d2"/>
    <rect x="1.2" y="1.2" width="97.6" height="97.6" fill="none" stroke="#e3d5b8" stroke-width="0.7"/>
  </g>
</svg>`;
}

async function ecrireGabarit() {
  const png = await sharp(Buffer.from(svgGabarit())).png().toBuffer();
  await fs.writeFile(TEMPLATE_PATH, png);
  console.log(`🖼  gabarit → ${path.relative(PROJECT_ROOT, TEMPLATE_PATH)}`);
  return png;
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // pas de .env : variables d'environnement existantes
  }
}

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const sliceOnly = args.includes("--slice-only");
const templateOnly = args.includes("--template-only");
function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}
const modelKey = flagValue("model", "pro");
const seuleSheet = flagValue("sheet", null);

/* ── Prompt d'une planche ── */
function promptPlanche(sheet) {
  const sujets = sheet.cases
    .map((c, i) => `${i + 1}. ${c.sujet}`)
    .join("\n");
  return [
    "One single square image containing a 3x3 grid of nine equal square panels separated by clean, thin, pure-white gutters (about 2% of the image width) and a pure-white outer margin of the same width.",
    "Each panel is a miniature vintage postage-stamp illustration: fine taille-douce engraving with delicate hatching and cross-hatching, " +
      sheet.encre +
      " ink with soft watercolor wash accents, on a pale cream paper background.",
    "Each illustration completely fills its own panel edge to edge (full bleed), subject centered and large.",
    "No text, no letters, no numbers, no denominations, no country names, no frames inside the panels, no perforations — the stamp frame is added separately later.",
    "Row by row, left to right, the nine panels depict:",
    sujets,
  ].join("\n");
}

/* ── Retouches (tags Finder de la recette 2026-09-02) ──────────────────────
   cadrage (rouge) : l'illustration ne remplissait pas sa cellule — trim des
   marges crème de la planche, rognage du filet dessiné restant, puis plein
   cadre. desaturation (bleu) : les cellules trop contrastées (culture-pop)
   sont ramenées vers la douceur des planches gravure (faune). */
const FOND_PLANCHE = { r: 245, g: 238, b: 220 };

/** Recentre le SUJET (2ᵉ passe de recette : personnages décalés sur leur
 *  lavis blanc, que le trim couleur ne voit pas). On demande à sharp la
 *  boîte d'encre (offsets de trim à seuil élevé), puis on recadre un carré
 *  centré dessus, avec une petite marge. */
async function recentrerSujet(buf, zoom = false) {
  const meta = await sharp(buf).metadata();
  const { info } = await sharp(buf)
    .trim({ threshold: 45 })
    .toBuffer({ resolveWithObject: true });
  const left = -(info.trimOffsetLeft ?? 0);
  const top = -(info.trimOffsetTop ?? 0);
  const { width: w, height: h } = info;
  if (!w || !h) return buf;
  const cx = left + w / 2;
  const cy = top + h / 2;
  // « zoom » (tag violet, 3ᵉ passe) : carré pris À L'INTÉRIEUR de la boîte
  // d'encre — les coins inesthétiques de l'illustration source sortent du
  // cadre. Sinon, carré englobant avec une petite marge.
  let side = zoom
    ? Math.round(Math.min(w, h) * 0.95)
    : Math.round(Math.max(w, h) * 1.05);
  side = Math.min(side, meta.width, meta.height);
  let x = Math.round(cx - side / 2);
  let y = Math.round(cy - side / 2);
  x = Math.max(0, Math.min(x, meta.width - side));
  y = Math.max(0, Math.min(y, meta.height - side));
  return sharp(buf)
    .extract({ left: x, top: y, width: side, height: side })
    .toBuffer();
}

/** Le trim « cadrage » : marges crème de la planche, puis le filet sombre
 *  dessiné autour de l'illustration (3 % de plus l'avalent). */
async function trimCadrage(buf) {
  buf = await sharp(buf)
    .trim({ background: FOND_PLANCHE, threshold: 35 })
    .toBuffer();
  const m = await sharp(buf).metadata();
  const ins = Math.round(Math.min(m.width, m.height) * 0.03);
  if (m.width > 4 * ins && m.height > 4 * ins) {
    buf = await sharp(buf)
      .extract({
        left: ins,
        top: ins,
        width: m.width - 2 * ins,
        height: m.height - 2 * ins,
      })
      .toBuffer();
  }
  return buf;
}

/** La couleur du thème avec sa saturation HSL poussée (bornée à 1). */
function teinteSaturee(hex, boost = 1.45) {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  s = Math.min(1, s * boost);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [canal(h + 1 / 3), canal(h), canal(h - 1 / 3)].map((c) =>
    Math.round(c * 255),
  );
}

async function retoucherCellule(cellBuf, id, retouches, teinte) {
  let buf = cellBuf;
  if (retouches.zoom?.includes(id)) {
    buf = await recentrerSujet(await trimCadrage(buf), true);
  } else if (retouches.recentrage?.includes(id)) {
    // Pourtour d'abord (sinon la fenêtre recadrée peut mordre le filet et
    // les marges, vues en bandes blanches aux coins — 2ᵉ passe de recette),
    // recentrage sur la boîte d'encre ensuite.
    buf = await recentrerSujet(await trimCadrage(buf));
  } else if (retouches.cadrage?.includes(id)) {
    buf = await trimCadrage(buf);
  }
  // MONOCHROME par catégorie (recette 2026-09-02) : duotone — luminance
  // remappée par canal, de l'encre sombre du thème (couleur × 0,45) vers le
  // blanc papier. `.tint()` de sharp était trop timide (rendu quasi gris).
  // Chaque thème a sa couleur (config `teintes`), légendaires compris
  // (couleur de LEUR thème, pas de la planche).
  if (teinte) {
    // Encre : la couleur du thème SATURÉE (+45 % — « moins fade », retour du
    // 2026-09-02) puis assombrie ; et une courbe de contraste (×1,2 autour
    // du gris moyen) repliée dans la même rampe linéaire.
    const encre = teinteSaturee(teinte).map((c) => c * 0.42);
    const papier = 252;
    const contraste = 1.2;
    const decalage = -(contraste - 1) * 128;
    // `recomb` (luminance recopiée sur les 3 canaux) plutôt que
    // `greyscale()` : ce dernier réduit à 1 bande et `linear` à 3 valeurs
    // refuse alors (« Band expansion using linear is unsupported »).
    const lum = [0.2126, 0.7152, 0.0722];
    buf = await sharp(buf)
      .recomb([lum, lum, lum])
      .linear(
        encre.map((d) => ((papier - d) / 255) * contraste),
        encre.map((d) => ((papier - d) / 255) * decalage + d),
      )
      .toBuffer();
  }
  if (retouches.desaturation?.includes(id)) {
    // Après le tint, il ne reste à adoucir que le CONTRASTE des cellules
    // culture-pop, plus dur que la gravure des autres planches.
    buf = await sharp(buf).linear(0.85, 28).toBuffer();
  }
  return buf;
}

async function composerTimbre(cellBuf, id, gabaritPng) {
  const cell = await sharp(cellBuf)
    .resize(FENETRE_PX, FENETRE_PX, { fit: "cover" })
    .toBuffer();
  const timbre = await sharp({
    create: {
      width: TAILLE,
      height: TAILLE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: cell, left: FENETRE_POS, top: FENETRE_POS },
      { input: gabaritPng, left: 0, top: 0 },
    ])
    .webp({ quality: 90 })
    .toBuffer();
  await fs.writeFile(path.join(OUTPUT_DIR, `${id}.webp`), timbre);
  console.log(`  ✂️  ${id}.webp (${Math.round(timbre.length / 1024)} kB)`);
}

/* ── Découpe + composition ── */
async function decouperPlanche(sheet, gabaritPng, retouches, teintes) {
  const sheetPath = path.join(SHEETS_DIR, `${sheet.nom}.png`);
  let img;
  try {
    img = sharp(await fs.readFile(sheetPath));
  } catch {
    console.error(`❌  planche absente : ${sheetPath}`);
    return 0;
  }
  const meta = await img.metadata();
  const { width: W, height: H } = meta;
  const cellW = Math.floor(W / 3);
  const cellH = Math.floor(H / 3);
  // Rognage intérieur : la gouttière blanche fait ~2 % de l'image entière,
  // soit ~6 % d'une cellule (3 % par bord partagé) ; 5 % par côté l'efface
  // avec de la marge sans trop manger l'illustration.
  const inset = Math.round(cellW * 0.05);

  // Un single regénéré (droits d'auteur) remplace la cellule de la planche :
  // ne pas l'écraser à la re-découpe.
  const ignores = new Set((retouches.singles ?? []).map((s) => s.id));

  let n = 0;
  for (let i = 0; i < sheet.cases.length; i++) {
    const { id, theme } = sheet.cases[i];
    if (!id || ignores.has(id)) continue;
    const col = i % 3;
    const row = Math.floor(i / 3);
    let cell = await sharp(await fs.readFile(sheetPath))
      .extract({
        left: col * cellW + inset,
        top: row * cellH + inset,
        width: cellW - 2 * inset,
        height: cellH - 2 * inset,
      })
      .toBuffer();
    cell = await retoucherCellule(
      cell,
      id,
      retouches,
      teintes?.[theme ?? sheet.nom],
    );
    await composerTimbre(cell, id, gabaritPng);
    n++;
  }
  return n;
}

/* ── Singles : une image Gemini par timbre à refaire (droits d'auteur) ── */
function promptSingle(single) {
  return [
    "One single square vintage postage-stamp illustration: fine taille-douce engraving with delicate hatching and cross-hatching, " +
      single.encre +
      " ink with soft watercolor wash accents, on a pale cream paper background.",
    "The illustration completely fills the image edge to edge (full bleed), subject centered and large.",
    "No text, no letters, no numbers, no frames, no borders, no perforations — the stamp frame is added separately later.",
    `It depicts: ${single.sujet}`,
  ].join("\n");
}

async function genererSingles(singles, ai, model, modelKey, gabaritPng, retouches, teintes) {
  const dir = path.join(SHEETS_DIR, "singles");
  await fs.mkdir(dir, { recursive: true });
  for (const single of singles) {
    const pngPath = path.join(dir, `${single.id}.png`);
    let existe = true;
    try {
      await fs.access(pngPath);
    } catch {
      existe = false;
    }
    if ((!existe || force) && ai) {
      console.log(`🎨  single ${single.id} — génération (${model})…`);
      const requestConfig = {
        model,
        contents: promptSingle(single),
        ...(modelKey === "pro"
          ? { config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } } }
          : {}),
      };
      const response = await ai.models.generateContent(requestConfig);
      const part = (response.candidates?.[0]?.content?.parts ?? []).find(
        (p) => p.inlineData?.data,
      );
      if (!part) {
        console.error(`❌  ${single.id} : pas d'image dans la réponse`);
        process.exitCode = 1;
        continue;
      }
      await fs.writeFile(pngPath, Buffer.from(part.inlineData.data, "base64"));
    }
    try {
      let cell = await fs.readFile(pngPath);
      // Même filet parasite possible qu'en planche : trim systématique.
      cell = await retoucherCellule(
        cell,
        single.id,
        { ...retouches, cadrage: [...(retouches.cadrage ?? []), single.id] },
        teintes?.[single.theme],
      );
      await composerTimbre(cell, single.id, gabaritPng);
    } catch {
      console.error(`❌  single absent : ${pngPath}`);
    }
  }
}

/* ── Main ── */
async function main() {
  await loadDotEnv();
  await fs.mkdir(SHEETS_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const gabaritPng = await ecrireGabarit();
  if (templateOnly) return;

  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const retouches = {
    ...(config.retouches ?? {}),
    singles: config.singles ?? [],
  };
  let sheets = config.sheets;
  if (seuleSheet) {
    sheets = sheets.filter((s) => s.nom === seuleSheet);
    if (sheets.length === 0 && seuleSheet !== "singles") {
      console.error(`❌  --sheet="${seuleSheet}" inconnue.`);
      process.exit(1);
    }
  }

  let ai = null;
  let model = null;
  if (!sliceOnly) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("❌  GEMINI_API_KEY absente (cf. .env).");
      process.exit(1);
    }
    model = MODEL_IDS[modelKey];
    if (!model) {
      console.error(`❌  --model="${modelKey}" inconnu (pro | flash).`);
      process.exit(1);
    }
    ai = new GoogleGenAI({ apiKey });

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
        contents: promptPlanche(sheet),
        ...(modelKey === "pro"
          ? { config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } } }
          : {}),
      };
      const response = await ai.models.generateContent(requestConfig);
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const part = parts.find((p) => p.inlineData?.data);
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

  let total = 0;
  for (const sheet of sheets) {
    console.log(`— découpe ${sheet.nom} —`);
    total += await decouperPlanche(sheet, gabaritPng, retouches, config.teintes);
  }

  if (!seuleSheet || seuleSheet === "singles") {
    console.log("— singles —");
    await genererSingles(
      retouches.singles,
      ai,
      model,
      modelKey,
      gabaritPng,
      retouches,
      config.teintes,
    );
    total += retouches.singles.length;
  }
  console.log(`\n${total} timbre(s) écrits dans public/timbres/`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
