"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface PasserConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Si vrai, l'action est bloquée (un chat dort sur le fauteuil). */
  bloque?: boolean;
}

const text: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--ink-700)",
  textAlign: "center",
  padding: "8px 4px 16px",
};

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const btnConfirm: CSSProperties = {
  padding: "14px 8px",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const btnCancel: CSSProperties = {
  ...btnConfirm,
  background: "var(--paper-200)",
  color: "var(--ink-700)",
};

export function PasserConfirmSheet({
  open,
  onClose,
  onConfirm,
  bloque = false,
}: PasserConfirmSheetProps) {
  if (bloque) {
    return (
      <BottomSheet open={open} onClose={onClose} title="— Fauteuil occupé —">
        <p style={text}>
          Un chat dort paisiblement sur le fauteuil. Impossible de passer la journée
          sans le déranger…
        </p>
        <button type="button" style={btnCancel} onClick={onClose}>
          Fermer
        </button>
      </BottomSheet>
    );
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="— Passer la journée —">
      <p style={text}>
        S'asseoir dans le fauteuil et laisser passer la journée ?
      </p>
      <div style={row}>
        <button type="button" style={btnCancel} onClick={onClose}>
          Annuler
        </button>
        <button type="button" style={btnConfirm} onClick={onConfirm}>
          Confirmer
        </button>
      </div>
    </BottomSheet>
  );
}
