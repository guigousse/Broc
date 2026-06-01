"use client";

import { qgObjetStyle } from "./QgScene";

interface QgJournalProps {
  onTap: () => void;
}

export function QgJournal({ onTap }: QgJournalProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Journal — la Gazette"
      style={qgObjetStyle("journal")}
    >
      <img
        src="/qg/journal.png"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          transform: "rotate(30deg)",
          transformOrigin: "center",
        }}
      />
    </button>
  );
}
