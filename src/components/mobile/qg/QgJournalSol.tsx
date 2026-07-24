"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

/**
 * Journal enroulé au sol devant la porte.
 * - mode "tuto" : première édition offerte par le grand-père (tap → sheet guidée).
 * - mode "achat" : édition du lundi (tap → modale acheter/refuser).
 */
export function QgJournalSol({
  mode,
  onTap,
}: {
  mode: "tuto" | "achat";
  onTap: () => void;
}) {
  const style = useQgObjetStyle("journalSol");
  const { d } = useLangue();
  const label = mode === "tuto" ? d.qg.journalSolOffert : d.qg.journalSolAcheter;
  return (
    <button type="button" onClick={onTap} aria-label={label} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/journal.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
