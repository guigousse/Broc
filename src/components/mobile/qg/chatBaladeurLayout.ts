import type { ChatBaladeurId } from "@/lib/chatBaladeur";

/**
 * Coordonnées des 3 emplacements du chat baladeur dans le panorama
 * unifié. Mêmes conventions que `QG_LAYOUT` / `ATELIER_LAYOUT` :
 * `left` et `width` en vw, `bottom` en pourcentage. Pour les chats
 * atelier, le décalage +300vw (`ATELIER_X_SHIFT_VW`) est déjà inclus
 * dans `left`.
 */
export const CHAT_BALADEUR_LAYOUT: Record<
  ChatBaladeurId,
  { left: number; bottom: number; width: number }
> = {
  "qg-fenetre":      { left: 235.0, bottom: 28.2, width: 10.7 },
  "atelier-fenetre": { left: 435.0, bottom: 41.0, width: 13.5 },
  "atelier-marche":  { left: 443.7, bottom: 68.2, width: 8.3 },
};
