"use client";

import { Crown } from "lucide-react";
import type { CSSProperties } from "react";
import type { BrocanteTier } from "@/types/game";

interface ScenePlaquesBarProps {
  currentTier: BrocanteTier;
  onTierClick: (t: BrocanteTier) => void;
  /** Place la barre en haut (défaut) ou en bas de la zone panorama. */
  position?: "top" | "bottom";
}

const TIERS: BrocanteTier[] = [1, 2, 3, 4];

const barStyle = (position: "top" | "bottom"): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  ...(position === "bottom" ? { bottom: 8 } : { top: 8 }),
  display: "flex",
  justifyContent: "center",
  gap: 10,
  padding: "0 12px",
  zIndex: 25,
  pointerEvents: "none", // les boutons réactivent
});

/**
 * Cartel laiton style étiquette de musée : rectangle aux coins arrondis,
 * deux rivets latéraux, dégradé de laiton, ombrage interne pour le relief.
 */
const plaqueStyle = (active: boolean): CSSProperties => ({
  pointerEvents: "auto",
  position: "relative",
  flex: "0 1 80px",
  height: 32,
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  background: active
    ? "linear-gradient(180deg, #f0d18b 0%, #d4ad60 45%, #b48a3e 100%)"
    : "linear-gradient(180deg, #bcae93 0%, #978769 50%, #756749 100%)",
  border: active ? "1px solid #6b4e25" : "1px solid #4a3a23",
  borderRadius: 4,
  boxShadow: active
    ? "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 14px rgba(220,170,60,0.6), 0 3px 8px rgba(20,12,0,0.45)"
    : "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 5px rgba(20,12,0,0.4)",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  filter: active ? "none" : "saturate(0.5) brightness(0.85)",
  transition: "filter 200ms ease, box-shadow 200ms ease, background 200ms ease",
});

const rivetStyle = (active: boolean, side: "left" | "right"): CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: 4,
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: active
    ? "radial-gradient(circle at 30% 30%, #f6e3b2, #6b4e25 80%)"
    : "radial-gradient(circle at 30% 30%, #c0b08a, #3a2c19 80%)",
  transform: "translateY(-50%)",
  boxShadow: "inset 0 1px 1px rgba(0,0,0,0.55)",
});

const starsStyle = (active: boolean): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: active ? "#3a2410" : "#2c2018",
  lineHeight: 1,
  textShadow: active
    ? "0 1px 0 rgba(255,235,180,0.5)"
    : "0 1px 0 rgba(255,255,255,0.18)",
});

function plaqueLabel(tier: BrocanteTier, active: boolean) {
  if (tier === 4) {
    return (
      <Crown
        size={18}
        strokeWidth={2}
        color={active ? "#3a2410" : "#2c2018"}
        style={{
          filter: active
            ? "drop-shadow(0 1px 0 rgba(255,235,180,0.5))"
            : undefined,
        }}
      />
    );
  }
  return <span style={starsStyle(active)}>{"★".repeat(tier)}</span>;
}

const ariaLabel = (tier: BrocanteTier) =>
  tier === 4
    ? "Tier 4 — Salon des Antiquaires"
    : `Tier ${tier} — ${"★".repeat(tier)}`;

export function ScenePlaquesBar({
  currentTier,
  onTierClick,
  position = "top",
}: ScenePlaquesBarProps) {
  return (
    <div style={barStyle(position)} aria-label="Navigation par tier">
      {TIERS.map((t) => {
        const active = t === currentTier;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onTierClick(t)}
            aria-label={ariaLabel(t)}
            aria-current={active ? "true" : "false"}
            style={plaqueStyle(active)}
          >
            <span aria-hidden style={rivetStyle(active, "left")} />
            {plaqueLabel(t, active)}
            <span aria-hidden style={rivetStyle(active, "right")} />
          </button>
        );
      })}
    </div>
  );
}
