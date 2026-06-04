"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

interface MobileHeaderProps {
  budget: number;
  tickets?: { current: number; max: number };
}

const wrapStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  paddingTop: "var(--safe-top)",
  background: "var(--forest-800)",
  borderBottom: "3px solid var(--brass-500)",
};

const innerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto auto",
  alignItems: "center",
  gap: 12,
  padding: "8px 14px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(8px, 2.2vw, 10px)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  lineHeight: 1,
};

const valueStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(13px, 3.8vw, 16px)",
  color: "var(--brass-300)",
  marginTop: 2,
};

export function MobileHeader({
  budget,
  tickets = { current: 5, max: 5 },
}: MobileHeaderProps) {
  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-broc-title)",
            fontWeight: 400,
            fontSize: "clamp(22px, 6.5vw, 30px)",
            letterSpacing: "0.04em",
            color: "var(--brass-300)",
            textDecoration: "none",
            lineHeight: 1,
          }}
        >
          Broc
        </Link>
        <span />
        <div style={{ textAlign: "right", ...labelStyle, color: "var(--brass-700)" }}>
          Tickets
          <strong style={valueStyle}>
            {tickets.current}
            <span style={{ color: "var(--brass-700)", fontWeight: 400 }}>
              /{tickets.max}
            </span>
          </strong>
        </div>
        <div style={{ textAlign: "right", ...labelStyle }}>
          Caisse
          <strong style={valueStyle}>{budget.toLocaleString("fr-FR")} €</strong>
        </div>
      </div>
    </header>
  );
}
