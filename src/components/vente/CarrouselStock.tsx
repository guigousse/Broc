"use client";

import type { Objet } from "@/types/game";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { ItemEnCarrousel } from "./ItemEnCarrousel";

interface Props {
  stock: Objet[];
  onPickUp: (objetId: string, clientX: number, clientY: number) => void;
}

const ITEM_WIDTH = 76;

export function CarrouselStock({ stock, onPickUp }: Props) {
  const { d, locale } = useLangue();
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
        {d.vente.aucunObjetACharger}
      </p>
    );
  }

  const tri = [...stock].sort(
    (a, b) =>
      a.categorie.localeCompare(b.categorie) ||
      nomObjet(a, locale).localeCompare(nomObjet(b, locale), locale),
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
        // Même fond que la bande de vinyles du gramophone (QG) : gradient
        // bois sombre, borderTop noir, inset shadow en haut.
        background:
          "var(--gradient-cargo-wood)",
        borderTop: "1px solid rgba(0,0,0,0.4)",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55)",
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
