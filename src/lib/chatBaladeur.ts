/**
 * Identifiants des emplacements du chat baladeur. L'ordre détermine
 * le cycle de tirage (`jourActuel % CHAT_BALADEUR_ORDER.length`).
 */
export const CHAT_BALADEUR_ORDER = ["qg-fenetre"] as const;

export type ChatBaladeurId = (typeof CHAT_BALADEUR_ORDER)[number];

/**
 * Sélectionne l'emplacement du chat baladeur pour le jour donné.
 * Retourne `null` si le chat est déjà sur le fauteuil — il ne peut pas
 * se dédoubler.
 */
export function selectChatBaladeur(
  jourActuel: number,
  chatSurFauteuil: boolean,
): ChatBaladeurId | null {
  if (chatSurFauteuil) return null;
  const idx =
    ((jourActuel % CHAT_BALADEUR_ORDER.length) + CHAT_BALADEUR_ORDER.length) %
    CHAT_BALADEUR_ORDER.length;
  return CHAT_BALADEUR_ORDER[idx];
}
