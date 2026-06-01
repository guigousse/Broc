"use client";

import type { CSSProperties } from "react";
import { ArrowUp } from "lucide-react";

interface UpgradeButtonProps {
  niveauCible: number;
  cout: number;
  peut: boolean;
  onUpgrade: () => void;
  ariaLabel?: string;
}

const baseStyle = (peut: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 1,
  padding: "4px 10px",
  border: "1px solid var(--brass-500)",
  background: peut ? "var(--forest-800)" : "var(--paper-200)",
  color: peut ? "var(--brass-300)" : "var(--ink-500)",
  cursor: peut ? "pointer" : "not-allowed",
  opacity: peut ? 1 : 0.6,
  lineHeight: 1.1,
});

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
};

const costStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
};

/**
 * Bouton compact à 2 lignes (↑ LVL{n} + {cout} €) utilisé en colonne
 * droite du PageHeaderBar de l'Atelier et du Stockage.
 */
export function UpgradeButton({
  niveauCible,
  cout,
  peut,
  onUpgrade,
  ariaLabel,
}: UpgradeButtonProps) {
  return (
    <button
      type="button"
      disabled={!peut}
      onClick={onUpgrade}
      aria-label={
        ariaLabel ?? `Améliorer vers LVL ${niveauCible} (${cout} €)`
      }
      style={baseStyle(peut)}
    >
      <span style={labelStyle}>
        <ArrowUp size={11} strokeWidth={2} />
        LVL{niveauCible}
      </span>
      <span style={costStyle}>{cout} €</span>
    </button>
  );
}
