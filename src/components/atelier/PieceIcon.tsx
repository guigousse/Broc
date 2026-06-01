"use client";

import { Cog } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CategorieObjet } from "@/types/game";

interface PieceIconProps {
  categorie: CategorieObjet;
  /** Diamètre extérieur (cog). Défaut 36. */
  size?: number;
}

/**
 * Représente une pièce d'amélioration : un engrenage laiton avec
 * l'icône de la catégorie centrée par-dessus. Utilisé dans le bandeau
 * PiecesInventoryBar et dans les boutons d'action de l'atelier.
 */
export function PieceIcon({ categorie, size = 36 }: PieceIconProps) {
  // L'icône intérieure fait ~45% du diamètre pour rester lisible.
  const innerSize = Math.max(10, Math.round(size * 0.45));
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        filter: "drop-shadow(0 1px 1px rgba(40,25,5,0.30))",
      }}
    >
      <Cog
        size={size}
        strokeWidth={1.5}
        color="var(--brass-700)"
        fill="var(--paper-100)"
      />
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "grid",
          placeItems: "center",
          lineHeight: 0,
        }}
      >
        <CategorieIcon
          categorie={categorie}
          size={innerSize}
          strokeWidth={1.6}
          color="var(--forest-800)"
        />
      </span>
    </span>
  );
}
