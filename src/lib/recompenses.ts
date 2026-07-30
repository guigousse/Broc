import {
  XP_QUETE_HEBDO,
  XP_QUETE_PRINCIPALE,
  XP_QUETE_QUOTIDIENNE,
} from "@/lib/xp";
import type { CourrierPayloadMission, MissionCategorie } from "@/types/game";

/** Récompense totale d'une commande, défauts appliqués — source unique de
 *  vérité pour les 4 surfaces d'affichage ET le versement à la livraison. */
export interface RecompenseEffective {
  argent: number;
  xp: number;
  energie: number;
}

/** XP versée à défaut de `recompense.xp` explicite (comportement historique). */
export function xpParDefaut(categorie: MissionCategorie): number {
  switch (categorie) {
    case "principale":
      return XP_QUETE_PRINCIPALE;
    case "hebdomadaire":
      return XP_QUETE_HEBDO;
    case "quotidienne":
      return XP_QUETE_QUOTIDIENNE;
  }
}

export function recompenseEffective(
  payload: CourrierPayloadMission,
): RecompenseEffective {
  return {
    argent: payload.recompense.argent,
    xp: payload.recompense.xp ?? xpParDefaut(payload.categorie),
    energie: payload.recompense.energie ?? 0,
  };
}
