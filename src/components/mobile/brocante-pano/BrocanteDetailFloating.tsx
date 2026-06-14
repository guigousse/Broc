"use client";

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { CATEGORY_ICONS } from "./categoryIcons";

interface BrocanteDetailFloatingProps {
  brocante: Brocante;
  debloquee: boolean;
  /** Le joueur a-t-il assez de budget ? Influence la couleur du prix. */
  peutEntrer: boolean;
  /** Liste des conditions atomiques (uniquement utilisée si !debloquee). */
  conditions: string[];
}

const cardStyle: CSSProperties = {
  pointerEvents: "auto",
  position: "relative",
  background: "rgba(245,239,225,0.95)",
  borderRadius: 6,
  // Double filet : extérieur brass-700 + intérieur brass-500 via shadow.
  border: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-500), 0 8px 22px rgba(20,12,0,0.45)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  padding: "18px 22px 14px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  maxWidth: 520,
  margin: "0 auto",
  overflow: "visible",
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-brocante-title)",
  fontSize: 24,
  fontWeight: 400,
  color: "var(--brass-500)",
  textShadow:
    "0 1px 0 rgba(255,235,180,0.4), 0 1px 2px rgba(80,50,10,0.25)",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.1,
  letterSpacing: "0.01em",
  textWrap: "balance",
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

// Filet doré séparateur — fin, centré, gradient.
const goldRuleStyle: CSSProperties = {
  width: "70%",
  height: 1,
  background:
    "linear-gradient(90deg, transparent 0%, var(--brass-500) 20%, var(--brass-500) 80%, transparent 100%)",
  margin: "6px 0 2px",
};

// Meta row inside the card.
const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
  marginTop: 4,
};

const metaItemsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "lowercase",
  color: "var(--ink-900)",
};

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

// Cachet thème circulaire — intégré dans la meta row à droite du prix.
const themeCachetStyle: CSSProperties = {
  width: 32,
  height: 32,
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

// Ornements de coin Art Déco.
const cornerOrnamentBase: CSSProperties = {
  position: "absolute",
  width: 18,
  height: 18,
  pointerEvents: "none",
  color: "var(--brass-500)",
};

function CornerOrnament({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const rotation = {
    tl: 0,
    tr: 90,
    br: 180,
    bl: 270,
  }[position];
  const placement: CSSProperties = {
    ...cornerOrnamentBase,
    ...(position === "tl" || position === "tr" ? { top: 6 } : { bottom: 6 }),
    ...(position === "tl" || position === "bl" ? { left: 6 } : { right: 6 }),
    transform: `rotate(${rotation}deg)`,
  };
  return (
    <svg viewBox="0 0 18 18" style={placement} aria-hidden>
      {/* Petit motif déco "stairstep" + point */}
      <path
        d="M2 16 L2 12 L6 12 L6 8 L10 8 L10 4 L16 4"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="2" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}

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

export function BrocanteDetailFloating({
  brocante,
  debloquee,
  peutEntrer,
  conditions,
}: BrocanteDetailFloatingProps) {
  const ThemeIcon = brocante.specialisation
    ? CATEGORY_ICONS[brocante.specialisation]
    : null;

  // --- Layout VERROUILLÉ : nom + cadenas + liste des conditions ---
  if (!debloquee) {
    return (
      <aside style={cardStyle} aria-live="polite">
        <CornerOrnament position="tl" />
        <CornerOrnament position="tr" />
        <CornerOrnament position="bl" />
        <CornerOrnament position="br" />
        <div style={titleRowStyle}>
          <h2 style={titleStyle}>{brocante.nom}</h2>
          <Lock size={20} strokeWidth={2.2} style={lockIconStyle} />
        </div>
        <div style={goldRuleStyle} aria-hidden />
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

  // --- Layout DÉBLOQUÉ : titre + desc + filet d'or + meta intégrée ---
  return (
    <aside style={cardStyle} aria-live="polite">
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <p style={descStyle}>{brocante.description}</p>
      <div style={goldRuleStyle} aria-hidden />
      <div style={metaRowStyle}>
        <span style={metaItemsStyle}>{brocante.taillePool} items</span>
        <span style={fraisBoxStyle(peutEntrer)}>
          <span style={fraisLineStyle}>
            <span style={fraisLabelStyle}>Entrée</span>
            {fraisEntree(brocante)} €
          </span>
          <span style={ticketLineStyle}>+ 1 ticket</span>
        </span>
        {ThemeIcon && (
          <div
            style={themeCachetStyle}
            aria-label={`Thème : ${brocante.specialisation}`}
          >
            <ThemeIcon size={18} strokeWidth={2} />
          </div>
        )}
      </div>
    </aside>
  );
}
