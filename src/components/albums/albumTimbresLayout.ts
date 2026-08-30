/* ── GÉOMÉTRIE PURE DE L'ALBUM DE TIMBRES ────────────────────────────────
   Aucune dépendance DOM : testable sans jsdom. Transforme une position
   d'écran (issue d'un drag) en placement `{ ligne, x }` aimanté — 5 lignes
   fixes par page, x continu mais borné pour que le timbre (centré sur son
   point d'ancrage) ne déborde jamais de la page. Réutilisé tel quel par
   `AlbumTimbresOverlay` pour la pose au pointeur ET pour la vérification
   « le point lâché est-il dans le bac ? » (bornes seules, ligne/x ignorés). */

/** Largeur d'un timbre, en fraction de la largeur de page. */
export const TAILLE_TIMBRE = 1 / 6;

/** Hauteur de page = largeur × ce ratio (page plus haute que large). */
export const HAUTEUR_PAGE_RATIO = 1.3;

export type Ligne = 0 | 1 | 2 | 3 | 4;

/** Un DOMRect n'a pas besoin d'être un vrai DOMRect ici — juste ces 4 champs. */
export interface DOMRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Centre vertical de la ligne, en fraction de la hauteur de page (0..1) : 5 lignes égales. */
export function yDeLigne(ligne: Ligne): number {
  return (ligne + 0.5) / 5;
}

/** La ligne dont le centre est le plus proche de la fraction verticale donnée. */
export function ligneLaPlusProche(yFraction: number): Ligne {
  const idx = Math.round(yFraction * 5 - 0.5);
  return Math.min(4, Math.max(0, idx)) as Ligne;
}

/** Borne x à la demi-largeur du timbre de chaque côté, pour qu'il reste sur la page. */
export function xBorne(xFraction: number): number {
  const demi = TAILLE_TIMBRE / 2;
  return Math.min(1 - demi, Math.max(demi, xFraction));
}

/**
 * Position aimantée depuis un point écran (drag), relative au rect de la page —
 * `null` si le point est hors de la page (le composant essaie alors le bac).
 */
export function positionDepuisPointeur(
  rectPage: DOMRectLike,
  clientX: number,
  clientY: number,
): { ligne: Ligne; x: number } | null {
  if (
    clientX < rectPage.left ||
    clientX > rectPage.left + rectPage.width ||
    clientY < rectPage.top ||
    clientY > rectPage.top + rectPage.height
  ) {
    return null;
  }
  const xFraction = (clientX - rectPage.left) / rectPage.width;
  const yFraction = (clientY - rectPage.top) / rectPage.height;
  return { ligne: ligneLaPlusProche(yFraction), x: xBorne(xFraction) };
}
