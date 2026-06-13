"use client";

import type { CSSProperties } from "react";

/** Largeur de la bande de séparation entre deux scènes, en pixels. */
export const TRANSITION_WIDTH_PX = 30;

/**
 * Fine bande de laiton verticale Art Déco placée entre deux scènes
 * consécutives. Purement décorative — pas d'image, pas d'interaction,
 * pas de snap (le snap reste sur les centres de scène).
 */
const wrapStyle: CSSProperties = {
  position: "relative",
  flex: `0 0 ${TRANSITION_WIDTH_PX}px`,
  width: `${TRANSITION_WIDTH_PX}px`,
  alignSelf: "stretch",
  // Dégradé laiton : reflet vertical doux + filets fins en bordure.
  background: [
    "linear-gradient(90deg,",
    "rgba(0,0,0,0.35) 0%,",
    "var(--brass-700) 4%,",
    "var(--brass-500) 14%,",
    "var(--brass-300) 50%,",
    "var(--brass-500) 86%,",
    "var(--brass-700) 96%,",
    "rgba(0,0,0,0.35) 100%)",
  ].join(" "),
  borderLeft: "1px solid var(--brass-700)",
  borderRight: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 12px rgba(20,12,0,0.4)",
  pointerEvents: "none",
  overflow: "hidden",
};

/** Petit motif de rivets Art Déco au centre, en CSS pur. */
const rivetsStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  width: 4,
  transform: "translateX(-50%)",
  background: [
    "repeating-linear-gradient(",
    "180deg,",
    "transparent 0px,",
    "transparent 36px,",
    "var(--brass-700) 36px,",
    "var(--brass-700) 38px,",
    "rgba(0,0,0,0.4) 38px,",
    "rgba(0,0,0,0.4) 40px,",
    "var(--brass-700) 40px,",
    "var(--brass-700) 42px,",
    "transparent 42px,",
    "transparent 80px)",
  ].join(" "),
};

export function BrocanteTransition() {
  return (
    <div style={wrapStyle} aria-hidden data-brocante-transition>
      <div style={rivetsStyle} />
    </div>
  );
}
