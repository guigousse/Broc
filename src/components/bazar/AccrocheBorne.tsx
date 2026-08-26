"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * L'accroche posée en tête de la feuille de soutien quand elle s'ouvre depuis
 * la borne. C'est la BORNE qui parle, dans sa langue : le joueur n'est pas
 * tiré hors de la fiction pour se faire demander un service, la demande arrive
 * ensuite, en petit.
 *
 * ⚠ « MODE DÉMONSTRATION » ne promet rien, et c'est le point. Une vraie borne
 * au repos tourne en mode démonstration — c'est littéralement ce que fait cet
 * écran. Les formulations écartées (« pas encore sorti », « FÉFÉ GAMES
 * travaille dessus », « hors service ») créaient toutes l'attente d'un jeu à
 * venir que personne ne s'est engagé à livrer.
 */

const crt: CSSProperties = {
  background: "#04140b",
  border: "1px solid rgba(125,252,174,0.25)",
  padding: "14px 12px",
  marginBottom: 14,
  fontFamily: "ui-monospace, Menlo, monospace",
  color: "#b7ffd6",
  textAlign: "center",
};

const enseigne: CSSProperties = {
  color: "#ffc93c",
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: "0.14em",
};

const etat: CSSProperties = {
  marginTop: 8,
  fontSize: 11,
  letterSpacing: "0.16em",
  lineHeight: 1.5,
  color: "#7dfcae",
};

const corps: CSSProperties = {
  marginBottom: 14,
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--paper-100)",
};

export function AccrocheBorne() {
  const { d } = useLangue();
  return (
    <>
      <div style={crt} data-testid="soutien-accroche-borne">
        <div style={enseigne}>{d.soutien.insertCoin}</div>
        <div style={etat}>{d.soutien.modeDemo}</div>
      </div>
      <p style={corps}>{d.soutien.corps}</p>
    </>
  );
}
