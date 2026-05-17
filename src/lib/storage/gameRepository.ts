import type { GameState } from "@/types/game";

/**
 * Couche d'abstraction pour la persistance du GameState.
 * Aujourd'hui : implémentation locale (mémoire + localStorage).
 * Demain : implémentation Supabase sans toucher au reste du code.
 */
export interface GameRepository {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
  clear(): Promise<void>;
}
