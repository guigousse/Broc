"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl, getItemThumbUrl } from "@/lib/itemImages";
import type { CategorieObjet } from "@/types/game";

interface ItemImageProps {
  templateId: string;
  categorie: CategorieObjet;
  /** Mode d'ajustement de l'image dans son conteneur. */
  fit?: "contain" | "cover";
  /** Taille de l'icône fallback (px). */
  fallbackIconSize?: number;
  /** Couleur de l'icône fallback. */
  fallbackIconColor?: string;
  /** Alt text pour l'image. */
  alt?: string;
  /**
   * Si vrai, l'image est rendue à 80 % du conteneur (laisse 20 % de marge
   * autour). Utilisé dans les tuiles où le fond coloré doit rester visible.
   */
  padded?: boolean;
  /**
   * Attribut `sizes` passé à next/image. Doit refléter la largeur réelle
   * d'affichage pour que Next serve la variante optimale. Par défaut on
   * cible une carte de grille mobile (~150px sur la majorité des écrans).
   */
  sizes?: string;
  /** Charger en priorité (above-the-fold, overlay détail…). */
  priority?: boolean;
  /**
   * Plein format (~500-1600 px) au lieu de la vignette 384 px. À réserver aux
   * visuels « héros » (un seul objet affiché en grand) : dans les listes/
   * grilles, décoder le plein format fait exploser la mémoire sous iOS
   * (le WebView recharge la page). Cf. `getItemThumbUrl`.
   */
  fullSize?: boolean;
}

const wrapper: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const DEFAULT_SIZES = "(max-width: 600px) 45vw, 200px";

export function ItemImage({
  templateId,
  categorie,
  fit = "contain",
  fallbackIconSize = 40,
  fallbackIconColor = "var(--brass-700)",
  alt = "",
  padded = false,
  sizes = DEFAULT_SIZES,
  priority = false,
  fullSize = false,
}: ItemImageProps) {
  const src = fullSize
    ? getItemImageUrl(templateId)
    : getItemThumbUrl(templateId);
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div style={wrapper}>
        <CategorieIcon
          categorie={categorie}
          size={fallbackIconSize}
          strokeWidth={1.2}
          color={fallbackIconColor}
        />
      </div>
    );
  }

  const imgSize = padded ? "80%" : "100%";

  return (
    <div style={wrapper}>
      {/* Skeleton — visible tant que l'image n'a pas chargé */}
      {!loaded && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(110deg, var(--paper-200) 30%, var(--brass-100) 50%, var(--paper-200) 70%)",
            backgroundSize: "200% 100%",
            animation: "broc-skeleton-shimmer 1.2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          width: imgSize,
          height: imgSize,
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          style={{ objectFit: fit, display: "block" }}
        />
      </div>
    </div>
  );
}
