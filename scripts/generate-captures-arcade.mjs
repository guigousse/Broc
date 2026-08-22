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
  "The result is this game's title screen, as seen on a CRT monitor: the character",
  "large, centered or slightly off-center, with a simple background behind it that",
  "stays consistent with the setting shown in the reference image.",
  "The word PLAY appears in large pixel letters in the bottom half of the screen.",
  "The studio mark FÉFÉ GAMES appears in small pixel letters in the top half.",
  "Bold saturated 16-bit palette, chunky square pixels, thick readable shapes,",
  "strong contrast, flat pixel-art shading, no photographic texture, no gradients,",
  "no modern lighting. The image is full-bleed: the game fills the whole frame",
  "edge to edge.",
  "The only characters anywhere in the image are PLAY and FÉFÉ GAMES. Every other",
  "surface is free of letters and words — in particular, no game title is painted",
  "anywhere in the scene: the app already shows it beneath the screen, translated",
  "into the player's language.",
].join(" ");

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
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: REFERENCE_INTRO }, { inlineData: reference }, { text: BRIEF }],
        },
      ],
      config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } },
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
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
