"use client";

import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { ETAT_STARS_MAX } from "@/lib/etat";

interface StarRowProps {
  /** Nombre d'étoiles remplies (entre 0 et `total`). */
  filled: number;
  /** Couleur des étoiles (remplissage et trait). */
  color: string;
  /** Taille en px de chaque étoile. */
  size?: number;
  /** Total d'étoiles affichées. Défaut : 3. */
  total?: number;
  /** Couleur de remplissage des étoiles vides. Défaut : "transparent". */
  emptyFill?: string;
  /** Épaisseur du trait des étoiles. Défaut : 1.8. */
  strokeWidth?: number;
  /** Espacement entre étoiles en px. Défaut : 1. */
  gap?: number;
  /** Ombre portée sur chaque étoile. Défaut : false. */
  dropShadow?: boolean;
  /** Container display. Défaut : "inline-flex". */
  display?: "inline-flex" | "flex";
  /** Style additionnel sur le conteneur. */
  style?: CSSProperties;
  /** Aria-label sur le conteneur. */
  "aria-label"?: string;
}

/**
 * Rangée d'étoiles d'état partagée. Pour l'état d'un objet, utiliser
 * `<StarRow filled={etoileCount(objet.etat)} color={...} />`.
 */
export function StarRow({
  filled,
  color,
  size = 12,
  total = ETAT_STARS_MAX,
  emptyFill = "transparent",
  strokeWidth = 1.8,
  gap = 1,
  dropShadow = false,
  display = "inline-flex",
  style,
  "aria-label": ariaLabel,
}: StarRowProps) {
  const starStyle: CSSProperties | undefined = dropShadow
    ? { filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }
    : undefined;

  return (
    <span
      style={{ display, gap, ...style }}
      aria-label={ariaLabel}
    >
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={`star-${i}`}
          size={size}
          strokeWidth={strokeWidth}
          fill={i < filled ? color : emptyFill}
          color={color}
          style={starStyle}
        />
      ))}
    </span>
  );
}
