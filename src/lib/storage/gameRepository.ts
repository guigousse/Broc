import type { GameState } from "@/types/game";

/**
 * Couche d'abstraction pour la persistance du GameState.
 * Aujourd'hui : implémentation locale (mémoire + localStorage).
 * Demain : implémentation Supabase sans toucher au reste du code.
 */
export interface GameRepository {
  load(): Promise<GameState | null>;
  /** Persiste l'état. Retourne `true` si réussi, `false` si échec (quota plein, stockage indisponible…). */
  save(state: GameState): Promise<boolean>;
  clear(): Promise<void>;
}
