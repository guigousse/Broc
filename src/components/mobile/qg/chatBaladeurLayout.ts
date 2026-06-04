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
  "qg-fenetre":      { left: 60,  bottom: 30, width: 6 },
  "atelier-fenetre": { left: 360, bottom: 28, width: 6 },
  "atelier-marche":  { left: 450, bottom: 14, width: 5 },
};
