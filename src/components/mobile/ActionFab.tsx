"use client";

import type { CSSProperties, ReactNode } from "react";

interface FabButton {
  label: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

interface ActionFabProps {
  buttons: FabButton[];
}

const wrapStyle: CSSProperties = {
  position: "fixed",
  left: "calc(12px + var(--safe-left))",
  right: "calc(12px + var(--safe-right))",
  bottom: "calc(12px + var(--safe-bottom))",
  display: "flex",
  gap: 8,
  zIndex: 25,
};

// Aligné sur FloatingActionButton (cf. sheets QG : Chiner / Étaler) — même
// présence visuelle (radius, padding, ombre portée, highlight intérieur).
const baseBtn: CSSProperties = {
  flex: 1,
  padding: "14px 22px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  borderRadius: 6,
  textAlign: "center",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const primaryBtn: CSSProperties = {
  ...baseBtn,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
};

const secondaryBtn: CSSProperties = {
  ...baseBtn,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  border: "1px solid var(--brass-700)",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.5)",
};

export function ActionFab({ buttons }: ActionFabProps) {
  return (
    <div style={wrapStyle}>
      {buttons.map((b, i) => (
        <button
          key={i}
          type="button"
          onClick={b.onClick}
          disabled={b.disabled}
          style={{
            ...(b.variant === "secondary" ? secondaryBtn : primaryBtn),
            opacity: b.disabled ? 0.45 : 1,
            cursor: b.disabled ? "not-allowed" : "pointer",
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
