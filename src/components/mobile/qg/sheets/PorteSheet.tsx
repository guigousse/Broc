"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
}

export function PorteSheet({
  open,
  onClose,
  onChiner,
  onVitrine,
}: PorteSheetProps) {
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <FloatingActionButton onClick={onChiner} minWidth={140}>
        Chiner
      </FloatingActionButton>
      <FloatingActionButton
        onClick={onVitrine}
        variant="secondary"
        minWidth={140}
      >
        Étaler
      </FloatingActionButton>
    </FloatingActionBar>
  );
}
