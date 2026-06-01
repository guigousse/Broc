"use client";

import { Cog } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CategorieObjet } from "@/types/game";

interface PieceIconProps {
  categorie: CategorieObjet;
  /** Diamètre extérieur (cog). Défaut 36. */
  size?: number;
  /** Nombre à afficher au centre. Si undefined, affiche CategorieIcon centré. */
  count?: number;
}

/**
 * Représente une pièce d'amélioration : un engrenage laiton avec
 * - soit l'icône de catégorie centrée (mode utilisé dans les boutons d'action),
 * - soit la quantité en gras au centre + petite icône catégorie en badge
 *   (mode utilisé dans le bandeau inventaire en tête de page).
 */
export function PieceIcon({ categorie, size = 36, count }: PieceIconProps) {
  const showCount = typeof count === "number";
  // Lorsque la quantité est affichée, l'icône catégorie devient un badge
  // dans le coin bas-droit ; sinon, elle est centrée.
  const innerSize = Math.max(10, Math.round(size * 0.45));
  const badgeSize = Math.max(10, Math.round(size * 0.33));
  // Taille du chiffre : assez gros pour qu'il "remplisse" l'œil du cog
  // et déborde légèrement (overlap voulu).
  const countSize = Math.max(11, Math.round(size * 0.5));

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
      {showCount ? (
        <>
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: "var(--font-display)",
              fontSize: countSize,
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--forest-800)",
              textShadow:
                "0 0 2px var(--paper-100), 0 0 4px var(--paper-100)",
            }}
          >
            {count}
          </span>
          <span
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: badgeSize,
              height: badgeSize,
              borderRadius: "50%",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-700)",
              display: "grid",
              placeItems: "center",
              lineHeight: 0,
            }}
          >
            <CategorieIcon
              categorie={categorie}
              size={Math.max(8, badgeSize - 4)}
              strokeWidth={1.8}
              color="var(--brass-700)"
            />
          </span>
        </>
      ) : (
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
      )}
    </span>
  );
}
