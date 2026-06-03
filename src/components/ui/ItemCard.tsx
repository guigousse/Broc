"use client";

import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { ItemImage } from "@/components/ui/ItemImage";
import { getRarityColors } from "@/lib/rarityColors";
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

function etoileCount(etat: EtatObjet): number {
  switch (etat) {
    case "Mauvais":
      return 0;
    case "Bon":
      return 1;
    case "Très bon":
      return 2;
    case "Pristin état":
      return 3;
  }
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
        gap: 6,
        opacity: dimmed ? 0.5 : 1,
        ...style,
      }}
    >
      {/* ─── Zone image carrée ─── */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: "var(--paper-100)",
          overflow: "hidden",
          filter: dimmed ? "grayscale(1)" : undefined,
        }}
      >
        <ItemImage
          templateId={templateId}
          categorie={categorie}
          fit="cover"
          fallbackIconSize={42}
          fallbackIconColor={colors.outer}
          alt={nom}
        />

        {/* Étoiles d'état — bas-gauche, plaque blanche bordée */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            display: "flex",
            gap: 1,
            padding: "2px 4px",
            background: "var(--paper-100)",
            border: `1px solid ${colors.outer}`,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
            pointerEvents: "none",
          }}
          aria-label={`État : ${etat}`}
        >
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              size={10}
              strokeWidth={1.8}
              fill={i < filled ? colors.outer : "var(--paper-100)"}
              color={colors.outer}
            />
          ))}
        </div>

        {/* Pastille catégorie — bas-droite */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 28,
            height: 28,
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
            size={14}
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
