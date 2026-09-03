#!/usr/bin/env node
/**
 * L'ART DES 50 CARTES — même principe que les timbres (2026-09-02, décision
 * Guillaume : « plusieurs sur 1 page puis redécoupage précis » pour limiter
 * les générations), puis refonte « vraie carte à jouer » le même soir :
 *
 *   1. GABARIT PAR CARTE, dessiné ICI en SVG : carte portrait 3:4 à coins
 *      arrondis teintée aux couleurs de rareté (`getRarityColors`), fenêtre
 *      d'art centrale TRANSPARENTE, et les CARACTÉRISTIQUES RÉELLES du duel
 *      lues dans `src/data/duel/cartesDuel.ts` (toujours synchrones avec
 *      l'équilibrage) : COÛT en hexagone laiton (haut gauche), LOGO DE
 *      FAMILLE — l'icône lucide de la catégorie, celle de `CategorieIcon` —
 *      (haut droit), ATTAQUE en pastille or à l'épée (bas gauche), PV en
 *      cœur rouge (bas droit), losanges de rareté (1/2/3) + numéro x/50 au
 *      bas. Chiffres seulement : rien de localisé n'est cuit dans le webp.
 *   2. PLANCHES 3×3 générées par Gemini en 3:4, tous les objets PERSONNIFIÉS
 *      en petits monstres mignons (même mascotte que la couverture du
 *      classeur) → scripts/carte-sheets/<nom>.png.
 *   3. DÉCOUPE (marge rognée contre la gouttière), insertion sous le gabarit
 *      de chaque carte → public/cartes/<id>.webp.
 *
 * Usage :
 *   node generate-cartes.mjs                    # tout (planches manquantes + découpe)
 *   node generate-cartes.mjs --sheet=planche1   # une planche
 *   node generate-cartes.mjs --slice-only       # re-découpe sans regénérer
 *   node generate-cartes.mjs --template-only    # 3 gabarits d'exemple (stats fictives)
 *   node generate-cartes.mjs --force            # regénère les planches existantes
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
const SHEETS_DIR = path.join(__dirname, "carte-sheets");
const CONFIG_PATH = path.join(__dirname, "carte-prompts.json");
const DUEL_PATH = path.join(PROJECT_ROOT, "src", "data", "duel", "cartesDuel.ts");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "cartes");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

/* ── Icônes lucide, extraites des SOURCES du paquet ───────────────────────
   `lucide-react` n'exporte pas ses fichiers d'icônes dans son champ
   `exports` : on lit le .mjs et on évalue le littéral `__iconNode` (tableau
   [tag, attrs] sans clés quotées — pas du JSON). */
async function chargerIcone(nom) {
  const src = await fs.readFile(
    path.join(PROJECT_ROOT, "node_modules/lucide-react/dist/esm/icons", `${nom}.mjs`),
    "utf8",
  );
  const m = src.match(/const __iconNode = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error(`icône lucide illisible : ${nom}`);
  return new Function(`return ${m[1]}`)();
}

function iconeSvg(node, cx, cy, taille, couleur, epaisseur = 2) {
  const s = taille / 24;
  const inner = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  return `<g transform="translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})" fill="none" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

/** Les logos de famille = les MÊMES icônes que `CategorieIcon` dans l'app. */
const ICONE_SERIE = {
  Musique: "disc-3",
  "Jeux & Loisirs": "dice-5",
  "Livres & Papeterie": "book-open",
  Mode: "shirt",
  Maison: "lamp",
  "Objets d'art": "palette",
  Bricolage: "wrench",
};

/* ── Gabarit d'une carte ─────────────────────────────────────────────────
   480×640 (3:4), viewBox 75×100. Fenêtre d'art 5.5..69.5 × 14..72. Le bas
   porte les stats ; le haut, le coût et le logo de famille. */
const LARGEUR = 480;
const HAUTEUR = 640;
const FEN = { x: 5.5, y: 14, w: 64, h: 58 };
const FEN_PX = {
  x: Math.round((FEN.x / 75) * LARGEUR),
  y: Math.round((FEN.y / 100) * HAUTEUR),
  w: Math.round((FEN.w / 75) * LARGEUR),
  h: Math.round((FEN.h / 100) * HAUTEUR),
};

/** Couleurs de `src/lib/rarityColors.ts` — recopiées, le script ne peut pas
 *  importer du TS. Toute divergence là-bas est à reporter ici. */
const RARETES = {
  commun: { outer: "#C9B98C", inner: "#D9C9A0", accent: "#F4ECD6", losanges: 1 },
  rare: { outer: "#8FB2D0", inner: "#A8C2D9", accent: "#DCEAF3", losanges: 2 },
  legendaire: { outer: "#D9A0A0", inner: "#E0B0B0", accent: "#F4D9D9", losanges: 3 },
};
const OR = "#b08d3c";
const ENCRE = "#3a2a14";

/** Un chiffre de stat : blanc, gras, cerné d'encre (paint-order). */
function chiffre(x, y, taille, valeur) {
  return `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${taille}" text-anchor="middle" fill="#fff" stroke="${ENCRE}" stroke-width="${taille * 0.14}" style="paint-order: stroke" >${valeur}</text>`;
}

function hexagone(cx, cy, r) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });
  return pts.join(" ");
}

function coeur(cx, cy, r) {
  return `M ${cx} ${cy + r * 0.9}
    C ${cx - r * 1.4} ${cy - r * 0.1} ${cx - r * 0.9} ${cy - r} ${cx} ${cy - r * 0.35}
    C ${cx + r * 0.9} ${cy - r} ${cx + r * 1.4} ${cy - r * 0.1} ${cx} ${cy + r * 0.9} Z`;
}

/**
 * Le SVG complet d'une carte (cadre + stats), la fenêtre d'art en trou
 * alpha. `carte` : { rarete, cout, attaque, pv, serie, numero }.
 */
function svgCarte(carte, icones) {
  const c = RARETES[carte.rarete];
  // Losanges de rareté, au centre bas entre les deux médaillons.
  const losanges = [];
  for (let i = 0; i < c.losanges; i++) {
    const x = 37.5 + (i - (c.losanges - 1) / 2) * 5.4;
    losanges.push(
      `<path d="M ${x} 84.5 l 1.7 2 l -1.7 2 l -1.7 -2 Z" fill="${c.outer}" stroke="${OR}" stroke-width="0.3"/>`,
    );
  }
  const filetOr =
    carte.rarete === "legendaire"
      ? `<rect x="2.6" y="2.6" width="69.8" height="94.8" rx="4.4" fill="none" stroke="${OR}" stroke-width="0.5"/>
         <rect x="3.6" y="3.6" width="67.8" height="92.8" rx="3.9" fill="none" stroke="${OR}" stroke-width="0.3"/>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 75 100">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.accent}"/>
      <stop offset="1" stop-color="${c.inner}"/>
    </linearGradient>
    <mask id="m">
      <rect width="75" height="100" rx="5" fill="white"/>
      <rect x="${FEN.x}" y="${FEN.y}" width="${FEN.w}" height="${FEN.h}" rx="1.6" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#m)">
    <rect width="75" height="100" rx="5" fill="url(#face)"/>
    <rect x="0.6" y="0.6" width="73.8" height="98.8" rx="4.7" fill="none" stroke="${c.outer}" stroke-width="1.4"/>
    ${filetOr}
    <rect x="${FEN.x - 0.6} " y="${FEN.y - 0.6}" width="${FEN.w + 1.2}" height="${FEN.h + 1.2}" rx="2" fill="none" stroke="${c.outer}" stroke-width="1"/>
  </g>

  <!-- COÛT (énergie du duel) : hexagone laiton, haut gauche. -->
  <polygon points="${hexagone(9.5, 8, 6.2)}" fill="${OR}" stroke="${ENCRE}" stroke-width="0.7"/>
  ${chiffre(9.5, 10.6, 7.5, carte.cout)}

  <!-- LOGO DE FAMILLE : l'icône de la catégorie, haut droit. -->
  <circle cx="65.5" cy="8" r="5.8" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.9"/>
  ${iconeSvg(icones[ICONE_SERIE[carte.serie]], 65.5, 8, 7.2, ENCRE, 2.2)}

  <!-- ATTAQUE : pastille or à l'épée, bas gauche. -->
  <circle cx="10" cy="89" r="7.2" fill="#a65b2a" stroke="${ENCRE}" stroke-width="0.7"/>
  ${iconeSvg(icones.sword, 5.9, 84.6, 4.6, "#f4ecd6", 2.6)}
  ${chiffre(10.6, 92, 8.5, carte.attaque)}

  <!-- PV : cœur rouge, bas droit. -->
  <path d="${coeur(65, 89, 7.6)}" fill="#b23a3a" stroke="${ENCRE}" stroke-width="0.7"/>
  ${chiffre(65, 92, 8.5, carte.pv)}

  ${losanges.join("\n  ")}
  <text x="37.5" y="94.5" font-family="Menlo, monospace" font-weight="700" font-size="3" text-anchor="middle" fill="${ENCRE}" opacity="0.75">${carte.numero} / 50</text>
</svg>`;
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
    // pas de .env
  }
}

/* ── Stats de duel, lues à la SOURCE ─────────────────────────────────────
   `cartesDuel.ts` est du TS : on n'importe pas, on lit — une regex par
   entrée `"carte.x": { cout: N, attaque: N, pv: N`. L'équilibrage du duel
   reste la seule source de vérité, les webp se refont en --slice-only. */
async function chargerStatsDuel() {
  const src = await fs.readFile(DUEL_PATH, "utf8");
  const stats = {};
  const re = /"(carte\.[a-z0-9_]+)":\s*\{\s*cout:\s*(\d+),\s*attaque:\s*(\d+),\s*pv:\s*(\d+)/g;
  let m;
  while ((m = re.exec(src))) {
    stats[m[1]] = { cout: +m[2], attaque: +m[3], pv: +m[4] };
  }
  return stats;
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
function promptPlanche(sheet, style) {
  const sujets = sheet.cases.map((c, i) => `${i + 1}. ${c.sujet}`).join("\n");
  return [
    "One single portrait image (3:4) containing a 3x3 grid of nine equal portrait panels separated by clean, thin, pure-white gutters (about 2% of the image width) and a pure-white outer margin of the same width.",
    style,
    "Each illustration completely fills its own panel edge to edge (full bleed), subject centered and large.",
    "No text, no letters, no numbers, no logos, no frames inside the panels — the card frame is added separately later.",
    "Row by row, left to right, the nine panels depict:",
    sujets,
  ].join("\n");
}

/* ── Découpe + composition ── */
async function composerCarte(cellBuf, carte, icones) {
  const gabarit = await sharp(Buffer.from(svgCarte(carte, icones)))
    .png()
    .toBuffer();
  const cell = await sharp(cellBuf)
    .resize(FEN_PX.w + 6, FEN_PX.h + 6, { fit: "cover" })
    .toBuffer();
  const rendu = await sharp({
    create: {
      width: LARGEUR,
      height: HAUTEUR,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: cell, left: FEN_PX.x - 3, top: FEN_PX.y - 3 },
      { input: gabarit, left: 0, top: 0 },
    ])
    .webp({ quality: 90 })
    .toBuffer();
  await fs.writeFile(path.join(OUTPUT_DIR, `${carte.id}.webp`), rendu);
  console.log(`  ✂️  ${carte.id}.webp (${Math.round(rendu.length / 1024)} kB)`);
}

async function decouperPlanche(sheet, statsDuel, icones, numeroDepart) {
  const sheetPath = path.join(SHEETS_DIR, `${sheet.nom}.png`);
  let src;
  try {
    src = await fs.readFile(sheetPath);
  } catch {
    console.error(`❌  planche absente : ${sheetPath}`);
    return 0;
  }
  const { width: W, height: H } = await sharp(src).metadata();
  const cellW = Math.floor(W / 3);
  const cellH = Math.floor(H / 3);
  const inset = Math.round(cellW * 0.05);

  let n = 0;
  for (let i = 0; i < sheet.cases.length; i++) {
    const { id, rarete, serie } = sheet.cases[i];
    if (!id) continue;
    const stats = statsDuel[id];
    if (!stats) {
      console.error(`❌  ${id} absent de cartesDuel.ts`);
      process.exitCode = 1;
      continue;
    }
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cell = await sharp(src)
      .extract({
        left: col * cellW + inset,
        top: row * cellH + inset,
        width: cellW - 2 * inset,
        height: cellH - 2 * inset,
      })
      .toBuffer();
    await composerCarte(
      cell,
      { id, rarete, serie, numero: numeroDepart + n, ...stats },
      icones,
    );
    n++;
  }
  return n;
}

/* ── Main ── */
async function main() {
  await loadDotEnv();
  await fs.mkdir(SHEETS_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const icones = {};
  for (const nom of [...new Set(Object.values(ICONE_SERIE))]) {
    icones[nom] = await chargerIcone(nom);
  }
  icones.sword = await chargerIcone("sword");

  if (templateOnly) {
    const exemples = [
      { rarete: "commun", cout: 2, attaque: 2, pv: 3, serie: "Bricolage", numero: 43 },
      { rarete: "rare", cout: 3, attaque: 2, pv: 4, serie: "Musique", numero: 6 },
      { rarete: "legendaire", cout: 5, attaque: 4, pv: 5, serie: "Maison", numero: 36 },
    ];
    for (const ex of exemples) {
      const p = path.join(__dirname, `carte-template-${ex.rarete}.png`);
      await fs.writeFile(
        p,
        await sharp(Buffer.from(svgCarte(ex, icones))).png().toBuffer(),
      );
      console.log(`🖼  gabarit ${ex.rarete} → ${path.relative(PROJECT_ROOT, p)}`);
    }
    return;
  }

  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const statsDuel = await chargerStatsDuel();
  let sheets = config.sheets;
  if (seuleSheet) {
    sheets = sheets.filter((s) => s.nom === seuleSheet);
    if (sheets.length === 0) {
      console.error(`❌  --sheet="${seuleSheet}" inconnue.`);
      process.exit(1);
    }
  }

  if (!sliceOnly) {
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
        contents: promptPlanche(sheet, config.style),
        ...(modelKey === "pro"
          ? { config: { imageConfig: { aspectRatio: "3:4", imageSize: "2K" } } }
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

  // Le numéro imprimé = l'ordre GLOBAL des pochettes (1..50) : on le fait
  // courir à travers les planches, cases vides exclues.
  const numeroDepartPar = new Map();
  let compteur = 1;
  for (const sheet of config.sheets) {
    numeroDepartPar.set(sheet.nom, compteur);
    compteur += sheet.cases.filter((c) => c.id).length;
  }

  let total = 0;
  for (const sheet of sheets) {
    console.log(`— découpe ${sheet.nom} —`);
    total += await decouperPlanche(
      sheet,
      statsDuel,
      icones,
      numeroDepartPar.get(sheet.nom),
    );
  }
  console.log(`\n${total} carte(s) écrites dans public/cartes/`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
