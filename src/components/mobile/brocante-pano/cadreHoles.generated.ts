/**
 * Bounding box du TROU intérieur (zone transparente) de chaque cadre
 * bois, exprimée en pourcentage du cadre lui-même.
 *
 * Généré par `npm run measure:cadres` — NE PAS éditer à la main.
 */

export interface CadreHole {
  /** En % du cadre. */
  left: number;
  /** En % du cadre. */
  top: number;
  /** En % du cadre. */
  width: number;
  /** En % du cadre. */
  height: number;
  /** Ratio width/height du cadre entier — utile pour calculer l'aspect du slot. */
  cadreAspect: number;
}

export const CADRE_HOLES: Record<1 | 2 | 3 | 4 | 5, CadreHole> = {
  1: { left: 10.20, top: 9.37, width: 79.61, height: 81.82, cadreAspect: 0.8375 },
  2: { left: 9.92, top: 11.48, width: 78.47, height: 77.60, cadreAspect: 0.9645 },
  3: { left: 9.80, top: 1.11, width: 89.87, height: 90.91, cadreAspect: 0.6785 },
  4: { left: 9.33, top: 11.72, width: 81.05, height: 77.24, cadreAspect: 1.1828 },
  5: { left: 9.11, top: 11.30, width: 82.03, height: 77.05, cadreAspect: 1.3151 },
};
