import type { Courrier, GameState, MissionResolution } from "@/types/game";

/**
 * Tick quotidien des quêtes : depuis SP2, les chapitres de la trame sont
 * délivrés EN DIALOGUE (`accepterChapitre`, déclenché par l'UI du grand-père
 * quand `chapitrePret(state)` désigne un chapitre — cf. `src/lib/quetes/principales.ts`),
 * plus au passage de jour. Ce tick devient donc un passthrough : conservé
 * comme point d'accroche pour de futurs ticks quotidiens de quêtes (les
 * commandes quotidiennes/hebdomadaires restent gérées en TEMPS RÉEL via
 * `settleQuetesPeriodiques`).
 */
export function tickQuetes(
  state: GameState,
  _jour: number,
): { courriers: Courrier[]; missions: MissionResolution[] } {
  return { courriers: state.courriers, missions: state.missions };
}
