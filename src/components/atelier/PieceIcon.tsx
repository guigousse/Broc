"use client";

import { Cog } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CategorieObjet } from "@/types/game";

interface PieceIconProps {
  categorie: CategorieObjet;
  /** Diamètre extérieur (cog). Défaut 36. */
  size?: number;
  /** Si fourni, badge quantité positionné en bas (chevauche le rim). */
  count?: number;
}

/**
 * Représente une pièce d'amélioration : un engrenage laiton avec
 * la CategorieIcon centrée. Si `count` est passé, un badge quantité
 * en gras est superposé en bas de l'engrenage (chevauche le rim).
 */
export function PieceIcon({ categorie, size = 36, count }: PieceIconProps) {
  const showCount = typeof count === "number";
  const innerSize = Math.max(10, Math.round(size * 0.45));
  const countSize = Math.max(10, Math.round(size * 0.38));

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
      {showCount && (
        <span
          style={{
            position: "absolute",
            left: "50%",
            bottom: -3,
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontSize: countSize,
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--forest-800)",
            background: "var(--paper-100)",
            padding: "0 4px",
            borderRadius: 3,
            border: "1px solid var(--brass-700)",
            whiteSpace: "nowrap",
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
