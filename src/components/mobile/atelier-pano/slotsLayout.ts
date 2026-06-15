/**
 * Coordonnées du slot de restauration atelier — éditable via l'outil QG edit.
 *
 * Convention identique aux autres familles (QG_LAYOUT, CHAT_BALADEUR_LAYOUT,
 * STOCKAGE_BOXES_LAYOUT) : `left` et `width` en vw, `bottom` en pourcentage.
 * Comme pour les chats baladeurs atelier, le shift +300vw du panorama unifié
 * est DÉJÀ INCLUS dans `left` — les coords sont absolues dans le panorama
 * unifié. Le composant WorkshopSlots est donc rendu directement comme enfant
 * d'UnifiedPanorama (pas dans la sous-section atelier).
 *
 * Un seul slot est éditable (le premier) : les slots suivants (niveau 2/3) sont
 * placés à droite avec un gap fixe (cf. ATELIER_SLOT_GAP_VW dans WorkshopSlots).
 */
export type AtelierSlotKey = "atelier-slot";

export const ATELIER_SLOT_ORDER: readonly AtelierSlotKey[] = [
  "atelier-slot",
] as const;

export const ATELIER_SLOT_LAYOUT: Record<
  AtelierSlotKey,
  { left: number; bottom: number; width: number }
> = {
  // Sur le rebord de la fenêtre vitrail, au-dessus de l'établi.
  // left absolu dans le panorama unifié (shift +300vw inclus).
  "atelier-slot": { left: 447.5, bottom: 38.5, width: 20.1 },
};

/** Espacement horizontal entre deux slots consécutifs (vw). */
export const ATELIER_SLOT_GAP_VW = 1.5;
