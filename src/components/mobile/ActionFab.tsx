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

const baseBtn: CSSProperties = {
  flex: 1,
  padding: "12px 10px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  textAlign: "center",
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  ...baseBtn,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  boxShadow:
    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.18)",
};

const secondaryBtn: CSSProperties = {
  ...baseBtn,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.10)",
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
