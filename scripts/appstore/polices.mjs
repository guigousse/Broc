/**
 * Chargement des fichiers de police du jeu et embarquement en URI `data:`.
 * Seul module du pipeline à faire de l'I/O disque pour les polices — tenu à
 * l'écart de `gabarit.mjs`, qui reste un module pur.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { cheminsPolices, extraireFontFace } from "./gabarit.mjs";

function mimePolice(chemin) {
  const ext = path.extname(chemin).slice(1).toLowerCase();
  return ext === "woff2" ? "font/woff2" : "font/woff";
}

async function dataUriPolice(dossierPublic, chemin) {
  const buf = await fs.readFile(path.join(dossierPublic, chemin));
  return `data:${mimePolice(chemin)};base64,${buf.toString("base64")}`;
}

/**
 * Précharge en mémoire les fichiers de police référencés par les familles
 * demandées, et construit le CSS `@font-face` correspondant avec leurs
 * octets embarqués en base64 — pas d'URL `file://`, donc rien à refuser
 * quel que soit l'origine du document qui charge ce CSS (voir le
 * commentaire de `extraireFontFace`).
 */
export async function chargerFontFaceCss(css, familles, dossierPublic) {
  const chemins = cheminsPolices(css, familles);
  const entrees = await Promise.all(
    chemins.map(async (c) => [c, await dataUriPolice(dossierPublic, c)]),
  );
  const dataUris = new Map(entrees);
  return extraireFontFace(css, familles, (chemin) => {
    const uri = dataUris.get(chemin);
    if (!uri) throw new Error(`police non préchargée : ${chemin}`);
    return uri;
  });
}
