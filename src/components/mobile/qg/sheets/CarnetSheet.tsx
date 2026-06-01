"use client";

import { BottomSheet } from "@/components/mobile/BottomSheet";
import { QgHistorique } from "@/components/mobile/QgHistorique";
import type { GameState } from "@/types/game";

interface CarnetSheetProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
}

export function CarnetSheet({ open, onClose, state }: CarnetSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="— Carnet de sessions —">
      <QgHistorique state={state} />
    </BottomSheet>
  );
}
