import type { CategorieObjet } from "@/types/game";

/** Source unique de vérité pour la liste ordonnée des catégories. */
export const CATEGORIES: CategorieObjet[] = [
  "Musique",
  "Jeux & Loisirs",
  "Livres & Papeterie",
  "Mode",
  "Maison",
  "Objets d'art",
  "Bricolage",
];

/**
 * Mapping des anciennes catégories vers les nouvelles, utilisé pour migrer
 * les sauvegardes pré-refonte des catégories.
 */
export const CATEGORIES_LEGACY_MAP: Record<string, CategorieObjet> = {
  // Refonte initiale (catégories d'origine)
  Vinyles: "Musique",
  "Jeux Vidéo": "Jeux & Loisirs",
  Bibelots: "Maison",
  Vaisselle: "Maison",
  Livres: "Livres & Papeterie",
  Outils: "Bricolage",
  Vêtements: "Mode",
  "Bric-à-brac": "Maison",
  // Renommages successifs
  "Livres & Papiers": "Livres & Papeterie",
  "Outils & Mécanique": "Bricolage",
};

export function migrerCategorie(cat: string): CategorieObjet {
  if ((CATEGORIES as string[]).includes(cat)) return cat as CategorieObjet;
  return CATEGORIES_LEGACY_MAP[cat] ?? "Maison";
}

export const CATEGORIE_EMOJI: Record<CategorieObjet, string> = {
  Musique: "🎵",
  "Jeux & Loisirs": "🎲",
  "Livres & Papeterie": "📚",
  Mode: "👗",
  Maison: "🏠",
  "Objets d'art": "🎨",
  Bricolage: "🔧",
};

/** Crée un dictionnaire de pièces vide (0 pour chaque catégorie). */
export function emptyPiecesAmelioration(): Record<CategorieObjet, number> {
  return {
    Musique: 0,
    "Jeux & Loisirs": 0,
    "Livres & Papeterie": 0,
    Mode: 0,
    Maison: 0,
    "Objets d'art": 0,
    Bricolage: 0,
  };
}
