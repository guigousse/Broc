import type { GameState, LotPeriodique } from "@/types/game";
import { cleJourLocal, cleSemaineLocale } from "./periode";
import { genererLot, type TypePeriodique } from "./periodiques";

/** Régénère un lot si sa clé a changé. Retourne le nouvel état partiel, ou null si inchangé. */
function settleUnLot(
  state: GameState,
  type: TypePeriodique,
  lot: LotPeriodique,
  cleActuelle: string,
):
  | (Pick<GameState, "courriers" | "missions"> & { lot: LotPeriodique })
  | null {
  if (lot.cle === cleActuelle) return null;
  const aRetirer = new Set(lot.courrierIds);
  const courriers = state.courriers.filter((c) => !aRetirer.has(c.id));
  const missions = state.missions.filter((m) => !aRetirer.has(m.courrierId));
  const nouveaux = genererLot({ ...state, courriers, missions }, type, cleActuelle);
  return {
    courriers: [...courriers, ...nouveaux],
    missions: [
      ...missions,
      ...nouveaux.map((c) => ({ courrierId: c.id, statut: "active" as const })),
    ],
    lot: { cle: cleActuelle, courrierIds: nouveaux.map((c) => c.id) },
  };
}

/**
 * Régénère les lots quotidien/hebdo dont la clé de période a changé. Pur.
 * `now` = temps de confiance (epoch ms). Idempotent si rien n'a changé (même référence).
 */
export function settleQuetesPeriodiques(state: GameState, now: number): GameState {
  let courriers = state.courriers;
  let missions = state.missions;
  let quotidien = state.quetesPeriodiques.quotidien;
  let hebdo = state.quetesPeriodiques.hebdo;
  let change = false;

  const q = settleUnLot(
    { ...state, courriers, missions },
    "quotidienne",
    quotidien,
    cleJourLocal(now),
  );
  if (q) {
    courriers = q.courriers;
    missions = q.missions;
    quotidien = q.lot;
    change = true;
  }

  const h = settleUnLot(
    { ...state, courriers, missions },
    "hebdomadaire",
    hebdo,
    cleSemaineLocale(now),
  );
  if (h) {
    courriers = h.courriers;
    missions = h.missions;
    hebdo = h.lot;
    change = true;
  }

  if (!change) return state;
  return {
    ...state,
    courriers,
    missions,
    quetesPeriodiques: { quotidien, hebdo },
  };
}
