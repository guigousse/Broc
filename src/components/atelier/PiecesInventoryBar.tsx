"use client";

import type { CategorieObjet } from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";

interface PiecesInventoryBarProps {
  pieces: Record<CategorieObjet, number>;
}

/**
 * Bandeau horizontal des 7 catégories : grille pleine largeur (1fr × 7).
 * Chaque cellule affiche un engrenage laiton avec, au centre, le nombre
 * de pièces disponibles en gras + l'icône de catégorie en badge.
 */
export function PiecesInventoryBar({ pieces }: PiecesInventoryBarProps) {
  const { d, tr } = useLangue();
  return (
    <div
      role="list"
      aria-label={d.inventaire.inventairePieces}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${CATEGORIES.length}, 1fr)`,
        gap: 4,
        padding: "2px 2px",
      }}
    >
      {CATEGORIES.map((cat) => (
        <div
          key={cat}
          role="listitem"
          data-fly-target={`piece-${cat}`}
          title={tr(d.inventaire.piecesTitre, {
            categorie: libelleCategorie(cat, d),
            n: pieces[cat] ?? 0,
          })}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <PieceIcon categorie={cat} size={36} count={pieces[cat] ?? 0} />
        </div>
      ))}
    </div>
  );
}
