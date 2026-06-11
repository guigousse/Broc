"use client";

import type { CSSProperties, ReactNode } from "react";

interface FloatingActionButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary";
  /** Si fourni, sert d'aria-label ; sinon le contenu textuel suffit. */
  ariaLabel?: string;
  /** Largeur min imposée (ex. lorsqu'on veut un bouton large isolé). */
  minWidth?: number;
}

const base: CSSProperties = {
  pointerEvents: "auto",
  padding: "14px 22px",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
  whiteSpace: "nowrap",
};

const secondaryOverride: CSSProperties = {
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  border: "1px solid var(--brass-700)",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.5)",
};

export function FloatingActionButton({
  onClick,
  children,
  variant = "primary",
  ariaLabel,
  minWidth = 200,
}: FloatingActionButtonProps) {
  const style: CSSProperties = {
    ...base,
    ...(variant === "secondary" ? secondaryOverride : {}),
    minWidth,
  };
  return (
    <button type="button" style={style} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
