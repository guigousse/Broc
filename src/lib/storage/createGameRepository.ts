import type { GameRepository } from "./gameRepository";
import { localGameRepository } from "./localGameRepository";

/**
 * Point unique de décision pour choisir l'implémentation du `GameRepository`.
 *
 * Aujourd'hui : retourne toujours l'implémentation locale (localStorage).
 *
 * Demain (cf. modèle Supabase + tickets) : pourra retourner une implémentation
 * remote ou hybride selon :
 * - la présence d'un utilisateur Supabase connecté (auth)
 * - une variable d'environnement (`NEXT_PUBLIC_USE_REMOTE_REPOSITORY`)
 * - un flag de mode test passé au démarrage
 *
 * Garde la décision concentrée ici pour que les callers (GameContext) ne
 * dépendent que de l'interface `GameRepository`.
 */
export function createGameRepository(): GameRepository {
  return localGameRepository;
}
