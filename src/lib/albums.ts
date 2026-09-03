// src/lib/albums.ts
import type { AlbumClasseurState, AlbumsState, AlbumState, GameState, Objet, PlacementTimbre, Rarete } from "@/types/game";
import { CATEGORIE_ALBUM, albumDe, getPiece, piecesDe, type AlbumId, type PieceCollection } from "@/data/pieces";

export const NB_LIGNES_ALBUM = 5;
export const NB_PAGES_ALBUM = 2;
/** 6 pages × 9 pochettes : les 50 cartes + 4 emplacements « à venir ». */
export const NB_SLOTS_CLASSEUR = 54;
export const TAILLE_PAQUET = 3;
export const POIDS_RARETE: Record<Rarete, number> = { commun: 70, rare: 25, legendaire: 5 };

/** Largeur d'un timbre, en fraction de la largeur de page. Vit ici (et pas
 *  dans `albumTimbresLayout`, un module de composant) pour que `poserTimbre`
 *  puisse s'en servir sans faire dépendre `src/lib` de `src/components`. */
export const TAILLE_TIMBRE = 1 / 6;

/** Borne x à la demi-largeur du timbre de chaque côté, pour qu'il reste sur la page. */
export function xBorne(xFraction: number): number {
  const demi = TAILLE_TIMBRE / 2;
  return Math.min(1 - demi, Math.max(demi, xFraction));
}

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

function patchAlbum(albums: AlbumsState, id: AlbumId, patch: Partial<AlbumsState["timbres"] & AlbumClasseurState>): AlbumsState {
  return id === "classeur"
    ? { ...albums, classeur: { ...albums.classeur, ...patch } }
    : { ...albums, timbres: { ...albums.timbres, ...patch } };
}

export function ajouterPiece(albums: AlbumsState, id: string): AlbumsState {
  const a = albumDe(id);
  // Id inconnu (pièce renommée/retirée du catalogue depuis une save ancienne,
  // ou id corrompu) : ignoré plutôt qu'empilé — voir M6 revue finale 2026-08-30.
  if (!a || !getPiece(id)) return albums;
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

/** Vrai si au moins un exemplaire de la pièce (carte/timbre) est déjà dans son
 *  album — contrepartie de `templateEnMainOuDonne`/`templateVu` pour les
 *  pièces, qui ne transitent jamais par `collection` (voir I3 revue finale
 *  2026-08-30). */
export function piecePossedee(albums: AlbumsState, id: string): boolean {
  const a = albumDe(id);
  return a !== null && !!albums[a].pieces[id];
}

export function nbPossedees(album: AlbumState): number {
  return Object.keys(album.pieces).filter((id) => getPiece(id)).length;
}

export function doublons(album: AlbumState): number {
  return Object.entries(album.pieces)
    .filter(([id]) => getPiece(id))
    .reduce((s, [, q]) => s + Math.max(0, q - 1), 0);
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
  const xb = xBorne(x);
  return patchAlbum(albums, "timbres", {
    placements: { ...albums.timbres.placements, [id]: { page, ligne, x: xb } },
    ordreZ: [...albums.timbres.ordreZ.filter((z) => z !== id), id],
  });
}

/* ── Placement manuel du classeur (recette 2026-09-03) ─────────────────────
   Les cartes vont PILE dans un slot (pas de placement libre comme les
   timbres), mais le joueur choisit lequel. `slots` est ADDITIF : absent, la
   carte occupe l'emplacement de son `ordre` (le comportement historique). */

/** Où est chaque carte possédée : `slots` explicites, complétés par l'ordre
 *  du catalogue pour les cartes jamais déplacées (et les vieilles saves). */
export function slotsDuClasseur(classeur: AlbumClasseurState): Record<string, number> {
  const slots: Record<string, number> = {};
  const occupes = new Set<number>();
  for (const [id, slot] of Object.entries(classeur.slots ?? {})) {
    if (!classeur.pieces[id] || !getPiece(id)) continue;
    slots[id] = slot;
    occupes.add(slot);
  }
  for (const id of Object.keys(classeur.pieces)) {
    if (id in slots) continue;
    const piece = getPiece(id);
    if (!piece) continue;
    // L'emplacement historique de la carte, sinon le premier libre.
    let slot = piece.ordre;
    while (occupes.has(slot)) slot = (slot + 1) % NB_SLOTS_CLASSEUR;
    slots[id] = slot;
    occupes.add(slot);
  }
  return slots;
}

/** Déplace une carte vers `slot` (0..53). Slot occupé par une autre carte →
 *  ÉCHANGE. Le résultat matérialise `slots` en entier : plus aucune
 *  dérivation implicite ne peut le contredire ensuite. */
export function deplacerCarte(albums: AlbumsState, id: string, slot: number): AlbumsState {
  if (albumDe(id) !== "classeur" || !albums.classeur.pieces[id] || !getPiece(id)) return albums;
  if (!Number.isInteger(slot) || slot < 0 || slot >= NB_SLOTS_CLASSEUR) return albums;
  const slots = slotsDuClasseur(albums.classeur);
  const depuis = slots[id];
  const occupant = Object.keys(slots).find((autre) => slots[autre] === slot);
  if (occupant === id) return albums;
  const suivants = { ...slots, [id]: slot };
  if (occupant) suivants[occupant] = depuis;
  return patchAlbum(albums, "classeur", { slots: suivants });
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
