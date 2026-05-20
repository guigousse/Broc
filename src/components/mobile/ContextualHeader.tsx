"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

interface ContextualHeaderProps {
  titre: string;
  sousTitre?: string;
  budget: number;
  onBack?: () => void;
  backIcon?: "back" | "close";
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
  gap: 8,
  padding: "8px 12px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

const btnStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 16,
  background: "transparent",
  cursor: "pointer",
};

export function ContextualHeader({
  titre,
  sousTitre,
  budget,
  onBack,
  backIcon = "back",
}: ContextualHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <button
          type="button"
          onClick={handleBack}
          aria-label={backIcon === "close" ? "Fermer" : "Retour"}
          style={btnStyle}
        >
          {backIcon === "close" ? "✕" : "‹"}
        </button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--brass-300)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {titre}
          </div>
          {sousTitre && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "var(--brass-700)",
                marginTop: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sousTitre}
            </div>
          )}
        </div>
        <div
          style={{
            textAlign: "right",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Caisse
          <strong
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: 12,
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
