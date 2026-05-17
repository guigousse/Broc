import type { CompetenceTreeState } from "@/types/game";

export const XP_PAR_NIVEAU = 100;

export function xpRequisPourNiveau(niveau: number): number {
  return Math.max(0, niveau) * XP_PAR_NIVEAU;
}

export function appliquerGainXP(
  tree: CompetenceTreeState,
  gain: number,
): CompetenceTreeState {
  const nouveauXP = tree.xp + gain;
  let niveau = tree.niveau;
  let pointsDisponibles = tree.pointsDisponibles;
  while (nouveauXP >= xpRequisPourNiveau(niveau + 1)) {
    niveau += 1;
    pointsDisponibles += 1;
  }
  return { xp: nouveauXP, niveau, pointsDisponibles };
}

/** Progression vers le prochain niveau (0..1). */
export function progressionNiveau(tree: CompetenceTreeState): number {
  const seuilCourant = xpRequisPourNiveau(tree.niveau);
  const seuilProchain = xpRequisPourNiveau(tree.niveau + 1);
  const span = seuilProchain - seuilCourant;
  if (span <= 0) return 0;
  return Math.min(1, (tree.xp - seuilCourant) / span);
}
