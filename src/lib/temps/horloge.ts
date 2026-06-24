/** Lie un temps de confiance (epoch ms) à une lecture d'horloge monotone. */
export interface AncreTemps {
  /** Temps de confiance au moment de la pose (epoch ms). */
  confiance: number;
  /** Lecture `performance.now()` au moment de la pose (ms monotones). */
  mono: number;
}

export function poserAncre(confiance: number, mono: number): AncreTemps {
  return { confiance, mono };
}

/**
 * Temps de confiance courant, extrapolé via l'horloge monotone.
 * Insensible aux changements d'heure système : `mono` ne recule jamais et
 * n'est pas affecté par un réglage manuel de l'horloge.
 */
export function tempsConfianceCourant(ancre: AncreTemps, mono: number): number {
  return ancre.confiance + (mono - ancre.mono);
}
