"use client";

import { memo, useCallback, useRef, type CSSProperties } from "react";
import { ItemImage } from "@/components/ui/ItemImage";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import type { CollectionSlot } from "@/types/game";

interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
  /** TemplateIds présents dans l'inventaire du joueur (badge "+"). */
  enStockIds?: ReadonlySet<string>;
}

const GRAY_BG = "var(--paper-200)";
const GRAY_OUTER = "var(--paper-500)";
const GRAY_INNER = "var(--paper-400)";

interface CornerLProps {
  position: "tl" | "tr" | "bl" | "br";
  color: string;
}

function CornerL({ position, color }: CornerLProps) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        width: 9,
        height: 9,
        top: isTop ? 6 : undefined,
        bottom: isTop ? undefined : 6,
        left: isLeft ? 6 : undefined,
        right: isLeft ? undefined : 6,
        borderTop: isTop ? `1px solid ${color}` : "none",
        borderBottom: isTop ? "none" : `1px solid ${color}`,
        borderLeft: isLeft ? `1px solid ${color}` : "none",
        borderRight: isLeft ? "none" : `1px solid ${color}`,
        pointerEvents: "none",
      }}
    />
  );
}

const centerLayer: CSSProperties = {
  position: "absolute",
  // Pile dans le filet intérieur (boxShadow inset 3px) — l'image touche le filet
  inset: 4,
  display: "grid",
  placeItems: "stretch",
  overflow: "hidden",
  pointerEvents: "none",
};

const starsRow: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 6,
  display: "flex",
  justifyContent: "center",
  gap: 2,
  pointerEvents: "none",
};

const newBadge: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 6,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--vermillion-600)",
  textShadow:
    "0 0 2px var(--paper-100), 0 0 4px var(--paper-100), 0 1px 2px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};

interface CollectionCellProps {
  slot: CollectionSlot;
  onTap: (slot: CollectionSlot) => void;
  enStock: boolean;
}

/**
 * Cellule mémoïsée : ne re-rend que si son slot change (référence) ou si
 * `onTap` change — la grille passe un wrapper stable (latest-ref), donc en
 * pratique seul le slot compte.
 */
const CollectionCell = memo(function CollectionCell({
  slot: s,
  onTap,
  enStock,
}: CollectionCellProps) {
  const isDonne = s.donation !== null;
  const isVu = !isDonne && s.vu;
  const isSilhouette = !isDonne && !isVu;
  const showStockBadge = enStock && !isDonne;
  const showNewBadge =
    !showStockBadge && s.vu && !isDonne && s.vuDansCollection === false;
  const colors = getRarityColors(s.rarete, !!s.unique);
  const filledStars = isDonne ? etoileCount(s.donation?.etat) : 0;

  // Fond gris pour vu/silhouette ; bordure rareté pour donné et vu (la
  // rareté reste visible) ; bordure grise seulement pour silhouette.
  const outerColor = isSilhouette ? GRAY_OUTER : colors.outer;
  const innerColor = isSilhouette ? GRAY_INNER : colors.inner;
  const bg = isDonne ? colors.thumbBg : GRAY_BG;
  const iconColor = isDonne ? colors.thumbIcon : GRAY_OUTER;
  const isInteractable = !isSilhouette;

  const cellStyle: CSSProperties = {
    aspectRatio: "1 / 1",
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
    border: isSilhouette
      ? `1px dashed ${GRAY_OUTER}`
      : `1.5px solid ${outerColor}`,
    background: bg,
    boxShadow: isSilhouette
      ? "none"
      : `inset 0 0 0 2px ${isDonne ? "var(--paper-100)" : GRAY_BG}, inset 0 0 0 3px ${innerColor}`,
    cursor: isInteractable ? "pointer" : "default",
    padding: 0,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  };

  return (
    <button
      type="button"
      className="broc-grid-cell"
      onClick={() => onTap(s)}
      disabled={isSilhouette}
      aria-label={isSilhouette ? "Pièce inconnue" : s.nom}
      style={cellStyle}
    >
      {/* Coins Art Déco */}
      {!isSilhouette && (
        <>
          <CornerL position="tl" color={innerColor} />
          <CornerL position="tr" color={innerColor} />
          <CornerL position="bl" color={innerColor} />
          <CornerL position="br" color={innerColor} />
        </>
      )}

      {/* Centre — image ou "?" si silhouette */}
      {isSilhouette ? (
        <span
          style={{
            fontFamily: "var(--font-broc-title)",
            fontSize: 36,
            fontWeight: 400,
            color: GRAY_OUTER,
            lineHeight: 1,
          }}
        >
          ?
        </span>
      ) : (
        <div
          style={{
            ...centerLayer,
            // Grisaille sur l'image seule : les badges du bouton restent en couleur.
            filter: isVu
              ? "grayscale(1) brightness(1.35) contrast(0.7) opacity(0.55)"
              : undefined,
          }}
        >
          <ItemImage
            templateId={s.templateId}
            categorie={s.categorie}
            fit="contain"
            fallbackIconSize={36}
            fallbackIconColor={iconColor}
            alt={s.nom}
            padded
          />
        </div>
      )}

      {/* Badge "+" — exemplaire en stock, pas encore donné (prioritaire sur "*") */}
      {showStockBadge && (
        <span style={newBadge} aria-label="Exemplaire disponible en stock">
          +
        </span>
      )}

      {/* Badge "*" — nouveauté pas encore consultée */}
      {showNewBadge && (
        <span style={newBadge} aria-label="Nouvellement découvert">
          *
        </span>
      )}

      {/* Étoiles d'état — uniquement si donné */}
      {isDonne && (
        <StarRow
          filled={filledStars}
          color={colors.outer}
          size={11}
          gap={2}
          emptyFill="var(--paper-100)"
          dropShadow
          display="flex"
          style={starsRow}
          aria-label={`État : ${s.donation?.etat}`}
        />
      )}
    </button>
  );
});

export function CollectionGrid({ slots, onTap, enStockIds }: CollectionGridProps) {
  // Wrapper stable (pattern latest-ref) : même si le parent passe une arrow
  // function inline recréée à chaque render, les cellules mémoïsées gardent
  // une référence stable et ne re-rendent que quand leur slot change.
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const stableOnTap = useCallback(
    (slot: CollectionSlot) => onTapRef.current?.(slot),
    [],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(var(--card-w), 1fr))",
        gap: "var(--gutter)",
      }}
    >
      {slots.map((s) => (
        <CollectionCell
          key={s.templateId}
          slot={s}
          onTap={stableOnTap}
          enStock={enStockIds?.has(s.templateId) ?? false}
        />
      ))}
    </div>
  );
}
