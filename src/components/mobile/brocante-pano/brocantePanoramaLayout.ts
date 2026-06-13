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

export interface PlaqueCoord {
  left: string;
  top: string;
  width: string;
}

// Tier 1 — 5 brocantes alignées sur une rangée basse
export const TIER_1_FRAMES: FrameCoord[] = [
  { id: "vide-grenier-quartier",     left: "6%",  top: "28%", width: "16%", height: "32%" },
  { id: "marche-aux-puces-dimanche", left: "25%", top: "28%", width: "16%", height: "32%" },
  { id: "bouquinerie-plein-air",     left: "44%", top: "28%", width: "16%", height: "32%" },
  { id: "vide-dressing-centre",      left: "63%", top: "28%", width: "16%", height: "32%" },
  { id: "brocante-club-jeux",        left: "82%", top: "28%", width: "16%", height: "32%" },
];

export const TIER_2_FRAMES: FrameCoord[] = [
  { id: "deballage-collectionneurs",     left: "6%",  top: "26%", width: "16%", height: "32%" },
  { id: "marche-saint-ouen",             left: "25%", top: "26%", width: "16%", height: "32%" },
  { id: "disquaire-independant",         left: "44%", top: "26%", width: "16%", height: "32%" },
  { id: "atelier-bricoleur",             left: "63%", top: "26%", width: "16%", height: "32%" },
  { id: "marche-antiquaires-bibelots",   left: "82%", top: "26%", width: "16%", height: "32%" },
];

// Tier 3 — 6 brocantes (plus petit format pour rentrer)
export const TIER_3_FRAMES: FrameCoord[] = [
  { id: "foire-chatou",                    left: "4%",  top: "24%", width: "14%", height: "30%" },
  { id: "salon-grands-collectionneurs",    left: "20%", top: "24%", width: "14%", height: "30%" },
  { id: "drouot-mode-couture",             left: "36%", top: "24%", width: "14%", height: "30%" },
  { id: "salon-violon-ancien",             left: "52%", top: "24%", width: "14%", height: "30%" },
  { id: "galerie-arts-decoratifs",         left: "68%", top: "24%", width: "14%", height: "30%" },
  { id: "galerie-tableaux-sculptures",     left: "84%", top: "24%", width: "14%", height: "30%" },
];

// Tier 4 — 1 cadre central monumental
export const TIER_4_FRAMES: FrameCoord[] = [
  { id: "salon-antiquaires-drouot", left: "32%", top: "16%", width: "36%", height: "50%" },
];

export const SCENE_FRAMES: Record<BrocanteTier, FrameCoord[]> = {
  1: TIER_1_FRAMES,
  2: TIER_2_FRAMES,
  3: TIER_3_FRAMES,
  4: TIER_4_FRAMES,
};

export const SCENE_PLAQUE: Record<BrocanteTier, PlaqueCoord> = {
  1: { left: "38%", top: "70%", width: "24%" },
  2: { left: "38%", top: "70%", width: "24%" },
  3: { left: "38%", top: "70%", width: "24%" },
  4: { left: "30%", top: "74%", width: "40%" },
};
