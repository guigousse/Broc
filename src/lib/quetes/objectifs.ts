import { ETATS_ORDRE } from "@/lib/etat";
import { valeurTotale } from "@/lib/collection";
import { estMissionLivrable, progressionMission } from "@/lib/missions";
import type {
  CourrierPayloadMission,
  GameState,
  MissionResolution,
  ObjectifMission,
  SessionVente,
} from "@/types/game";

export interface ProgressionObjectif {
  actuel: number;
  cible: number;
  atteint: boolean;
}

/** Objectifs effectifs d'une mission (compat : dérivés des cibles si absent). */
export function objectifsDeMission(p: CourrierPayloadMission): ObjectifMission[] {
  if (p.objectifs) return p.objectifs;
  return p.cibles.map((c) => ({ type: "objet", templateId: c.templateId, ...(c.etatMin ? { etatMin: c.etatMin } : {}) }));
}

/** Sessions de vente comptées pour un objectif cumulatif : strictement après
 *  l'acceptation si on a le timestamp, sinon à partir du jour de réception. */
function sessionsComptees(
  state: Pick<GameState, "historique">,
  reso: Pick<MissionResolution, "timestampAcceptation">,
  jourRecu: number,
): SessionVente[] {
  return state.historique.filter((s): s is SessionVente => {
    if (s.type !== "vente") return false;
    return reso.timestampAcceptation !== undefined
      ? s.timestamp > reso.timestampAcceptation
      : s.jour >= jourRecu;
  });
}

export function progressionObjectif(
  obj: ObjectifMission,
  state: GameState,
  reso: MissionResolution,
  jourRecu: number,
): ProgressionObjectif {
  switch (obj.type) {
    case "objet": {
      const prog = progressionMission(
        { cibles: [{ templateId: obj.templateId, ...(obj.etatMin ? { etatMin: obj.etatMin } : {}) }] } as CourrierPayloadMission,
        state.inventaireJoueur,
      );
      return { actuel: prog.remplies, cible: 1, atteint: prog.livrable };
    }
    case "ventesCumulees": {
      const total = sessionsComptees(state, reso, jourRecu)
        .flatMap((s) => s.ventes)
        .reduce((acc, v) => acc + v.prixVente, 0);
      return { actuel: total, cible: obj.montant, atteint: total >= obj.montant };
    }
    case "profitVente": {
      const meilleur = sessionsComptees(state, reso, jourRecu)
        .flatMap((s) => s.ventes)
        .reduce((acc, v) => (v.prixAchat === null ? acc : Math.max(acc, v.prixVente - v.prixAchat)), 0);
      return { actuel: meilleur, cible: obj.montant, atteint: meilleur >= obj.montant };
    }
    case "restauration": {
      const minIdx = ETATS_ORDRE.indexOf(obj.etatMin);
      const apres = reso.timestampAcceptation ?? 0;
      const ok = (state.restaurations ?? []).some(
        (r) => r.timestamp > apres && ETATS_ORDRE.indexOf(r.etatFinal) >= minIdx,
      );
      return { actuel: ok ? 1 : 0, cible: 1, atteint: ok };
    }
    case "valeurCollection": {
      const actuel = Math.floor(valeurTotale(state.collection));
      return { actuel, cible: obj.montant, atteint: actuel >= obj.montant };
    }
    case "niveau": {
      const actuel = state.brocanteur?.niveau ?? 0;
      return { actuel, cible: obj.niveau, atteint: actuel >= obj.niveau };
    }
  }
}

/** Livrabilité complète : cibles objets (machinerie historique) + objectifs non-objet. */
export function missionLivrable(
  payload: CourrierPayloadMission,
  reso: MissionResolution,
  state: GameState,
  jourRecu: number,
): boolean {
  if (!estMissionLivrable(payload, state.inventaireJoueur)) return false;
  return objectifsDeMission(payload)
    .filter((o) => o.type !== "objet")
    .every((o) => progressionObjectif(o, state, reso, jourRecu).atteint);
}

/**
 * Missions actives réellement livrables (cibles ET objectifs), avec leur
 * commanditaire — source des pastilles de livrables du QG et du compteur
 * « n livrable(s) » du registre. ⚠ Pas `estMissionLivrable` seul : une
 * mission sans cible objet (ex. chapitre « 300 € de ventes ») serait
 * vacuously livrable et la pastille resterait allumée en permanence.
 */
export function missionsLivrables(
  state: GameState,
): { courrierId: string; expediteurId: string }[] {
  const out: { courrierId: string; expediteurId: string }[] = [];
  for (const m of state.missions) {
    if (m.statut !== "active") continue;
    const c = state.courriers.find((cc) => cc.id === m.courrierId);
    if (!c || c.payload.type !== "mission") continue;
    if (missionLivrable(c.payload, m, state, c.jourRecu)) {
      out.push({ courrierId: m.courrierId, expediteurId: c.payload.expediteurId });
    }
  }
  return out;
}
