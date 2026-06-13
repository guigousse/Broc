"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";

interface BrocanteBottomBarProps {
  onBack: () => void;
  onContinuer: () => void;
  /** Vrai si le bouton « Continuer » doit être actif (brocante débloquée + budget OK). */
  continuerActif: boolean;
}

const wrapStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 30,
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 12,
  borderTop: "3px solid var(--brass-500)",
  background: "var(--forest-800)",
  padding: "8px 14px",
  paddingBottom: "calc(8px + var(--safe-bottom))",
  height: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  boxSizing: "border-box",
};

const backBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "1px solid var(--brass-500)",
  borderRadius: 4,
  padding: "8px 12px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  cursor: "pointer",
};

const continuerBtn = (actif: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid var(--brass-500)",
  borderRadius: 4,
  padding: "8px 16px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  background: actif ? "var(--brass-500)" : "transparent",
  color: actif ? "var(--forest-800)" : "var(--brass-700)",
  cursor: actif ? "pointer" : "not-allowed",
  opacity: actif ? 1 : 0.55,
  boxShadow: actif
    ? "inset 0 0 0 2px var(--forest-800), 0 4px 10px rgba(40,25,5,0.35)"
    : "none",
  fontWeight: 700,
});

export function BrocanteBottomBar({
  onBack,
  onContinuer,
  continuerActif,
}: BrocanteBottomBarProps) {
  return (
    <div style={wrapStyle} role="toolbar" aria-label="Actions brocante">
      <button type="button" onClick={onBack} style={backBtn} aria-label="Retour">
        <ChevronLeft size={16} strokeWidth={2} />
        Retour
      </button>
      <span />
      <button
        type="button"
        onClick={onContinuer}
        disabled={!continuerActif}
        style={continuerBtn(continuerActif)}
        aria-label="Continuer"
      >
        Continuer
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
