"use client";

import type { CSSProperties } from "react";
import type { Colonnes } from "@/lib/useColonnesCollection";

interface ColonnesSliderProps {
  value: Colonnes;
  onChange: (v: Colonnes) => void;
}

const wrap: CSSProperties = {
  position: "fixed",
  left: "calc(12px + var(--safe-left))",
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 12px)",
  zIndex: 35,
  display: "flex",
  alignItems: "center",
  padding: "2px 12px",
  borderRadius: 999,
  background: "var(--forest-800)",
  border: "1px solid var(--brass-600)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
};

export function ColonnesSlider({ value, onChange }: ColonnesSliderProps) {
  return (
    <div style={wrap} data-on-dark>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        aria-label="Items par ligne"
        className="broc-colonnes-slider"
        onChange={(e) => onChange(Number(e.target.value) as Colonnes)}
      />
    </div>
  );
}
