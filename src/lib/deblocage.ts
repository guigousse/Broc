import type {
  Brocante,
  CategorieObjet,
  ConditionDeblocage,
  GameState,
} from "@/types/game";

export function descriptionCondition(c: ConditionDeblocage): string {
  switch (c.type) {
    case "depart":
      return "Disponible dès le départ";
    case "jour":
      return `Débloqué au jour ${c.jour}`;
    case "budget":
      return `Débloqué à partir de ${c.montant} € de budget`;
    case "ventesCategorie":
      return `Débloqué après ${c.nombre} vente${c.nombre > 1 ? "s" : ""} de ${c.categorie}`;
    case "brocantesDebloquees":
      return `Débloqué après ${c.nombre} brocante${c.nombre > 1 ? "s" : ""} ${"⭐".repeat(c.tier)} débloquée${c.nombre > 1 ? "s" : ""}`;
    case "ET":
      return c.conditions.map(descriptionCondition).join(" + ");
  }
}

/** Compte les ventes d'une catégorie donnée à travers l'historique. */
function compterVentesCategorie(
  historique: GameState["historique"],
  cat: CategorieObjet,
): number {
  let n = 0;
  for (const s of historique) {
    if (s.type !== "vente") continue;
    for (const v of s.ventes) {
      if (v.categorie === cat) n += 1;
    }
  }
  return n;
}

/**
 * Évalue si une brocante est débloquée.
 * - Pour les conditions `brocantesDebloquees`, on a besoin de connaître les brocantes
 *   déjà débloquées d'un tier inférieur (set d'IDs).
 * - Les brocantes sont évaluées par tier croissant : tier 1 d'abord, puis tier 2, etc.
 */
export function estDebloquee(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): boolean {
  return evaluerCondition(
    brocante.conditionDeblocage,
    state,
    brocantesDebloqueesParTier,
  );
}

function evaluerCondition(
  c: ConditionDeblocage,
  state: Pick<GameState, "jourActuel" | "budget" | "historique">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): boolean {
  switch (c.type) {
    case "depart":
      return true;
    case "jour":
      return state.jourActuel >= c.jour;
    case "budget":
      return state.budget >= c.montant;
    case "ventesCategorie":
      return compterVentesCategorie(state.historique, c.categorie) >= c.nombre;
    case "brocantesDebloquees": {
      const set = brocantesDebloqueesParTier?.get(c.tier);
      return (set?.size ?? 0) >= c.nombre;
    }
    case "ET":
      return c.conditions.every((cc) =>
        evaluerCondition(cc, state, brocantesDebloqueesParTier),
      );
  }
}
