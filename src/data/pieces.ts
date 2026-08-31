import type { CategorieObjet, Rarete } from "@/types/game";
import type { ObjetTemplate } from "@/data/objetTemplates";
import { CARTES } from "@/data/cartes";
import { TIMBRES } from "@/data/timbres";

export { CARTES } from "@/data/cartes";
export { TIMBRES } from "@/data/timbres";

export type AlbumId = "classeur" | "timbres";

export interface PieceCollection {
  /** "carte.<slug>" ou "timbre.<slug>" — le préfixe identifie l'album. */
  id: string;
  nom: string;
  album: AlbumId;
  /** Cartes : catégorie de l'objet source. Timbres : thème. */
  serie: string;
  rarete: Rarete;
  /** Valeur de référence (« Très bon ») pour le prix en brocante. */
  prixRefBase: number;
  /** Cartes uniquement : templateId de l'objet toonifié (placeholder). */
  source?: string;
  /** Ordre dans l'album (0..49), stable : sert aux pochettes du classeur. */
  ordre: number;
}

/** Catégorie sous laquelle une pièce se présente quand elle est enveloppée en Objet. */
export const CATEGORIE_ALBUM: Record<AlbumId, CategorieObjet> = {
  classeur: "Jeux & Loisirs",
  timbres: "Livres & Papeterie",
};

export const THEMES_TIMBRES = ["voyage", "faune", "monuments", "celebrites", "culture-pop"] as const;
export type ThemeTimbre = (typeof THEMES_TIMBRES)[number];

export const PIECES: PieceCollection[] = [...CARTES, ...TIMBRES];
const PAR_ID = new Map(PIECES.map((p) => [p.id, p]));

export function estPiece(id: string): boolean {
  return id.startsWith("carte.") || id.startsWith("timbre.");
}

export function albumDe(id: string): AlbumId | null {
  if (id.startsWith("carte.")) return "classeur";
  if (id.startsWith("timbre.")) return "timbres";
  return null;
}

export function getPiece(id: string): PieceCollection | undefined {
  return PAR_ID.get(id);
}

/** Les 50 pièces d'un album, dans l'ordre des pochettes. */
export function piecesDe(album: AlbumId): PieceCollection[] {
  return PIECES.filter((p) => p.album === album).sort((a, b) => a.ordre - b.ordre);
}

/** Vue ObjetTemplate d'une pièce — ce que `getTemplate` renvoie pour elle. */
export function templateDePiece(id: string): ObjetTemplate | undefined {
  const p = PAR_ID.get(id);
  if (!p) return undefined;
  return {
    templateId: p.id,
    nom: p.nom,
    categorie: CATEGORIE_ALBUM[p.album],
    rarete: p.rarete,
    prixRefBase: p.prixRefBase,
    taille: "XS",
  };
}
