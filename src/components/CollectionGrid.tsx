"use client";

import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { getRarityColors } from "@/lib/rarityColors";
import type { CollectionSlot, EtatObjet } from "@/types/game";

interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
}

function etoileCount(etat: EtatObjet | undefined): number {
  switch (etat) {
    case "Mauvais":
      return 0;
    case "Bon":
      return 1;
    case "Très bon":
      return 2;
    case "Pristin état":
      return 3;
    default:
      return 0;
  }
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

export function CollectionGrid({ slots, onTap }: CollectionGridProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {slots.map((s) => {
        const isDonne = s.donation !== null;
        const isVu = !isDonne && s.vu;
        const isSilhouette = !isDonne && !isVu;
        const showNewBadge =
          s.vu && !isDonne && s.vuDansCollection === false;
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
            ? `1.5px dashed ${GRAY_OUTER}`
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
          // Pour les items vus (non donnés), grisaille + éclaircit + opacité réduite
          // pour rendre l'image clairement estompée par rapport aux items collectés.
          filter: isVu
            ? "grayscale(1) brightness(1.35) contrast(0.7) opacity(0.55)"
            : undefined,
        };

        return (
          <button
            key={s.templateId}
            type="button"
            onClick={() => onTap?.(s)}
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
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 700,
                  color: GRAY_OUTER,
                  lineHeight: 1,
                }}
              >
                ?
              </span>
            ) : (
              <div style={centerLayer}>
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

            {/* Badge "*" — nouveauté pas encore consultée */}
            {showNewBadge && (
              <span style={newBadge} aria-label="Nouvellement découvert">
                *
              </span>
            )}

            {/* Étoiles d'état — uniquement si donné */}
            {isDonne && (
              <div style={starsRow} aria-label={`État : ${s.donation?.etat}`}>
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    size={11}
                    strokeWidth={1.8}
                    fill={i < filledStars ? colors.outer : "var(--paper-100)"}
                    color={colors.outer}
                    style={{
                      filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))",
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
