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
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  textAlign: "center",
  lineHeight: 1,
  gap: "6%",
  containerType: "inline-size",
};

const jourCourt: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "18cqw",
  letterSpacing: "0.15em",
  color: "var(--vermillion-600)",
  fontWeight: 600,
};

const numJour: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "48cqw",
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
      style={{ ...style, position: "absolute" }}
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
