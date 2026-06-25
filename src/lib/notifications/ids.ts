/**
 * Registre central des IDs de notifications locales (32-bit stables).
 * Centraliser ici évite les collisions entre types de notifs. Plages
 * réservées pour les sous-projets à venir (restauration, quêtes).
 */
export const NOTIF_IDS = {
  ENERGIE_PLEINE: 1,
  RAPPEL_RETOUR: [10, 11, 12] as const, // J+1, J+3, J+7
  // Réservé 🅱️ restauration : 100–199 (1 par slot d'atelier)
  // Réservé 🅲 quêtes      : 200–299
} as const;
