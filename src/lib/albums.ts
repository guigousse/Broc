// src/lib/albums.ts
import type { AlbumsState, AlbumState, GameState, Objet, PlacementTimbre, Rarete } from "@/types/game";
import { CATEGORIE_ALBUM, albumDe, getPiece, piecesDe, type AlbumId, type PieceCollection } from "@/data/pieces";

export const NB_LIGNES_ALBUM = 5;
export const NB_PAGES_ALBUM = 2;
export const TAILLE_PAQUET = 3;
export const POIDS_RARETE: Record<Rarete, number> = { commun: 70, rare: 25, legendaire: 5 };

export function initAlbums(): AlbumsState {
  return {
    classeur: { achete: false, pieces: {}, nouvelles: [] },
    timbres: { achete: false, pieces: {}, nouvelles: [], placements: {}, ordreZ: [] },
  };
}

/** Lecture tolérante : une save d'avant 2026-08-30 n'a pas le champ. */
export function albumsDe(state: Pick<GameState, "albums">): AlbumsState {
  return state.albums ?? initAlbums();
}

function patchAlbum(albums: AlbumsState, id: AlbumId, patch: Partial<AlbumsState["timbres"]>): AlbumsState {
  return id === "classeur"
    ? { ...albums, classeur: { ...albums.classeur, ...patch } }
    : { ...albums, timbres: { ...albums.timbres, ...patch } };
}

export function ajouterPiece(albums: AlbumsState, id: string): AlbumsState {
  const a = albumDe(id);
  if (!a) return albums;
  const album = albums[a];
  const qte = album.pieces[id] ?? 0;
  return patchAlbum(albums, a, {
    pieces: { ...album.pieces, [id]: qte + 1 },
    nouvelles: qte === 0 ? [...album.nouvelles, id] : album.nouvelles,
  });
}

export function marquerConsultee(albums: AlbumsState, id: string): AlbumsState {
  const a = albumDe(id);
  if (!a || !albums[a].nouvelles.includes(id)) return albums;
  return patchAlbum(albums, a, { nouvelles: albums[a].nouvelles.filter((x) => x !== id) });
}

export function nbPossedees(album: AlbumState): number {
  return Object.keys(album.pieces).length;
}

export function doublons(album: AlbumState): number {
  return Object.values(album.pieces).reduce((s, q) => s + Math.max(0, q - 1), 0);
}

/** 1 pièce de réparation (catégorie de l'album) par exemplaire recyclé. */
export function recyclerDoublons(state: GameState, albumId: AlbumId): { state: GameState; n: number } {
  const albums = albumsDe(state);
  const n = doublons(albums[albumId]);
  if (n === 0) return { state, n: 0 };
  const pieces = Object.fromEntries(Object.keys(albums[albumId].pieces).map((id) => [id, 1]));
  const cat = CATEGORIE_ALBUM[albumId];
  return {
    n,
    state: {
      ...state,
      albums: patchAlbum(albums, albumId, { pieces }),
      piecesAmelioration: { ...state.piecesAmelioration, [cat]: (state.piecesAmelioration[cat] ?? 0) + n },
    },
  };
}

/** Poids 70/25/5 par rareté, uniforme dans la rareté. Doublons possibles. */
export function tirerPiece(albumId: AlbumId, rng: () => number = Math.random): PieceCollection {
  const total = POIDS_RARETE.commun + POIDS_RARETE.rare + POIDS_RARETE.legendaire;
  const r = rng() * total;
  const rarete: Rarete = r < POIDS_RARETE.commun ? "commun" : r < POIDS_RARETE.commun + POIDS_RARETE.rare ? "rare" : "legendaire";
  const pool = piecesDe(albumId).filter((p) => p.rarete === rarete);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function ouvrirPaquet(albumId: AlbumId, rng: () => number = Math.random): PieceCollection[] {
  return Array.from({ length: TAILLE_PAQUET }, () => tirerPiece(albumId, rng));
}

export function poserTimbre(albums: AlbumsState, id: string, page: 0 | 1, ligne: PlacementTimbre["ligne"], x: number): AlbumsState {
  if (albumDe(id) !== "timbres" || !albums.timbres.pieces[id] || !getPiece(id)) return albums;
  const xb = Math.min(1, Math.max(0, x));
  return patchAlbum(albums, "timbres", {
    placements: { ...albums.timbres.placements, [id]: { page, ligne, x: xb } },
    ordreZ: [...albums.timbres.ordreZ.filter((z) => z !== id), id],
  });
}

export function rendreAuBac(albums: AlbumsState, id: string): AlbumsState {
  if (!albums.timbres.placements[id]) return albums;
  const { [id]: _retire, ...placements } = albums.timbres.placements;
  void _retire;
  return patchAlbum(albums, "timbres", { placements, ordreZ: albums.timbres.ordreZ.filter((z) => z !== id) });
}

export type RefusPiece = "albumManquant" | "budget";

/** Aiguille l'achat d'une pièce (carte/timbre) vers son album : refuse si l'album
 * n'est pas acheté ou si le budget est insuffisant, sinon débite et range dans
 * l'album — jamais dans la réserve (`inventaireJoueur`). */
export function acheterPiece(
  state: GameState,
  objet: Objet,
  prix: number,
): { ok: true; state: GameState } | { ok: false; raison: RefusPiece } {
  const album = albumDe(objet.templateId);
  if (!album) return { ok: false, raison: "albumManquant" };
  const albums = albumsDe(state);
  if (!albums[album].achete) return { ok: false, raison: "albumManquant" };
  if (state.budget < prix) return { ok: false, raison: "budget" };
  return { ok: true, state: { ...state, budget: state.budget - prix, albums: ajouterPiece(albums, objet.templateId) } };
}

/** Chemin sans glisser : ligne 0, x = 0,1 + 0,2 k dont aucun timbre posé n'est à moins de 0,15 ; sinon 0,5. */
export function premierePlaceLibre(albums: AlbumsState, page: 0 | 1): PlacementTimbre {
  const poses = Object.values(albums.timbres.placements).filter((p) => p.page === page && p.ligne === 0);
  for (let k = 0; k < 5; k++) {
    const x = Math.round((0.1 + 0.2 * k) * 100) / 100;
    if (poses.every((p) => Math.abs(p.x - x) >= 0.15)) return { page, ligne: 0, x };
  }
  return { page, ligne: 0, x: 0.5 };
}
