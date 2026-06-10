"use client";

import type { Objet } from "@/types/game";
import { ItemEnCarrousel } from "./ItemEnCarrousel";

interface Props {
  stock: Objet[];
  onPickUp: (objetId: string, clientX: number, clientY: number) => void;
}

const ITEM_WIDTH = 76;

export function CarrouselStock({ stock, onPickUp }: Props) {
  if (stock.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12.5,
          color: "var(--ink-500)",
          textAlign: "center",
          padding: "8px 12px",
          margin: 0,
        }}
      >
        Aucun objet à charger. Allez chiner !
      </p>
    );
  }

  const tri = [...stock].sort(
    (a, b) => a.categorie.localeCompare(b.categorie) || a.nom.localeCompare(b.nom),
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 14px",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        // Texture bois : lattes verticales avec veines, palette brass tirée
        // sur le warm-tan pour rester dans le ton de l'app.
        background: `
          repeating-linear-gradient(
            90deg,
            #b89968 0px,
            #b89968 38px,
            #9a7c4d 39px,
            #b89968 40px,
            #b89968 76px,
            #8a6d40 77px,
            #b89968 78px
          ),
          repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.04) 0px,
            rgba(0, 0, 0, 0.04) 1px,
            transparent 1px,
            transparent 4px
          )
        `,
        boxShadow: "inset 0 1px 0 rgba(0, 0, 0, 0.15)",
      }}
    >
      {tri.map((o) => (
        <div
          key={o.id}
          style={{ flex: `0 0 ${ITEM_WIDTH}px`, width: ITEM_WIDTH }}
        >
          <ItemEnCarrousel objet={o} onDragToCoffre={onPickUp} />
        </div>
      ))}
    </div>
  );
}
