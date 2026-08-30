// src/lib/bazar/albums.ts
import type { GameState } from "@/types/game";
import type { AlbumId } from "@/data/pieces";
import { ajouterPiece, albumsDe, ouvrirPaquet } from "@/lib/albums";
import type { ResultatAchat } from "./achat";

/** Prix de l'album (classeur ou timbres), en jetons. Achat unique par album. */
export const PRIX_ALBUM = 10;
/** Prix d'un paquet de 3 pièces, en jetons. Stock illimité comme les lots de restauration. */
export const PRIX_PAQUET = 5;

/**
 * Achète un album (classeur ou timbres) — condition d'entrée pour ouvrir des
 * paquets de cet album. Refuse `"indisponible"` si déjà acheté : un album ne
 * se rachète pas.
 */
export function acheterAlbum(state: GameState, albumId: AlbumId): ResultatAchat {
  const albums = albumsDe(state);
  if (albums[albumId].achete) return { ok: false, raison: "indisponible" };
  if (state.jetons < PRIX_ALBUM) return { ok: false, raison: "jetons" };
  return {
    ok: true,
    state: {
      ...state,
      jetons: state.jetons - PRIX_ALBUM,
      albums: { ...albums, [albumId]: { ...albums[albumId], achete: true } },
    },
  };
}

/**
 * Achète un paquet de 3 pièces de l'album donné. Refuse `"indisponible"` si
 * l'album n'est pas encore acheté.
 *
 * ⚠ Tire les pièces au hasard (`rng`) — impur en ce sens, donc à N'UTILISER
 * QUE pour un pré-check hors `setState`. Pour l'updater React (rejouable),
 * utiliser `appliquerPaquet` avec les ids déjà tirés.
 */
export function acheterPaquet(
  state: GameState,
  albumId: AlbumId,
  rng: () => number = Math.random,
): ResultatAchat & { pieces?: string[] } {
  const albums = albumsDe(state);
  if (!albums[albumId].achete) return { ok: false, raison: "indisponible" };
  if (state.jetons < PRIX_PAQUET) return { ok: false, raison: "jetons" };
  const pieces = ouvrirPaquet(albumId, rng).map((p) => p.id);
  return appliquerPaquet(state, albumId, pieces);
}

/**
 * Rejoue l'achat d'un paquet avec des ids DÉJÀ tirés (par `acheterPaquet` en
 * pré-check). Mêmes contrôles, mais pure et déterministe : c'est elle qui
 * tourne dans l'updater `setState`, pour que le paquet ne soit tiré qu'une
 * seule fois.
 */
export function appliquerPaquet(
  state: GameState,
  albumId: AlbumId,
  ids: string[],
): ResultatAchat & { pieces?: string[] } {
  const albums = albumsDe(state);
  if (!albums[albumId].achete) return { ok: false, raison: "indisponible" };
  if (state.jetons < PRIX_PAQUET) return { ok: false, raison: "jetons" };
  const next = ids.reduce((acc, id) => ajouterPiece(acc, id), albums);
  return {
    ok: true,
    state: { ...state, jetons: state.jetons - PRIX_PAQUET, albums: next },
    pieces: ids,
  };
}
