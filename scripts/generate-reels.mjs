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

import { chargerCatalogue } from "./reels/catalogue.mjs";
import { parserArgs } from "./reels/cli.mjs";
import { CHEMINS } from "./reels/config.mjs";
import { coutEpisode, formaterDollars } from "./reels/couts.mjs";
import { resoudreEpisode } from "./reels/episode.mjs";
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

async function chargerContexte() {
  const contenu = JSON.parse(await fsp.readFile(CHEMINS.contenu, "utf8"));
  const catalogue = chargerCatalogue(await fsp.readFile(CHEMINS.catalogue, "utf8"));
  const personasBruts = JSON.parse(await fsp.readFile(CHEMINS.personas, "utf8"));
  const personas = new Map(personasBruts.map((p) => [p.id, p.desc]));
  return { contenu, catalogue, personas };
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

async function main() {
  const args = parserArgs(process.argv.slice(2));
  await chargerDotEnv();

  // L'étape master régénère l'image de référence commune à la série : elle
  // ne concerne aucun épisode. On ne résout le catalogue et les épisodes
  // que pour les étapes qui en dépendent réellement (frame/video/montage).
  const etapesEpisode = args.etapes.filter((e) => e !== "master");

  if (etapesEpisode.length > 0) {
    const { contenu, catalogue, personas } = await chargerContexte();

    const bruts = episodesDemandes(contenu, args.ids);
    const episodes = bruts.map((brut) =>
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

  console.error(
    "Seul --dry-run est disponible pour l'instant (étapes master/frame/video/montage à venir).",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`❌ ${err.message ?? err}`);
  process.exit(1);
});
