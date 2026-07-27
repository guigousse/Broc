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
      generateAudio: true,
      personGeneration: "allow_all",
    },
  });

  const finale = await attendreOperation({ ai, operation, dormir, journaliser });
  const video = finale.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("aucune vidéo dans la réponse de Veo");
  return video;
}
