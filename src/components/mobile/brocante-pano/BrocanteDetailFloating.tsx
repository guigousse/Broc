"use client";

import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";

interface BrocanteDetailFloatingProps {
  brocante: Brocante;
  debloquee: boolean;
  raisonVerrouillage: string | null;
}

const cardStyle: CSSProperties = {
  position: "relative",
  pointerEvents: "auto",
  background: "rgba(245,239,225,0.94)",
  border: "1px solid var(--brass-700)",
  borderRadius: 6,
  padding: "14px 18px 16px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), 0 8px 22px rgba(20,12,0,0.45)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  maxWidth: 520,
  margin: "0 auto",
  overflow: "visible",
};

const titleStyle: CSSProperties = {
  // Lettre manuscrite dorée — typo Caveat.
  fontFamily: "var(--font-handwriting)",
  fontSize: 28,
  fontWeight: 700,
  color: "var(--brass-500)",
  textShadow:
    "0 1px 0 rgba(255,235,180,0.4), 0 1px 2px rgba(80,50,10,0.25)",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.05,
  letterSpacing: "0.01em",
};

const descStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  margin: 0,
  lineHeight: 1.4,
  textAlign: "center",
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const metaItemsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

// Encadré "ticket d'entrée" rouge.
const fraisStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 3,
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--vermillion-600)",
  background: "var(--paper-100)",
  border: "1.5px solid var(--vermillion-600)",
  borderRadius: 3,
  padding: "3px 9px",
  letterSpacing: "0.06em",
  boxShadow: "0 1px 3px rgba(120,30,20,0.2)",
};

const fraisLabelStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--vermillion-600)",
  opacity: 0.75,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
};

const lockStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--vermillion-600)",
  letterSpacing: "0.06em",
  textAlign: "center",
  lineHeight: 1.3,
};

// Badge ambiance — superposé en haut-droite de la fenêtre.
const ambianceBadgeStyle: CSSProperties = {
  position: "absolute",
  top: -10,
  right: 14,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  padding: "4px 10px",
  border: "1px solid var(--brass-500)",
  borderRadius: 3,
  boxShadow: "0 3px 6px rgba(20,12,0,0.45)",
  whiteSpace: "nowrap",
};

export function BrocanteDetailFloating({
  brocante,
  debloquee,
  raisonVerrouillage,
}: BrocanteDetailFloatingProps) {
  return (
    <aside style={cardStyle} aria-live="polite">
      <span style={ambianceBadgeStyle} aria-label={`Ambiance : ${brocante.ambiance}`}>
        {brocante.ambiance}
      </span>
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <p style={descStyle}>{brocante.description}</p>
      <div style={metaRowStyle}>
        <span style={metaItemsStyle}>{brocante.taillePool} items</span>
        <span style={fraisStyle}>
          <span style={fraisLabelStyle}>Entrée</span>
          {fraisEntree(brocante)} €
        </span>
      </div>
      {!debloquee && raisonVerrouillage && (
        <div style={lockStyle}>⊘ {raisonVerrouillage}</div>
      )}
    </aside>
  );
}
