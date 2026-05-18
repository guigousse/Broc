import type {
  Brocante,
  CategorieObjet,
  ConditionDeblocage,
  GameState,
} from "@/types/game";
import { valeurTotale, valeurParCategorie } from "@/lib/collection";

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
    case "valeurCollection":
      return `Débloqué quand votre collection atteint ${c.montant} €`;
    case "valeurCollectionCategorie":
      return `Débloqué quand votre collection « ${c.categorie} » atteint ${c.montant} €`;
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

export function estDebloquee(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection">,
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
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection">,
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
    case "valeurCollection":
      return valeurTotale(state.collection) >= c.montant;
    case "valeurCollectionCategorie":
      return valeurParCategorie(state.collection, c.categorie) >= c.montant;
    case "ET":
      return c.conditions.every((cc) =>
        evaluerCondition(cc, state, brocantesDebloqueesParTier),
      );
  }
}
