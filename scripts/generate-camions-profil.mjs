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

// Tolérance de cohérence entre les 4 coins échantillonnés, mesurée avec la
// même distance R+G+B que le chroma-key. Sur un fond magenta correctement
// peint, les 4 coins sont quasi identiques (bruit de compression seul).
// Volontairement plus large que CHROMA_TOLERANCE (120) car son rôle n'est
// pas de séparer fond et sujet mais de détecter un fond qui n'est PAS
// uniforme (dégradé, ombre portée, bordure "sticker", ou un coin qui mord
// sur le sujet) — un défaut déjà observé sur une génération précédente de
// cette même série (fond noir + bordure blanche sur un des trois véhicules).
const CORNER_CONSISTENCY_TOLERANCE = 150;

// Fourchette plausible de la proportion de pixels rendus transparents par le
// chroma-key, mesurée sur le webp final (après rognage). Bornes calées sur
// les mesures réelles des trois assets de cette série (24 %, 37 %, 39 %),
// avec une marge confortable de part et d'autre pour absorber la variation
// normale de silhouette (fourgon plus trapu qu'une berline, cadrage plus ou
// moins serré) sans laisser passer les deux dérives redoutées : « presque
// rien retiré » (fond mal keyé) ou « presque tout retiré » (sujet effacé
// avec le fond).
const MIN_TRANSPARENT_RATIO = 0.12;
const MAX_TRANSPARENT_RATIO = 0.6;

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
 * Deux garde-fous font échouer bruyamment cette fonction plutôt que de
 * laisser passer un détourage silencieusement raté : la cohérence des 4
 * coins échantillonnés, et la plausibilité de la proportion détourée. Un
 * webp valide mais mutilé (sujet amputé, fond resté opaque) est pire qu'une
 * erreur explicite — voir le constat qui motive ces gardes en tête de
 * fichier / rapport de tâche.
 *
 * @param {Buffer} buffer image brute reçue de Gemini
 * @param {number} tolerance somme des écarts absolus R+G+B tolérée pour le chroma-key
 * @param {string} id identifiant de l'asset, pour nommer l'erreur le cas échéant
 * @returns {Promise<{ webp: Buffer, pxKeyed: number }>}
 */
async function detourerMagenta(buffer, tolerance, id) {
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
  const echantillons = coins.map(([x, y]) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });

  // Garde 1 — cohérence des coins : un fond uniforme donne 4 échantillons
  // quasi identiques. Un écart important signifie que la prémisse (fond
  // uniforme dans les coins) est fausse — inutile de continuer.
  let ecartMax = 0;
  for (let a = 0; a < echantillons.length; a++) {
    for (let b = a + 1; b < echantillons.length; b++) {
      const [r1, g1, b1] = echantillons[a];
      const [r2, g2, b2] = echantillons[b];
      const dist = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (dist > ecartMax) ecartMax = dist;
    }
  }
  if (ecartMax > CORNER_CONSISTENCY_TOLERANCE) {
    throw new Error(
      `"${id}" : coins incohérents (écart max ${ecartMax} > ${CORNER_CONSISTENCY_TOLERANCE}) — ` +
        `couleurs mesurées : ${echantillons.map((c) => `(${c.join(",")})`).join(", ")}. ` +
        `Le fond n'est probablement pas uniforme (ombre, dégradé, bordure, ou sujet débordant dans un coin).`,
    );
  }

  const tr = echantillons.reduce((s, c) => s + c[0], 0) / echantillons.length;
  const tg = echantillons.reduce((s, c) => s + c[1], 0) / echantillons.length;
  const tb = echantillons.reduce((s, c) => s + c[2], 0) / echantillons.length;

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
  // « spill » de chroma-key. Restreint aux pixels à la fois teintés
  // rose/magenta (rouge ET bleu au-dessus du vert) ET raisonnablement
  // proches de la couleur de fond mesurée : sans cette seconde condition, la
  // même formule désaturerait n'importe quelle carrosserie bordeaux ou tout
  // reflet rosé légitime, qui n'ont rien à voir avec une contamination de
  // fond. Le seuil ci-dessous est délibérément plus large que la tolérance
  // du chroma-key (le spill est un mélange optique dilué, donc plus loin de
  // la cible que les pixels déjà détourés) mais reste borné : une carrosserie
  // franchement colorée (bordeaux, etc.) est mesurée à plusieurs centaines
  // d'écart du magenta de fond, largement au-delà de ce seuil.
  const DESPILL_SUPPRESSION = 0.85; // fraction de l'excès retirée
  const DESPILL_TOLERANCE = tolerance * 2; // ex. 240 pour un chroma-key à 120
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // déjà transparent, rien à corriger
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const distFond = Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb);
    if (r > g && b > g && distFond <= DESPILL_TOLERANCE) {
      data[i] = Math.round(r - (r - g) * DESPILL_SUPPRESSION);
      data[i + 2] = Math.round(b - (b - g) * DESPILL_SUPPRESSION);
    }
  }

  // Rognage aux bornes du sujet (le bouton fait ~50 px de côté). Fait à part
  // (buffer brut intermédiaire) plutôt que chaîné directement vers `.webp()`
  // : la garde 2 a besoin de mesurer la transparence APRÈS rognage, sur
  // l'image telle qu'elle sera réellement livrée — c'est cette mesure-là
  // (24 %, 37 %, 39 % sur les trois assets de cette série) qui a servi à
  // calibrer MIN/MAX_TRANSPARENT_RATIO, pas la proportion sur le canevas
  // brut avant rognage (qui inclut une large marge de fond sans rapport
  // avec le sujet).
  const { data: dataRognee, info: infoRognee } = await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .trim()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Garde 2 — plausibilité du détourage : un webp valide mais dont le fond
  // n'a presque pas été retiré (fond mal keyé) ou dont le sujet a presque
  // entièrement disparu avec le fond (sur-détourage) est un échec silencieux
  // qu'il faut refuser explicitement plutôt que livrer.
  let pxTransparents = 0;
  for (let i = 3; i < dataRognee.length; i += 4) {
    if (dataRognee[i] === 0) pxTransparents++;
  }
  const ratioTransparent =
    pxTransparents / (infoRognee.width * infoRognee.height);
  if (
    ratioTransparent < MIN_TRANSPARENT_RATIO ||
    ratioTransparent > MAX_TRANSPARENT_RATIO
  ) {
    throw new Error(
      `"${id}" : détourage implausible (${(ratioTransparent * 100).toFixed(1)}% de pixels transparents après rognage, ` +
        `attendu entre ${MIN_TRANSPARENT_RATIO * 100}% et ${MAX_TRANSPARENT_RATIO * 100}%).`,
    );
  }

  const webp = await sharp(dataRognee, {
    raw: { width: infoRognee.width, height: infoRognee.height, channels: 4 },
  })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { webp, pxKeyed };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
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
            item.id,
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
