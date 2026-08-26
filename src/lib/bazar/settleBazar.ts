import type { GameState } from "@/types/game";
import { cleSemaineLocale } from "@/lib/quetes/periode";
import { bazarEstOuvert } from "./ouverture";
import { genererEtal } from "./etal";

/**
 * Régénère l'étal si la semaine a changé. Pur, idempotent : retourne la MÊME
 * référence si rien ne bouge, pour que React ne rende pas dans le vide.
 *
 * L'étal est persisté plutôt que recalculé à la volée : une ancre périmée est
 * exactement ce qui avait fait sonner les notifications de restauration en
 * avance. La clé de semaine vit dans la save, pas dans une horloge.
 */
export function settleBazar(state: GameState, now: number): GameState {
  if (!bazarEstOuvert(state)) return state;
  const cle = cleSemaineLocale(now);
  if (state.bazar?.cleSemaine === cle) return state;
  return { ...state, bazar: genererEtal(cle) };
}
