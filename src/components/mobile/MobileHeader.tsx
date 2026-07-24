"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Plus } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import { ENERGIE_MAX, energieCourante } from "@/lib/energie";
import { progressionNiveauBrocanteur } from "@/lib/xp";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";
import { useLangue } from "@/lib/i18n/LangueContext";
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
  // brass-300 (7,6:1 sur forest-800) — brass-700 mesurait 2,7:1, sous AA.
  color: "var(--brass-300)",
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

const xpBlocStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  justifySelf: "center",
  minWidth: 0,
  textDecoration: "none",
};

const xpNiveauStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  color: "var(--paper-100)",
};

const xpTrackStyle: CSSProperties = {
  width: 56,
  height: 5,
  background: "rgba(247,244,238,0.18)",
  border: "1px solid var(--brass-500)",
  overflow: "hidden",
};

const xpFillStyle: CSSProperties = {
  display: "block",
  height: "100%",
  background: "var(--brass-500)",
  transition: "width 300ms ease",
};

export function MobileHeader({ budget }: MobileHeaderProps) {
  const { state } = useGame();
  const { tempsConfiance } = useGameActions();
  const [rechargeOuverte, setRechargeOuverte] = useState(false);
  const pathname = usePathname();
  const { d, tr, locale } = useLangue();

  const energieMax = ENERGIE_MAX;
  const energie = state
    ? energieCourante(state, tempsConfiance() ?? Date.now(), energieMax)
    : ENERGIE_MAX;
  const peutRecharger = energie < energieMax;

  // La puce XP ne doit pas naviguer pendant une session (chinage/vitrine) : un
  // mistap ferait sortir de la session et re-paierait le droit d'entrée +
  // re-consommerait l'énergie à la re-entrée. Elle ne doit pas non plus
  // naviguer avant N1, car l'écran Compétences est masqué tant que le joueur
  // n'a pas ouvert son premier point.
  const enSession = ROUTES_SESSION_PREFIXES.some((p) => pathname?.startsWith(p));
  const xpNavigationBloquee = enSession || (state ? state.brocanteur.niveau < 1 : true);
  const xpLabel = state
    ? tr(d.chrome.niveauBrocanteur, { n: state.brocanteur.niveau })
    : undefined;
  const xpContenu = state ? (
    <>
      <span style={xpNiveauStyle}>N{state.brocanteur.niveau}</span>
      <span style={xpTrackStyle}>
        <span
          style={{
            ...xpFillStyle,
            width: `${Math.round(progressionNiveauBrocanteur(state.brocanteur) * 100)}%`,
          }}
        />
      </span>
    </>
  ) : null;

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
        {state ? (
          xpNavigationBloquee ? (
            <span style={xpBlocStyle} aria-label={xpLabel} data-fly-target="xp-header">
              {xpContenu}
            </span>
          ) : (
            <Link href="/bibliotheque" style={xpBlocStyle} aria-label={xpLabel} data-fly-target="xp-header">
              {xpContenu}
            </Link>
          )
        ) : (
          <span />
        )}
        <div style={{ textAlign: "center", ...labelStyle }}>
          {d.chrome.energie}
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
                aria-label={d.chrome.rechargerEnergie}
                style={{
                  // Zone de tap 44 pt (marges négatives compensées : le
                  // cercle visuel reste 18 px, la cible tactile non).
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  margin: -13,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    border: "1.5px solid var(--brass-500)",
                    color: "var(--brass-300)",
                  }}
                >
                  <Plus size={12} strokeWidth={3} />
                </span>
              </button>
            )}
            <Zap size={15} strokeWidth={2.5} aria-hidden />
            {energie}
            <span style={{ color: "var(--brass-700)" }}>/{energieMax}</span>
          </strong>
        </div>
        <div style={{ textAlign: "right", ...labelStyle }}>
          {d.chrome.caisse}
          <strong style={valueStyle}>
            {tr(d.chrome.montantEuros, { valeur: budget.toLocaleString(locale) })}
          </strong>
        </div>
      </div>

      {rechargeOuverte && <EnergieRecharge onClose={() => setRechargeOuverte(false)} />}
    </header>
  );
}
