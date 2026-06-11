"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgJournalProps {
  onTap: () => void;
}

export function QgJournal({ onTap }: QgJournalProps) {
  const style = useQgObjetStyle("journal");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Journal — la Gazette"
      style={style}
    >
      <img
        src="/qg/journal.webp"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      />
    </button>
  );
}
