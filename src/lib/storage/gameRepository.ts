import type { GameState } from "@/types/game";
import type { GenreErreur } from "./pontNatif";
import type { NumeroSlot } from "./slots";

/** Résultat d'une sauvegarde : succès, ou échec qualifié pour que l'UI puisse
 *  proposer une action ("libère de l'espace" plutôt qu'un message générique). */
export type ResultatSave =
  | { ok: true; annulee?: true }
  | { ok: false; genre: GenreErreur };

/**
 * Couche d'abstraction pour la persistance du GameState.
 * Aujourd'hui : implémentation locale (mémoire + localStorage).
 * Demain : implémentation Supabase sans toucher au reste du code.
 */
export interface GameRepository {
  load(): Promise<GameState | null>;
  /** Persiste l'état. Retourne une cause qualifiée en cas d'échec (quota plein, stockage indisponible…).
   *  `slot` : emplacement cible capturé PAR L'APPELANT au moment de l'appel
   *  (F-04) ; à défaut, le repository résout l'actif lui-même. `annulee`
   *  signale une écriture abandonnée parce qu'invalidée entre-temps. */
  save(state: GameState, slot?: NumeroSlot): Promise<ResultatSave>;
  clear(): Promise<void>;
  /** Supprime un emplacement DONNÉ (pas nécessairement l'actif) dans TOUS
   *  les magasins (fichier natif, index fichier, miroir localStorage). La
   *  promesse doit être attendue avant tout `reload`/relance (F-01). */
  clearSlot(n: NumeroSlot): Promise<void>;
  /** Invalide les écritures en vol : rien de ce qui a été lancé avant cet
   *  appel ne doit plus atteindre le stockage (bascule de slot, F-04). */
  invaliderEcrituresEnVol(): void;
}
