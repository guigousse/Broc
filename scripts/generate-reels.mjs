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
import readline from "node:readline/promises";

import { GoogleGenAI } from "@google/genai";

import { chargerCatalogue } from "./reels/catalogue.mjs";
import { parserArgs } from "./reels/cli.mjs";
import { CHEMINS, DUREES, MODELES } from "./reels/config.mjs";
import { coutClip, coutEpisode, coutImage, formaterDollars } from "./reels/couts.mjs";
import { resoudreEpisode } from "./reels/episode.mjs";
import { commandeDerniereFrame, executer, verifierFfmpeg } from "./reels/ffmpeg.mjs";
import {
  EXTENSIONS_REFERENCE,
  genererImage,
  partsAvecImages,
  trouverImageReference,
} from "./reels/images.mjs";
import { promptEtal, promptPlan1, promptPlan2 } from "./reels/prompts.mjs";
import {
  extraireSourceRaccord,
  genererVideo,
  nomJournalRaccord,
  nomPrise,
  reserverPrise,
} from "./reels/video.mjs";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

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

// `etapeMaster` écrit toujours ici, en PNG.
function cheminMaster() {
  return path.join(CHEMINS.masters, "_master-etal.png");
}

function cheminFrame(episodeId) {
  return path.join(CHEMINS.masters, `${episodeId}-etal.png`);
}

/**
 * Recherche l'image de référence déjà présente, quelle que soit son
 * extension (PNG produit par le pipeline, ou JPEG/JPG/WEBP si le
 * propriétaire l'a retouchée et réexportée à la main — Aperçu, par
 * exemple, exporte en JPEG). Rend `{ chemin, mimeType }` du premier
 * candidat trouvé, ou `undefined` si aucun n'existe.
 */
function trouverMaster() {
  let noms;
  try {
    noms = fs.readdirSync(CHEMINS.masters);
  } catch {
    noms = [];
  }
  const trouve = trouverImageReference("_master-etal", noms);
  if (!trouve) return undefined;
  return { chemin: path.join(CHEMINS.masters, trouve.nom), mimeType: trouve.mimeType };
}

/**
 * Même tolérance d'extension que `trouverMaster`, appliquée à l'étal d'un
 * épisode précis : lui aussi peut avoir été retouché à la main par le
 * propriétaire (recadrage, export JPEG depuis Aperçu) après génération.
 */
function trouverEtal(episodeId) {
  let noms;
  try {
    noms = fs.readdirSync(CHEMINS.masters);
  } catch {
    noms = [];
  }
  const trouve = trouverImageReference(`${episodeId}-etal`, noms);
  if (!trouve) return undefined;
  return { chemin: path.join(CHEMINS.masters, trouve.nom), mimeType: trouve.mimeType };
}

/** L'image de raccord, elle, est toujours écrite par notre propre appel
 *  ffmpeg (voir `etapeVideo`) : son extension ne varie jamais. */
function cheminRaccord(episodeId) {
  return path.join(CHEMINS.masters, `${episodeId}-raccord.png`);
}

/** Journal de filiation du raccord : de quelle prise du plan 1 il provient.
 *  `<id>-raccord.png` est un chemin fixe, écrasé à chaque régénération du
 *  plan 1 — sans ce journal à côté, deux prises de plan 2 issues de deux
 *  prises différentes du plan 1 seraient indiscernables au montage. */
function cheminRaccordJournal(episodeId) {
  return path.join(CHEMINS.masters, nomJournalRaccord(episodeId));
}

/** Lit et valide la filiation du raccord (voir `cheminRaccordJournal`) ;
 *  jette un message actionnable si elle est absente ou corrompue plutôt que
 *  de laisser le plan 2 partir avec une provenance inconnue. */
async function lireSourceRaccord(episodeId) {
  const chemin = cheminRaccordJournal(episodeId);
  try {
    const brut = JSON.parse(await fsp.readFile(chemin, "utf8"));
    return extraireSourceRaccord(brut);
  } catch {
    throw new Error(
      `filiation du raccord introuvable ou invalide (${path.basename(chemin)}) : régénère le plan 1 (« --video ${episodeId} --plan=1 »)`,
    );
  }
}

function mimeTypeDepuisExtension(chemin) {
  const extension = path.extname(chemin).slice(1).toLowerCase();
  const connue = EXTENSIONS_REFERENCE.find((e) => e.extension === extension);
  return connue?.mimeType ?? "image/png";
}

/** Aperçu de --master : montre le prompt et le coût, sans jamais construire
 *  de client Gemini ni écrire de fichier. */
function afficherDryRunMaster(contenu) {
  console.log(`\n════ master ════`);
  console.log(`\n— prompt —\n${INTRO_MASTER}\n\n${contenu.decor}`);
  console.log(
    `\n— coût image estimé — ${MODELES.image.pro} : ${formaterDollars(coutImage("pro"))}`,
  );
}

async function lireImage(chemin) {
  const buf = await fsp.readFile(chemin);
  return { mimeType: mimeTypeDepuisExtension(chemin), data: buf.toString("base64") };
}

async function etapeMaster(contenu, args, ai) {
  await fsp.mkdir(CHEMINS.masters, { recursive: true });
  const sortie = cheminMaster();
  const existant = trouverMaster();
  if (!args.force && existant) {
    console.log(`⏭️  ${path.basename(existant.chemin)} déjà présent (--force pour regénérer)`);
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
  const master = trouverMaster();
  if (!master) {
    throw new Error(`image de référence absente : lance d'abord « npm run gen:reels -- --master »`);
  }
  const sortie = cheminFrame(episode.id);
  if (!args.force && fs.existsSync(sortie)) {
    console.log(`⏭️  ${episode.id}-etal.png déjà présent (--force pour regénérer)`);
    return;
  }

  const images = [await lireImage(master.chemin)];
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

async function imageDepart({ chemin, mimeType }) {
  const buf = await fsp.readFile(chemin);
  return { imageBytes: buf.toString("base64"), mimeType };
}

/**
 * Tente de réserver atomiquement le take `n` du plan en créant son journal
 * `.json` avec le drapeau d'exclusion `wx` : la création échoue (`EEXIST`)
 * si une autre exécution a déjà pris ce numéro, ce qui est exactement le
 * signal dont `reserverPrise` a besoin pour passer au suivant plutôt que
 * d'écraser une prise déjà payée par cette exécution concurrente.
 */
async function tryReserverPrise({ episode, plan, n, journalBase }) {
  const cheminJournal = path.join(CHEMINS.sorties, nomPrise(episode.id, plan, n)).replace(
    /\.mp4$/,
    ".json",
  );
  try {
    await fsp.writeFile(
      cheminJournal,
      JSON.stringify(
        { ...journalBase, take: n, statut: "réservé — génération en cours", date: new Date().toISOString() },
        null,
        2,
      ),
      { flag: "wx" },
    );
    return true;
  } catch (err) {
    if (err.code === "EEXIST") return false;
    throw err;
  }
}

async function genererPlan({ episode, contenu, args, ai, plan, image, raccordSource }) {
  await fsp.mkdir(CHEMINS.sorties, { recursive: true });
  const blocs = { decor: contenu.decor, camera: contenu.camera, ambiance: contenu.ambiance };
  const prompt = plan === 1 ? promptPlan1(episode, blocs) : promptPlan2(episode, blocs);
  const model = MODELES.video[args.palier];
  if (!model) throw new Error(`palier « ${args.palier} » inconnu : lite, fast ou pro`);

  const journalBase = {
    episode: episode.id,
    plan,
    model,
    definition: args.definition,
    secondes: DUREES.plan,
    cout: coutClip({ palier: args.palier, definition: args.definition }),
    imageDepart: path.basename(image.chemin),
    ...(raccordSource ? { priseSourceRaccord: raccordSource } : {}),
    prompt,
  };

  // Réservation atomique du numéro de prise, AVANT l'appel payant : voir
  // `tryReserverPrise` et `reserverPrise` (video.mjs). C'est ce qui empêche
  // deux exécutions concurrentes de calculer le même takeN et de s'écraser
  // l'une l'autre.
  const take = await reserverPrise({
    fichiers: await fsp.readdir(CHEMINS.sorties),
    prefixe: `${episode.id}-p${plan}`,
    tryReserver: (n) => tryReserverPrise({ episode, plan, n, journalBase }),
  });

  const nom = nomPrise(episode.id, plan, take);
  const sortie = path.join(CHEMINS.sorties, nom);
  const cheminJournal = sortie.replace(/\.mp4$/, ".json");

  console.log(`🎬  ${nom} — ${model} ${args.definition}, ${DUREES.plan} s`);
  let video;
  try {
    video = await genererVideo({
      ai,
      model,
      prompt,
      image: await imageDepart(image),
      definition: args.definition,
      dormir,
      journaliser: (m) => console.log(`   ${m}`),
    });
  } catch (err) {
    // Aucune URI n'a été rendue : rien n'a été facturé sur ce créneau (que
    // l'échec vienne d'un paramètre rejeté avant l'appel, d'un quota ou
    // d'une panne Veo). On libère donc la réservation pour ne pas brûler ce
    // numéro de prise pour rien — sinon la prochaine tentative repartirait
    // sur le take suivant alors que celui-ci n'a jamais existé.
    await fsp.rm(cheminJournal, { force: true }).catch(() => {});
    throw err;
  }

  // À partir d'ici, `video.uri` existe : l'appel est payé. On note l'URI
  // tout de suite, avant même de tenter le téléchargement : si celui-ci
  // plante, l'appel facturé reste retrouvable dans ce journal plutôt que
  // perdu — et on ne supprime plus jamais ce journal (voir le catch
  // ci-dessus, qui ne s'applique qu'avant ce point).
  const journalPaye = {
    ...journalBase,
    take,
    uri: video.uri,
    statut: "payé — téléchargement en cours",
    date: new Date().toISOString(),
  };
  await fsp.writeFile(cheminJournal, JSON.stringify(journalPaye, null, 2));

  try {
    await ai.files.download({ file: video, downloadPath: sortie });
  } catch (err) {
    throw new Error(
      `vidéo déjà payée mais téléchargement échoué (uri : ${video.uri}, voir ${path.basename(cheminJournal)}) : ${err.message ?? err}`,
    );
  }

  await fsp.writeFile(
    cheminJournal,
    JSON.stringify({ ...journalPaye, statut: "ok", date: new Date().toISOString() }, null, 2),
  );
  console.log(`✅  ${sortie}`);
  return sortie;
}

/**
 * Anime l'étal en deux plans de 8 s. Le plan 2 ne part jamais du prompt :
 * il part de la dernière image du plan 1 (extraite par ffmpeg), pour que le
 * raccord soit un vrai raccord — même caméra, mêmes pixels de part et
 * d'autre de la coupe. La confirmation de dépense est déjà passée par le
 * garde-fou unique de `main` (voir `actionsFacturees`) : cette fonction ne
 * redemande rien, elle vérifie seulement les préalables gratuits (ffmpeg
 * installé, images sources présentes) avant le premier appel réseau.
 */
async function etapeVideo(episode, contenu, args, ai) {
  await verifierFfmpeg();
  const raccord = cheminRaccord(episode.id);
  const plans = args.plan ? [args.plan] : [1, 2];

  if (plans.includes(1)) {
    const etal = trouverEtal(episode.id);
    if (!etal) {
      throw new Error(`étal absent : lance d'abord « npm run gen:reels -- --frame ${episode.id} »`);
    }
    const p1 = await genererPlan({ episode, contenu, args, ai, plan: 1, image: etal });
    console.log(`🔗  extraction de l'image de raccord…`);
    await executer("ffmpeg", commandeDerniereFrame(p1, raccord));
    // La filiation est écrite juste à côté : `raccord.png` est un chemin
    // fixe, écrasé à chaque régénération du plan 1, donc sans ce journal la
    // prise de plan 1 dont il provient serait perdue dès la prise suivante.
    await fsp.writeFile(
      cheminRaccordJournal(episode.id),
      JSON.stringify({ episode: episode.id, prise: path.basename(p1), date: new Date().toISOString() }, null, 2),
    );
    console.log(`✅  ${raccord} (source : ${path.basename(p1)})`);
  }

  if (plans.includes(2)) {
    if (!fs.existsSync(raccord)) {
      throw new Error(
        `image de raccord absente : génère d'abord le plan 1 (« --video ${episode.id} --plan=1 »)`,
      );
    }
    const raccordSource = await lireSourceRaccord(episode.id);
    await genererPlan({
      episode,
      contenu,
      args,
      ai,
      plan: 2,
      image: { chemin: raccord, mimeType: "image/png" },
      raccordSource,
    });
  }
}

/**
 * Actions qui entraîneraient réellement un appel facturé si l'exécution se
 * poursuivait : une image déjà présente est sautée sans coût (sauf
 * --force), elle ne compte donc pas ici. Sert de base à la confirmation
 * demandée avant le premier appel API payant d'une exécution.
 */
function actionsFacturees(args, etapesEpisode, episodes) {
  const actions = [];
  if (args.etapes.includes("master") && (args.force || !trouverMaster())) {
    actions.push({ label: "master — image de référence", cout: coutImage("pro") });
  }
  if (etapesEpisode.includes("frame")) {
    for (const episode of episodes) {
      if (args.force || !fs.existsSync(cheminFrame(episode.id))) {
        actions.push({ label: `${episode.id} — composition de l'étal`, cout: coutImage("pro") });
      }
    }
  }
  // La vidéo, elle, n'a jamais de fichier à sauter : un take payé n'est
  // jamais écrasé (voir `etapeVideo`), donc chaque plan demandé se
  // traduit forcément par un nouvel appel facturé.
  if (etapesEpisode.includes("video")) {
    const plans = args.plan ? [args.plan] : [1, 2];
    const cout = coutClip({ palier: args.palier, definition: args.definition });
    for (const episode of episodes) {
      for (const plan of plans) {
        actions.push({
          label: `${episode.id} — plan ${plan} vidéo (${args.palier} ${args.definition})`,
          cout,
        });
      }
    }
  }
  return actions;
}

async function confirmer(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const reponse = await rl.question(question);
    return /^(o|oui|y|yes)$/i.test(reponse.trim());
  } finally {
    rl.close();
  }
}

/** N'affiche et ne demande confirmation que s'il y a réellement un appel
 *  facturé à venir ; --yes saute la question mais pas l'affichage du coût. */
async function demanderConfirmation(actions, args) {
  if (!actions.length) return true;
  const total = actions.reduce((somme, a) => somme + a.cout, 0);
  console.log(`\n— appel(s) facturé(s) à venir —`);
  for (const a of actions) console.log(`  ${a.label} (${formaterDollars(a.cout)})`);
  console.log(`— coût total estimé — ${formaterDollars(total)}`);
  if (args.yes) return true;
  return confirmer("Continuer ? [o/N] ");
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

  // --master --dry-run doit rester gratuit : il court-circuite avant même
  // de toucher au catalogue, donc avant tout client Gemini.
  if (args.etapes.includes("master") && args.dryRun) {
    afficherDryRunMaster(contenu);
    return;
  }

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

  // Aucune étape payante ne démarre sans confirmation explicite (ou --yes) :
  // on affiche ce qui va être généré et son coût avant le premier appel API.
  const actions = actionsFacturees(args, etapesEpisode, episodes);
  if (!(await demanderConfirmation(actions, args))) {
    console.log("Annulé — aucun appel facturé.");
    return;
  }

  const ai = clientGemini();

  if (args.etapes.includes("master")) {
    await etapeMaster(contenu, args, ai);
    return;
  }

  for (const episode of episodes) {
    if (args.etapes.includes("frame")) await etapeFrame(episode, contenu, args, ai);
    if (args.etapes.includes("video")) await etapeVideo(episode, contenu, args, ai);
  }

  const restantes = args.etapes.filter((e) => e !== "frame" && e !== "video");
  if (restantes.length) {
    console.error(`Étapes non encore disponibles : ${restantes.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message ?? err}`);
  process.exit(1);
});
