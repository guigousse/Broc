#!/usr/bin/env -S npx tsx
/**
 * Les onze fausses captures d'écran de la borne d'arcade.
 *
 * UN SEUL BRIEF COMMUN, et c'est le point : ces onze images doivent avoir
 * l'air de tourner sur la même machine. Le brief impose la palette, la
 * taille des pixels et le cadrage ; ce qui change d'un jeu à l'autre, c'est
 * l'image de RÉFÉRENCE envoyée à Gemini — la jaquette de la cartouche
 * (`public/items/<templateId>.webp`), dont le personnage est déjà original
 * et validé. On ne décrit plus la scène en anglais : le texte est justement
 * ce qui, la première fois, faisait dériver le dessin vers un jeu réel
 * (le titre du catalogue « inspirait » une description qui redessinait un
 * personnage existant). En passant l'illustration comme référence, il n'y a
 * plus d'intermédiaire textuel par lequel la dérive peut passer.
 *
 * La liste des onze jeux est importée de `JEUX_ARCADE`, pas recopiée : les
 * deux ne peuvent plus diverger. Le fichier reste un `.mjs` mais s'exécute
 * via `tsx` (le shebang et le script npm `gen:captures-arcade` s'en
 * chargent) — c'est nécessaire pour que l'alias `@/` dont `arcade.ts` a
 * besoin (`@/lib/collection`, `@/types/game`) se résolve.
 *
 * Ces images ne portent plus AUCUN texte, ni PLAY ni FÉFÉ GAMES ni le titre
 * du jeu : ces deux mentions sont désormais posées par-dessus en HTML, dans
 * `EcranArcade.tsx` — restylables sans régénérer une image, et nettes à
 * toute résolution au lieu d'être pixelisées deux fois. Le script se réduit
 * donc à référence + prompt + resize + webp ; la seule règle de texte qui
 * reste porte sur ce que le modèle NE doit PAS peindre dans la scène,
 * formulée positivement (les négations répétées fabriquent le défaut
 * qu'elles interdisent, déjà observé sur ce projet).
 *
 * Le cadre de moniteur peint dans certaines images d'un jet précédent est
 * traité de la même façon : pas de négation du type « no bezel », qui
 * risquerait de faire dessiner un moniteur pour mieux le nier, mais une
 * description positive de ce qu'est l'image (le dessin lui-même, plein
 * cadre).
 *
 * Usage :
 *   npm run gen:captures-arcade                 # les manquantes
 *   npm run gen:captures-arcade -- --force      # toutes
 *   npm run gen:captures-arcade -- <templateId> # une seule
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JEUX_ARCADE } from "../src/lib/bazar/arcade.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, "public", "bazar", "arcade");
const REF_DIR = path.join(ROOT, "public", "items");

/** Le brief, identique pour les onze — seule la référence attachée change. */
const REFERENCE_INTRO = [
  "Reference image (attached): the label art of a fictional video-game cartridge.",
  "The character it shows is the subject of this image — redraw that same character",
  "in bold chunky square 16-bit pixels, keeping its silhouette, colors and",
  "accessories recognizably the same.",
].join(" ");

const BRIEF = [
  "The result is this game's title screen: the character large, centered or slightly",
  "off-center, with a simple background behind it that stays consistent with the",
  "setting shown in the reference image.",
  "Bold saturated 16-bit palette, chunky square pixels, thick readable shapes,",
  "strong contrast, flat pixel-art shading, no photographic texture, no gradients,",
  "no modern lighting.",
  "The scene is the picture itself, full-bleed: it fills every edge of the frame,",
  "corner to corner, as if the viewer were looking directly at the pixels themselves.",
  "Every surface in the image is free of writing: signs, banners, scrolls, screens,",
  "clothing and walls all stay purely graphic, with no letters, numbers or symbols",
  "anywhere in the scene.",
].join(" ");

/**
 * Consigne particulière attachée à UN SEUL jeu. Les dix autres n'en ont pas.
 *
 * `jx.cartouche_gachette_du_temps_rpg_16_bit` : le modèle a rendu ce jeu-là
 * sur une grille de pixels bien plus grossière que les dix autres — environ
 * 40 blocs de large contre ~160 — au point que le visage du personnage n'a
 * plus ni yeux ni bouche. Le brief commun dit « chunky square pixels » et les
 * dix autres l'entendent bien ; plutôt que de le réécrire, ce qui obligerait
 * à regénérer les dix images déjà validées, la densité est imposée ICI, pour
 * ce seul jeu.
 *
 * L'autre dérive de ce lot, `jx.jeu_solda_flute_temporelle_aventure_3d_64_bit`
 * (un Link point pour point), a été traitée À LA SOURCE et n'a donc pas de
 * consigne : c'est sa jaquette d'objet qui a été redessinée, dans
 * `item-prompts.json`. Corriger la référence vaut mieux que la contredire —
 * sans quoi la jaquette du catalogue et la capture de la borne montreraient
 * deux personnages différents pour un même jeu.
 */
const CONSIGNES_PARTICULIERES = {
  "jx.cartouche_gachette_du_temps_rpg_16_bit": [
    "Pixel density for this game: draw on a fine sprite grid, roughly 160 pixels",
    "across the frame — the density of a late 16-bit console, not of a chunky mosaic.",
    "The face reads clearly, with distinct eyes and mouth; the backpack straps, the",
    "boots, the grass blades and the swirl of the portal each resolve into their own",
    "small pixels.",
  ].join(" "),
};

async function chargerEnv() {
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
}

/** Charge la jaquette de la cartouche, envoyée en référence à Gemini. */
async function loadReferenceImage(id) {
  const refPath = path.join(REF_DIR, `${id}.webp`);
  const buf = await fs.readFile(refPath);
  return { mimeType: "image/webp", data: buf.toString("base64") };
}

/**
 * Un appel qui reste bloqué (constaté en pratique : plus d'une heure sans
 * réponse ni erreur, deux fois de suite, sur un réseau par ailleurs sain)
 * bloquerait tout le lot sans jamais échouer ni progresser. `abortSignal`
 * coupe la requête côté client après `TIMEOUT_MS` ; une tentative
 * supplémentaire suit avant d'abandonner l'image et de passer à la
 * suivante.
 */
const TIMEOUT_MS = 90_000;

async function genererAvecTimeout(parts, tentatives = 2) {
  let derniereErreur;
  for (let i = 0; i < tentatives; i++) {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), TIMEOUT_MS);
    try {
      return await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts }],
        // 4:3, pas 16:9 : le trou du CRT fait un rapport de 1,36. Une image
        // en 1,33 le couvre entièrement avec un léger débord vertical — la
        // marge demandée pour qu'il ne reste jamais de jour sur les bords,
        // quel que soit l'appareil.
        config: {
          imageConfig: { aspectRatio: "4:3", imageSize: "1K" },
          abortSignal: controleur.signal,
        },
      });
    } catch (err) {
      derniereErreur = err;
    } finally {
      clearTimeout(minuteur);
    }
  }
  throw derniereErreur;
}

await chargerEnv();
await fs.mkdir(DEST, { recursive: true });

const args = process.argv.slice(2);
const force = args.includes("--force");
const seuls = args.filter((a) => !a.startsWith("--"));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let ok = 0;
let saute = 0;
for (const id of JEUX_ARCADE) {
  if (seuls.length && !seuls.includes(id)) continue;
  const sortie = path.join(DEST, `${id}.webp`);
  if (!force) {
    try {
      await fs.access(sortie);
      saute++;
      continue;
    } catch {
      /* absent, on génère */
    }
  }
  process.stdout.write(`🎮  ${id}… `);
  try {
    const reference = await loadReferenceImage(id);
    const parts = [{ text: REFERENCE_INTRO }, { inlineData: reference }, { text: BRIEF }];
    const consigne = CONSIGNES_PARTICULIERES[id];
    if (consigne) parts.push({ text: consigne });
    const res = await genererAvecTimeout(parts);
    const responseParts = res.candidates?.[0]?.content?.parts ?? [];
    const img = responseParts.find((p) => p.inlineData?.data);
    if (!img) {
      console.log("❌ pas d'image");
      continue;
    }
    // 640 de large : la zone d'affichage fait ~362 px CSS, soit ~1090 px sur
    // un écran @3×… mais une capture pixel art se DÉGRADE à être trop fine.
    // 640 donne des pixels bien carrés une fois agrandis, ce qui est
    // exactement l'effet cherché.
    await sharp(Buffer.from(img.inlineData.data, "base64"))
      .resize({ width: 640 })
      .webp({ quality: 88 })
      .toFile(sortie);
    console.log("✅");
    ok++;
  } catch (err) {
    console.log(`❌ ${err.message ?? err}`);
  }
}
console.log(`${ok} générée(s), ${saute} déjà présente(s).`);
