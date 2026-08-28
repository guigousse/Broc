/**
 * Enregistrement du canvas en vidéo partageable.
 *
 * Le principe : `canvas.captureStream()` pour l'image + la sortie
 * MediaStream du son (`son.destination`) pour l'audio, les deux dans un même
 * MediaRecorder. Sur Safari iOS le mime retenu est du mp4 H.264/AAC — le
 * format que TikTok avale tel quel ; ailleurs (Chrome) c'est du webm.
 *
 * L'enregistrement se fait EN TEMPS RÉEL : on redessine l'aperçu frame par
 * frame pendant `r.duree` secondes, le MediaRecorder capte ce qui s'affiche.
 * Il n'y a pas de rendu accéléré possible — le son est joué par le contexte
 * audio, qui avance à la vitesse du monde réel.
 *
 * Aucune requête au DOM ici : le canvas est passé en argument (seul
 * `partager()` fabrique un `<a>` quand il faut retomber sur le téléchargement).
 */
import { FPS } from "./roulette.js";

/** Mimes essayés dans l'ordre de préférence : mp4 d'abord (Safari, TikTok), webm ensuite. */
export const MIMES = [
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm",
];

export const RAISON_INCAPABLE =
  "Ce navigateur ne sait pas enregistrer la vidéo — utilise l'enregistrement d'écran iOS.";
export const MESSAGE_SANS_ROULETTE = "Choisis au moins 2 objets et une cible avant d'enregistrer";

/** 1080×1920 à 30 fps : en dessous de ~10 Mb/s, les aplats de laiton bavent. */
const DEBIT_VIDEO = 12_000_000;
/** Un morceau toutes les 250 ms : le MediaRecorder ne garde pas tout en mémoire d'un bloc. */
const PERIODE_MORCEAU = 250;
/** Battement entre `rec.start()` et la première frame : le temps que l'encodeur démarre (s). */
const AVANCE_DEPART = 0.1;

/** Premier mime supporté de `MIMES`, ou `null`. `supportes` est un prédicat (m) → bool. */
export function choisirMime(supportes) {
  return MIMES.find((m) => supportes(m)) ?? null;
}

/**
 * `broc-roulette-<cible>.mp4|webm`. L'identifiant est assaini (accents,
 * espaces, séparateurs de chemin) : il finit dans un nom de fichier que le
 * système du téléphone doit accepter tel quel.
 */
export function nomFichierPour(cibleId, mime) {
  const ext = String(mime ?? "").startsWith("video/mp4") ? "mp4" : "webm";
  const cible = String(cibleId ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // « Doré » → « Dore »
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cible ? `broc-roulette-${cible}.${ext}` : `broc-roulette.${ext}`;
}

/**
 * Ce que sait faire le navigateur courant.
 * → { ok, mime, raison? } — `raison` est un message affichable tel quel.
 */
export function capacitesEnregistrement() {
  const incapable = { ok: false, mime: null, raison: RAISON_INCAPABLE };
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return incapable;
  // Safari < 15 et quelques WebView : MediaRecorder existe, mais pas la capture du canvas.
  if (typeof HTMLCanvasElement === "undefined" || !HTMLCanvasElement.prototype.captureStream) return incapable;
  const mime = choisirMime((m) => MediaRecorder.isTypeSupported(m));
  return mime ? { ok: true, mime } : incapable;
}

/**
 * Enregistre un tour complet de la roulette courante.
 * → { blob, nomFichier, fpsMoyen }
 *
 * L'aperçu est arrêté le temps de la prise (une seule boucle de dessin, la
 * nôtre, sinon les deux se disputeraient le canvas) puis relancé quoi qu'il
 * arrive. `onProgression` reçoit une fraction entre 0 et 1.
 */
export async function enregistrer({ canvas, apercu, son, cibleId, mime, onProgression }) {
  const r = apercu.r;
  if (!r) throw new Error(MESSAGE_SANS_ROULETTE);
  const type = mime ?? capacitesEnregistrement().mime;
  if (!type) throw new Error(RAISON_INCAPABLE);

  apercu.arreter();
  try {
    const flux = canvas.captureStream(FPS);
    // `son.destination` crée le contexte audio au besoin — d'où la règle : toujours
    // `await son.demarrer()` (dans le geste utilisateur) avant d'arriver ici.
    const pisteSon = son.destination.stream.getAudioTracks()[0];
    if (pisteSon) flux.addTrack(pisteSon);

    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: DEBIT_VIDEO });
    const morceaux = [];
    let echec = null;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) morceaux.push(e.data); };
    const arrete = new Promise((resolve, reject) => {
      rec.onstop = () => (echec ? reject(echec) : resolve());
      rec.onerror = (e) => {
        echec = new Error(`L'enregistrement a échoué : ${e?.error?.message ?? "erreur du navigateur"}`);
        reject(echec);
      };
    });

    rec.start(PERIODE_MORCEAU);
    const t0 = performance.now() + AVANCE_DEPART * 1000;
    son.planifierTour(r, son.tempsContexte + AVANCE_DEPART);

    let frames = 0;
    await new Promise((resolve, reject) => {
      const boucle = () => {
        if (echec) { reject(echec); return; }
        const t = (performance.now() - t0) / 1000;
        if (t >= r.duree) {
          // La dernière frame vaut exactement la première (t = duree ≡ 0) : la boucle TikTok est propre.
          apercu.dessinerA(r.duree);
          frames++;
          onProgression?.(1);
          resolve();
          return;
        }
        apercu.dessinerA(Math.max(0, t));
        if (t >= 0) frames++;
        onProgression?.(Math.max(0, t / r.duree));
        requestAnimationFrame(boucle);
      };
      requestAnimationFrame(boucle);
    });

    rec.stop();
    await arrete;
    // La piste vidéo du canvas ne sert plus ; celle du son appartient au graphe audio, on n'y touche pas.
    for (const piste of flux.getVideoTracks()) piste.stop();

    return {
      blob: new Blob(morceaux, { type }),
      nomFichier: nomFichierPour(cibleId, type),
      fpsMoyen: frames / r.duree,
    };
  } finally {
    apercu.jouer();
  }
}

/** Le temps qu'on laisse au navigateur pour aller chercher le blob avant de le libérer (ms). */
const DELAI_REVOCATION = 60_000;

/**
 * Feuille de partage iOS si elle accepte les fichiers, sinon téléchargement.
 * → "partage" | "telechargement" | "annule"
 *
 * ⚠️ `navigator.share` exige un contexte sécurisé (HTTPS) : en local on
 * tombe toujours sur le téléchargement.
 */
export async function partager(blob, nomFichier) {
  const fichier = new File([blob], nomFichier, { type: blob.type });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: "BROC" });
      return "partage";
    } catch (e) {
      if (e?.name === "AbortError") return "annule";   // il a fermé la feuille : ce n'est pas une panne.
      throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), DELAI_REVOCATION);
  return "telechargement";
}
