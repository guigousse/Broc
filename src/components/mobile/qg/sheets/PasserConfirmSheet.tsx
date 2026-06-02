"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";

interface PasserConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Si vrai, l'action est bloquée (un chat dort sur le fauteuil). */
  bloque?: boolean;
}

export function PasserConfirmSheet({
  open,
  onClose,
  onConfirm,
  bloque = false,
}: PasserConfirmSheetProps) {
  if (bloque) {
    return (
      <FloatingActionBar
        open={open}
        onClose={onClose}
        message="Un chat dort paisiblement sur le fauteuil. Impossible de passer la journée sans le déranger…"
      >
        <FloatingActionButton onClick={onClose} variant="secondary" minWidth={180}>
          Fermer
        </FloatingActionButton>
      </FloatingActionBar>
    );
  }
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <FloatingActionButton onClick={onConfirm} minWidth={240}>
        Se reposer (+1 jour)
      </FloatingActionButton>
    </FloatingActionBar>
  );
}
