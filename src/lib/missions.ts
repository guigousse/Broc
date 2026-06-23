import { ETATS_ORDRE } from "@/lib/etat";
import type { CourrierPayloadMission, Objet } from "@/types/game";

function etatIdx(e: Objet["etat"]): number {
  return ETATS_ORDRE.indexOf(e);
}

/** Indices d'inventaire candidats pour une cible (état ok, hors restauration). */
function candidats(cible: CourrierPayloadMission["cibles"][number], inv: Objet[]): number[] {
  const minIdx = cible.etatMin ? ETATS_ORDRE.indexOf(cible.etatMin) : 0;
  return inv
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.templateId === cible.templateId && !o.enRestauration && etatIdx(o.etat) >= minIdx)
    .map(({ i }) => i);
}

export interface ProgressionMission {
  remplies: number;
  total: number;
  livrable: boolean;
  /** Pour chaque cible (même ordre), satisfaite ou non. */
  ciblesRemplies: boolean[];
}

/**
 * Calcule la progression d'une mission : pour chaque cible, on réserve un objet
 * d'inventaire DISTINCT (un objet ne peut satisfaire qu'une seule cible).
 * On traite les cibles les plus contraintes (etatMin le plus élevé) d'abord pour
 * éviter qu'une cible facile ne « vole » un objet utile à une cible exigeante.
 */
export function progressionMission(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): ProgressionMission {
  const ordre = payload.cibles
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (b.c.etatMin ? ETATS_ORDRE.indexOf(b.c.etatMin) : 0) - (a.c.etatMin ? ETATS_ORDRE.indexOf(a.c.etatMin) : 0));
  const pris = new Set<number>();
  const ciblesRemplies = new Array(payload.cibles.length).fill(false);
  for (const { c, i } of ordre) {
    const dispo = candidats(c, inventaire).filter((idx) => !pris.has(idx));
    if (dispo.length > 0) {
      pris.add(dispo[0]);
      ciblesRemplies[i] = true;
    }
  }
  const remplies = ciblesRemplies.filter(Boolean).length;
  return { remplies, total: payload.cibles.length, livrable: remplies === payload.cibles.length, ciblesRemplies };
}

/**
 * Si la mission est livrable, retourne les indices d'inventaire à consommer
 * (un par cible, le MOINS BON état d'abord, objets distincts). Sinon `null`.
 */
export function indicesAConsommerPourLivraison(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): number[] | null {
  const ordre = payload.cibles
    .slice()
    .sort((a, b) => (b.etatMin ? ETATS_ORDRE.indexOf(b.etatMin) : 0) - (a.etatMin ? ETATS_ORDRE.indexOf(a.etatMin) : 0));
  const pris = new Set<number>();
  for (const c of ordre) {
    const dispo = candidats(c, inventaire)
      .filter((idx) => !pris.has(idx))
      .sort((i, j) => etatIdx(inventaire[i].etat) - etatIdx(inventaire[j].etat)); // moins bon d'abord
    if (dispo.length === 0) return null;
    pris.add(dispo[0]);
  }
  return [...pris];
}

/** Compat : une mission est livrable si toutes ses cibles sont remplies. */
export function estMissionLivrable(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): boolean {
  return progressionMission(payload, inventaire).livrable;
}
