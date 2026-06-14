"use client";

import {
  BookOpen,
  Hammer,
  Home,
  Music,
  Palette,
  Puzzle,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import type { CategorieObjet } from "@/types/game";

/**
 * Icône Lucide associée à chaque catégorie de brocante. Utilisé pour les
 * badges thématiques affichés sur les cadres spécialisés.
 */
export const CATEGORY_ICONS: Record<CategorieObjet, LucideIcon> = {
  Musique: Music,
  "Jeux & Loisirs": Puzzle,
  "Livres & Papeterie": BookOpen,
  Mode: Shirt,
  Maison: Home,
  "Objets d'art": Palette,
  Bricolage: Hammer,
};
