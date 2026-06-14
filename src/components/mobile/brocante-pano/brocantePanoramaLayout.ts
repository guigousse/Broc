/**
 * Coordonnées des cadres et plaquettes du panorama de brocantes.
 *
 * Toutes les valeurs sont exprimées en pourcentage de la SCÈNE (qui fait
 * 100vw × full-height). À ajuster à l'œil après intégration des fonds.
 */

import type { BrocanteTier } from "@/types/game";

export interface FrameCoord {
  /** id de la brocante (cf. src/data/brocantes.ts). */
  id: string;
  /** En % de la largeur de scène. */
  left: string;
  /** En % de la hauteur de scène. */
  top: string;
  /** En % de la largeur de scène. */
  width: string;
  /** En % de la hauteur de scène. */
  height: string;
}

// Tier 1 — 5 brocantes en 3+2 (coords ajustées via l'outil dev).
export const TIER_1_FRAMES: FrameCoord[] = [
  { id: "vide-grenier-quartier",     left: "6.00%",  top: "23.00%", width: "29.00%", height: "18.00%" },
  { id: "marche-aux-puces-dimanche", left: "37.00%", top: "21.00%", width: "26.08%", height: "19.75%" },
  { id: "bouquinerie-plein-air",     left: "65.00%", top: "24.00%", width: "29.33%", height: "16.74%" },
  { id: "vide-dressing-centre",      left: "48.00%", top: "42.00%", width: "30.79%", height: "16.47%" },
  { id: "brocante-club-jeux",        left: "18.00%", top: "42.00%", width: "28.00%", height: "20.00%" },
];

// Tier 2 — 5 brocantes (coords ajustées via l'outil dev).
export const TIER_2_FRAMES: FrameCoord[] = [
  { id: "deballage-collectionneurs",   left: "10.69%", top: "43.25%", width: "36.52%", height: "18.48%" },
  { id: "marche-saint-ouen",           left: "6.37%",  top: "22.55%", width: "24.71%", height: "18.58%" },
  { id: "disquaire-independant",       left: "64.92%", top: "26.46%", width: "30.26%", height: "14.65%" },
  { id: "atelier-bricoleur",           left: "49.43%", top: "43.23%", width: "34.98%", height: "20.12%" },
  { id: "marche-antiquaires-bibelots", left: "33.38%", top: "18.83%", width: "29.49%", height: "22.28%" },
];

// Tier 3 — 6 brocantes (coords ajustées via l'outil dev).
export const TIER_3_FRAMES: FrameCoord[] = [
  { id: "foire-chatou",                left: "5.00%",  top: "26.00%", width: "29.00%", height: "14.00%" },
  { id: "salon-grands-collectionneurs", left: "10.00%", top: "41.00%", width: "23.00%", height: "18.00%" },
  { id: "drouot-mode-couture",         left: "66.00%", top: "41.00%", width: "29.00%", height: "16.00%" },
  { id: "salon-violon-ancien",         left: "66.00%", top: "23.00%", width: "27.00%", height: "17.00%" },
  { id: "galerie-arts-decoratifs",     left: "35.00%", top: "46.00%", width: "29.00%", height: "15.00%" },
  { id: "galerie-tableaux-sculptures", left: "36.00%", top: "20.00%", width: "28.00%", height: "25.00%" },
];

// Tier 4 — 1 cadre central monumental.
export const TIER_4_FRAMES: FrameCoord[] = [
  { id: "salon-antiquaires-drouot", left: "18.75%", top: "21.17%", width: "61.64%", height: "36.84%" },
];

export const SCENE_FRAMES: Record<BrocanteTier, FrameCoord[]> = {
  1: TIER_1_FRAMES,
  2: TIER_2_FRAMES,
  3: TIER_3_FRAMES,
  4: TIER_4_FRAMES,
};
