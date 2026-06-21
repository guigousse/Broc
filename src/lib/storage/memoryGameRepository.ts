import type { GameState } from "@/types/game";
import type { GameRepository } from "./gameRepository";

/**
 * Implémentation in-memory du `GameRepository`. Utile pour :
 * - Les tests unitaires (pas besoin d'un localStorage simulé)
 * - Les tests d'intégration sans pollution entre runs
 * - Un mode "incognito" éventuel où aucune persistance n'est souhaitée
 *
 * La fonction est une factory : chaque appel crée une instance indépendante,
 * pour éviter que deux tests partagent l'état.
 */
export function createMemoryGameRepository(
  initial: GameState | null = null,
): GameRepository {
  let state: GameState | null = initial;
  return {
    async load() {
      return state;
    },
    async save(next) {
      state = next;
      return true;
    },
    async clear() {
      state = null;
    },
  };
}
