import type {
  Brocante,
  CategorieObjet,
  ConditionDeblocage,
  GameState,
} from "@/types/game";
import { valeurTotale, valeurParCategorie } from "@/lib/collection";
import { brocantesParTier } from "@/data/brocantes";

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

/** Retourne une courte description de la condition de déblocage d'une brocante. */
export function decrireConditions(brocante: Brocante, _state: GameState): string {
  return descriptionCondition(brocante.conditionDeblocage);
}

/** Variante compacte (style "Collection > X €", "Musique > Y €"). */
export function descriptionConditionCourte(c: ConditionDeblocage): string {
  switch (c.type) {
    case "depart":
      return "Disponible";
    case "jour":
      return `Jour > ${c.jour}`;
    case "budget":
      return `Budget > ${c.montant} €`;
    case "ventesCategorie":
      return `${c.categorie} > ${c.nombre} ventes`;
    case "brocantesDebloquees":
      return `${c.nombre} brocantes ${"★".repeat(c.tier)}`;
    case "valeurCollection":
      return `Collection > ${c.montant} €`;
    case "valeurCollectionCategorie":
      return `${c.categorie} > ${c.montant} €`;
    case "ET":
      return c.conditions.map(descriptionConditionCourte).join(" + ");
  }
}

/** Liste les conditions de déblocage atomiques (déplie le ET). */
export function decrireConditionsCourtes(brocante: Brocante): string[] {
  const c = brocante.conditionDeblocage;
  if (c.type === "ET") return c.conditions.map(descriptionConditionCourte);
  return [descriptionConditionCourte(c)];
}

/**
 * Calcule, tier par tier (en cascade : les conditions `brocantesDebloquees`
 * d'un tier supérieur voient les tiers inférieurs déjà résolus), l'ensemble
 * des brocantes débloquées. À passer à `estDebloquee` pour toute brocante
 * dont la condition référence d'autres brocantes.
 */
export function calculerBrocantesDebloqueesParTier(
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection">,
): Map<1 | 2 | 3 | 4, Set<string>> {
  const m = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set()],
    [2, new Set()],
    [3, new Set()],
    [4, new Set()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, m)) m.get(tier)!.add(b.id);
    }
  }
  return m;
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
