import {
  XP_QUETE_HEBDO,
  XP_QUETE_PRINCIPALE,
  XP_QUETE_QUOTIDIENNE,
  appliquerGainXPBrocanteur,
} from "@/lib/xp";
import { appendLedger } from "@/lib/grandLivre";
import { pointsDepensesCompetences } from "@/data/competences";
import { ENERGIE_MAX, ENERGIE_PLAFOND, settleEnergie } from "@/lib/energie";
import type {
  CourrierPayloadMission,
  EtatObjet,
  GameState,
  MissionCategorie,
} from "@/types/game";

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
    default:
      // Catégorie inconnue (ex. vieille save non purgée) : défaut sûr plutôt
      // qu'un `undefined` qui NaN-poisonnerait `b.xp + undefined` en save.
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

/** Contexte d'écriture au grand livre (repris du payload mission au moment
 *  de la livraison — cf. commentaire params dans livrerMission). */
export interface ContexteLedgerMission {
  designation: string;
  courrierId: string;
  gabaritId?: string;
  etatMin?: EtatObjet;
  templateIds?: string[];
}

/**
 * Verse une récompense effective : argent au grand livre (mission_recompense),
 * XP au brocanteur, énergie APRÈS settle (temps de confiance `now`) avec
 * débordement possible au-delà d'ENERGIE_MAX, borné par ENERGIE_PLAFOND.
 * Fonction pure (retourne le nouveau state).
 */
export function appliquerRecompense(
  state: GameState,
  r: RecompenseEffective,
  ledger: ContexteLedgerMission,
  now: number,
): GameState {
  let next = appendLedger(state, {
    jour: state.jourActuel,
    kind: "mission_recompense",
    designation: ledger.designation,
    recette: r.argent,
    depense: 0,
    courrierId: ledger.courrierId,
    params: {
      courrierId: ledger.courrierId,
      gabaritId: ledger.gabaritId,
      etatMin: ledger.etatMin,
      templateIds: ledger.templateIds,
      xp: r.xp,
      energie: r.energie,
    },
  });
  next = {
    ...next,
    brocanteur: appliquerGainXPBrocanteur(
      next.brocanteur,
      r.xp,
      pointsDepensesCompetences(next.competencesDebloquees),
    ),
  };
  if (r.energie > 0) {
    const settled = settleEnergie(next, now, ENERGIE_MAX);
    next = {
      ...next,
      energie: Math.min(ENERGIE_PLAFOND, settled.energie + r.energie),
      energieDerniereMaj: settled.energieDerniereMaj,
    };
  }
  return next;
}
