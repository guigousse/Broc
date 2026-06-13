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
  pointerEvents: "auto",
  background: "rgba(245,239,225,0.94)",
  border: "1px solid var(--brass-700)",
  borderRadius: 6,
  padding: "12px 16px 14px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), 0 8px 22px rgba(20,12,0,0.45)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  maxWidth: 520,
  margin: "0 auto",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  textAlign: "center",
  margin: 0,
  lineHeight: 1.2,
};

const tierStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  color: "var(--brass-600)",
  letterSpacing: "0.1em",
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

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const lockStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--vermillion-600)",
  letterSpacing: "0.06em",
  textAlign: "center",
  lineHeight: 1.3,
};

export function BrocanteDetailFloating({
  brocante,
  debloquee,
  raisonVerrouillage,
}: BrocanteDetailFloatingProps) {
  return (
    <aside style={cardStyle} aria-live="polite">
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <div style={tierStyle}>{"★".repeat(brocante.tier)}</div>
      <p style={descStyle}>{brocante.description}</p>
      <div style={metaStyle}>
        {brocante.taillePool} items · entrée {fraisEntree(brocante)} €
      </div>
      {!debloquee && raisonVerrouillage && (
        <div style={lockStyle}>⊘ {raisonVerrouillage}</div>
      )}
    </aside>
  );
}
