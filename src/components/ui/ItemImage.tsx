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
  return (
    <div style={wrapper}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          display: "block",
        }}
      />
    </div>
  );
}
