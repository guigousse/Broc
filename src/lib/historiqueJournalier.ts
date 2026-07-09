import type { LedgerEntry, LedgerKind, Session } from "@/types/game";
import type { Locale } from "@/lib/i18n/locales";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { getBrocanteById } from "@/data/brocantes";
import { nomBrocante } from "@/lib/i18n/contenu";

export type TypeJournee = "chinage" | "vente" | "repos";

export interface JourneeHistorique {
  jour: number;
  type: TypeJournee;
  session: Session | null;
  /** Libellé FR canonique — conservé pour compat/debug ; l'affichage doit
   *  passer par `libelleJournee(j, d, locale)` pour la version localisée. */
  libelle: string;
  entries: LedgerEntry[];
  net: number;
  soldeFin: number;
}

/** Sous-ensemble de `LedgerKind` éligible à un libellé de journée de repos, par ordre de priorité. */
type ReposKind =
  | "upgrade_atelier"
  | "upgrade_stockage"
  | "upgrade_camion"
  | "loyer"
  | "gazette"
  | "courrier_recompense"
  | "mission_recompense";

const PRIORITE_REPOS: ReposKind[] = [
  "upgrade_atelier",
  "upgrade_stockage",
  "upgrade_camion",
  "loyer",
  "gazette",
  "courrier_recompense",
  "mission_recompense",
];

/** Détermine, parmi les écritures d'une journée de repos, quel type prime pour le libellé (ou aucun). */
function reposKindPourEntries(entries: LedgerEntry[]): ReposKind | null {
  return PRIORITE_REPOS.find((kind) => entries.some((e) => e.kind === kind)) ?? null;
}

/** Libellé localisé d'une journée de repos (switch exhaustif motif `libelleCategorie`). */
export function libelleRepos(kind: ReposKind | null, d: DictionnaireUI): string {
  switch (kind) {
    case "upgrade_atelier":
      return d.cahier.atelierAmeliore;
    case "upgrade_stockage":
      return d.cahier.stockageAmeliore;
    case "upgrade_camion":
      return d.cahier.camionAmeliore;
    case "loyer":
      return d.cahier.loyerPreleve;
    case "gazette":
      return d.cahier.gazetteAchetee;
    case "courrier_recompense":
      return d.cahier.recompenseRecue;
    case "mission_recompense":
      return d.cahier.missionRecompensee;
    case null:
      return d.cahier.journeeRepos;
  }
}

/**
 * Libellé localisé d'une journée du Cahier de compte, résolu à l'affichage.
 * Chinage : nom de brocante par `brocanteId` (fallback `brocanteNom` — vieilles
 * saves / id introuvable). Vente : « Marché du jour ». Repos : priorité
 * `PRIORITE_REPOS` sur les écritures du jour.
 */
export function libelleJournee(j: JourneeHistorique, d: DictionnaireUI, locale: Locale): string {
  if (j.type === "chinage" && j.session?.type === "chinage") {
    const brocante = getBrocanteById(j.session.brocanteId);
    return brocante ? nomBrocante(brocante, locale) : j.session.brocanteNom;
  }
  if (j.type === "vente") return d.cahier.marcheDuJour;
  return libelleRepos(reposKindPourEntries(j.entries), d);
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
      libelle = DICTIONNAIRES.fr.cahier.marcheDuJour;
    } else {
      type = "repos";
      libelle = libelleRepos(reposKindPourEntries(entries), DICTIONNAIRES.fr);
    }
    result.push({ jour, type, session, libelle, entries, net, soldeFin });
  }
  result.sort((a, b) => b.jour - a.jour);
  return result;
}
