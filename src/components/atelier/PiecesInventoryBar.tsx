"use client";

import type { CategorieObjet } from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { PieceIcon } from "@/components/atelier/PieceIcon";

interface PiecesInventoryBarProps {
  pieces: Record<CategorieObjet, number>;
}

/**
 * Bandeau horizontal des 7 catégories : grille pleine largeur (1fr × 7)
 * avec un engrenage laiton + icône de catégorie centrée, et compteur
 * monospace en dessous.
 */
export function PiecesInventoryBar({ pieces }: PiecesInventoryBarProps) {
  return (
    <div
      role="list"
      aria-label="Inventaire de pièces d'amélioration"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${CATEGORIES.length}, 1fr)`,
        gap: 4,
        padding: "6px 2px 8px",
      }}
    >
      {CATEGORIES.map((cat) => (
        <div
          key={cat}
          role="listitem"
          data-fly-target={`piece-${cat}`}
          title={`${cat} : ${pieces[cat] ?? 0} pièces`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            minWidth: 0,
          }}
        >
          <PieceIcon categorie={cat} size={36} />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-700)",
              letterSpacing: "0.04em",
            }}
          >
            {pieces[cat] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
