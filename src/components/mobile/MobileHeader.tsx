"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

interface MobileHeaderProps {
  jour: number;
  budget: number;
}

const wrapStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  paddingTop: "var(--safe-top)",
  background: "var(--forest-800)",
  borderBottom: "1px solid var(--brass-500)",
};

const innerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

export function MobileHeader({ jour, budget }: MobileHeaderProps) {
  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.22em",
            color: "var(--brass-300)",
            textDecoration: "none",
          }}
        >
          BROC
        </Link>
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
          }}
        >
          Jour
          <strong
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: "var(--paper-100)",
              letterSpacing: "0.12em",
              marginTop: 1,
            }}
          >
            N°{String(jour).padStart(3, "0")}
          </strong>
        </div>
        <div
          style={{
            textAlign: "right",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Caisse
          <strong
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--brass-300)",
            }}
          >
            {budget.toLocaleString("fr-FR")} €
          </strong>
        </div>
      </div>
    </header>
  );
}
