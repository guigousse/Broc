import type { ChatBaladeurId } from "@/lib/chatBaladeur";

/**
 * Coordonnées des emplacements du chat baladeur dans le panorama bureau.
 * Mêmes conventions que `QG_LAYOUT` : `left` et `width` en vw (repère
 * 0–300 de l'image bureau), `bottom` en pourcentage.
 */
export const CHAT_BALADEUR_LAYOUT: Record<
  ChatBaladeurId,
  { left: number; bottom: number; width: number }
> = {
  "qg-fenetre": { left: 235.0, bottom: 28.2, width: 10.7 },
};
