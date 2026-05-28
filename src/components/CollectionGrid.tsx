"use client";

import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
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

const cellBase: CSSProperties = {
  aspectRatio: "1 / 1",
  position: "relative",
  width: "100%",
  boxSizing: "border-box",
  display: "block",
  cursor: "pointer",
  padding: 0,
  overflow: "hidden",
};

const imageLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
};

const starsRow: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 4,
  display: "flex",
  justifyContent: "center",
  gap: 2,
  pointerEvents: "none",
};

const newBadge: CSSProperties = {
  position: "absolute",
  top: 3,
  right: 3,
  width: 16,
  height: 16,
  display: "grid",
  placeItems: "center",
  background: "var(--vermillion-600)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  border: "1px solid var(--paper-100)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
};

export function CollectionGrid({ slots, onTap }: CollectionGridProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {slots.map((s) => {
        const isDonne = s.donation !== null;
        const isVu = !isDonne && s.vu;
        const isSilhouette = !isDonne && !isVu;
        const showNewBadge = s.vu && !isDonne && s.vuDansCollection === false;
        const colors = getRarityColors(s.rarete, !!s.unique);
        const filledStars = isDonne ? etoileCount(s.donation?.etat) : 0;

        const cellStyle: CSSProperties = isSilhouette
          ? {
              ...cellBase,
              border: "1px dashed var(--paper-500)",
              background: "var(--paper-200)",
            }
          : {
              ...cellBase,
              border: `1px solid ${colors.outer}`,
              background: colors.thumbBg,
              filter: isVu ? "grayscale(0.95) brightness(0.85)" : "none",
            };

        return (
          <button
            key={s.templateId}
            type="button"
            onClick={() => onTap?.(s)}
            disabled={isSilhouette}
            aria-label={isSilhouette ? "Pièce inconnue" : s.nom}
            style={{
              ...cellStyle,
              cursor: isSilhouette ? "default" : "pointer",
            }}
          >
            {/* Placeholder "image" — icône catégorie en grand (en attendant la vraie image) */}
            <div style={imageLayer}>
              {isSilhouette ? (
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: "var(--paper-500)",
                  }}
                >
                  ?
                </span>
              ) : (
                <CategorieIcon
                  categorie={s.categorie}
                  size={40}
                  strokeWidth={1.2}
                  color={colors.thumbIcon}
                />
              )}
            </div>

            {/* Badge "*" nouveau découvert (uniquement si vu et pas encore consulté) */}
            {showNewBadge && (
              <span style={newBadge} aria-label="Nouvellement découvert">
                *
              </span>
            )}

            {/* Étoiles en bas centre — seulement si donné (état connu) */}
            {isDonne && (
              <div style={starsRow} aria-label={`État : ${s.donation?.etat}`}>
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    size={12}
                    strokeWidth={1.8}
                    fill={
                      i < filledStars
                        ? colors.outer
                        : "var(--paper-100)"
                    }
                    color={colors.outer}
                    style={{
                      filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.45))",
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
