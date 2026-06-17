import type { LedgerEntry, LedgerKind, Session } from "@/types/game";

export type TypeJournee = "chinage" | "vente" | "repos";

export interface JourneeHistorique {
  jour: number;
  type: TypeJournee;
  session: Session | null;
  libelle: string;
  entries: LedgerEntry[];
  net: number;
  soldeFin: number;
}

const PRIORITE_REPOS: { kind: LedgerKind; libelle: string }[] = [
  { kind: "upgrade_atelier", libelle: "Atelier amélioré" },
  { kind: "upgrade_stockage", libelle: "Stockage amélioré" },
  { kind: "upgrade_camion", libelle: "Camion amélioré" },
  { kind: "loyer", libelle: "Loyer prélevé" },
  { kind: "gazette", libelle: "Gazette achetée" },
  { kind: "courrier_recompense", libelle: "Récompense reçue" },
  { kind: "mission_recompense", libelle: "Mission récompensée" },
];

function libelleRepos(entries: LedgerEntry[]): string {
  for (const { kind, libelle } of PRIORITE_REPOS) {
    if (entries.some((e) => e.kind === kind)) return libelle;
  }
  return "Journée de repos";
}

export function agregerJournees(
  grandLivre: LedgerEntry[],
  historique: Session[],
): JourneeHistorique[] {
  const parJour = new Map<number, LedgerEntry[]>();
  for (const e of grandLivre) {
    const arr = parJour.get(e.jour);
    if (arr) arr.push(e);
    else parJour.set(e.jour, [e]);
  }

  const sessionsParJour = new Map<number, Session>();
  for (const s of historique) sessionsParJour.set(s.jour, s);

  const result: JourneeHistorique[] = [];
  for (const [jour, entries] of parJour.entries()) {
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const session = sessionsParJour.get(jour) ?? null;
    const net = entries.reduce((s, e) => s + e.recette - e.depense, 0);
    const soldeFin = entries[entries.length - 1].soldeApres;
    let type: TypeJournee;
    let libelle: string;
    if (session?.type === "chinage") {
      type = "chinage";
      libelle = session.brocanteNom;
    } else if (session?.type === "vente") {
      type = "vente";
      libelle = "Marché du jour";
    } else {
      type = "repos";
      libelle = libelleRepos(entries);
    }
    result.push({ jour, type, session, libelle, entries, net, soldeFin });
  }
  result.sort((a, b) => b.jour - a.jour);
  return result;
}
