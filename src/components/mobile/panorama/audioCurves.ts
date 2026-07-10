/**
 * Courbes de volume audio pilotées par l'index de zone fractionnaire du
 * panorama bureau 3 zones (0 = bureau · 1 = porte · 2 = repos).
 * Le gramophone et la cheminée sont dans le coin repos (idx 2).
 */

/** Volume vinyle : ramp du bureau vers le repos (pic au gramophone). */
export function volumeVinylForPos(pos: number): number {
  if (pos <= 1) return 0.3 + 0.2 * Math.max(0, pos); // 0.3 → 0.5 (porte)
  return Math.min(0.8, 0.5 + 0.3 * (pos - 1)); // 0.5 → 0.8 (repos)
}

/** Volume cheminée : triangulaire, nul au bureau, pic au repos (idx 2). */
export function fireplaceVolumeForPos(pos: number): number {
  return Math.min(0.6, 0.3 * Math.max(0, pos)); // 0 → 0.6 (repos)
}
