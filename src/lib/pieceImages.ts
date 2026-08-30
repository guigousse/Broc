import { albumDe } from "@/data/pieces";

/** Ids dont l'art définitif est livré dans public/cartes/ ou public/timbres/. Le chantier art remplit ce Set. */
export const PIECES_AVEC_IMAGE: ReadonlySet<string> = new Set<string>([]);

export function pieceImageSrc(id: string, declarees: ReadonlySet<string> = PIECES_AVEC_IMAGE): string | null {
  if (!declarees.has(id)) return null;
  const album = albumDe(id);
  if (album === "classeur") return `/cartes/${id}.webp`;
  if (album === "timbres") return `/timbres/${id}.webp`;
  return null;
}
