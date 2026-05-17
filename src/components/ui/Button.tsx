"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useState } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const SIZE_STYLES: Record<Size, CSSProperties> = {
  sm: { padding: "7px 14px", fontSize: 10 },
  md: { padding: "12px 22px", fontSize: 12 },
  lg: { padding: "16px 32px", fontSize: 14 },
};

const VARIANT_STYLES: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--forest-800)",
    color: "var(--brass-300)",
    border: "1px solid var(--brass-500)",
    boxShadow:
      "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)",
  },
  secondary: {
    background: "transparent",
    color: "var(--forest-800)",
    border: "1px solid var(--brass-700)",
    boxShadow:
      "inset 0 0 0 3px var(--paper-200), inset 0 0 0 4px var(--brass-700)",
  },
  ghost: {
    background: "transparent",
    color: "var(--forest-800)",
    border: "1px solid transparent",
    boxShadow: "none",
  },
  danger: {
    background: "var(--vermillion-600)",
    color: "var(--paper-200)",
    border: "1px solid var(--velvet-700)",
    boxShadow:
      "inset 0 0 0 3px var(--vermillion-600), inset 0 0 0 4px var(--velvet-700)",
  },
};

const HOVER_STYLES: Record<Variant, CSSProperties> = {
  primary: { background: "var(--forest-700)", color: "var(--brass-100)" },
  secondary: { background: "var(--paper-300)" },
  ghost: { background: "rgba(197,160,89,0.15)" },
  danger: { background: "var(--vermillion-500)" },
};

export function Button({
  variant = "primary",
  size = "md",
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const base = VARIANT_STYLES[variant];
  const overlay = hover && !disabled ? HOVER_STYLES[variant] : {};

  return (
    <button
      {...rest}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "var(--font-display)",
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "all 200ms ease",
        ...SIZE_STYLES[size],
        ...base,
        ...overlay,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
