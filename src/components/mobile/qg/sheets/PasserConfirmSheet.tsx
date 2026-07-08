"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";
import { useLangue } from "@/lib/i18n/LangueContext";

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
  const { d } = useLangue();
  if (bloque) {
    return (
      <FloatingActionBar
        open={open}
        onClose={onClose}
        message={d.qg.chatDortMessage}
      />
    );
  }
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <FloatingActionButton onClick={onConfirm} minWidth={240}>
        {d.qg.seReposer}
      </FloatingActionButton>
    </FloatingActionBar>
  );
}
