import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import type { GameState } from "@/types/game";

export interface NiveauProgression {
  tierMax: 1 | 2 | 3 | 4;
  nbDebloquees: number;
}

export function niveauProgression(state: GameState): NiveauProgression {
  const parTier = calculerBrocantesDebloqueesParTier(state);
  let tierMax: 1 | 2 | 3 | 4 = 1;
  let nbDebloquees = 0;
  for (const tier of [1, 2, 3, 4] as const) {
    const n = parTier.get(tier)?.size ?? 0;
    nbDebloquees += n;
    if (n > 0) tierMax = tier;
  }
  return { tierMax, nbDebloquees };
}

/** Nombre max de quêtes secondaires actives, croissant avec la progression. */
export function capSecondaires(state: GameState): number {
  const { nbDebloquees } = niveauProgression(state);
  return Math.min(6, Math.max(2, 2 + Math.floor(nbDebloquees / 3)));
}
