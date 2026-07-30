/** Lie un temps de confiance (epoch ms) à une lecture d'horloge monotone. */
export interface AncreTemps {
  /** Temps de confiance au moment de la pose (epoch ms). */
  confiance: number;
  /** Lecture `performance.now()` au moment de la pose (ms monotones). */
  mono: number;
  /** Lecture `Date.now()` au moment de la pose (epoch ms, horloge murale). */
  mural: number;
}

export function poserAncre(
  confiance: number,
  mono: number,
  mural: number,
): AncreTemps {
  return { confiance, mono, mural };
}

/**
 * Temps de confiance courant, extrapolé depuis l'ancre.
 *
 * On retient le PLUS AVANCÉ des deux deltas écoulés depuis la pose :
 * - le delta monotone (`performance.now()`) ignore un réglage manuel de
 *   l'horloge système en cours de session — mais il SE FIGE pendant la veille
 *   profonde iOS, et le temps de confiance resterait alors en retard sur le
 *   temps réel (énergie et minuteries gelées au retour dans l'app) ;
 * - le delta mural (`Date.now()`) traverse la veille — mais il suit un
 *   changement d'heure système.
 *
 * Le max corrige le gel sans jamais permettre de RECULER (une horloge reculée
 * donne un delta mural plus petit, le monotone l'emporte). Un joueur qui
 * avance son horloge hors ligne gagne du temps jusqu'au prochain recalage
 * réseau — c'était déjà le cas avant (`sync()` ré-ancrait sur `Date.now()` dès
 * le retour au premier plan) ; la source de temps réseau reste l'autorité.
 */
export function tempsConfianceCourant(
  ancre: AncreTemps,
  mono: number,
  mural: number,
): number {
  const ecoule = Math.max(mono - ancre.mono, mural - ancre.mural);
  return ancre.confiance + ecoule;
}
