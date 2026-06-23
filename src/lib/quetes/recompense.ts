import type { ObjetTemplate } from "@/data/objetTemplates";
import type { EtatObjet, MissionCible } from "@/types/game";

/** Prime fixe appliquée à la valeur de marché (réglable). Dans [1,3 ; 1,6]. */
const PRIME = 1.45;

const MULT_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.8,
  Bon: 1.0,
  "Très bon": 1.2,
  "Pristin état": 1.4,
};

function arrondi5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Récompense d'une quête : Σ(valeur marché des cibles, pondérée par etatMin)
 * × prime + bonus multi-objets (+10 % par cible au-delà de la première).
 */
export function calculerRecompense(
  cibles: MissionCible[],
  templates: Map<string, ObjetTemplate>,
): number {
  const base = cibles.reduce((acc, c) => {
    const prix = templates.get(c.templateId)?.prixRefBase ?? 0;
    const mult = c.etatMin ? MULT_ETAT[c.etatMin] : 1;
    return acc + prix * mult;
  }, 0);
  const bonusMulti = 1 + 0.1 * Math.max(0, cibles.length - 1);
  return arrondi5(base * PRIME * bonusMulti);
}
