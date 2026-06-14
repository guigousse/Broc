"use client";

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";

interface BrocanteDetailFloatingProps {
  brocante: Brocante;
  debloquee: boolean;
  /** Le joueur a-t-il assez de budget ? Influence la couleur du prix. */
  peutEntrer: boolean;
  /** Liste des conditions atomiques (uniquement utilisée si !debloquee). */
  conditions: string[];
}

// Conteneur global : carte descriptive + meta flottants en dessous.
const wrapStyle: CSSProperties = {
  pointerEvents: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  maxWidth: 520,
  margin: "0 auto",
};

const cardStyle: CSSProperties = {
  position: "relative",
  width: "100%",
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
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-brocante-title)",
  fontSize: 30,
  fontWeight: 400,
  color: "var(--brass-500)",
  textShadow:
    "0 1px 0 rgba(255,235,180,0.4), 0 1px 2px rgba(80,50,10,0.25)",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.05,
  letterSpacing: "0.01em",
};

const titleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
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

// Meta flottants — sous la carte, sans fond, ombre légère pour lisibilité.
const metaFloatRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  textShadow: "0 1px 2px rgba(245,239,225,0.55), 0 0 6px rgba(245,239,225,0.4)",
};

const metaItemsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "lowercase",
  color: "var(--ink-900)",
};

// Encadré "ticket d'entrée" — noir par défaut, rouge si budget insuffisant.
const fraisBoxStyle = (peutEntrer: boolean): CSSProperties => {
  const color = peutEntrer ? "var(--ink-900)" : "var(--vermillion-600)";
  return {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    color,
    lineHeight: 1.05,
  };
};

const fraisLineStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 5,
  fontFamily: "var(--font-display)",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.06em",
};

const fraisLabelStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  opacity: 0.85,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
};

const ticketLineStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.10em",
  opacity: 0.85,
};

// Badge ambiance — petit pill laiton/forêt à droite du prix.
const ambianceBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  padding: "4px 9px",
  border: "1px solid var(--brass-500)",
  borderRadius: 3,
  boxShadow: "0 2px 5px rgba(20,12,0,0.45)",
  whiteSpace: "nowrap",
  textShadow: "none",
};

// Layout verrouillé.
const lockIconStyle: CSSProperties = {
  color: "var(--vermillion-600)",
  flexShrink: 0,
};

const conditionsListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "4px 0 0",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
};

const conditionItemStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--vermillion-600)",
  fontWeight: 700,
};

const conditionsSeparatorStyle: CSSProperties = {
  width: 40,
  height: 1,
  background: "var(--brass-500)",
  opacity: 0.5,
  margin: "2px 0 4px",
};

export function BrocanteDetailFloating({
  brocante,
  debloquee,
  peutEntrer,
  conditions,
}: BrocanteDetailFloatingProps) {
  // --- Layout VERROUILLÉ : nom + cadenas + liste des conditions ---
  if (!debloquee) {
    return (
      <div style={wrapStyle}>
        <aside style={cardStyle} aria-live="polite">
          <div style={titleRowStyle}>
            <h2 style={titleStyle}>{brocante.nom}</h2>
            <Lock size={20} strokeWidth={2.2} style={lockIconStyle} />
          </div>
          <div style={conditionsSeparatorStyle} aria-hidden />
          <ul style={conditionsListStyle}>
            {conditions.map((c, i) => (
              <li key={i} style={conditionItemStyle}>
                {c}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    );
  }

  // --- Layout DÉBLOQUÉ : carte + meta flottants en dessous ---
  return (
    <div style={wrapStyle}>
      <aside style={cardStyle} aria-live="polite">
        <h2 style={titleStyle}>{brocante.nom}</h2>
        <p style={descStyle}>{brocante.description}</p>
      </aside>
      <div style={metaFloatRowStyle}>
        <span style={metaItemsStyle}>{brocante.taillePool} items</span>
        <span style={fraisBoxStyle(peutEntrer)}>
          <span style={fraisLineStyle}>
            <span style={fraisLabelStyle}>Entrée</span>
            {fraisEntree(brocante)} €
          </span>
          <span style={ticketLineStyle}>+ 1 ticket</span>
        </span>
        <span style={ambianceBadgeStyle} aria-label={`Ambiance : ${brocante.ambiance}`}>
          {brocante.ambiance}
        </span>
      </div>
    </div>
  );
}
