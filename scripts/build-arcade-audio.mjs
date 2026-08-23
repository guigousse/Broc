#!/usr/bin/env node
/**
 * Fabrique les onze bandes-son de la borne d'arcade du Bazar.
 *
 * Prend les masters mp3 (hors dépôt, chez l'auteur) et en tire des `.m4a`
 * mono passés au « haut-parleur de borne » : une caisse en bois, un petit
 * ampli poussé, et un convertisseur d'époque.
 *
 * POURQUOI CUIRE LA COLORATION DANS LE FICHIER plutôt que la poser au
 * runtime : c'est une propriété du SON, pas du moment. Elle ne dépend ni de
 * l'écran, ni du joueur, ni de l'instant ; la refaire à chaque lecture
 * coûterait quatre nœuds Web Audio et une deuxième implémentation à tenir.
 * Le glitch, lui, est exactement l'inverse — il doit tomber ailleurs à chaque
 * tour de boucle, donc il vit dans `audioManager` et surtout PAS ici.
 *
 * LE CRUSH EST GRADUÉ PAR GÉNÉRATION, et c'est le cœur de la recette. Le
 * catalogue est rangé du 8-bit au 128-bit (cf. `src/lib/bazar/arcade.ts`) et
 * la borne raconte cette chronologie de gauche à droite. Le son la raconte
 * aussi : franc sur les 8-bit, nul sur le 128-bit. Un dosage uniforme
 * écraserait le jeu d'aventure japonais au niveau du plombier sauteur, et la
 * série perdrait ce qu'elle a de mieux.
 *
 *   node scripts/build-arcade-audio.mjs [--src <dossier>] [--dry]
 */

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const SRC_DEFAUT = "/Users/guillaume/Desktop/son arcade";
const DEST = resolve(import.meta.dirname, "..", "public", "sounds", "arcade");

/**
 * Les cinq paliers de « vieillerie », du plus ancien au plus récent.
 *
 * `bits` et `samples` sont les deux réglages d'`acrusher` : le premier
 * quantifie l'amplitude (le grain), le second tient chaque échantillon N fois
 * (l'aliasing d'un convertisseur lent). `mix` dose le mélange avec le signal
 * propre — c'est lui qu'on tourne pour aller plus ou moins loin sans jamais
 * rendre le morceau méconnaissable.
 */
const PALIERS = {
  fort: { bits: 6, samples: 4, mix: 0.85 },
  moyen: { bits: 8, samples: 2, mix: 0.6 },
  leger: { bits: 10, samples: 1, mix: 0.35 },
  tresLeger: { bits: 12, samples: 1, mix: 0.18 },
  aucun: null,
};

/**
 * Master → jeu du catalogue. Un pour un, sans reste.
 *
 * Les noms de fichiers sont recopiés TELS QUELS, coquilles comprises
 * (« aveturier », « hanntée », « engreage », « Sonn ») : ce sont les vrais
 * noms sur le disque de l'auteur, et les corriger ici casserait la recette.
 */
const PISTES = [
  ["Son jeu robot.mp3", "jx.cartouche_bluebot_8_bit", "fort"],
  ["Sonn Aventure de Solda.mp3", "jx.cartouche_la_legende_de_solda_8_bit", "fort"],
  ["Son Plombier sauteur.mp3", "jx.cartouche_le_plombier_sauteur_8_bit", "fort"],
  ["Son hérisson rapide.mp3", "jx.cartouche_turbo_herisson_16_bit", "moyen"],
  ["son bagarre.mp3", "jx.cartouche_street_castagne_ii_16_bit", "moyen"],
  ["Son aveturier portail.mp3", "jx.cartouche_gachette_du_temps_rpg_16_bit", "moyen"],
  ["son maison hanntée.mp3", "jx.jeu_le_manoir_du_mal_32_bit", "leger"],
  ["son foxy crush.mp3", "jx.jeu_foxy_crush_32_bit", "leger"],
  ["son engreage métallique.mp3", "jx.jeu_engrenage_de_metal_infiltration_32_bit", "leger"],
  ["son solda flute.mp3", "jx.jeu_solda_flute_temporelle_aventure_3d_64_bit", "tresLeger"],
  ["so shenmu like.mp3", "jx.jeu_d_aventure_japonais_128_bit", "aucun"],
];

/**
 * La chaîne ffmpeg, dans l'ordre où le signal traverse une vraie borne.
 *
 * L'ORDRE EST LA PIÈCE PORTEUSE : le crush vient AVANT le passe-bas, jamais
 * après. Une console d'époque crache un signal dur et plein d'aliasing, et
 * c'est le haut-parleur qui le rabote ensuite. Inversé, on entendrait un
 * grésillement propre posé sur une bouillie sourde — le contraire du but.
 */
function chaine(palier) {
  const p = PALIERS[palier];
  const etapes = [
    // Mono : une borne, un haut-parleur.
    "aformat=channel_layouts=mono",
    // Les masters n'ont pas le même niveau ; sans ça, le compresseur plus bas
    // mordrait beaucoup sur l'un et pas du tout sur l'autre, et le crush
    // n'aurait pas le même goût d'une piste à l'autre.
    "loudnorm=I=-18:TP=-2:LRA=11",
    // La caisse ne descend pas : sous 180 Hz, un 10 cm ne rend rien.
    "highpass=f=180:poles=2",
  ];
  if (p) {
    etapes.push(
      `acrusher=bits=${p.bits}:samples=${p.samples}:mode=log:aa=1:mix=${p.mix}`,
    );
  }
  etapes.push(
    // La résonance du meuble.
    "equalizer=f=1000:t=q:w=1.2:g=3",
    // Le haut-parleur, qui rabote l'aliasing du crush au passage.
    "lowpass=f=7000:poles=2",
    // Le petit ampli poussé : c'est ce qui fait qu'une borne s'entend de
    // l'autre bout de la salle.
    "acompressor=threshold=-18dB:ratio=4:attack=5:release=120:makeup=3",
    // 0.85 et non 0.95 : l'encodeur AAC dépasse le pic du PCM qu'on lui
    // donne (il reconstruit une forme d'onde, il ne recopie pas des
    // échantillons), et à 0.95 le fichier décodé retombait pile à 0 dB. La
    // marge de 1,4 dB laisse la saturation volontaire du compresseur faire
    // le caractère, sans écrêtage subi par-dessus.
    // `level=disabled` EST OBLIGATOIRE, et c'est le piège de cette recette :
    // `alimiter` porte une option `level` (auto-level) activée PAR DÉFAUT qui
    // renormalise le signal à 0 dB APRÈS avoir limité — le `limit` ne se voit
    // alors nulle part dans le fichier, et les onze pistes sortaient toutes
    // pile à 0 dB. Mesuré, pas supposé : le wav d'avant encodage était déjà
    // écrêté, ce qui a écarté l'encodeur AAC.
    "alimiter=limit=0.85:level=disabled",
  );
  return etapes.join(",");
}

const args = process.argv.slice(2);
const src = args.includes("--src") ? args[args.indexOf("--src") + 1] : SRC_DEFAUT;
const dry = args.includes("--dry");

if (!existsSync(src)) {
  console.error(`Dossier source introuvable : ${src}`);
  process.exit(1);
}
mkdirSync(DEST, { recursive: true });

let total = 0;
for (const [fichier, templateId, palier] of PISTES) {
  const entree = join(src, fichier);
  if (!existsSync(entree)) {
    console.error(`✗ master manquant : ${fichier}`);
    process.exit(1);
  }
  const sortie = join(DEST, `${templateId}.m4a`);
  const cmd = [
    "-y",
    "-i", entree,
    // Les masters embarquent une pochette (un flux vidéo, aux yeux de
    // ffmpeg) que le conteneur `.m4a` refuse net : sans `-vn`, rien n'est
    // écrit du tout.
    "-vn",
    "-af", chaine(palier),
    "-c:a", "aac",
    "-b:a", "64k",
    "-ar", "24000",
    "-ac", "1",
    // Aucune métadonnée : les masters portent des tags d'export qui n'ont
    // rien à faire dans le binaire livré.
    "-map_metadata", "-1",
    sortie,
  ];
  if (dry) {
    console.log(`ffmpeg ${cmd.join(" ")}`);
    continue;
  }
  await execFileP("ffmpeg", ["-hide_banner", "-loglevel", "error", ...cmd]);
  const ko = statSync(sortie).size / 1024;
  total += ko;
  console.log(`✓ ${templateId.padEnd(48)} crush:${palier.padEnd(10)} ${ko.toFixed(0)} Ko`);
}
if (!dry) console.log(`\n${PISTES.length} pistes · ${(total / 1024).toFixed(1)} Mo`);
