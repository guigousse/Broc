"use client";

import { useState, type CSSProperties } from "react";
import type { BrocanteTier } from "@/types/game";
import { SCENE_FRAMES } from "./brocantePanoramaLayout";
import { applyOverride, useBrocanteFramesEdit } from "./BrocanteFramesEditContext";

interface ScenesEditPanelProps {
  /** Tier actuellement visible (utilisé pour cibler l'export JSON). */
  currentTier: BrocanteTier;
}

const panelStyle: CSSProperties = {
  position: "fixed",
  right: 8,
  bottom: "calc(var(--mobile-tabbar-h, 0px) + var(--safe-bottom, 0px) + 8px)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "10px 12px",
  borderRadius: 6,
  boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
  border: "1px solid var(--brass-500)",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  maxWidth: 240,
};

const btnStyle: CSSProperties = {
  background: "var(--brass-500)",
  color: "var(--forest-800)",
  border: "1px solid var(--brass-700)",
  borderRadius: 3,
  padding: "6px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontWeight: 700,
};

export function ScenesEditPanel({ currentTier }: ScenesEditPanelProps) {
  const { enabled, overrides, setEnabled, resetAll } = useBrocanteFramesEdit();
  const [copied, setCopied] = useState(false);

  if (!enabled) return null;

  const exportJson = () => {
    const frames = SCENE_FRAMES[currentTier];
    const result = frames.map((f) => applyOverride(f, overrides[f.id]));
    const text = JSON.stringify(result, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        })
        .catch(() => console.log(text));
    } else {
      console.log(text);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 700 }}>Édition cadres · tier {currentTier}</div>
      <div style={{ color: "var(--brass-700)", fontSize: 9 }}>
        Drag = déplacer · Coins = redimensionner · Snap 1 %
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" style={btnStyle} onClick={exportJson}>
          {copied ? "✓ Copié" : "Copier JSON"}
        </button>
        <button
          type="button"
          style={{ ...btnStyle, background: "transparent", color: "var(--brass-300)" }}
          onClick={() => {
            if (confirm("Reset tous les overrides ?")) resetAll();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          style={{ ...btnStyle, background: "var(--vermillion-600)", color: "white" }}
          onClick={() => setEnabled(false)}
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
