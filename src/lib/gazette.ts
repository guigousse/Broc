import { indexJourSemaineReel } from "@/lib/calendrier";
import { aAccesGazette } from "@/lib/competences";
import type { GameState } from "@/types/game";

export type JournalSolMode = "tuto" | "achat" | null;

type EtatGazette = Pick<
  GameState,
  | "competencesDebloquees"
  | "tutoGazette"
  | "gazetteAchetee"
  | "gazetteRefusee"
  | "jourActuel"
>;

/**
 * Mode du journal enroulé au sol devant la porte (spec 2026-07-24) :
 * - "tuto" : première compétence gazette débloquée, tuto pas encore fait —
 *   journal offert, visible tous les jours jusqu'au tap.
 * - "achat" : tuto fait, lundi, édition ni achetée ni refusée — le mardi la
 *   condition tombe d'elle-même (édition manquée).
 * - null : rien à afficher.
 */
export function journalSolMode(state: EtatGazette): JournalSolMode {
  if (!aAccesGazette(state)) return null;
  if ((state.tutoGazette ?? "aFaire") === "aFaire") return "tuto";
  const lundi = indexJourSemaineReel(state.jourActuel) === 0;
  if (lundi && !state.gazetteAchetee && !(state.gazetteRefusee ?? false)) {
    return "achat";
  }
  return null;
}
