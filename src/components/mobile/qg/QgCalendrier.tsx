"use client";

import type { CSSProperties } from "react";
import { dateForJour, labelJourCourt } from "@/lib/calendrier";
import { useQgObjetStyle } from "./QgScene";

interface QgCalendrierProps {
  jourActuel: number;
  onTap: () => void;
}

const overlay: CSSProperties = {
  position: "absolute",
  inset: "18% 12% 18% 12%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  textAlign: "center",
  lineHeight: 1,
  gap: "4%",
  containerType: "inline-size",
};

const jourCourt: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "26cqw",
  letterSpacing: "0.12em",
  color: "var(--ink-900)",
  fontWeight: 700,
};

const numJour: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "58cqw",
  fontWeight: 700,
  color: "var(--ink-900)",
};

export function QgCalendrier({ jourActuel, onTap }: QgCalendrierProps) {
  const style = useQgObjetStyle("calendrier");
  const d = dateForJour(jourActuel);
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`Calendrier — ${labelJourCourt(jourActuel)} ${d.getUTCDate()}`}
      style={{
        ...style,
        position: "absolute",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <img
        src="/qg/calendrier.png"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      <div style={overlay}>
        <span style={jourCourt}>{labelJourCourt(jourActuel)}</span>
        <span style={numJour}>{d.getUTCDate()}</span>
      </div>
    </button>
  );
}
