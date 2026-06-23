import type { Courrier, GameState, MissionResolution } from "@/types/game";
import { debloquerQuetesPrincipales } from "./principales";
import { genererQueteSecondaire } from "./generateurSecondaire";

/**
 * Tick quotidien des quêtes : débloque le chapitre principal dû puis tente une
 * génération secondaire. Retourne les nouvelles listes courriers + missions
 * (résolutions actives ajoutées pour chaque mission créée).
 */
export function tickQuetes(
  state: GameState,
  jour: number,
  rng: () => number = Math.random,
): { courriers: Courrier[]; missions: MissionResolution[] } {
  let courriers = state.courriers;
  let missions = state.missions;

  const ajouter = (nouveaux: Courrier[]) => {
    if (nouveaux.length === 0) return;
    courriers = [...courriers, ...nouveaux];
    missions = [
      ...missions,
      ...nouveaux.map((c) => ({ courrierId: c.id, statut: "active" as const })),
    ];
  };

  ajouter(debloquerQuetesPrincipales({ ...state, courriers, missions }, jour));
  const sec = genererQueteSecondaire({ ...state, courriers, missions }, jour, rng);
  if (sec) ajouter([sec]);

  return { courriers, missions };
}
