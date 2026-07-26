/**
 * Minutage de la « relève » du véhicule : l'ancien s'efface, l'échange se fait
 * à l'abri derrière une opacité nulle, le nouveau réapparaît.
 *
 * Isolé du composant parce que c'est la seule partie où une erreur est
 * plausible, et que la piloter à travers requestAnimationFrame en jsdom
 * coûterait plus qu'elle ne rapporte.
 */

export const RELEVE_FONDU_SORTIE_MS = 300;
export const RELEVE_PAUSE_MS = 100;
export const RELEVE_FONDU_ENTREE_MS = 400;

/**
 * Instant où l'état bascule sur le nouveau palier. DOIT tomber quand l'opacité
 * est nulle : plus tôt, et c'est le nouveau véhicule qu'on verrait s'effacer.
 */
export const RELEVE_BASCULE_MS = RELEVE_FONDU_SORTIE_MS;

export const RELEVE_DUREE_MS =
  RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS + RELEVE_FONDU_ENTREE_MS;

/** Opacité du véhicule à `t` millisecondes du début de la séquence. */
export function opaciteReleve(t: number): number {
  if (t <= 0) return 1;
  if (t < RELEVE_FONDU_SORTIE_MS) return 1 - t / RELEVE_FONDU_SORTIE_MS;

  const finPause = RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS;
  if (t < finPause) return 0;
  if (t >= RELEVE_DUREE_MS) return 1;

  return (t - finPause) / RELEVE_FONDU_ENTREE_MS;
}
