"use client";

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { CATEGORY_ICONS } from "./categoryIcons";

interface BrocanteDetailFloatingProps {
  brocante: Brocante;
  debloquee: boolean;
  /** Liste des conditions atomiques (uniquement utilisée si !debloquee). */
  conditions: string[];
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

const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const metaItemsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

// Badge catégorie circulaire — placé dans la fenêtre, à droite du prix.
const categoryBadgeStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background:
    "radial-gradient(circle at 30% 28%, #f0d18b 0%, #c89c4e 55%, #8a6429 100%)",
  border: "1.5px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  color: "#3a2410",
  boxShadow:
    "0 2px 4px rgba(20,12,0,0.45), inset 0 1px 0 rgba(255,235,180,0.45)",
  flexShrink: 0,
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
  conditions,
}: BrocanteDetailFloatingProps) {
  // --- Layout VERROUILLÉ : nom + cadenas + liste des conditions ---
  if (!debloquee) {
    return (
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
    );
  }

  // --- Layout DÉBLOQUÉ : titre + description + items / entrée [+ badge] ---
  const Icon = brocante.specialisation
    ? CATEGORY_ICONS[brocante.specialisation]
    : null;
  return (
    <aside style={cardStyle} aria-live="polite">
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <p style={descStyle}>{brocante.description}</p>
      <div style={metaRowStyle}>
        <span style={metaItemsStyle}>{brocante.taillePool} items</span>
        <span style={fraisStyle}>
          <span style={fraisLabelStyle}>Entrée</span>
          {fraisEntree(brocante)} €
        </span>
        {Icon && (
          <div
            style={categoryBadgeStyle}
            aria-label={`Spécialité : ${brocante.specialisation}`}
          >
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
    </aside>
  );
}
