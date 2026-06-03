"use client";

import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl } from "@/lib/itemImages";
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
}

const wrapper: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

export function ItemImage({
  templateId,
  categorie,
  fit = "contain",
  fallbackIconSize = 40,
  fallbackIconColor = "var(--brass-700)",
  alt = "",
  padded = false,
}: ItemImageProps) {
  const src = getItemImageUrl(templateId);
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: imgSize,
          height: imgSize,
          objectFit: fit,
          display: "block",
        }}
      />
    </div>
  );
}
