#!/usr/bin/env node
/**
 * Build du générateur TikTok : copie la page et les assets du jeu dans dist/.
 * Sans dépendance. Exporte les fonctions pures pour les tests ; ne s'exécute
 * que lancé directement.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "..");
const DIST = path.join(ICI, "dist");

/** Découpe un CSV « ; » avec guillemets doublés ; retire le BOM. */
export function analyserCsv(texte) {
  const source = texte.replace(/^﻿/, "");
  const lignes = [];
  let cellules = [];
  let cellule = "";
  let entreGuillemets = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') { cellule += '"'; i++; } else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ";") { cellules.push(cellule); cellule = ""; }
    else if (c === "\n") { cellules.push(cellule); lignes.push(cellules); cellules = []; cellule = ""; }
    else if (c !== "\r") cellule += c;
  }
  if (cellule !== "" || cellules.length) { cellules.push(cellule); lignes.push(cellules); }
  return lignes;
}

export function analyserCatalogueCsv(texte) {
  const [entete, ...lignes] = analyserCsv(texte);
  const col = (nom) => entete.indexOf(nom);
  const iId = col("templateId"), iNom = col("nom"), iCat = col("categorie"), iRar = col("rarete");
  // Prix affiché sous l'objet au flash : celui de l'état « bon », la valeur de référence.
  const iPrix = col("prix_Bon");
  return lignes
    .filter((l) => l[iId])
    .map((l) => ({ id: l[iId], nom: l[iNom], categorie: l[iCat], rarete: l[iRar], prix: Number(l[iPrix]) || 0 }));
}

export function filtrerAvecImages(entrees, idsDisponibles) {
  const gardes = [], manquants = [];
  for (const e of entrees) (idsDisponibles.has(e.id) ? gardes : manquants).push(e);
  return { gardes, manquants: manquants.map((e) => e.id) };
}

/**
 * Copie les fichiers (non-dossiers, filtrés) de `src` vers `dest`.
 * Tolère un `src` absent (dossier vide, ex. `src/` ou `assets/badges/`
 * non versionnés par git faute de contenu) : crée quand même `dest`.
 */
export async function copierDossier(src, dest, filtre = () => true) {
  await fsp.mkdir(dest, { recursive: true });
  let noms;
  try {
    noms = await fsp.readdir(src);
  } catch (e) {
    if (e.code === "ENOENT") return;
    throw e;
  }
  for (const nom of noms) {
    const s = path.join(src, nom);
    if ((await fsp.stat(s)).isDirectory() || !filtre(nom)) continue;
    await fsp.copyFile(s, path.join(dest, nom));
  }
}

function shaGit() {
  try { return execSync("git rev-parse HEAD", { cwd: ICI, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return "local"; }
}

async function construire() {
  await fsp.rm(DIST, { recursive: true, force: true });
  await fsp.mkdir(path.join(DIST, "assets"), { recursive: true });
  // Tampon de version affiché dans l'app : commit (Vercel le fournit, sinon git) + heure de build.
  const version = `${(process.env.VERCEL_GIT_COMMIT_SHA ?? shaGit()).slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const html = (await fsp.readFile(path.join(ICI, "index.html"), "utf8")).replace("__VERSION__", version);
  await fsp.writeFile(path.join(DIST, "index.html"), html);
  await fsp.copyFile(path.join(ICI, "styles.css"), path.join(DIST, "styles.css"));
  await copierDossier(path.join(ICI, "src"), path.join(DIST, "src"), (n) => !n.endsWith(".test.mjs"));
  await copierDossier(path.join(ICI, "assets", "badges"), path.join(DIST, "assets", "badges"));
  await copierDossier(path.join(ICI, "assets", "sons"), path.join(DIST, "assets", "sons"));
  // Muxeur mp4 (WebCodecs → fichier), vendorisé dans le dépôt : Vercel n'installe
  // rien (`installCommand` vide), un node_modules absent y ferait échouer le build.
  await copierDossier(path.join(ICI, "vendor"), path.join(DIST, "vendor"));
  const webp = (n) => n.endsWith(".webp");
  await copierDossier(path.join(RACINE, "public", "items"), path.join(DIST, "assets", "items"), webp);
  await copierDossier(path.join(RACINE, "public", "items", "thumbs"), path.join(DIST, "assets", "thumbs"), webp);
  await copierDossier(path.join(RACINE, "public", "brocantes"), path.join(DIST, "assets", "fonds"), webp);
  await fsp.mkdir(path.join(DIST, "assets", "fonts"), { recursive: true });
  await fsp.copyFile(path.join(RACINE, "public/fonts/VerveShadow.ttf"), path.join(DIST, "assets/fonts/VerveShadow.ttf"));
  await fsp.copyFile(path.join(RACINE, "public/fonts/google/g05.woff2"), path.join(DIST, "assets/fonts/cinzel.woff2"));

  const csv = await fsp.readFile(path.join(RACINE, "docs", "items-catalogue.csv"), "utf8");
  const ids = new Set((await fsp.readdir(path.join(DIST, "assets", "items"))).map((n) => n.replace(/\.webp$/, "")));
  const { gardes, manquants } = filtrerAvecImages(analyserCatalogueCsv(csv), ids);
  await fsp.writeFile(path.join(DIST, "assets", "catalogue.json"), JSON.stringify(gardes));
  const fonds = (await fsp.readdir(path.join(DIST, "assets", "fonds"))).map((n) => n.replace(/\.webp$/, ""));
  await fsp.writeFile(path.join(DIST, "assets", "fonds.json"), JSON.stringify(fonds));
  console.log(`✓ ${gardes.length} objets, ${fonds.length} fonds → ${path.relative(RACINE, DIST)}`);
  if (manquants.length) console.warn(`⚠ sans image : ${manquants.join(", ")}`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  construire().catch((e) => { console.error(e); process.exit(1); });
}
