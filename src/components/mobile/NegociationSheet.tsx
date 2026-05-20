"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface NegociationSheetProps {
  open: boolean;
  onClose: () => void;
  prixAffiche: number;
  offreInitiale: number;
  onProposer: (offre: number) => void;
}

export function NegociationSheet({
  open,
  onClose,
  prixAffiche,
  offreInitiale,
  onProposer,
}: NegociationSheetProps) {
  const [offre, setOffre] = useState(offreInitiale);
  useEffect(() => {
    if (open) setOffre(offreInitiale);
  }, [open, offreInitiale]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Négocier">
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--ink-500)",
          margin: "0 0 12px",
        }}
      >
        Prix affiché : <strong>{prixAffiche} €</strong>. Quelle est votre offre ?
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <input
          type="number"
          min={1}
          max={prixAffiche}
          value={offre}
          onChange={(e) => setOffre(Number(e.target.value))}
          style={{
            flex: 1,
            padding: "10px 12px",
            fontFamily: "var(--font-display)",
            fontSize: 18,
            border: "1px solid var(--brass-700)",
            background: "var(--paper-100)",
            color: "var(--forest-800)",
            textAlign: "right",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--brass-700)",
          }}
        >
          €
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={btnSecondary}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onProposer(offre)}
          style={btnPrimary}
        >
          Proposer {offre} €
        </button>
      </div>
    </BottomSheet>
  );
}

const btnPrimary: CSSProperties = {
  padding: "12px 8px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
};
