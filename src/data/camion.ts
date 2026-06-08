import type { NiveauCamion, TailleObjet } from "@/types/game";
import { PLACES_PAR_TAILLE } from "@/types/game";

export interface CamionConfig {
  niveau: NiveauCamion;
  nom: string;
  cotePixels: number;
  capacitePlaces: number;
  prixUpgradeVersCeNiveau: number | null;
}

export const CAMIONS: readonly CamionConfig[] = [
  { niveau: 1, nom: "4L",         cotePixels: 280, capacitePlaces: 9,  prixUpgradeVersCeNiveau: null },
  { niveau: 2, nom: "Break",      cotePixels: 280, capacitePlaces: 16, prixUpgradeVersCeNiveau: 150 },
  { niveau: 3, nom: "Utilitaire", cotePixels: 280, capacitePlaces: 25, prixUpgradeVersCeNiveau: 500 },
  { niveau: 4, nom: "Fourgon",    cotePixels: 280, capacitePlaces: 36, prixUpgradeVersCeNiveau: 1500 },
] as const;

export function getCamion(niveau: NiveauCamion): CamionConfig {
  return CAMIONS[niveau - 1];
}

export function getProchainCamion(niveau: NiveauCamion): CamionConfig | null {
  return niveau < 4 ? CAMIONS[niveau] : null;
}

/**
 * Échelle visuelle d'un objet en fonction de la taille et de la capacité totale du coffre.
 * Hypothèse : 1 XL en N1 (9 places) = tout le coffre (scale = 1).
 */
export function getScaleCoffre(
  taille: TailleObjet,
  capacitePlaces: number,
): number {
  return Math.sqrt(PLACES_PAR_TAILLE[taille] / capacitePlaces);
}
