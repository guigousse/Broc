import type { ChapitrePrincipal } from "@/data/quetesPrincipales";
import type { DialogueSequence } from "@/data/dialogues";

/** Battement entre la fin de la cérémonie et la scène du grand-père. */
export const DELAI_AVANT_DIALOGUE_MS = 500;

/**
 * Séquence à armer quand un chapitre vient d'être livré. `null` si aucun
 * chapitre n'est dû — après le chapitre 16, la trame est close et le carnet ne
 * doit pas se refermer tout seul.
 */
export function sequenceEnchainement(chapitre: ChapitrePrincipal | null): DialogueSequence | null {
  if (!chapitre) return null;
  return { id: `dlg_${chapitre.id}`, lignes: chapitre.dialogue };
}
