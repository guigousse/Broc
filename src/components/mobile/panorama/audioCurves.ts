/**
 * Courbes de volume audio pilotées par l'index de zone fractionnaire du
 * panorama unifié 9 zones (0 = lecture … 8 = coinL).
 *
 * Repère des zones :
 *   0 lecture · 1 vitrine · 2 escalier   (Collection)
 *   3 bureau  · 4 porte   · 5 repos      (Bureau — gramophone+cheminée au repos)
 *   6 stockage · 7 etabli · 8 coinL      (Atelier)
 */

/** Volume vinyle : faible dans la Collection, ramp dans le bureau (pic au
 *  repos = gramophone), décroissance douce vers l'atelier. */
export function volumeVinylForPos(pos: number): number {
  if (pos <= 3) return 0.3; // collection + bureau gauche
  if (pos <= 4) return 0.3 + 0.2 * (pos - 3); // 0.3 → 0.5 (porte)
  if (pos <= 5) return 0.5 + 0.3 * (pos - 4); // 0.5 → 0.8 (repos)
  if (pos <= 6) return 0.8 - 0.4 * (pos - 5); // 0.8 → 0.4 (stockage)
  if (pos <= 7) return 0.4 - 0.1 * (pos - 6); // 0.4 → 0.3 (etabli)
  return Math.max(0.2, 0.3 - 0.1 * (pos - 7)); // 0.3 → 0.2 (coinL)
}

/** Volume cheminée : triangulaire, nul hors bureau, pic au repos (idx 5). */
export function fireplaceVolumeForPos(pos: number): number {
  if (pos <= 3) return 0; // collection + bureau gauche : pas de feu visible
  if (pos <= 5) return 0.3 * (pos - 3); // 0 → 0.6 (repos)
  return Math.max(0, 0.6 - 0.2 * (pos - 5)); // 0.6 → 0 (atelier)
}
