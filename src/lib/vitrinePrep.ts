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

/** Les deux temps de la préparation : charger le coffre, puis tarifer. */
export type EtapePrep = "packing" | "pricing";

/**
 * Réserve haute du contenu de la préparation, par étape.
 *
 * Deux calques flottent au-dessus de cet écran : le texte d'étape
 * (`EtapeBandeau`, `position: fixed`) et la bannière de consigne du
 * tutoriel (`TutorielBanniere`, `fixed` elle aussi, transparente aux
 * pointeurs, qui publie sa hauteur dans `--tuto-banniere-h`).
 *
 * - **packing** : le contenu est une IMAGE (le coffre ouvert) suivie du
 *   carrousel du stock, dans une colonne à hauteur fixe dont la barre
 *   d'actions est `position: fixed`. Y réserver de la place n'abaisse pas la
 *   vue, cela allonge le contenu — et le carrousel, dernier élément avant
 *   l'espaceur, passe sous la barre. Défaut de recette du 2026-08-26 : 73 px
 *   de carrousel sur 97 masqués, la carafe du tutoriel devenue intapable.
 *   Les deux calques se superposent donc à l'image, sans rien pousser.
 * - **pricing** : le contenu est une LISTE de lignes à tarifer. La première
 *   doit rester lisible sous les deux calques — d'où la réserve.
 */
export function reserveHauteContenuPrep(etape: EtapePrep): string {
  if (etape === "packing") return "0px";
  return "calc(70px + var(--tuto-banniere-h, 0px))";
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
