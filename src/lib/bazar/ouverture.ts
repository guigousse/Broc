import type { GameState } from "@/types/game";

/**
 * Jour de jeu du 10 juillet 1924, ouverture du Bazar (Jour 1 = 6 juin 1924,
 * cf. `src/lib/calendrier.ts`). C'est un événement du calendrier, pas une
 * récompense de progression : le Bazar ouvre ses portes, il ne se mérite pas.
 */
export const JOUR_OUVERTURE_BAZAR = 35;

/** Vrai si le joueur a atteint le jour d'ouverture. */
export function bazarEstOuvert(state: GameState): boolean {
  return state.jourActuel >= JOUR_OUVERTURE_BAZAR;
}
