"use client";

import type { CSSProperties } from "react";
import { Angry, Meh, Smile, SmilePlus, type LucideIcon } from "lucide-react";

interface HumeurGaugeProps {
  /** Humeur courante, 0–1. */
  humeur: number;
}

/** Icône (Lucide, trait 1.5 — cohérent Art Déco) + teinte selon l'humeur. */
function iconForHumeur(humeur: number): { Icon: LucideIcon; color: string } {
  if (humeur < 0.25) return { Icon: SmilePlus, color: "var(--patina-500)" };
  if (humeur < 0.5) return { Icon: Smile, color: "var(--patina-500)" };
  if (humeur < 0.75) return { Icon: Meh, color: "var(--brass-600)" };
  return { Icon: Angry, color: "var(--vermillion-600)" };
}

export function HumeurGauge({ humeur }: HumeurGaugeProps) {
  const clamped = Math.min(1, Math.max(0, humeur));
  const { Icon, color } = iconForHumeur(clamped);
  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>Humeur</span>
      <div style={trackStyle}>
        <div style={fillStyle} />
        <div style={{ ...pointerStyle, left: `${clamped * 100}%` }} />
      </div>
      <Icon size={18} strokeWidth={1.5} color={color} aria-hidden />
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
  background: "var(--gradient-humeur)",
};

const pointerStyle: CSSProperties = {
  position: "absolute",
  top: -3,
  width: 2,
  height: 12,
  background: "var(--ink-900)",
  transition: "left 200ms ease-out",
};
