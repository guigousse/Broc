import type { Brocante, ConditionDeblocage, GameState } from "@/types/game";

export function descriptionCondition(c: ConditionDeblocage): string {
  switch (c.type) {
    case "depart":
      return "Disponible dès le départ";
    case "jour":
      return `Débloqué au jour ${c.jour}`;
    case "budget":
      return `Débloqué à partir de ${c.montant} € de budget`;
  }
}

export function estDebloquee(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget">,
): boolean {
  const c = brocante.conditionDeblocage;
  switch (c.type) {
    case "depart":
      return true;
    case "jour":
      return state.jourActuel >= c.jour;
    case "budget":
      return state.budget >= c.montant;
  }
}
