"use client";

import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { useLangue } from "@/lib/i18n/LangueContext";

interface BrocanteDetailPanelProps {
  brocante: Brocante | null;
  debloquee: boolean;
  peutEntrer: boolean;
  raisonVerrouillage: string | null;
  onEntrer: () => void;
}

const panelStyle: CSSProperties = {
  height: "35vh",
  minHeight: 220,
  borderTop: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "12px 16px calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 8px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  boxSizing: "border-box",
  flexShrink: 0,
};

const emptyStyle: CSSProperties = {
  flex: 1,
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--ink-500)",
  textAlign: "center",
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
  maxWidth: 480,
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
  maxWidth: 480,
  lineHeight: 1.3,
};

const enterBtn = (
  debloquee: boolean,
  peutEntrer: boolean,
): CSSProperties => ({
  width: "100%",
  maxWidth: 360,
  padding: "12px 16px",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: debloquee && peutEntrer ? "var(--forest-800)" : "var(--paper-300)",
  color: debloquee && peutEntrer ? "var(--brass-300)" : "var(--ink-500)",
  cursor: debloquee && peutEntrer ? "pointer" : "not-allowed",
  opacity: !debloquee || !peutEntrer ? 0.65 : 1,
  boxShadow:
    debloquee && peutEntrer
      ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.25)"
      : "none",
  marginTop: "auto",
});

export function BrocanteDetailPanel({
  brocante,
  debloquee,
  peutEntrer,
  raisonVerrouillage,
  onEntrer,
}: BrocanteDetailPanelProps) {
  const { d, tr } = useLangue();
  if (!brocante) {
    return (
      <aside style={panelStyle}>
        <div style={emptyStyle}>{d.chine.choisissezBrocante}</div>
      </aside>
    );
  }

  const label = !debloquee
    ? d.chine.ferme
    : !peutEntrer
      ? d.chine.fondsInsuffisants
      : d.chine.entrer;

  return (
    <aside style={panelStyle}>
      <h2 style={titleStyle}>{brocante.nom}</h2>
      <div style={tierStyle}>{"★".repeat(brocante.tier)}</div>
      <p style={descStyle}>{brocante.description}</p>
      <div style={metaStyle}>
        {tr(d.chine.metaBrocante, {
          taille: brocante.taillePool,
          prix: fraisEntree(brocante),
        })}
      </div>
      {!debloquee && raisonVerrouillage && (
        <div style={lockStyle}>⊘ {raisonVerrouillage}</div>
      )}
      <button
        type="button"
        disabled={!debloquee || !peutEntrer}
        onClick={onEntrer}
        style={enterBtn(debloquee, peutEntrer)}
      >
        {label}
      </button>
    </aside>
  );
}
