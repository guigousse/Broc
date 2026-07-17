import { CARTES_POSTALES, INTERVALLE_CARTES_POSTALES } from "@/data/cartesPostales";
import { creerCartePostale } from "@/lib/courrier";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

/**
 * Tick quotidien des quêtes : depuis SP2, les chapitres de la trame sont
 * délivrés EN DIALOGUE (`accepterChapitre`, déclenché par l'UI du grand-père
 * quand `chapitrePret(state)` désigne un chapitre — cf. `src/lib/quetes/principales.ts`),
 * plus au passage de jour. Ce tick gère désormais aussi l'épilogue : une fois
 * `trame_ch12` livrée, injecte les cartes postales du grand-père une à une
 * (au plus une par tick, idempotent par id, jusqu'à la 5ᵉ). Le reste demeure
 * un passthrough (les commandes quotidiennes/hebdomadaires restent gérées en
 * TEMPS RÉEL via `settleQuetesPeriodiques`).
 */
export function tickQuetes(
  state: GameState,
  jour: number,
): { courriers: Courrier[]; missions: MissionResolution[] } {
  const ch12 = state.missions.find(
    (m) => m.courrierId === "trame_ch12" && m.statut === "livree",
  );
  if (ch12?.jourResolution !== undefined) {
    const prochaine = CARTES_POSTALES.findIndex(
      (c) => !state.courriers.some((cr) => cr.id === c.id),
    );
    if (
      prochaine !== -1 &&
      jour >= ch12.jourResolution + (prochaine + 1) * INTERVALLE_CARTES_POSTALES
    ) {
      return {
        courriers: [...state.courriers, creerCartePostale(prochaine + 1, jour)],
        missions: state.missions,
      };
    }
  }
  return { courriers: state.courriers, missions: state.missions };
}
