"use client";

import { useState } from "react";
import type { NiveauCamion } from "@/types/game";
import { CAMIONS } from "@/data/camion";

interface Props {
  niveau: NiveauCamion;
  visuelId: string;
  x: number;
  y: number;
  scale: number;
  onSetNiveauDev: (n: NiveauCamion) => void;
  onChange: (next: { x: number; y: number; scale: number }) => void;
}

/**
 * Panneau dev unifié — regroupe le switcher de camion et les sliders
 * position/scale. Affiché en haut à droite sous la caisse, avec un toggle
 * compact pour le replier.
 */
export function DevPanel({
  niveau,
  visuelId,
  x,
  y,
  scale,
  onSetNiveauDev,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const inputStyle = {
    width: 90,
    accentColor: "var(--vermillion-600)",
  } as const;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(var(--mobile-header-h) + var(--safe-top) + 6px)",
        right: 8,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
      }}
    >
      {/* Toggle compact */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer outils dev" : "Ouvrir outils dev"}
        style={{
          padding: "3px 8px",
          border: "1px dashed var(--vermillion-600)",
          background: "rgba(20, 20, 20, 0.85)",
          color: "var(--vermillion-600)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          borderRadius: 3,
          lineHeight: 1.2,
        }}
      >
        DEV {open ? "▴" : "▾"}
      </button>

      {open && (
        <div
          style={{
            background: "rgba(20, 20, 20, 0.9)",
            color: "var(--brass-300)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            border: "1px dashed var(--vermillion-600)",
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            minWidth: 180,
          }}
        >
          {/* Switcher niveau camion */}
          <button
            type="button"
            onClick={() => {
              const next = (((niveau - 1) + 1) % CAMIONS.length) + 1;
              onSetNiveauDev(next as NiveauCamion);
            }}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--vermillion-600)",
              background: "transparent",
              color: "var(--vermillion-600)",
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: 3,
              alignSelf: "stretch",
            }}
          >
            Camion · N{niveau} ({visuelId})
          </button>

          {/* Sliders position/scale */}
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 22 }}>X</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={x}
              onChange={(e) => onChange({ x: Number(e.target.value), y, scale })}
              style={inputStyle}
            />
            <span style={{ width: 36, textAlign: "right" }}>{x.toFixed(3)}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 22 }}>Y</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={y}
              onChange={(e) => onChange({ x, y: Number(e.target.value), scale })}
              style={inputStyle}
            />
            <span style={{ width: 36, textAlign: "right" }}>{y.toFixed(3)}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 22 }}>Sc</span>
            <input
              type="range"
              min={0.15}
              max={1.5}
              step={0.005}
              value={scale}
              onChange={(e) => onChange({ x, y, scale: Number(e.target.value) })}
              style={inputStyle}
            />
            <span style={{ width: 36, textAlign: "right" }}>{scale.toFixed(3)}</span>
          </label>

          <div
            style={{
              marginTop: 2,
              fontSize: 8.5,
              color: "var(--brass-500)",
              letterSpacing: "0.03em",
              wordBreak: "break-all",
            }}
          >
            garageX:{x.toFixed(3)} garageY:{y.toFixed(3)} garageScale:{scale.toFixed(3)}
          </div>
        </div>
      )}
    </div>
  );
}
