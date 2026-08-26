"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useLangue } from "@/lib/i18n/LangueContext";
import { BoutonsSoutien } from "@/components/mobile/BoutonsSoutien";

/**
 * La feuille « Soutenir Broc » de la borne d'arcade, ouverte au premier tap :
 * la prop `intro` porte l'accroche de la borne, et les trois boutons sont
 * ceux, partagés, de `BoutonsSoutien`.
 *
 * Le menu principal, lui, ouvre `SoutienModal` (pleine page, format Réglages).
 */

interface SoutienSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accroche posée au-dessus des boutons. Absente hors de la borne. */
  intro?: ReactNode;
}

export function SoutienSheet({ open, onClose, intro }: SoutienSheetProps) {
  const { d } = useLangue();

  return (
    <BottomSheet open={open} onClose={onClose} title={d.soutien.titre}>
      {intro}
      <BoutonsSoutien />
    </BottomSheet>
  );
}
