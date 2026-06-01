"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
}

const bigButton: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "16px 12px",
  marginTop: 10,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow:
    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
};

const altButton: CSSProperties = {
  ...bigButton,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function PorteSheet({
  open,
  onClose,
  vitrineActive,
  onChiner,
  onVitrine,
}: PorteSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="— Sortir —">
      <button type="button" style={bigButton} onClick={onChiner}>
        Sortir chiner
      </button>
      <button type="button" style={altButton} onClick={onVitrine}>
        {vitrineActive ? "Tenir l'étal" : "Exposer une vitrine"}
      </button>
    </BottomSheet>
  );
}
