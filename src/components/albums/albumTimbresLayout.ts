/* ── GÉOMÉTRIE PURE DE L'ALBUM DE TIMBRES ────────────────────────────────
   Aucune dépendance DOM : testable sans jsdom. Transforme une position
   d'écran (issue d'un drag) en placement `{ ligne, x }` aimanté — 5 lignes
   fixes par page, x continu mais borné pour que le timbre (centré sur son
   point d'ancrage) ne déborde jamais de la page. Réutilisé tel quel par
   `AlbumTimbresOverlay` pour la pose au pointeur ET pour la vérification
   « le point lâché est-il dans le bac ? » (bornes seules, ligne/x ignorés). */

// TAILLE_TIMBRE et xBorne vivent dans `src/lib/albums` (poserTimbre en a
// besoin) et sont ré-exportées ici pour ne rien changer côté appelants.
import { xBorne } from "@/lib/albums";
export { TAILLE_TIMBRE, xBorne } from "@/lib/albums";

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

/** Le bandeau translucide d'une ligne (vrai album à bandes) : commence SOUS
 *  le centre du timbre et descend un peu sous son bord bas, sans mordre la
 *  ligne suivante — il ne recouvre que le tiers bas du timbre, le plastique
 *  par-dessus (photo Lindner ; « timbres trop bas » corrigé le 2026-08-31).
 *  Fractions de la hauteur de page. */
export const BANDE_TOP = 0.02;
export const BANDE_HAUTEUR = 0.07;
export function bandeDeLigne(ligne: Ligne): { top: number; hauteur: number } {
  return { top: yDeLigne(ligne) + BANDE_TOP, hauteur: BANDE_HAUTEUR };
}

/** La ligne dont le centre est le plus proche de la fraction verticale donnée. */
export function ligneLaPlusProche(yFraction: number): Ligne {
  const idx = Math.round(yFraction * 5 - 0.5);
  return Math.min(4, Math.max(0, idx)) as Ligne;
}

/**
 * Position aimantée depuis un point écran (drag), relative au rect de la page —
 * `null` si le point est hors de la page (le composant essaie alors le bac).
 * `tolerancePx` élargit la page de chaque côté : un point dans cette marge
 * est ramené au bord le plus proche puis aimanté (le timbre est centré sous
 * le doigt, qui peut sortir de quelques px quand on vise la 1ʳᵉ bande).
 */
export function positionDepuisPointeur(
  rectPage: DOMRectLike,
  clientX: number,
  clientY: number,
  tolerancePx = 0,
): { ligne: Ligne; x: number } | null {
  const droite = rectPage.left + rectPage.width;
  const bas = rectPage.top + rectPage.height;
  if (
    clientX < rectPage.left - tolerancePx ||
    clientX > droite + tolerancePx ||
    clientY < rectPage.top - tolerancePx ||
    clientY > bas + tolerancePx
  ) {
    return null;
  }
  const x = Math.min(droite, Math.max(rectPage.left, clientX));
  const y = Math.min(bas, Math.max(rectPage.top, clientY));
  const xFraction = (x - rectPage.left) / rectPage.width;
  const yFraction = (y - rectPage.top) / rectPage.height;
  return { ligne: ligneLaPlusProche(yFraction), x: xBorne(xFraction) };
}
