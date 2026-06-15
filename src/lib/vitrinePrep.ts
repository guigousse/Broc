/**
 * Constantes et helpers pour le mode "préparation du coffre" — étape
 * antérieure au choix de la brocante dans le flux Étaler.
 *
 * Le coffre est créé avec `brocanteId = VITRINE_PREP_ID` puis ré-attribué à
 * une vraie brocante lors du clic "Continuer" sur l'écran de sélection
 * (cf. action GameContext.attribuerVitrineABrocante).
 */
import type { BrocanteTier, GameState } from "@/types/game";
import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/storage/safeLocalStorage";

/** brocanteId sentinelle utilisé pendant la préparation du coffre. */
export const VITRINE_PREP_ID = "__prep__";

export function vitrineEstEnPrep(state: GameState): boolean {
  return state.vitrine?.brocanteId === VITRINE_PREP_ID;
}

/**
 * Dernier tier de scène visité sur l'écran de sélection de brocante. Utilisé
 * pour restaurer la position de scroll lors des prochaines visites (chiner
 * ou vitrine). Stocké en localStorage car purement UX (pas de save game).
 */
const LAST_TIER_KEY = "broc.brocantePanorama.lastTier";

export function getDernierTierVisite(): BrocanteTier | null {
  const v = safeLocalStorageGet<number | null>(LAST_TIER_KEY, null);
  if (v === 1 || v === 2 || v === 3 || v === 4) return v;
  return null;
}

export function setDernierTierVisite(tier: BrocanteTier): void {
  safeLocalStorageSet(LAST_TIER_KEY, tier);
}
