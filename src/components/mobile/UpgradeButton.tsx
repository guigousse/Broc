"use client";

import type { CSSProperties } from "react";
import { ArrowUp } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";

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
  justifyContent: "center",
  gap: 1,
  padding: "6px 12px",
  minHeight: 40,
  minWidth: 56,
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: peut ? "var(--forest-800)" : "var(--paper-200)",
  color: peut ? "var(--brass-300)" : "var(--ink-300)",
  cursor: peut ? "pointer" : "not-allowed",
  opacity: peut ? 1 : 0.45,
  filter: peut ? undefined : "grayscale(0.65)",
  lineHeight: 1.1,
});

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10.5,
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
  const { d, tr } = useLangue();
  return (
    <button
      type="button"
      disabled={!peut}
      onClick={onUpgrade}
      aria-label={
        ariaLabel ??
        tr(d.chrome.ameliorerVersNiveau, { niveau: niveauCible, cout })
      }
      style={baseStyle(peut)}
    >
      <span style={labelStyle}>
        <ArrowUp size={11} strokeWidth={2} />
        {tr(d.chrome.lvlAbrege, { n: niveauCible })}
      </span>
      <span style={costStyle}>{cout} €</span>
    </button>
  );
}
