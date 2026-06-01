"use client";

import type { CategorieObjet } from "@/types/game";
import { CATEGORIES, CATEGORIE_EMOJI } from "@/data/categories";

interface PiecesInventoryBarProps {
  pieces: Record<CategorieObjet, number>;
}

/**
 * Bandeau horizontal des 7 catégories sous forme d'engrenages stylisés.
 * Chaque case = emoji de la catégorie + nombre de pièces dispo en dessous.
 * Largeur fixe par case, scroll horizontal si le viewport est trop étroit.
 */
export function PiecesInventoryBar({ pieces }: PiecesInventoryBarProps) {
  return (
    <div
      role="list"
      aria-label="Inventaire de pièces d'amélioration"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "6px 2px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CATEGORIES.map((cat) => (
        <div
          key={cat}
          role="listitem"
          title={`${cat} : ${pieces[cat] ?? 0} pièces`}
          style={{
            flex: "0 0 auto",
            width: 46,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1.5px solid var(--brass-500)",
              background: "var(--paper-100)",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              lineHeight: 1,
              boxShadow:
                "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
            }}
          >
            {CATEGORIE_EMOJI[cat]}
          </div>
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
