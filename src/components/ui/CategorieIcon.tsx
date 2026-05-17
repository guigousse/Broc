import {
  BookOpen,
  Dice5,
  Disc3,
  Lamp,
  Shirt,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategorieObjet } from "@/types/game";

const ICONS: Record<CategorieObjet, LucideIcon> = {
  Musique: Disc3,
  "Jeux & Loisirs": Dice5,
  "Livres & Papeterie": BookOpen,
  Mode: Shirt,
  Maison: Lamp,
  Bricolage: Wrench,
};

interface CategorieIconProps {
  categorie: CategorieObjet;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Icône Lucide par catégorie, traitée en line-art (stroke 1,5) pour rester
 * dans la grammaire Art Déco de l'app.
 */
export function CategorieIcon({
  categorie,
  size = 18,
  color = "currentColor",
  strokeWidth = 1.5,
}: CategorieIconProps) {
  const Icon = ICONS[categorie];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
