"use client";

import type { CSSProperties, ReactNode } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { ItemImage } from "@/components/ui/ItemImage";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import type { CategorieObjet, EtatObjet, Rarete } from "@/types/game";

interface ItemCardProps {
  templateId: string;
  categorie: CategorieObjet;
  etat: EtatObjet;
  rarete: Rarete;
  unique?: boolean;
  nom: string;
  /** Slot libre rendu sous le titre (prix, boutons, etc.). */
  footer?: ReactNode;
  /** Si true, image grisée et opacité réduite (objet acquis / vendu / inaccessible). */
  dimmed?: boolean;
  /** Style supplémentaire appliqué à l'article. */
  style?: CSSProperties;
}

export function ItemCard({
  templateId,
  categorie,
  etat,
  rarete,
  unique = false,
  nom,
  footer,
  dimmed = false,
  style,
}: ItemCardProps) {
  const colors = getRarityColors(rarete, unique);
  const filled = etoileCount(etat);

  return (
    <article
      style={{
        background: "var(--paper-100)",
        border: `1.5px solid ${colors.outer}`,
        boxShadow: `inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px ${colors.inner}`,
        padding: 6,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: dimmed ? 0.5 : 1,
        ...style,
      }}
    >
      {/* ─── Zone image carrée — fond teinté par rareté (cf. CollectionGrid) ─── */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: colors.thumbBg,
          overflow: "hidden",
          filter: dimmed ? "grayscale(1)" : undefined,
        }}
      >
        <ItemImage
          templateId={templateId}
          categorie={categorie}
          fit="contain"
          fallbackIconSize={42}
          fallbackIconColor={colors.outer}
          alt={nom}
          padded
        />

        {/* Étoiles d'état — ligne centrée juste sous l'image (zone teintée),
            style Collection. Drop-shadow pour rester lisible. */}
        <StarRow
          filled={filled}
          color={colors.outer}
          size={11}
          gap={2}
          emptyFill="var(--paper-100)"
          dropShadow
          display="flex"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 6,
            justifyContent: "center",
            pointerEvents: "none",
          }}
          aria-label={`État : ${etat}`}
        />

        {/* Pastille catégorie — coin haut-droite (à l'écart du titre). */}
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--paper-100)",
            border: `1.2px solid ${colors.outer}`,
            boxShadow: `inset 0 0 0 1px var(--paper-100), inset 0 0 0 2px ${colors.inner}, 0 1px 2px rgba(0,0,0,0.25)`,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
          aria-label={`Catégorie : ${categorie}`}
        >
          <CategorieIcon
            categorie={categorie}
            size={11}
            strokeWidth={1.4}
            color="var(--forest-800)"
          />
        </div>
      </div>

      {/* ─── Nom de l'objet ─── */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(9px, 2.6vw, 12px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          lineHeight: 1.15,
          minHeight: "2.3em",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textAlign: "center",
          padding: "0 2px",
        }}
      >
        {nom}
      </div>

      {/* ─── Slot libre (prix, boutons…) ─── */}
      {footer}
    </article>
  );
}
