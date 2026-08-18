import { appliquerGainXPBrocanteur } from "@/lib/xp";
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

/**
 * Décision de design du 2026-08-18 : **les quêtes ne versent plus d'XP**. Des
 * jetons « Bazar » prendront cette place (à spécifier).
 *
 * Le `0` est écrit ici, au point de passage unique du versement ET des quatre
 * surfaces d'affichage, plutôt qu'en mettant les constantes `XP_QUETE_*` à
 * zéro : une constante nommée qui vaut 0 est un piège pour le prochain
 * lecteur. Ces constantes et `xpParDefaut` ont donc été supprimées.
 *
 * Conséquence voulue en cascade : un gain nul ne produit pas de jeton
 * (`PaveRecompense`), la cérémonie n'émet donc aucune étape XP et ne gèle plus
 * le compteur d'XP — aucun cas particulier à ajouter ailleurs.
 *
 * ⚠ `payload.recompense.xp` est toujours honoré s'il est explicitement
 * renseigné : aucune quête du jeu ne le fait aujourd'hui, mais une save
 * ancienne ou une future quête exceptionnelle reste libre de le poser.
 */
export function recompenseEffective(
  payload: CourrierPayloadMission,
): RecompenseEffective {
  return {
    argent: payload.recompense.argent,
    xp: payload.recompense.xp ?? 0,
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
