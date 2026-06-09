import type { NiveauCamion, TailleObjet } from "@/types/game";
import { PLACES_PAR_TAILLE } from "@/types/game";

export interface CamionConfig {
  niveau: NiveauCamion;
  nom: string;
  /** Identifiant des assets visuels (ouvert/fermé/masque) — voir `coffreAssets`. */
  visuelId: string;
  /** Ratio largeur/hauteur du visuel du coffre (utilisé pour aspect-ratio CSS). */
  aspectRatio: number;
  capacitePlaces: number;
  prixUpgradeVersCeNiveau: number | null;
}

export const CAMIONS: readonly CamionConfig[] = [
  { niveau: 1, nom: "Rogers",     visuelId: "rogers", aspectRatio: 1408 / 1358, capacitePlaces: 9,  prixUpgradeVersCeNiveau: null },
  { niveau: 2, nom: "Break",      visuelId: "break",  aspectRatio: 1718 / 1456, capacitePlaces: 16, prixUpgradeVersCeNiveau: 150 },
  { niveau: 3, nom: "Utilitaire", visuelId: "utilitaire", aspectRatio: 1,       capacitePlaces: 25, prixUpgradeVersCeNiveau: 500 },
] as const;

export function getCamion(niveau: NiveauCamion): CamionConfig {
  return CAMIONS[niveau - 1];
}

export function getProchainCamion(niveau: NiveauCamion): CamionConfig | null {
  return niveau < 3 ? CAMIONS[niveau] : null;
}

/**
 * Capacité de référence (Rogers, N1) qui sert d'ancrage : à cette capacité,
 * les objets gardent leur scale "naturelle" √(places / 9).
 */
const CAPACITE_REFERENCE = 9;

/**
 * Échelle visuelle d'un objet en fonction de la taille et de la capacité totale du coffre.
 *
 * Formule hybride : la base reste √(places/9) pour le coffre Rogers, et un
 * facteur de réduction additionnel `(9/capacite)^0.25` modère la décroissance
 * dans les coffres plus grands. Au lieu de rétrécir avec √, on tire avec ^0.25.
 *
 * Exemple piano XL (5 places) :
 *  - Rogers (cap 9)     → 0.745 du côté
 *  - Break  (cap 16)    → 0.645
 *  - Utilitaire (cap 25) → 0.577
 */
export function getScaleCoffre(
  taille: TailleObjet,
  capacitePlaces: number,
): number {
  const baseScale = Math.sqrt(PLACES_PAR_TAILLE[taille] / CAPACITE_REFERENCE);
  const shrinkFactor = Math.pow(CAPACITE_REFERENCE / capacitePlaces, 0.25);
  return baseScale * shrinkFactor;
}
