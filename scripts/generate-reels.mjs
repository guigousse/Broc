#!/usr/bin/env node
/**
 * Pipeline de production des Reels / TikTok marketing.
 *
 * Voir docs/superpowers/specs/2026-07-27-pipeline-reels-marketing-design.md
 *
 * Usage :
 *   npm run gen:reels -- --dry-run ep01-aquarelle
 *   npm run gen:reels -- --master
 *   npm run gen:reels -- --frame ep01-aquarelle
 *   npm run gen:reels -- --video ep01-aquarelle --model=fast --hd
 *   npm run gen:reels -- --montage ep01-aquarelle
 *   npm run gen:reels -- ep01-aquarelle          # les trois étapes
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";

import { chargerCatalogue } from "./reels/catalogue.mjs";
import { parserArgs } from "./reels/cli.mjs";
import { CHEMINS, MODELES } from "./reels/config.mjs";
import { coutEpisode, formaterDollars } from "./reels/couts.mjs";
import { resoudreEpisode } from "./reels/episode.mjs";
import { genererImage, partsAvecImages } from "./reels/images.mjs";
import { promptEtal, promptPlan1, promptPlan2 } from "./reels/prompts.mjs";

async function chargerDotEnv() {
  try {
    const contenu = await fsp.readFile(CHEMINS.env, "utf8");
    for (const brut of contenu.split("\n")) {
      const ligne = brut.trim();
      if (!ligne || ligne.startsWith("#")) continue;
      const eq = ligne.indexOf("=");
      if (eq < 0) continue;
      const cle = ligne.slice(0, eq).trim();
      let val = ligne.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(cle in process.env)) process.env[cle] = val;
    }
  } catch {
    // pas de .env : la clé viendra de l'environnement, ou l'étape réseau échouera.
  }
}

// Le contenu (décor/caméra/ambiance/épisodes bruts) est nécessaire à toutes
// les étapes, y compris --master. Le catalogue et la résolution d'épisode,
// eux, ne servent qu'aux étapes qui portent sur un épisode précis : on les
// charge séparément, uniquement quand ils sont réellement utiles (voir
// `etapesEpisode` dans `main`).
async function chargerContenu() {
  return JSON.parse(await fsp.readFile(CHEMINS.contenu, "utf8"));
}

async function chargerCatalogueEtPersonas() {
  const catalogue = chargerCatalogue(await fsp.readFile(CHEMINS.catalogue, "utf8"));
  const personasBruts = JSON.parse(await fsp.readFile(CHEMINS.personas, "utf8"));
  const personas = new Map(personasBruts.map((p) => [p.id, p.desc]));
  return { catalogue, personas };
}

function episodesDemandes(contenu, ids) {
  if (!ids.length) return contenu.episodes;
  const parId = new Map(contenu.episodes.map((e) => [e.id, e]));
  return ids.map((id) => {
    const e = parId.get(id);
    if (!e) throw new Error(`épisode « ${id} » introuvable dans ${CHEMINS.contenu}`);
    return e;
  });
}

function afficherDryRun(episode, contenu, args) {
  const blocs = { decor: contenu.decor, camera: contenu.camera, ambiance: contenu.ambiance };
  console.log(`\n════ ${episode.id} ════`);
  console.log(`\n— objets —`);
  for (const item of episode.items) {
    console.log(`  ${item.id.padEnd(38)} ${item.nom} (cote ${item.prixTresBon} €)`);
    console.log(`    ↳ ${item.fichier}`);
  }
  console.log(`\n— chute — ${episode.chute}`);
  console.log(`\n— prompt étal —\n${promptEtal(episode, blocs)}`);
  console.log(`\n— prompt plan 1 —\n${promptPlan1(episode, blocs)}`);
  console.log(`\n— prompt plan 2 —\n${promptPlan2(episode, blocs)}`);
  const cout = coutEpisode({ palier: args.palier, definition: args.definition });
  console.log(
    `\n— coût vidéo estimé — 2 plans en ${args.palier} ${args.definition} : ${formaterDollars(cout)}`,
  );
}

const INTRO_MASTER = [
  "Create the reference frame of a recurring illustrated scene.",
  "No objects on the table yet: leave the table top nearly bare, with only the cloth and the cash tin.",
].join(" ");

const INTRO_ETAL = [
  "Reference image (first image attached): the master scene to MATCH exactly.",
  "Keep the same camera, the same framing, the same horizon, the same table position, the same street background, the same illustration style and palette.",
  "Only the objects laid out on the table may change.",
  "The following attached images are the objects to place on the table.",
].join(" ");

async function lireImage(chemin) {
  const buf = await fsp.readFile(chemin);
  const mimeType = chemin.endsWith(".webp") ? "image/webp" : "image/png";
  return { mimeType, data: buf.toString("base64") };
}

async function etapeMaster(contenu, args, ai) {
  await fsp.mkdir(CHEMINS.masters, { recursive: true });
  const sortie = path.join(CHEMINS.masters, "_master-etal.png");
  if (!args.force && fs.existsSync(sortie)) {
    console.log(`⏭️  _master-etal.png déjà présent (--force pour regénérer)`);
    return;
  }
  console.log(`🎨  master — génération…`);
  const buf = await genererImage({
    ai,
    model: MODELES.image.pro,
    contents: `${INTRO_MASTER}\n\n${contenu.decor}`,
  });
  await fsp.writeFile(sortie, buf);
  console.log(`✅  ${sortie} (${Math.round(buf.length / 1024)} kB)`);
}

async function etapeFrame(episode, contenu, args, ai) {
  await fsp.mkdir(CHEMINS.masters, { recursive: true });
  const master = path.join(CHEMINS.masters, "_master-etal.png");
  if (!fs.existsSync(master)) {
    throw new Error(`image de référence absente : lance d'abord « npm run gen:reels -- --master »`);
  }
  const sortie = path.join(CHEMINS.masters, `${episode.id}-etal.png`);
  if (!args.force && fs.existsSync(sortie)) {
    console.log(`⏭️  ${episode.id}-etal.png déjà présent (--force pour regénérer)`);
    return;
  }

  const images = [await lireImage(master)];
  for (const item of episode.items) images.push(await lireImage(item.fichier));

  const blocs = { decor: contenu.decor, camera: contenu.camera, ambiance: contenu.ambiance };
  const contents = partsAvecImages({
    texteIntro: INTRO_ETAL,
    images,
    prompt: promptEtal(episode, blocs),
  });

  console.log(`🎨  ${episode.id} — composition de l'étal (${episode.items.length} objets)…`);
  const buf = await genererImage({ ai, model: MODELES.image.pro, contents });
  await fsp.writeFile(sortie, buf);
  console.log(`✅  ${sortie} (${Math.round(buf.length / 1024)} kB)`);
}

function clientGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY absente. Voir .env");
    process.exit(1);
  }
  return new GoogleGenAI({ apiKey });
}

async function main() {
  const args = parserArgs(process.argv.slice(2));
  await chargerDotEnv();

  const contenu = await chargerContenu();

  // L'étape master régénère l'image de référence commune à la série : elle
  // ne concerne aucun épisode. On ne résout le catalogue et les épisodes
  // que pour les étapes qui en dépendent réellement (frame/video/montage).
  const etapesEpisode = args.etapes.filter((e) => e !== "master");

  let episodes = [];
  if (etapesEpisode.length > 0) {
    const { catalogue, personas } = await chargerCatalogueEtPersonas();

    const bruts = episodesDemandes(contenu, args.ids);
    episodes = bruts.map((brut) =>
      resoudreEpisode(brut, {
        catalogue,
        personas,
        fichierExiste: (chemin) => fs.existsSync(chemin),
      }),
    );

    if (args.dryRun) {
      for (const episode of episodes) afficherDryRun(episode, contenu, args);
      return;
    }
  }

  const ai = clientGemini();

  if (args.etapes.includes("master")) {
    await etapeMaster(contenu, args, ai);
    return;
  }

  for (const episode of episodes) {
    if (args.etapes.includes("frame")) await etapeFrame(episode, contenu, args, ai);
  }

  const restantes = args.etapes.filter((e) => e !== "frame");
  if (restantes.length) {
    console.error(`Étapes non encore disponibles : ${restantes.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message ?? err}`);
  process.exit(1);
});
