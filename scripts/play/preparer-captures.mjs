#!/usr/bin/env node
/**
 * Captures téléphone pour la fiche Play Store.
 *
 * Les captures de l'App Store font 1242×2688, soit un ratio de 2,164:1. Play
 * plafonne à 2:1 et refuse au-delà. On ROGNE (1242×2484) : redimensionner
 * déformerait le jeu, et l'image serait rejetée à l'œil avant de l'être par
 * Google.
 *
 * Rognage centré : le HUD est en haut, la barre d'onglets en bas — couper d'un
 * seul côté amputerait l'un des deux. 102 px de chaque côté, c'est 4 % de la
 * hauteur, invisible sur le contenu utile.
 *
 * Play exige aussi l'absence de canal alpha : on aplatit.
 *
 * Usage : node scripts/play/preparer-captures.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(RACINE, "marketing/appstore/.captures");
const SORTIE = path.join(RACINE, "marketing/play/captures");

const ECRANS = ["chiner", "negocier", "vendre", "collection", "musiques"];
const LARGEUR = 1242;
const HAUTEUR = 2484; // ratio 2:1 pile, le maximum accepté par Play
const FOREST_900 = "#0F1F18";

async function main() {
  await fs.mkdir(SORTIE, { recursive: true });
  const produits = [];

  for (const [i, ecran] of ECRANS.entries()) {
    const src = path.join(SOURCE, `fr-iphone-6.5-${ecran}.png`);
    const meta = await sharp(src).metadata();
    if (meta.height <= HAUTEUR) {
      throw new Error(`${ecran} : hauteur ${meta.height}px, rien à rogner — vérifier la source.`);
    }
    const marge = Math.round((meta.height - HAUTEUR) / 2);
    // Nom préfixé : Play trie les captures par ordre alphabétique de fichier.
    const dest = path.join(SORTIE, `${String(i + 1).padStart(2, "0")}-${ecran}.png`);

    await sharp(src)
      .extract({ left: 0, top: marge, width: LARGEUR, height: HAUTEUR })
      .flatten({ background: FOREST_900 })
      .png({ compressionLevel: 9 })
      .toFile(dest);

    const v = await sharp(dest).metadata();
    if (v.width !== LARGEUR || v.height !== HAUTEUR) {
      throw new Error(`${ecran} : ${v.width}×${v.height} au lieu de ${LARGEUR}×${HAUTEUR}.`);
    }
    if (v.hasAlpha) throw new Error(`${ecran} : canal alpha présent, Play le refuse.`);
    produits.push({ ecran, dest, marge, ko: Math.round((await fs.stat(dest)).size / 1024) });
  }

  for (const p of produits) {
    console.log(
      `✅ ${path.relative(RACINE, p.dest)} — ${LARGEUR}×${HAUTEUR} (ratio 2.000), ` +
        `${p.marge}px rognés en haut et en bas, ${p.ko} Ko`,
    );
  }
  console.log(`\n${produits.length} captures prêtes. Play en exige au moins 2.`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
