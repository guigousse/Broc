import { melanger } from "@/lib/duel/rng";
import {
  MAIN_INITIALE, PLAFOND_MAX, VITRINE_INITIALE, cloner,
  type EtatPartie, type Joueur, type Resultat,
} from "@/lib/duel/etat";
import { piocher, verifierFin } from "@/lib/duel/operations";

function joueurInitial(deck: string[]): Joueur {
  return { vitrine: VITRINE_INITIALE, plafond: 0, energie: 0, main: [], deck, etal: [], casse: [], echecsPioche: 0 };
}

/** Mute `e` : énergie, pioche, remise à zéro des attaques (effets debutTour en Task 5). */
function commencerTour(e: EtatPartie): void {
  e.tour += 1;
  const j = e.joueurs[e.actif];
  j.plafond = Math.min(PLAFOND_MAX, j.plafond + 1);
  j.energie = j.plafond;
  for (const o of j.etal) o.aAttaque = false;
  piocher(e, e.actif, 1);
  verifierFin(e);
}

export function nouvellePartie(deckA: readonly string[], deckB: readonly string[], rng: () => number): EtatPartie {
  const e: EtatPartie = {
    joueurs: [joueurInitial(melanger(deckA, rng)), joueurInitial(melanger(deckB, rng))],
    actif: 0, tour: 0, prochainUid: 1, fini: null, journal: [],
  };
  piocher(e, 0, MAIN_INITIALE);
  piocher(e, 1, MAIN_INITIALE + 1); // compensation du second joueur (spec §3.1)
  commencerTour(e);
  return e;
}

export function finirTour(etat: EtatPartie): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const e = cloner(etat);
  // Fragile et effets de fin de tour : Task 4.
  verifierFin(e);
  if (!e.fini) {
    e.actif = e.actif === 0 ? 1 : 0;
    commencerTour(e);
  }
  return { ok: true, etat: e };
}
