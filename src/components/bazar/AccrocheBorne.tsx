"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * L'accroche posée en tête de la feuille de soutien quand elle s'ouvre depuis
 * la borne. C'est la BORNE qui parle d'abord, dans sa langue : le joueur n'est
 * pas tiré hors de la fiction pour se faire demander un service. Le mot de
 * remerciement vient ensuite, et c'est le MÊME qu'à la page « Soutenir » du
 * menu (clés `soutien.merci*`) : deux portes, un seul discours.
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

/* Le texte se lit sur le PAPIER de la feuille : il lui faut de l'encre, pas
   du blanc cassé (`paper-100`, qui a longtemps rendu ce paragraphe invisible
   sur appareil). Même corps de lecture que la page « Soutenir » du menu. */
const corps: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "var(--font-serif)",
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.6,
  color: "var(--ink-700)",
};

export function AccrocheBorne() {
  const { d } = useLangue();
  return (
    <>
      <div style={crt} data-testid="soutien-accroche-borne">
        <div style={enseigne}>{d.soutien.insertCoin}</div>
        <div style={etat}>{d.soutien.modeDemo}</div>
      </div>
      <p style={corps}>{d.soutien.merciCorps}</p>
      <p style={corps}>{d.soutien.merciPartage}</p>
      <p style={{ ...corps, marginBottom: 16 }}>{d.soutien.merciAvis}</p>
    </>
  );
}
