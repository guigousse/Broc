"use client";

import type { CSSProperties } from "react";
import type { BrocanteTier } from "@/types/game";

interface ScenePlaqueProps {
  tier: BrocanteTier;
}

const labels: Record<BrocanteTier, { stars: string; label?: string; aria: string }> = {
  1: { stars: "★", aria: "Rang : 1 étoile" },
  2: { stars: "★★", aria: "Rang : 2 étoiles" },
  3: { stars: "★★★", aria: "Rang : 3 étoiles" },
  4: { stars: "★★★★", label: "Salon des Antiquaires", aria: "Rang : 4 étoiles — Salon des Antiquaires" },
};

const plaqueStyle: CSSProperties = {
  background: "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  borderRadius: 4,
  padding: "8px 14px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.25), 0 4px 10px rgba(40,25,5,0.35)",
  textAlign: "center",
  color: "var(--forest-800)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  userSelect: "none",
};

const starsStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  marginTop: 4,
  letterSpacing: "0.22em",
};

export function ScenePlaque({ tier }: ScenePlaqueProps) {
  const { stars, label, aria } = labels[tier];
  return (
    <div style={plaqueStyle} role="img" aria-label={aria}>
      <div style={starsStyle}>{stars}</div>
      {label && <div style={labelStyle}>{label}</div>}
    </div>
  );
}
