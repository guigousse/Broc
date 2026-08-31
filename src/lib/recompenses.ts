import { crediterXPBrocanteur } from "@/lib/xp";
import { appendLedger } from "@/lib/grandLivre";
import { ENERGIE_MAX, ENERGIE_PLAFOND, settleEnergie } from "@/lib/energie";
import { legendairesAcquis } from "@/lib/quetes/objectifs";
import type {
  CourrierPayloadMission,
  EtatObjet,
  GameState,
  MissionCategorie,
  MissionResolution,
} from "@/types/game";

/** Jetons versés par une quête quotidienne livrée. */
export const JETONS_QUOTIDIENNE = 1;
/** Jetons versés par une quête hebdomadaire livrée. */
export const JETONS_HEBDO = 3;

/**
 * Prime de la quête « pièce légendaire », en fraction du `prixRefBase` de la
 * pièce trouvée. Le pourcentage porte sur la valeur de MARCHÉ et non sur le
 * prix payé au vendeur : sur le prix payé, mal négocier rapporterait plus.
 */
export const TAUX_PRIME_LEGENDAIRE = 0.2;

/** Jetons Bazar d'une quête « pièce légendaire » (au lieu de JETONS_QUOTIDIENNE). */
export const JETONS_LEGENDAIRE = 3;

/** Récompense totale d'une commande, défauts appliqués — source unique de
 *  vérité pour les 4 surfaces d'affichage ET le versement à la livraison. */
export interface RecompenseEffective {
  argent: number;
  xp: number;
  energie: number;
  /** Jetons du Bazar. Ratio fixe, cf. `PRIX_JETON_EUROS` (lib/bazar/etal). */
  jetons: number;
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
 *
 * Prime variable : `ctx` est optionnel et absent des quatre surfaces
 * d'affichage (carnet, sheet, carte d'histoire) — la pièce légendaire n'est
 * pas encore trouvée à l'affichage, il n'y a rien à chiffrer. Seule la
 * livraison le fournit, ce qui garantit qu'aucune quête existante (arc
 * principal compris, qui ne porte jamais de `primeVariable`) ne change de
 * comportement.
 */
export function recompenseEffective(
  payload: CourrierPayloadMission,
  ctx?: ContextePrime,
): RecompenseEffective {
  return {
    argent: payload.recompense.argent + (ctx ? primeVariableArgent(payload, ctx) : 0),
    xp: payload.recompense.xp ?? 0,
    energie: payload.recompense.energie ?? 0,
    jetons: payload.recompense.jetons ?? 0,
  };
}

/**
 * Contexte de résolution d'une prime variable. Optionnel partout : les
 * surfaces d'AFFICHAGE (carnet, sheet, carte d'histoire) appellent sans lui et
 * montrent la part fixe — la pièce n'est pas encore trouvée, il n'y a rien à
 * chiffrer. Seule la LIVRAISON le fournit.
 */
export interface ContextePrime {
  state: Pick<GameState, "historique">;
  reso: Pick<MissionResolution, "timestampAcceptation">;
  jourRecu: number;
}

/**
 * Part variable de la récompense : un pourcentage du `prixRefBase` de la pièce
 * légendaire trouvée, la plus chère si le joueur en a déniché plusieurs.
 */
function primeVariableArgent(
  payload: CourrierPayloadMission,
  ctx: ContextePrime,
): number {
  if (payload.primeVariable?.type !== "pourcentageLegendaire") return 0;
  const [meilleure] = legendairesAcquis(ctx.state, ctx.reso, ctx.jourRecu);
  if (!meilleure) return 0;
  return Math.round(meilleure.prixRefBase * payload.primeVariable.taux);
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
      jetons: r.jetons,
    },
  });
  next = crediterXPBrocanteur(next, r.xp);
  if (r.energie > 0) {
    const settled = settleEnergie(next, now, ENERGIE_MAX);
    next = {
      ...next,
      energie: Math.min(ENERGIE_PLAFOND, settled.energie + r.energie),
      energieDerniereMaj: settled.energieDerniereMaj,
    };
  }
  if (r.jetons > 0) {
    next = { ...next, jetons: next.jetons + r.jetons };
  }
  return next;
}
