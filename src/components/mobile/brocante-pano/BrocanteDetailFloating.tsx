"use client";

import { Zap } from "lucide-react";
import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import type { ConditionInfo } from "@/lib/deblocage";
import { CATEGORY_ICONS } from "./categoryIcons";

interface BrocanteDetailFloatingProps {
  brocante: Brocante;
  debloquee: boolean;
  /** Le joueur a-t-il assez de budget ? Influence la couleur du prix. */
  peutEntrer: boolean;
  /** Conditions atomiques + drapeau "satisfaite" (uniquement si !debloquee). */
  conditions: ConditionInfo[];
}

// Plus de boîte papier : la fenêtre est transparente, le texte flotte
// directement « devant » le décor de la scène.
const cardStyle: CSSProperties = {
  pointerEvents: "auto",
  position: "relative",
  background: "transparent",
  padding: "4px 18px 8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  maxWidth: 480,
  margin: "0 auto",
  overflow: "visible",
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-brocante-title)",
  fontSize: 20,
  fontWeight: 400,
  color: "var(--brass-500)",
  // Ombre renforcée : le titre flotte désormais sur fond transparent.
  textShadow:
    "0 1px 0 rgba(255,235,180,0.5), 0 1px 3px rgba(40,24,4,0.55)",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.1,
  letterSpacing: "0.01em",
  textWrap: "balance",
};

/** Variante grisée du titre quand la brocante est verrouillée. */
const titleStyleLocked: CSSProperties = {
  ...titleStyle,
  color: "#6b6657",
  textShadow: "0 1px 0 rgba(255,255,255,0.35)",
  filter: "saturate(0.4)",
};

// Description manuscrite (Caveat), fond transparent : on s'appuie sur une
// ombre douce (halo clair + léger contour sombre) pour rester lisible
// par-dessus le décor.
const descStyle: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 16,
  color: "var(--ink-900)",
  margin: 0,
  lineHeight: 1.3,
  textAlign: "center",
  textShadow:
    "0 1px 0 rgba(245,239,225,0.9), 0 1px 4px rgba(20,12,0,0.28)",
};

// Filet doré séparateur — fin, centré, gradient.
const goldRuleStyle: CSSProperties = {
  width: "70%",
  height: 1,
  background:
    "linear-gradient(90deg, transparent 0%, var(--brass-500) 20%, var(--brass-500) 80%, transparent 100%)",
  margin: "6px 0 2px",
};

// Meta row : conserve un fond discret pour garder le texte mono lisible
// alors que le reste de la fenêtre est passé en transparent.
const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
  marginTop: 4,
  background: "rgba(245,239,225,0.78)",
  border: "1px solid var(--brass-700)",
  borderRadius: 4,
  padding: "5px 12px",
};

const metaItemsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "lowercase",
  color: "var(--ink-900)",
};

// Affichage du coût d'entrée : un encadré horizontal compact regroupant
// l'icône billet, le label "ENTRÉE", le montant, le "+", puis l'icône énergie.
// Style "billet de gala" — passe en rouge si !peutEntrer.
const fraisBoxStyle = (peutEntrer: boolean): CSSProperties => {
  const color = peutEntrer ? "var(--ink-900)" : "var(--vermillion-600)";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color,
    background: peutEntrer ? "rgba(245,239,225,0.85)" : "rgba(245,225,225,0.85)",
    border: `1px solid ${peutEntrer ? "var(--brass-700)" : "var(--vermillion-600)"}`,
    borderRadius: 3,
    padding: "4px 9px",
    lineHeight: 1,
  };
};

const fraisLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 8.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  opacity: 0.75,
  fontWeight: 700,
};

const fraisAmountStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.04em",
};

const fraisPlusStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.55,
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

const conditionsListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "4px 0 0",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
};

const conditionItemBase: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 700,
  // Lisibilité sur fond transparent (la fenêtre n'a plus de boîte papier).
  textShadow: "0 1px 0 rgba(245,239,225,0.9), 0 1px 3px rgba(20,12,0,0.3)",
};

const conditionItemStyle = (met: boolean): CSSProperties => ({
  ...conditionItemBase,
  // Convention standard : vert (couleur forest du thème) = palier atteint,
  // rouge vermillon = palier encore manquant.
  color: met ? "var(--forest-700)" : "var(--vermillion-600)",
});

export function BrocanteDetailFloating({
  brocante,
  debloquee,
  peutEntrer,
  conditions,
}: BrocanteDetailFloatingProps) {
  const ThemeIcon = brocante.specialisation
    ? CATEGORY_ICONS[brocante.specialisation]
    : null;

  // --- Layout VERROUILLÉ : nom gris + liste des conditions colorées ---
  if (!debloquee) {
    return (
      <aside style={cardStyle} aria-live="polite">
        <h2 style={titleStyleLocked}>{brocante.nom}</h2>
        <div style={goldRuleStyle} aria-hidden />
        <ul style={conditionsListStyle}>
          {conditions.map((c, i) => (
            <li key={i} style={conditionItemStyle(c.met)}>
              {c.text}
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  // --- Layout DÉBLOQUÉ : titre + desc + filet d'or + meta intégrée ---
  return (
    <aside style={cardStyle} aria-live="polite">
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <p style={descStyle}>{brocante.description}</p>
      <div style={goldRuleStyle} aria-hidden />
      <div style={metaRowStyle}>
        <span style={metaItemsStyle}>{brocante.taillePool} items</span>
        <span
          style={fraisBoxStyle(peutEntrer)}
          aria-label={`Entrée : ${fraisEntree(brocante)} euros et 1 énergie`}
        >
          <span style={fraisLabelStyle}>Entrée</span>
          <span style={fraisAmountStyle}>{fraisEntree(brocante)} €</span>
          <span style={fraisPlusStyle}>+</span>
          <Zap size={14} strokeWidth={2} />
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
