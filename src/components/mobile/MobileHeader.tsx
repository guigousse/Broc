"use client";

import Link from "next/link";
import { Zap, Plus } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import { ENERGIE_MAX, energieCourante } from "@/lib/energie";
import { EnergieRecharge } from "./EnergieRecharge";

interface MobileHeaderProps {
  budget: number;
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
  fontWeight: 700,
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

export function MobileHeader({ budget }: MobileHeaderProps) {
  const { state } = useGame();
  const { tempsConfiance } = useGameActions();
  const [rechargeOuverte, setRechargeOuverte] = useState(false);

  const energie = state
    ? energieCourante(state, tempsConfiance() ?? Date.now())
    : ENERGIE_MAX;
  const peutRecharger = energie < ENERGIE_MAX;

  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-broc-title)",
            fontWeight: 400,
            fontSize: "clamp(26px, 7.8vw, 36px)",
            letterSpacing: "0.04em",
            color: "var(--brass-300)",
            textDecoration: "none",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
          }}
        >
          Broc
        </Link>
        <span />
        <div style={{ textAlign: "center", ...labelStyle }}>
          Énergie
          <strong
            style={{
              ...valueStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {peutRecharger && (
              <button
                onClick={() => setRechargeOuverte(true)}
                aria-label="Recharger l'énergie"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  border: "1.5px solid var(--brass-500)",
                  background: "transparent",
                  color: "var(--brass-300)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            )}
            <Zap size={15} strokeWidth={2.5} aria-hidden />
            {energie}
            <span style={{ color: "var(--brass-700)" }}>/{ENERGIE_MAX}</span>
          </strong>
        </div>
        <div style={{ textAlign: "right", ...labelStyle }}>
          Caisse
          <strong style={valueStyle}>{budget.toLocaleString("fr-FR")} €</strong>
        </div>
      </div>

      {rechargeOuverte && <EnergieRecharge onClose={() => setRechargeOuverte(false)} />}
    </header>
  );
}
