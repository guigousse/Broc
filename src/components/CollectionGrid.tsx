"use client";

import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CollectionSlot } from "@/types/game";

interface CollectionGridProps {
  slots: CollectionSlot[];
  onTap?: (slot: CollectionSlot) => void;
}

export function CollectionGrid({ slots, onTap }: CollectionGridProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {slots.map((s) => {
        const isDonne = s.donation !== null;
        const isVu = !isDonne && s.vu;
        const isSilhouette = !isDonne && !isVu;

        const cellStyle: CSSProperties = isDonne
          ? {
              aspectRatio: "1 / 1",
              border: "1px solid var(--forest-800)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: 4,
              position: "relative",
              cursor: "pointer",
              background: "var(--paper-100)",
              width: "100%",
              boxSizing: "border-box",
            }
          : isVu
            ? {
                aspectRatio: "1 / 1",
                border: "1px solid var(--brass-500)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: 4,
                position: "relative",
                cursor: "pointer",
                background: "var(--paper-300)",
                opacity: 0.75,
                width: "100%",
                boxSizing: "border-box",
              }
            : {
                aspectRatio: "1 / 1",
                border: "1px dashed var(--paper-500)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: 4,
                position: "relative",
                cursor: "pointer",
                background: "var(--paper-200)",
                width: "100%",
                boxSizing: "border-box",
              };

        return (
          <button
            key={s.templateId}
            type="button"
            onClick={() => onTap?.(s)}
            aria-label={isSilhouette ? "Pièce inconnue" : s.nom}
            style={cellStyle}
          >
            {isDonne && (
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 7.5,
                  padding: "1px 4px",
                  letterSpacing: "0.08em",
                }}
              >
                {Math.round(s.donation!.valeur)} €
              </span>
            )}
            {isSilhouette ? (
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  color: "var(--paper-500)",
                }}
              >
                ?
              </span>
            ) : (
              <CategorieIcon
                categorie={s.categorie}
                size={22}
                strokeWidth={1.5}
                color={isDonne ? "var(--forest-800)" : "var(--brass-700)"}
              />
            )}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                color: isSilhouette ? "var(--paper-500)" : "var(--ink-700)",
                letterSpacing: "0.06em",
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {isSilhouette ? "???" : s.nom}
            </span>
            {isVu && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  color: "var(--brass-700)",
                  letterSpacing: "0.06em",
                }}
              >
                Vu
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
