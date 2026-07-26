#!/usr/bin/env node
/**
 * Génère les profils de véhicules (boutons de concession) via Gemini Image API.
 *
 * Usage :
 *   npm run gen:camions                       # les 3
 *   npm run gen:camions -- --force            # regénère même les présents
 *   npm run gen:camions -- rogers-profil      # un seul
 *   npm run gen:camions -- --model=pro        # Nano Banana Pro
 *
 * Écrit directement `public/coffre/{id}.webp` : `generate-webp.mjs` ne couvre
 * pas ce dossier, et un PNG résiduel dans `public/` partirait dans le bundle.
 *
 * Chaque entrée porte `reference: "<id>"` — le script charge
 * `public/coffre/<id>.webp` (la vue arrière déjà en place) et l'envoie comme
 * image de référence, pour que le profil soit LE MÊME véhicule sous un autre
 * angle et non une voiture cousine.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "coffre");
const CONFIG_PATH = path.join(__dirname, "camions-profil-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const WEBP_QUALITY = 82;

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
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
await loadDotEnv();

// Style des assets de véhicules déjà en place (rogers/break/utilitaire) —
// volontairement différent du brief Art Déco du QG.
//
// Gemini n'encode pas de canal alpha : lui demander un fond transparent le
// pousse à peindre un damier de transparence en pixels opaques. On génère
// donc sur un aplat magenta pur, retiré ensuite par chroma-key (voir
// `detourerMagenta` plus bas) — aucune carrosserie d'époque, chrome ou pneu
// ne s'approche de ce magenta, une tolérance généreuse ne mord pas le sujet.
//
// Constat en pratique : le modèle refuse le verre (vitres) rendu plat et
// glisse une réflexion rose/magenta dedans, malgré l'interdiction explicite.
// D'où l'insistance ci-dessous sur les vitres et l'ombre portée.
const STYLE_BRIEF = [
  "Clean vector-style illustration of a single vehicle, in the style of a game asset sheet.",
  "Thin dark ink outlines, flat colour fills with soft cel shading, muted and slightly desaturated palette.",
  "Solid uniform pure magenta background (#FF00FF), filling the entire frame edge to edge. The background must be a single flat colour with no gradient, no texture, no checkerboard, no shadow, no vignette. The vehicle must not contain any magenta or pink tones anywhere, INCLUDING inside the windows.",
  "Windows and windscreen must be rendered as plain flat tinted grey-blue glass, at most one subtle light-grey highlight streak — absolutely no magenta or pink reflection, tint or colour bleed inside the glass.",
  "No ground shadow, no contact shadow, no shadow ellipse beneath the vehicle, no scenery, no text, no captions, no watermark. The vehicle floats on the flat magenta background with no shadow of any kind.",
].join(" ");

const REFERENCE_INTRO =
  "Reference image (first image, attached): the SAME vehicle, seen from the rear. Match its exact body colour, trim colour, wheel design, era, proportions, line weight and rendering style. Output the same vehicle seen in strict side profile, isolated on a solid uniform pure magenta background (#FF00FF) — do NOT redraw the rear view.";

// Tolérance du chroma-key (somme des écarts absolus R+G+B, comme dans
// `chromaKey()` de generate-qg-images.mjs). Le modèle ne restitue jamais
// l'exact #FF00FF demandé (dérive de rendu vers une teinte fuchsia
// légèrement différente à chaque génération) : voir `detourerMagenta`, qui
// mesure la couleur réellement peinte plutôt que de comparer à cette valeur
// nominale.
const CHROMA_TOLERANCE = 120;

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const verbose = args.includes("--verbose");

function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const modelKey = flagValue("model", "flash");
const model = MODEL_IDS[modelKey];
if (!model) {
  console.error(`❌ --model="${modelKey}" inconnu. Valeurs : pro | flash`);
  process.exit(1);
}
// Une voiture de profil est un format allongé : 3:2 évite de la tasser.
const aspectRatio = flagValue("aspect", "3:2");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

/** Charge une référence webp depuis `public/coffre/`. */
async function loadReferenceImage(refId) {
  const refPath = path.join(OUTPUT_DIR, `${refId}.webp`);
  try {
    const buf = await fs.readFile(refPath);
    return { mimeType: "image/webp", data: buf.toString("base64") };
  } catch (err) {
    throw new Error(
      `référence "${refId}.webp" introuvable dans ${OUTPUT_DIR}. Cause: ${err.message ?? err}`,
    );
  }
}

/**
 * Chroma-key en mémoire : détoure le fond magenta d'un buffer d'image et
 * recadre aux bornes du sujet, sans jamais écrire de PNG sur disque (le
 * brief interdit tout PNG résiduel dans `public/`).
 *
 * Porté depuis `chromaKey()` de generate-qg-images.mjs (même métrique de
 * distance R+G+B), qui opère sur un fichier PNG ; ici on reste en buffer
 * du début à la fin.
 *
 * Le modèle ne restitue jamais l'exact #FF00FF demandé au prompt (dérive
 * vers une teinte fuchsia légèrement différente à chaque génération), mais
 * peint bien un aplat rigoureusement uniforme comme demandé. On mesure donc
 * la couleur réellement peinte aux 4 coins de l'image (zone de marge
 * garantie par le prompt) et on chroma-key sur cette cible mesurée plutôt
 * que sur la valeur nominale — comparer à #FF00FF littéral ne détourait
 * aucun pixel en pratique.
 *
 * @param {Buffer} buffer image brute reçue de Gemini
 * @param {number} tolerance somme des écarts absolus R+G+B tolérée
 * @returns {Promise<{ webp: Buffer, pxKeyed: number }>}
 */
async function detourerMagenta(buffer, tolerance = 60) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Couleur de fond mesurée aux 4 coins (à 2 px du bord, hors ligne de
  // détourage), moyennée pour lisser le bruit de compression.
  const inset = 2;
  const coins = [
    [inset, inset],
    [width - 1 - inset, inset],
    [inset, height - 1 - inset],
    [width - 1 - inset, height - 1 - inset],
  ];
  let sr = 0, sg = 0, sb = 0;
  for (const [x, y] of coins) {
    const i = (y * width + x) * 4;
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
  }
  const tr = sr / coins.length;
  const tg = sg / coins.length;
  const tb = sb / coins.length;

  let pxKeyed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb);
    if (dist <= tolerance) {
      data[i + 3] = 0; // alpha → 0
      pxKeyed++;
    }
  }

  // Dé-spill : constaté à l'usage sur les vitres (surfaces réfléchissantes),
  // qui attrapent une pointe de magenta réfléchi du fond — le classique
  // « spill » de chroma-key. Pour tout pixel resté opaque où le rouge ET le
  // bleu dépassent le vert (signature d'une teinte magenta/rose), on retire
  // proportionnellement l'essentiel de cet excès plutôt que de clipper net,
  // pour une transition douce vers un gris neutre.
  const DESPILL_SUPPRESSION = 0.85; // fraction de l'excès retirée
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // déjà transparent, rien à corriger
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > g && b > g) {
      data[i] = Math.round(r - (r - g) * DESPILL_SUPPRESSION);
      data[i + 2] = Math.round(b - (b - g) * DESPILL_SUPPRESSION);
    }
  }

  const webp = await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .trim() // recadre aux bornes du sujet (le bouton fait ~50 px de côté)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { webp, pxKeyed };
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun profil à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} profil(s) à traiter\n`);

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const filename = `${item.id}.webp`;
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${filename} déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // pas encore généré
      }
    }

    const promptText = `${STYLE_BRIEF}\n\nSubject: ${item.description}`;

    let contents;
    try {
      const parts = [
        { text: REFERENCE_INTRO },
        { inlineData: await loadReferenceImage(item.reference) },
        { text: promptText },
      ];
      contents = [{ role: "user", parts }];
      console.log(
        `🎨  ${item.id} — génération en cours (${model}, ${aspectRatio}, ref: ${item.reference})…`,
      );
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
      continue;
    }

    if (verbose) console.log(`  prompt → ${promptText}`);

    const requestConfig =
      modelKey === "pro"
        ? { model, contents, config: { imageConfig: { aspectRatio, imageSize } } }
        : { model, contents };

    try {
      const response = await ai.models.generateContent(requestConfig);
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let saved = false;
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buf = Buffer.from(part.inlineData.data, "base64");
          const { webp, pxKeyed } = await detourerMagenta(
            buf,
            CHROMA_TOLERANCE,
          );
          await fs.writeFile(outPath, webp);
          const { size } = await fs.stat(outPath);
          console.log(
            `✅  ${filename} (${Math.round(size / 1024)} kB, ${pxKeyed} px détourés)`,
          );
          saved = true;
          ok++;
          break;
        } else if (part.text && verbose) {
          console.log(`💬  modèle : ${part.text.slice(0, 240)}`);
        }
      }
      if (!saved) {
        console.error(`❌  ${item.id} : pas d'image dans la réponse`);
        failed++;
      }
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(`\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
