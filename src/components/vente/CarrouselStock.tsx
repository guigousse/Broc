"use client";

import type { Objet } from "@/types/game";
import { ItemEnCarrousel } from "./ItemEnCarrousel";

interface Props {
  stock: Objet[];
  onPickUp: (objetId: string, clientX: number, clientY: number) => void;
}

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
          padding: 12,
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
    <>
      <div
        style={{
          padding: "10px 14px 4px",
          fontFamily: "var(--font-display)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
        }}
      >
        — Stock disponible ({stock.length}) —
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "0 14px 14px",
          overflowX: "auto",
        }}
      >
        {tri.map((o) => (
          <ItemEnCarrousel key={o.id} objet={o} onDragToCoffre={onPickUp} />
        ))}
      </div>
    </>
  );
}
