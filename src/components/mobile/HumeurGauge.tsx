"use client";

import type { CSSProperties } from "react";

interface HumeurGaugeProps {
  /** Humeur courante, 0–1. */
  humeur: number;
}

function emojiForHumeur(humeur: number): string {
  if (humeur < 0.25) return "😊";
  if (humeur < 0.5) return "🙂";
  if (humeur < 0.75) return "😐";
  return "😠";
}

export function HumeurGauge({ humeur }: HumeurGaugeProps) {
  const clamped = Math.min(1, Math.max(0, humeur));
  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>Humeur</span>
      <div style={trackStyle}>
        <div style={fillStyle} />
        <div style={{ ...pointerStyle, left: `${clamped * 100}%` }} />
      </div>
      <span style={emojiStyle}>{emojiForHumeur(clamped)}</span>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 11,
  marginTop: 22,
  paddingTop: 16,
  borderTop: "1px dashed rgba(0,0,0,0.15)",
};

const labelStyle: CSSProperties = {
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  opacity: 0.7,
};

const trackStyle: CSSProperties = {
  flex: 1,
  height: 6,
  background: "rgba(0,0,0,0.08)",
  borderRadius: 3,
  position: "relative",
};

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 3,
  background: "linear-gradient(to right, #3a7c43 0%, #d99000 60%, #c44 100%)",
};

const pointerStyle: CSSProperties = {
  position: "absolute",
  top: -3,
  width: 2,
  height: 12,
  background: "#222",
  transition: "left 200ms ease-out",
};

const emojiStyle: CSSProperties = {
  fontSize: 16,
};
