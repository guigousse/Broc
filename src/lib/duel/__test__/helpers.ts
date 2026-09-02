import { CARTES } from "@/data/cartes";
import { statsDuel } from "@/data/duel/cartesDuel";
import type { MotCleActif } from "@/data/duel/types";
import { cloner, type EtatPartie, type ObjetEnJeu } from "@/lib/duel/etat";

/** 20 premières / 20 suivantes du catalogue : deux decks singleton valides pour les tests. */
export const DECK_A = CARTES.slice(0, 20).map((c) => c.id);
export const DECK_B = CARTES.slice(20, 40).map((c) => c.id);

/** Pose directement `id` sur l'étal du joueur `j`, posé à un tour passé (peut attaquer). */
export function avecObjet(e: EtatPartie, j: 0 | 1, id: string, poseAuTour = 0): { etat: EtatPartie; uid: number } {
  const etat = cloner(e);
  const s = statsDuel(id);
  const motsCles: MotCleActif[] = s.texte && s.texte.type !== "cri" && s.texte.type !== "effet" ? [s.texte.type] : [];
  const o: ObjetEnJeu = { uid: etat.prochainUid++, id, attaque: s.attaque, pv: s.pv, motsCles, poseAuTour, aAttaque: false };
  etat.joueurs[j].etal.push(o);
  return { etat, uid: o.uid };
}

export function avecMain(e: EtatPartie, j: 0 | 1, ids: string[], energie?: number): EtatPartie {
  const etat = cloner(e);
  etat.joueurs[j].main = [...ids];
  if (energie !== undefined) { etat.joueurs[j].energie = energie; etat.joueurs[j].plafond = Math.max(etat.joueurs[j].plafond, energie); }
  return etat;
}
