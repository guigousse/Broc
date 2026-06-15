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
  // left = 300 (shift atelier) + 135.5 (centre établi - slotSize/2).
  "atelier-slot": { left: 435.5, bottom: 48, width: 9 },
};

/** Espacement horizontal entre deux slots consécutifs (vw). */
export const ATELIER_SLOT_GAP_VW = 1.5;
