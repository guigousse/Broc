"use client";

import { Cog } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CategorieObjet } from "@/types/game";

interface PieceIconProps {
  categorie: CategorieObjet;
  /**
   * Diamètre extérieur (cog). Défaut 36.
   *
   * C'est une taille SOUHAITÉE, pas une promesse : l'engrenage ne dépasse
   * jamais la boîte qui le reçoit (cf. le plafond `max-width/height: 100%`
   * ci-dessous). Un nombre de pixels ne peut pas tenir dans une case dont la
   * largeur suit l'écran — celle de l'étal du Bazar, par exemple.
   */
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
        // « L'objet doit toujours être visible en entier » (recette du
        // 2026-08-20) : dans une case dont la largeur suit l'écran, un
        // engrenage de 48 px déborderait sur un petit téléphone et se ferait
        // rogner. Le plafond le ramène à la taille de sa boîte au lieu de le
        // laisser sortir. Sans effet là où la boîte est plus grande que
        // `size` — c'est-à-dire partout ailleurs aujourd'hui.
        maxWidth: "100%",
        maxHeight: "100%",
        filter: "drop-shadow(0 1px 1px rgba(40,25,5,0.30))",
      }}
    >
      <Cog
        size={size}
        strokeWidth={1.5}
        color="var(--brass-700)"
        fill="var(--paper-100)"
        // La taille en style l'emporte sur l'attribut `width`/`height` que
        // lucide pose à partir de `size` : le dessin suit donc la boîte quand
        // celle-ci a été rabotée par le plafond, au lieu d'en sortir. Le
        // `viewBox` de l'icône préserve les proportions.
        style={{ width: "100%", height: "100%" }}
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
