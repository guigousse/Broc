"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTickSound } from "@/lib/audio/useTickSound";
import type { NegoMode } from "@/types/game";

interface NegoBarProps {
  mode: NegoMode;
  /** Borne haute de l'échelle (prix vendeur initial en achat / prix demandé initial en vente). */
  echelleMax: number;
  /** Prix courant côté adverse (vendeur ou client). */
  prixAdverse: number;
  /** Prix courant côté joueur (offre en cours). */
  prixJoueur: number;
  /** Bornes min/max autorisées pour le drag joueur. */
  minJoueur: number;
  maxJoueur: number;
  /** Callback à chaque changement de valeur (incréments de 1 €). */
  onChangeJoueur: (prix: number) => void;
  /** Désactive le drag (négo terminée). */
  readOnly?: boolean;
}

const COLOR_JOUEUR = "#2b5a8c";
const COLOR_ADVERSE = "var(--brass-700, #8c6a2b)";

export function NegoBar({
  mode: _mode,
  echelleMax,
  prixAdverse,
  prixJoueur,
  minJoueur,
  maxJoueur,
  onChangeJoueur,
  readOnly = false,
}: NegoBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const tick = useTickSound();
  const lastValRef = useRef(prixJoueur);

  useEffect(() => {
    lastValRef.current = prixJoueur;
  }, [prixJoueur]);

  const pctJoueur = Math.min(100, Math.max(0, (prixJoueur / echelleMax) * 100));
  const pctAdverse = Math.min(100, Math.max(0, (prixAdverse / echelleMax) * 100));

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = Math.round(ratio * echelleMax);
      const clamped = Math.min(maxJoueur, Math.max(minJoueur, raw));
      if (clamped !== lastValRef.current) {
        lastValRef.current = clamped;
        tick();
        onChangeJoueur(clamped);
      }
    };
    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX);
    const onPointerUp = () => setDragging(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragging, echelleMax, minJoueur, maxJoueur, onChangeJoueur, tick]);

  const startDrag = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div style={wrapStyle}>
      <div ref={trackRef} style={trackStyle}>
        <div
          style={{
            ...cursorStyle,
            left: `${pctAdverse}%`,
            background: COLOR_ADVERSE,
            color: "white",
            transition: "left 300ms ease-out",
          }}
        >
          {prixAdverse}€
          <span style={{ ...labelStyle, top: -14, bottom: "auto" }}>Lui</span>
        </div>
        <div
          onPointerDown={startDrag}
          style={{
            ...cursorStyle,
            left: `${pctJoueur}%`,
            background: COLOR_JOUEUR,
            color: "white",
            cursor: readOnly ? "default" : "grab",
            touchAction: "none",
            zIndex: 2,
          }}
        >
          {prixJoueur}€
          <span style={labelStyle}>Vous</span>
        </div>
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  position: "relative",
  padding: "0 24px",
  margin: "28px 0 4px",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: 60,
  borderRadius: 2,
  background:
    "linear-gradient(to bottom, transparent 28px, rgba(0,0,0,0.12) 28px, rgba(0,0,0,0.12) 32px, transparent 32px)",
};

const cursorStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  fontWeight: 700,
  transform: "translateX(-50%)",
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  userSelect: "none",
};

const labelStyle: CSSProperties = {
  position: "absolute",
  top: 40,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  opacity: 0.7,
};
