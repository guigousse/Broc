/**
 * Rendu HORS LIGNE de la roulette en mp4 : chaque image est dessinée puis
 * encodée une par une (WebCodecs), à cadence FIXE — aucune image ne peut être
 * perdue, contrairement à la prise en temps réel de `enregistreur.js`, qui
 * ne capture que ce que le téléphone a réussi à dessiner à temps (d'où des
 * trous de 42–67 ms et des saccades une fois ré-encodé par TikTok).
 *
 * Vidéo : H.264 (High si possible) via `VideoEncoder`, 60 images/s, toutes
 * horodatées à i/60 s. Son : le tour rendu par `OfflineAudioContext`
 * (`son.rendreHorsLigne`) puis AAC via `AudioEncoder`. Muxage : mp4-muxer
 * (dist/vendor), fastStart en mémoire.
 *
 * Aucune requête au DOM hors la création d'un canvas de travail.
 */
import { estFlash, instantDessine } from "./roulette.js";
import { dessinerFrame } from "./rendu.js";
import { LARGEUR, HAUTEUR } from "./roulette.js";
import { nomFichierPour } from "./enregistreur.js";

/** Cadence du fichier produit. Indépendante de `roulette.FPS` (qui ne sert qu'à la largeur du flash). */
export const FPS_VIDEO = 60;
/** 1080×1920 à 60 fps : même débit qu'avant, l'encodeur matériel s'en sort. */
const DEBIT_VIDEO = 12_000_000;
const DEBIT_AUDIO = 128_000;
const FREQUENCE_AUDIO = 48_000;
/** Une image clé toutes les 2 s : TikTok découpe proprement, le fichier reste léger. */
const INTERVALLE_CLE_S = 2;
/**
 * File d'attente de l'encodeur : on ne lui donne l'image suivante que si sa
 * file est courte. Sur iPhone, un fond photo (bien plus coûteux à encoder
 * qu'un fond du jeu) saturait l'encodeur matériel et l'export restait figé
 * à la fin des images : une file courte le laisse respirer.
 */
const FILE_MAX = 2;
/** Sondage de la file (ms) : l'événement `dequeue` n'est pas garanti partout, on regarde nous-mêmes. */
const PAS_SONDAGE_MS = 4;
/** Au-delà, une image qui ne se vide pas de la file est un encodeur bloqué. */
const ATTENTE_FILE_MAX_MS = 20_000;
/** Délai maximal accordé à la finalisation vidéo (`flush`) : passé, on livre ce qu'on a. */
const DELAI_FLUSH_MS = 20_000;
/**
 * Délai maximal du rendu et de l'encodage audio. Sur iPhone, après le sélecteur
 * de photos, le rendu hors ligne du son a été vu ne jamais revenir (export figé
 * à 92 %) : passé ce délai, on livre la vidéo MUETTE et on le dit.
 */
const DELAI_AUDIO_MS = 15_000;

/** Les étapes de `rendreHorsLigne`, telles que rapportées par `onProgression(p, etape)`. */
export const ETAPES = Object.freeze({
  images: "images", flush: "finalisation vidéo", son: "son : rendu", sonEncodage: "son : encodage", fichier: "fichier",
});
/**
 * Sous-images par image encodée. 1 = image nette à l'instant exact. Un flou de
 * mouvement (moyenne de 8 sous-images) a été essayé : il rendait les objets
 * fins translucides et étalait la cible au flash — refusé, les objets doivent
 * garder toute leur opacité.
 */
export const SOUS_IMAGES = 1;

/** Codecs H.264 tentés dans l'ordre : High 4.2 (1080p60), Main 4.2, Baseline 4.2. */
export const CODECS_VIDEO = ["avc1.64002A", "avc1.4D402A", "avc1.42E02A"];
const CODEC_AUDIO = "mp4a.40.2";

/**
 * Le plan des images d'un clip : combien, et lesquelles sont des images clés.
 * Pure, testable. La dernière image est à `duree − 1/fps` : celle de `duree`
 * vaudrait celle de 0 (roulette périodique) et marquerait un temps mort à
 * chaque boucle.
 */
export function planImages(duree, fps = FPS_VIDEO, intervalleCleS = INTERVALLE_CLE_S) {
  const nb = Math.max(1, Math.round(duree * fps));
  const pasCle = Math.max(1, Math.round(intervalleCleS * fps));
  const images = [];
  for (let i = 0; i < nb; i++) {
    images.push({ i, t: i / fps, timestampUs: Math.round((i * 1_000_000) / fps), cle: i % pasCle === 0 });
  }
  return { nb, dureeUs: Math.round((nb * 1_000_000) / fps), images };
}

/**
 * Les instants des sous-images d'une image à `t` : `t` seul si n = 1, sinon
 * répartis sur [t, t + 1/fps), centrés dans leur case (k + ½). Pure, testable.
 */
export function instantsSousImages(t, fps = FPS_VIDEO, n = SOUS_IMAGES) {
  if (n <= 1) return [t];   // une seule : l'instant exact, pas le milieu de la case.
  const out = [];
  for (let k = 0; k < n; k++) out.push(t + ((k + 0.5) / n) / fps);
  return out;
}

/**
 * Dessine sur `ctx` la moyenne des sous-images de l'instant `t` : la k-ième
 * est composée avec alpha 1/(k+1), ce qui donne exactement la moyenne courante.
 */
export function dessinerImageFloue(ctx, t, scene, r, fps = FPS_VIDEO, n = SOUS_IMAGES) {
  const instants = instantsSousImages(t, fps, n);
  ctx.save();
  instants.forEach((ti, k) => {
    ctx.globalAlpha = 1 / (k + 1);
    dessinerFrame(ctx, instantDessine(ti, r), { ...scene, flashActif: estFlash(ti, r) });
  });
  ctx.restore();
}



/** Ce que sait faire le navigateur : { ok, codecVideo, audio } — `audio` faux = fichier muet. */
export async function capacitesHorsLigne() {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return { ok: false, codecVideo: null, audio: false };
  let codecVideo = null;
  for (const codec of CODECS_VIDEO) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec, width: LARGEUR, height: HAUTEUR, framerate: FPS_VIDEO, bitrate: DEBIT_VIDEO, avc: { format: "avc" },
      });
      if (supported) { codecVideo = codec; break; }
    } catch { /* codec inconnu de ce navigateur : au suivant */ }
  }
  if (!codecVideo) return { ok: false, codecVideo: null, audio: false };
  let audio = false;
  if (typeof AudioEncoder !== "undefined" && typeof AudioData !== "undefined") {
    try {
      audio = (await AudioEncoder.isConfigSupported({
        codec: CODEC_AUDIO, sampleRate: FREQUENCE_AUDIO, numberOfChannels: 1, bitrate: DEBIT_AUDIO,
      })).supported === true;
    } catch { audio = false; }
  }
  return { ok: true, codecVideo, audio };
}

/**
 * Rend un tour complet en mp4. → { blob, nomFichier, fps }
 * `scene` est celle de l'aperçu (déjà chargée), `r` sa roulette. `sonActif`
 * faux → piste audio silencieuse (le fichier garde une piste, comme avant).
 */
export async function rendreHorsLigne({ scene, r, son, sonActif, cibleId, capacites, onProgression, journal = console }) {
  const caps = capacites ?? await capacitesHorsLigne();
  if (!caps.ok) throw new Error("Ce navigateur ne sait pas encoder la vidéo hors ligne.");
  const { Muxer, ArrayBufferTarget } = await import("../vendor/mp4-muxer.mjs");

  const plan = planImages(r.duree);
  // Le son se rend pendant que la vidéo s'encode : les deux sont indépendants.
  const audioPromesse = caps.audio
    ? (sonActif ? rendreSon(son, r) : Promise.resolve(silence(r.duree)))
    : Promise.resolve(null);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: LARGEUR, height: HAUTEUR, frameRate: FPS_VIDEO },
    audio: caps.audio ? { codec: "aac", sampleRate: FREQUENCE_AUDIO, numberOfChannels: 1 } : undefined,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  let erreur = null;
  let morceauxRecus = 0;
  const encodeurVideo = new VideoEncoder({
    output: (morceau, meta) => { morceauxRecus += 1; muxer.addVideoChunk(morceau, meta); },
    error: (e) => { erreur = e; },
  });
  encodeurVideo.configure({
    codec: caps.codecVideo, width: LARGEUR, height: HAUTEUR, framerate: FPS_VIDEO, bitrate: DEBIT_VIDEO,
    avc: { format: "avc" }, latencyMode: "quality",
  });

  const canvas = document.createElement("canvas");
  canvas.width = LARGEUR; canvas.height = HAUTEUR;
  const ctx = canvas.getContext("2d");

  let avertissement = null;
  try {
    for (const img of plan.images) {
      if (erreur) throw erreur;
      const ok = await attendreFileCourte(encodeurVideo, { max: FILE_MAX, pasMs: PAS_SONDAGE_MS, maxMs: ATTENTE_FILE_MAX_MS });
      if (!ok) throw new Error(`L'encodeur vidéo ne répond plus (image ${img.i + 1}/${plan.nb}, ${morceauxRecus} reçues).`);
      dessinerImageFloue(ctx, img.t, scene, r);
      const frame = new VideoFrame(canvas, { timestamp: img.timestampUs, duration: Math.round(1_000_000 / FPS_VIDEO) });
      encodeurVideo.encode(frame, { keyFrame: img.cle });
      frame.close();
      onProgression?.((img.i + 1) / plan.nb * 0.9, ETAPES.images);
    }
    onProgression?.(0.9, ETAPES.flush);
    // Un `flush` qui ne revient jamais (encodeur matériel saturé) ne doit pas
    // figer l'export : on livre les images déjà muxées et on le dit.
    try {
      await avecDelai(encodeurVideo.flush(), DELAI_FLUSH_MS, ETAPES.flush);
    } catch (e) {
      if (!(e instanceof ErreurDelai)) throw e;
      avertissement = `Finalisation vidéo interrompue : ${morceauxRecus}/${plan.nb} images livrées.`;
      journal?.warn?.(avertissement, e);
    }
    if (erreur) throw erreur;

    onProgression?.(0.92, ETAPES.son);
    let buffer = await avecRepli(audioPromesse, DELAI_AUDIO_MS, () => (caps.audio ? silence(r.duree) : null));
    if (buffer.repli) {
      avertissement = ajouter(avertissement, `Son abandonné (rendu bloqué, contexte « ${son?.etat ?? "?"} ») : vidéo muette.`);
      journal?.warn?.(avertissement);
    }
    if (buffer.valeur) {
      onProgression?.(0.95, ETAPES.sonEncodage);
      const enc = await avecRepli(encoderAudio(buffer.valeur, muxer), DELAI_AUDIO_MS, () => null);
      if (enc.repli) {
        avertissement = ajouter(avertissement, "Encodage du son bloqué : vidéo muette.");
        journal?.warn?.(avertissement);
      }
    }
    onProgression?.(0.98, ETAPES.fichier);

    muxer.finalize();
    onProgression?.(1, ETAPES.fichier);
    return {
      blob: new Blob([muxer.target.buffer], { type: "video/mp4" }),
      nomFichier: nomFichierPour(cibleId, "video/mp4"),
      fps: FPS_VIDEO,
      avertissement,
    };
  } finally {
    try { encodeurVideo.close(); } catch { /* déjà fermé */ }
  }
}

/**
 * Attend que `encodeur.encodeQueueSize` ≤ `max`, par sondage toutes les `pasMs`.
 * → true dès que la file est courte, false si `maxMs` s'écoule avant. Pure
 * vis-à-vis de WebCodecs : n'importe quel objet à `encodeQueueSize` convient.
 */
export async function attendreFileCourte(encodeur, { max = FILE_MAX, pasMs = PAS_SONDAGE_MS, maxMs = ATTENTE_FILE_MAX_MS } = {}) {
  if (encodeur.encodeQueueSize <= max) return true;
  const limite = Date.now() + maxMs;
  while (encodeur.encodeQueueSize > max) {
    if (Date.now() >= limite) return false;
    await new Promise((resolve) => setTimeout(resolve, pasMs));
  }
  return true;
}

export class ErreurDelai extends Error {}

/**
 * La promesse dans le délai → { valeur, repli: false } ; sinon → { valeur: repli(), repli: true }.
 * Une promesse en retard qui finit par rejeter est ignorée (le repli a déjà pris la place).
 */
export async function avecRepli(promesse, ms, repli) {
  try {
    return { valeur: await avecDelai(promesse, ms, "repli"), repli: false };
  } catch (e) {
    if (!(e instanceof ErreurDelai)) throw e;
    promesse.catch(() => {});
    return { valeur: repli(), repli: true };
  }
}

function ajouter(a, b) { return a ? `${a} ${b}` : b; }

/** Le son du tour, après une tentative de sortie d'interruption iOS. */
async function rendreSon(son, r) {
  await son.reprendre?.();
  return son.rendreHorsLigne(r, FREQUENCE_AUDIO);
}

/** La promesse, ou une `ErreurDelai` nommant `etape` si `ms` s'écoulent d'abord. */
export function avecDelai(promesse, ms, etape) {
  let minuterie;
  const garde = new Promise((_, rejeter) => {
    minuterie = setTimeout(() => rejeter(new ErreurDelai(`Étape « ${etape} » trop longue (${Math.round(ms / 1000)} s).`)), ms);
  });
  return Promise.race([promesse, garde]).finally(() => clearTimeout(minuterie));
}

/** Un AudioBuffer mono muet de `duree` s (fichier « avec son » mais silencieux). */
function silence(duree) {
  const ctx = new OfflineAudioContext(1, Math.max(1, Math.round(duree * FREQUENCE_AUDIO)), FREQUENCE_AUDIO);
  return ctx.createBuffer(1, Math.max(1, Math.round(duree * FREQUENCE_AUDIO)), FREQUENCE_AUDIO);
}

/**
 * L'AudioSpecificConfig d'un flux AAC-LC (ISO 14496-3) : 5 bits de type
 * d'objet (2 = LC), 4 bits d'index de fréquence, 4 bits de canaux. WebKit
 * n'en fournit pas dans `decoderConfig.description` : sans lui, le lecteur
 * voit « object type 0, 0 canal » et le fichier est muet, voire refusé.
 */
export function audioSpecificConfig(frequence, canaux) {
  const FREQUENCES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  const index = FREQUENCES.indexOf(frequence);
  if (index < 0) throw new Error(`fréquence AAC non standard : ${frequence}`);
  const bits = (2 << 11) | (index << 7) | (canaux << 3);   // 5 + 4 + 4 bits, cadrés à gauche sur 16
  return new Uint8Array([bits >> 8, bits & 0xff]);
}

/** Toute la piste dans l'encodeur AAC, par tranches de 1024 échantillons (une trame AAC). */
async function encoderAudio(buffer, muxer) {
  let erreur = null;
  const description = audioSpecificConfig(buffer.sampleRate, 1);
  const enc = new AudioEncoder({
    output: (morceau, meta) => {
      // Le muxeur lit la description dans la méta du PREMIER morceau ; on la garantit.
      const dc = meta?.decoderConfig ?? { codec: CODEC_AUDIO, sampleRate: buffer.sampleRate, numberOfChannels: 1 };
      muxer.addAudioChunk(morceau, { ...meta, decoderConfig: { ...dc, description: dc.description ?? description } });
    },
    error: (e) => { erreur = e; },
  });
  enc.configure({ codec: CODEC_AUDIO, sampleRate: buffer.sampleRate, numberOfChannels: 1, bitrate: DEBIT_AUDIO });
  const donnees = buffer.getChannelData(0);
  const TRAME = 1024;
  for (let debut = 0; debut < donnees.length; debut += TRAME) {
    if (erreur) throw erreur;
    const tranche = donnees.subarray(debut, Math.min(debut + TRAME, donnees.length));
    const data = new AudioData({
      format: "f32-planar", sampleRate: buffer.sampleRate, numberOfFrames: tranche.length, numberOfChannels: 1,
      timestamp: Math.round((debut * 1_000_000) / buffer.sampleRate), data: tranche,
    });
    enc.encode(data);
    data.close();
  }
  await enc.flush();
  enc.close();
  if (erreur) throw erreur;
}
