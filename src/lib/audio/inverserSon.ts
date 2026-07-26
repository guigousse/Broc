/**
 * Inversion d'un son, amorce silencieuse rognée.
 *
 * Un geste joué à l'envers (un coffre qui s'ouvre = une fermeture retournée)
 * demande un tampon retourné. Mais un son de fermeture, de moteur ou de porte
 * finit presque toujours par une queue de silence ou de réverbération :
 * retournée, cette queue devient une amorce muette, et le son paraît démarrer
 * en retard alors qu'il a bien été déclenché à l'heure. D'autant plus s'il est
 * ralenti ensuite, ce qui allonge le silence d'autant.
 *
 * Isolé de `audioManager` parce que le mock Web Audio des tests ne fabrique
 * pas de vrais `AudioBuffer` : cette logique ne serait pas couverte sinon.
 */

/** Amplitude en dessous de laquelle un échantillon compte pour du silence (≈ −40 dBFS). */
export const SEUIL_SILENCE = 0.01;

/**
 * Indice du premier échantillon audible, tous canaux confondus.
 *
 * Renvoie 0 si le tout premier échantillon est déjà audible (rien à rogner)
 * **comme** si l'ensemble est sous le seuil (rien d'audible à trouver : mieux
 * vaut tout garder que rendre un tampon vide).
 */
export function premierEchantillonAudible(
  canaux: ReadonlyArray<Float32Array>,
  seuil = SEUIL_SILENCE,
): number {
  const longueur = canaux[0]?.length ?? 0;
  if (longueur === 0) return 0;

  // On cherche le plus précoce : chaque canal ne s'explore que jusqu'au
  // meilleur déjà trouvé.
  let debut = longueur;
  for (const echantillons of canaux) {
    for (let i = 0; i < debut; i++) {
      if (Math.abs(echantillons[i]) > seuil) {
        debut = i;
        break;
      }
    }
  }
  return debut >= longueur ? 0 : debut;
}

/**
 * Retourne les canaux fournis et rogne le silence de tête ainsi créé.
 *
 * Les tableaux d'entrée ne sont pas modifiés. Tous les canaux sont rognés du
 * même nombre d'échantillons, sans quoi ils se désynchroniseraient.
 */
export function inverserEtRogner(
  canaux: ReadonlyArray<Float32Array>,
  seuil = SEUIL_SILENCE,
): { canaux: Float32Array<ArrayBuffer>[]; rognes: number } {
  // Allocation explicite plutôt que `Float32Array.from(...).reverse()` : le
  // tampon doit être un `ArrayBuffer` propre, seul type que
  // `AudioBuffer.copyToChannel` accepte (et non un `ArrayBufferLike`).
  const inverses = canaux.map((c) => {
    const copie = new Float32Array(c.length);
    for (let i = 0; i < c.length; i++) copie[i] = c[c.length - 1 - i];
    return copie;
  });

  const debut = premierEchantillonAudible(inverses, seuil);
  return {
    // `slice` et non `subarray` : on veut des tampons autonomes, que
    // `AudioBuffer.copyToChannel` accepte et qui n'aliasent pas la source.
    canaux: inverses.map((c) => c.slice(debut)),
    rognes: debut,
  };
}
