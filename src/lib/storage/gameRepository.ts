import type { GameState } from "@/types/game";
import type { GenreErreur } from "./pontNatif";

/** Résultat d'une sauvegarde : succès, ou échec qualifié pour que l'UI puisse
 *  proposer une action ("libère de l'espace" plutôt qu'un message générique). */
export type ResultatSave = { ok: true } | { ok: false; genre: GenreErreur };

/**
 * Couche d'abstraction pour la persistance du GameState.
 * Aujourd'hui : implémentation locale (mémoire + localStorage).
 * Demain : implémentation Supabase sans toucher au reste du code.
 */
export interface GameRepository {
  load(): Promise<GameState | null>;
  /** Persiste l'état. Retourne une cause qualifiée en cas d'échec (quota plein, stockage indisponible…). */
  save(state: GameState): Promise<ResultatSave>;
  clear(): Promise<void>;
}
