"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

/**
 * Journal posé sur le coin du bureau — visible seulement quand l'édition de
 * la semaine est achetée (ou offerte). Tap → relire la Gazette.
 * (Restauration de l'ancien QgJournal retiré par df0bf00.)
 */
export function QgJournalBureau({ onTap }: { onTap: () => void }) {
  const style = useQgObjetStyle("journalBureau");
  const { d } = useLangue();
  return (
    <button type="button" onClick={onTap} aria-label={d.qg.journalBureauLire} style={style}>
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
