#!/usr/bin/env node
/**
 * Les onze fausses captures d'écran de la borne d'arcade.
 *
 * UN SEUL BRIEF COMMUN, et c'est le point : ces onze images doivent avoir
 * l'air de tourner sur la même machine. Le brief impose la palette, la taille
 * des pixels et le cadrage ; seule la SCÈNE change d'un jeu à l'autre.
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, "public", "bazar", "arcade");

/** Le style, identique pour les onze. */
const BRIEF = [
  "A fake screenshot of a fictional 16-bit arcade video game, as seen on a CRT monitor.",
  "Bold saturated 16-bit palette, chunky square pixels, thick readable sprites, strong contrast.",
  "The scene reads instantly at a glance: a clear foreground character or object, a simple",
  "background, a ground line. Flat pixel-art shading, no photographic texture, no gradients,",
  "no modern lighting. A thin HUD strip of pixel digits along the top edge.",
  "The image is full-bleed: the game fills the whole frame edge to edge.",
].join(" ");

/** La scène propre à chaque jeu. Le titre du catalogue en dicte le sujet. */
const SCENES = {
  "jx.cartouche_bluebot_8_bit":
    "A small round blue robot with antenna and glowing eyes running along a metal factory walkway, pipes and conveyor belts behind it.",
  "jx.cartouche_la_legende_de_solda_8_bit":
    "A tiny green-clad hero with a sword and round shield standing at the entrance of a stone dungeon, torches on the walls, a treasure chest ahead.",
  "jx.cartouche_le_plombier_sauteur_8_bit":
    "A stocky moustachioed workman in blue overalls and a red cap jumping between floating brick blocks over a bright blue sky, a coin spinning above him.",
  "jx.cartouche_turbo_herisson_16_bit":
    "A fast blue spiky creature curled into a ball speeding through a green loop-the-loop track, palm trees and checkered ground rushing past.",
  "jx.cartouche_street_castagne_ii_16_bit":
    "Two pixel fighters facing off in a street arena, one throwing a punch, health bars along the top, a crowd of onlookers in the background.",
  "jx.cartouche_gachette_du_temps_rpg_16_bit":
    "A turn-based role-playing battle screen: three heroes on the right facing a large horned monster on the left, a command menu box at the bottom.",
  "jx.jeu_le_manoir_du_mal_32_bit":
    "A dark haunted mansion corridor with cracked portraits and a candelabra, a lone silhouetted figure with a flashlight beam, a full moon through a window.",
  "jx.jeu_foxy_crush_32_bit":
    "A colourful puzzle grid of shiny gems and fruit, a cartoon fox mascot cheering in the corner, sparkles where three gems align.",
  "jx.jeu_engrenage_de_metal_infiltration_32_bit":
    "A top-down stealth screen: a soldier crouching behind a crate inside a military base, a guard's vision cone sweeping the floor, radar box in the corner.",
  "jx.jeu_solda_flute_temporelle_aventure_3d_64_bit":
    "An early-3D-looking pixel rendition of a green-clad hero on a wide grassy field at sunset, a distant castle, a floating fairy of light beside him.",
  "jx.jeu_d_aventure_japonais_128_bit":
    "A spiky-haired hero with an oversized sword standing before a neon-lit futuristic city street at night, rain, a dialogue box at the bottom.",
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

await chargerEnv();
await fs.mkdir(DEST, { recursive: true });

const args = process.argv.slice(2);
const force = args.includes("--force");
const seuls = args.filter((a) => !a.startsWith("--"));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let ok = 0;
let saute = 0;
for (const [id, scene] of Object.entries(SCENES)) {
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
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: `${BRIEF}\n\nThe game: ${scene}`,
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
