import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { ID_GRANDE_BRADERIE } from "@/lib/evenements";
import { aCompetenceReparation } from "@/lib/competences";
import type { GameState } from "@/types/game";
import type { FormeQuete } from "./formes";

/**
 * Une brocante de tier 4 est-elle ouverte au joueur ?
 *
 * La Grande Braderie est de tier 4 mais n'ouvre que deux jours par an : la
 * compter débloquerait à vie une forme de quête sur un événement de 48 h.
 * `objetsAtteignables` l'écarte déjà pour la même raison.
 */
export function brocanteTier4Debloquee(state: GameState): boolean {
  const tier4 = calculerBrocantesDebloqueesParTier(state).get(4);
  if (!tier4) return false;
  for (const id of tier4) if (id !== ID_GRANDE_BRADERIE) return true;
  return false;
}

/**
 * Verrou d'accès par forme, lu au moment où le lot naît. Une forme absente de
 * cette table est toujours éligible — toute forme future déclare sa condition
 * ICI, et le tirage n'a jamais à connaître une règle métier.
 */
const ELIGIBILITE: Partial<Record<FormeQuete, (s: GameState) => boolean>> = {
  objetLegendaire: brocanteTier4Debloquee,
  restauration: aCompetenceReparation,
};

/** La forme peut-elle être tirée dans l'état courant ? */
export function formeEligible(forme: FormeQuete, state: GameState): boolean {
  const test = ELIGIBILITE[forme];
  return test ? test(state) : true;
}
