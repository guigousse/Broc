import type {
  GameState,
  LedgerEntry,
  LedgerKind,
  Session,
  SessionChinage,
  SessionVente,
} from "@/types/game";

/** Génère un id court stable. */
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AppendLedgerPartial {
  jour: number;
  kind: LedgerKind;
  designation: string;
  recette: number;
  depense: number;
  sessionId?: string;
  courrierId?: string;
}

export interface AppendLedgerOptions {
  /** Si false, n'altère pas le budget (utile pour les entrées agrégées de session — le budget a déjà été muté pendant la journée). Défaut true. */
  applyBudget?: boolean;
  /** Timestamp explicite — par défaut `Date.now()`. */
  timestamp?: number;
}

/**
 * Pousse une entrée dans `state.grandLivre` et (par défaut) applique
 * recette/depense au budget. Retourne un nouveau state (pur).
 */
export function appendLedger(
  state: GameState,
  partial: AppendLedgerPartial,
  opts: AppendLedgerOptions = {},
): GameState {
  const applyBudget = opts.applyBudget !== false;
  const delta = partial.recette - partial.depense;
  const newBudget = applyBudget ? state.budget + delta : state.budget;
  const entry: LedgerEntry = {
    id: makeId(),
    timestamp: opts.timestamp ?? Date.now(),
    soldeApres: newBudget,
    ...partial,
  };
  return {
    ...state,
    budget: newBudget,
    grandLivre: [...state.grandLivre, entry],
  };
}

/** Convertit une session en entrée ledger (helper interne, exporté pour tests). */
export function sessionToLedgerEntry(
  s: Session,
  soldeApres: number,
): LedgerEntry {
  if (s.type === "chinage") {
    return sessionChinageToEntry(s, soldeApres);
  }
  return sessionVenteToEntry(s, soldeApres);
}

function sessionChinageToEntry(
  s: SessionChinage,
  soldeApres: number,
): LedgerEntry {
  const depense = s.achats.reduce((sum, a) => sum + a.prixPaye, 0);
  const n = s.achats.length;
  return {
    id: `ledger-rebuild-${s.id}`,
    timestamp: s.timestamp,
    jour: s.jour,
    kind: "session_chinage",
    designation: `${s.brocanteNom} · ${n} acqui${n > 1 ? "s" : ""}`,
    recette: 0,
    depense,
    soldeApres,
    sessionId: s.id,
  };
}

function sessionVenteToEntry(
  s: SessionVente,
  soldeApres: number,
): LedgerEntry {
  const recette = s.ventes.reduce((sum, v) => sum + v.prixVente, 0);
  const n = s.ventes.length;
  return {
    id: `ledger-rebuild-${s.id}`,
    timestamp: s.timestamp,
    jour: s.jour,
    kind: "session_vente",
    designation: `Étal · ${n} vente${n > 1 ? "s" : ""}`,
    recette,
    depense: 0,
    soldeApres,
    sessionId: s.id,
  };
}

/**
 * Reconstruit best-effort un grand livre depuis l'historique de sessions.
 * Tri chronologique ascendant. `soldeApres` est calculé en remontant depuis
 * `budgetActuel` (la dernière entrée a `soldeApres = budgetActuel`, les
 * précédentes retirent l'effet des suivantes).
 */
export function reconstruireGrandLivre(
  historique: Session[],
  budgetActuel: number,
): LedgerEntry[] {
  if (historique.length === 0) return [];
  // Tri chronologique ascendant.
  const sortedAsc = [...historique].sort((a, b) => a.timestamp - b.timestamp);
  // On calcule d'abord les recette/depense de chaque session, puis on remonte
  // le solde depuis le dernier vers le premier.
  const drafts = sortedAsc.map((s) => sessionToLedgerEntry(s, 0));
  let runningSolde = budgetActuel;
  for (let i = drafts.length - 1; i >= 0; i--) {
    drafts[i].soldeApres = runningSolde;
    runningSolde -= drafts[i].recette - drafts[i].depense;
  }
  return drafts;
}
