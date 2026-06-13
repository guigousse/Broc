"use client";

import type { CSSProperties } from "react";
import type { BrocanteTier } from "@/types/game";

interface BrocanteTransitionProps {
  /** Tier de gauche (1..3). Le filler `transition-{from}-{from+1}` sera utilisé. */
  from: 1 | 2 | 3;
}

/** Largeur du filler en pixels — une fine bande verticale entre scènes. */
export const TRANSITION_WIDTH_PX = 150;

// Dégradé stub par transition (utilisé tant que le filler n'est pas généré).
const STUB_GRADIENT: Record<1 | 2 | 3, string> = {
  1: "linear-gradient(90deg, #5c6b58 0%, #5b4527 100%)",
  2: "linear-gradient(90deg, #5b4527 0%, #5d3d1d 100%)",
  3: "linear-gradient(90deg, #5d3d1d 0%, #2d0d10 100%)",
};

const transitionStyle = (from: BrocanteTransitionProps["from"]): CSSProperties => ({
  position: "relative",
  flex: `0 0 ${TRANSITION_WIDTH_PX}px`,
  width: `${TRANSITION_WIDTH_PX}px`,
  alignSelf: "stretch",
  // Pas de scroll-snap : on glisse au-dessus, le snap se fait sur les scènes.
  backgroundImage: `url("/brocantes/scenes/transition-${from}-${from + 1}.webp"), ${STUB_GRADIENT[from]}`,
  backgroundSize: "cover, cover",
  backgroundPosition: "center, center",
  backgroundRepeat: "no-repeat, no-repeat",
  pointerEvents: "none",
});

export function BrocanteTransition({ from }: BrocanteTransitionProps) {
  return (
    <div
      style={transitionStyle(from)}
      aria-hidden
      data-brocante-transition={`${from}-${from + 1}`}
    />
  );
}
