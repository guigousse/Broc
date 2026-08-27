"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl, getItemThumbUrl } from "@/lib/itemImages";
import { ECLAT_PRISTIN } from "@/components/ui/ItemSticker";
import { estPristin } from "@/lib/etat";
import type { CategorieObjet, EtatObjet } from "@/types/game";

interface ItemImageProps {
  templateId: string;
  categorie: CategorieObjet;
  /** Mode d'ajustement de l'image dans son conteneur. */
  fit?: "contain" | "cover";
  /**
   * Ancrage vertical de l'image dans son cadre (`object-position`). Par
   * défaut centré — c'est le comportement d'aujourd'hui, inchangé pour
   * tous les appelants existants (grille de collection, cartes, stickers…).
   * `"bottom"` ancre le BAS de l'image sur l'arête basse du cadre : utile
   * quand `fit="contain"` letterboxe un objet large et bas (une ménagère,
   * une pile de vinyles) — sans ça, `contain` centre le visible et laisse
   * un vide transparent sous l'objet, qui semble flotter au-dessus de
   * l'étagère au lieu d'y reposer.
   */
  verticalAlign?: "center" | "bottom";
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
  /**
   * État de l'objet. Sert UNIQUEMENT à l'éclat du pristin — le même halo que
   * celui du sticker (`ECLAT_PRISTIN`), pour qu'un objet au sommet se
   * reconnaisse d'un écran à l'autre. Facultatif : sans lui, rendu inchangé.
   */
  etat?: EtatObjet;
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
  verticalAlign = "center",
  fallbackIconSize = 40,
  fallbackIconColor = "var(--brass-700)",
  alt = "",
  padded = false,
  sizes = DEFAULT_SIZES,
  priority = false,
  fullSize = false,
  etat,
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
          style={{
            objectFit: fit,
            objectPosition: verticalAlign === "bottom" ? "center bottom" : "center",
            display: "block",
            ...(estPristin(etat) ? { filter: ECLAT_PRISTIN } : null),
          }}
        />
      </div>
    </div>
  );
}
