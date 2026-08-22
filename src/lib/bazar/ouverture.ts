import type { GameState } from "@/types/game";

/**
 * Jour de jeu du 25 juin 1924, ouverture du Bazar (Jour 1 = 6 juin 1924,
 * cf. `src/lib/calendrier.ts`). C'est un événement du calendrier, pas une
 * récompense de progression : le Bazar ouvre ses portes, il ne se mérite pas.
 */
export const JOUR_OUVERTURE_BAZAR = 20;

/** Vrai si le joueur a atteint le jour d'ouverture. */
export function bazarEstOuvert(state: GameState): boolean {
  return state.jourActuel >= JOUR_OUVERTURE_BAZAR;
}

/**
 * Jours de jeu restant avant l'ouverture, jamais négatif : le bouton de la
 * porte affiche « J-{n} » tant que le Bazar est fermé.
 */
export function joursAvantOuvertureBazar(state: GameState): number {
  return Math.max(0, JOUR_OUVERTURE_BAZAR - state.jourActuel);
}
