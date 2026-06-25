import type { Courrier, GameState, MissionResolution } from "@/types/game";
import { debloquerQuetesPrincipales } from "./principales";

/**
 * Tick quotidien des quêtes : débloque le chapitre principal dû. (Les commandes
 * quotidiennes/hebdomadaires sont gérées en TEMPS RÉEL via settleQuetesPeriodiques,
 * plus par jour de jeu.)
 */
export function tickQuetes(
  state: GameState,
  jour: number,
): { courriers: Courrier[]; missions: MissionResolution[] } {
  const nouveaux = debloquerQuetesPrincipales(state, jour);
  if (nouveaux.length === 0) {
    return { courriers: state.courriers, missions: state.missions };
  }
  return {
    courriers: [...state.courriers, ...nouveaux],
    missions: [
      ...state.missions,
      ...nouveaux.map((c) => ({ courrierId: c.id, statut: "active" as const })),
    ],
  };
}
