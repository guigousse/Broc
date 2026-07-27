/**
 * Étage vidéo : génération d'un plan via Veo.
 * Le client `ai` et la fonction d'attente sont injectés.
 */
import { DUREES } from "./config.mjs";

export function prochainTake(fichiers, prefixe) {
  const motif = new RegExp(`^${prefixe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-take(\\d+)\\.mp4$`);
  let max = 0;
  for (const nom of fichiers) {
    const m = nom.match(motif);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export function nomPrise(id, plan, take) {
  return `${id}-p${plan}-take${take}.mp4`;
}

/**
 * Réserve atomiquement le prochain numéro de prise disponible.
 *
 * `prochainTake` ne fait qu'une estimation à partir d'un instantané du
 * dossier (`readdir`) : entre cette lecture et le premier octet écrit,
 * plusieurs minutes s'écoulent (l'appel Veo). Si deux exécutions tournent
 * en même temps sur le même épisode/plan, les deux liraient le même
 * instantané et calculeraient le même `takeN` — la seconde écraserait alors
 * la vidéo déjà payée par la première.
 *
 * Ici, chaque numéro candidat est soumis à `tryReserver`, qui doit
 * effectuer une réservation *atomique* côté appelant (typiquement créer un
 * fichier avec le drapeau d'exclusion `wx`, qui échoue si le nom existe
 * déjà) et rendre `true`/`false` selon que la réservation a réussi. En cas
 * d'échec on passe au numéro suivant : une exécution concurrente qui a déjà
 * pris ce numéro ne peut donc jamais se le faire souffler, et inversement.
 */
export async function reserverPrise({ fichiers, prefixe, tryReserver }) {
  let take = prochainTake(fichiers, prefixe);
  for (;;) {
    const reserve = await tryReserver(take);
    if (reserve) return take;
    take += 1;
  }
}

export function nomJournalRaccord(id) {
  return `${id}-raccord.json`;
}

/**
 * Valide et extrait la prise du plan 1 dont provient une image de raccord,
 * à partir du contenu déjà parsé de son journal (`nomJournalRaccord`).
 * Rend une erreur parlante plutôt qu'un `undefined` silencieux : la
 * filiation du raccord doit toujours être traçable, sans quoi la Task 8 ne
 * peut pas vérifier que le plan 2 monté correspond bien au plan 1 dont il
 * est issu.
 */
export function extraireSourceRaccord(journal) {
  if (!journal || typeof journal.prise !== "string" || !journal.prise) {
    throw new Error("champ « prise » manquant ou invalide dans le journal de raccord");
  }
  return journal.prise;
}

export async function attendreOperation({ ai, operation, dormir, journaliser }) {
  let courante = operation;
  let tours = 0;
  while (!courante.done) {
    await dormir(10000);
    tours++;
    journaliser(`⏳  génération en cours… (${tours * 10} s)`);
    courante = await ai.operations.getVideosOperation({ operation: courante });
  }
  if (courante.error) {
    throw new Error(`Veo a échoué : ${courante.error.message ?? JSON.stringify(courante.error)}`);
  }
  return courante;
}

export async function genererVideo({ ai, model, prompt, image, definition, dormir, journaliser }) {
  const operation = await ai.models.generateVideos({
    model,
    prompt,
    image,
    config: {
      aspectRatio: "9:16",
      resolution: definition,
      numberOfVideos: 1,
      durationSeconds: DUREES.plan,
      // Pas de `generateAudio` : ce drapeau n'existe que côté Gemini
      // Enterprise Agent Platform (Vertex) et fait rejeter la requête (avant
      // toute facturation) en mode Gemini Developer API — confirmé le
      // 2026-07-27 par un essai réel. Veo 3.x produit son audio nativement,
      // sans qu'il soit besoin de le demander.
      // `personGeneration: "allow_adult"` et non `"allow_all"` : on part
      // toujours d'une image (étal ou raccord), jamais d'un simple texte —
      // or en mode image-to-video, seul `"allow_adult"` est accepté par
      // l'API Developer (`"allow_all"` n'est valable qu'en texte→vidéo).
      personGeneration: "allow_adult",
    },
  });

  const finale = await attendreOperation({ ai, operation, dormir, journaliser });
  const video = finale.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("aucune vidéo dans la réponse de Veo");
  return video;
}
