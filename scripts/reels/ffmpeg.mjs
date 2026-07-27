/**
 * Enveloppe ffmpeg. Les constructeurs de commandes sont purs et testés ;
 * seule `executer` touche au système.
 */
import { spawn } from "node:child_process";
import { CHEMINS, DUREES } from "./config.mjs";

/** Dernière image d'un mp4 : c'est elle qui sert d'image de départ au plan 2. */
export function commandeDerniereFrame(mp4, png) {
  return ["-sseof", "-0.2", "-i", mp4, "-update", "1", "-frames:v", "1", "-y", png];
}

/**
 * drawtext casse sur « : », « % » et « , » (voir les échappements
 * ci-dessous). L'apostrophe droite est un cas à part et plus vicieux :
 * contrairement à ce qu'on pourrait croire, elle NE passe PAS telle quelle
 * dans une valeur `text=` non quotée — vérifié le 2026-07-27 sur un ffmpeg
 * réel (build ffmpeg-full 8.1.2) : elle fait basculer le lecteur de
 * filtergraph en mode « chaîne quotée » en plein milieu de l'option, qui
 * avale la suite de la chaîne (jusqu'à consommer le label de sortie
 * suivant, ex. « Output with label 'v' does not exist »). Aucune forme
 * d'échappement (`\'`, quotes englobantes) ne restitue le caractère. On la
 * remplace donc par l'apostrophe typographique « ’ » (U+2019, invisible
 * pour le lecteur de filtergraph) — qui est de toute façon la forme
 * correcte en typographie française. */
export function echapperTexte(texte) {
  return texte
    .replace(/'/g, "’")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,");
}

const CADRE_1080 =
  "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x1a1a1a,setsar=1";

/** Passe 1 : coller les deux plans. Coupe franche à l'image (les deux
 *  frames sont identiques), fondu croisé de 0,2 s sur le son. */
export function commandeAssemblage({ p1, p2, sortie }) {
  const filtre = [
    `[0:v]${CADRE_1080}[v0]`,
    `[1:v]${CADRE_1080}[v1]`,
    `[v0][v1]concat=n=2:v=1:a=0[v]`,
    `[0:a][1:a]acrossfade=d=${DUREES.fonduAudio}[a]`,
  ].join(";");

  return [
    "-i", p1,
    "-i", p2,
    "-filter_complex", filtre,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-c:a", "aac",
    "-b:a", "192k",
    "-y", sortie,
  ];
}

/** `between(t,a,b)` a ses virgules internes — sans échappement, le
 *  découpeur de filtergraph d'ffmpeg les prend pour des séparateurs de
 *  filtres et casse la chaîne en plein milieu (« No such filter: '0' »,
 *  vérifié le 2026-07-27 : c'est le vrai piège d'échappement de drawtext,
 *  pas les apostrophes ni les deux-points). */
function fenetre(debut, fin) {
  return `between(t\\,${debut}\\,${fin})`;
}

/** Taille des sous-titres, dégressive avec la longueur du texte : à 52 px
 *  fixe, une réplique d'une cinquantaine de caractères déborde des deux
 *  côtés du cadre de 1080 px (vérifié le 2026-07-27 sur un rendu réel —
 *  « Elle est signée, celle-là… vous en voulez combien ? », 51 caractères,
 *  coupée à gauche ET à droite). Le plafond à 52 laisse les répliques
 *  courtes (« Quarante euros. ») à leur taille habituelle ; le plancher à
 *  30 garde les plus longues lisibles. */
function tailleSousTitre(texte) {
  return Math.max(30, Math.min(52, Math.floor(2000 / texte.length)));
}

/** Passe 2 : accroche en haut, sous-titres en bas. */
export function commandeHabillage({ entree, sortie, accroche, sousTitres }) {
  const dessins = [
    [
      `drawtext=fontfile=${CHEMINS.policeTitre}`,
      `text=${echapperTexte(accroche)}`,
      "fontsize=76",
      "fontcolor=0xF5EFE0",
      "borderw=6",
      "bordercolor=0x1a1a1a",
      "x=(w-text_w)/2",
      "y=h*0.14",
      `enable=${fenetre(0, 2)}`,
    ].join(":"),
    ...sousTitres.map((st) =>
      [
        `drawtext=fontfile=${CHEMINS.policeSousTitre}`,
        `text=${echapperTexte(st.texte)}`,
        `fontsize=${tailleSousTitre(st.texte)}`,
        "fontcolor=white",
        "box=1",
        "boxcolor=0x1a1a1a@0.55",
        "boxborderw=22",
        "x=(w-text_w)/2",
        "y=h*0.80",
        `enable=${fenetre(st.debut, st.fin)}`,
      ].join(":"),
    ),
  ];

  return [
    "-i", entree,
    "-vf", dessins.join(","),
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-c:a", "copy",
    "-y", sortie,
  ];
}

/** Passe 3 : la carte de fin, 2 s sur fond parchemin. */
export function commandeCarteFin({ icone, chute, signature, cta, sortie }) {
  const filtre = [
    "[1:v]scale=280:280[ico]",
    "[0:v][ico]overlay=(W-w)/2:H*0.28[bg]",
    [
      "[bg]drawtext=fontfile=" + CHEMINS.policeTitre,
      `text=${echapperTexte(chute)}`,
      "fontsize=72",
      "fontcolor=0x2F4F3E",
      "x=(w-text_w)/2",
      "y=h*0.50",
    ].join(":") + "[t1]",
    [
      "[t1]drawtext=fontfile=" + CHEMINS.policeSousTitre,
      `text=${echapperTexte(signature)}`,
      "fontsize=40",
      "fontcolor=0x5A4632",
      "x=(w-text_w)/2",
      "y=h*0.60",
    ].join(":") + "[t2]",
    [
      "[t2]drawtext=fontfile=" + CHEMINS.policeSousTitre,
      `text=${echapperTexte(cta)}`,
      "fontsize=46",
      "fontcolor=0x2F4F3E",
      "x=(w-text_w)/2",
      "y=h*0.68",
    ].join(":") + "[v]",
  ].join(";");

  return [
    "-f", "lavfi",
    "-i", `color=c=0xF5EFE0:s=1080x1920:r=30:d=${DUREES.carteFin}`,
    "-i", icone,
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-filter_complex", filtre,
    "-map", "[v]",
    "-map", "2:a",
    "-t", `${DUREES.carteFin}`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-y", sortie,
  ];
}

/**
 * Passe 3 bis : le son. Fondu de sortie sur la dernière seconde, et si un
 * mp3 est fourni, lit musical bouclé à bas niveau par-dessus la jointure —
 * c'est la troisième mesure du spec contre le raccord audible.
 */
export function commandeSon({ entree, musique, sortie, duree }) {
  const fondu = `afade=t=out:st=${Math.max(0, duree - 1)}:d=1`;
  const commun = ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-y", sortie];

  if (!musique) {
    return ["-i", entree, "-af", fondu, ...commun];
  }

  const filtre = [
    `[1:a]volume=0.18,aloop=loop=-1:size=2e9[lit]`,
    `[0:a][lit]amix=inputs=2:duration=first:dropout_transition=0,${fondu}[a]`,
  ].join(";");

  return [
    "-i", entree,
    "-i", musique,
    "-filter_complex", filtre,
    "-map", "0:v",
    "-map", "[a]",
    ...commun,
  ];
}

/** Passe 4 : clip habillé + carte de fin. */
export function commandeConcat({ liste, sortie }) {
  return [
    "-f", "concat",
    "-safe", "0",
    "-i", liste,
    "-c", "copy",
    "-y", sortie,
  ];
}

export function executer(binaire, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaire, args, { stdio: ["ignore", "ignore", "pipe"] });
    let erreurs = "";
    proc.stderr.on("data", (d) => {
      erreurs += d.toString();
    });
    proc.on("error", (err) => {
      reject(
        err.code === "ENOENT"
          ? new Error(`${binaire} introuvable — installe-le (brew install ffmpeg)`)
          : err,
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${binaire} a échoué (code ${code}) :\n${erreurs.slice(-2000)}`));
    });
  });
}

export async function verifierFfmpeg() {
  await executer("ffmpeg", ["-version"]);
}
