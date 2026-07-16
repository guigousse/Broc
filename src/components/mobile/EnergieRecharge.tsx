"use client";

import { X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import {
  ENERGIE_MAX,
  energieCourante,
  pubsEnergieRestantes,
  secondesAvantProchaine,
} from "@/lib/energie";
import { getAdProvider } from "@/lib/ads/adProvider";
import { useLangue } from "@/lib/i18n/LangueContext";

/** Course de l'aiguille du galvanomètre : -60° (0 ⚡) → +60° (max), clampée. */
export function angleAiguille(energie: number, max: number): number {
  const ratio = max > 0 ? Math.min(Math.max(energie / max, 0), 1) : 0;
  return -60 + ratio * 120;
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MACHINE_IMG = "/qg/machine-energie.webp";

/** Zones posées sur l'illustration, en % de la carte (calibrées sur le rendu). */
const ZONE_CADRAN = { cx: 50.1, cy: 24.2, r: 12 };
/** Pastille compteur n/5 + minuteur, sous le cadran. */
const ZONE_COMPTEUR_TOP = 40;
/** Cartel-bouton pub, posé sur les portes du bas de la machine. */
const ZONE_PLAQUE = { left: 10, top: 66, width: 62, height: 11 };
/** Le levier peint (colonne droite) : zone de tap redondante vers la même action. */
const ZONE_LEVIER = { left: 70, top: 34, width: 20, height: 32 };

/** Décalages des étincelles (précalculés : pas de Math.random au rendu). */
const ETINCELLES: ReadonlyArray<{ dx: number; dy: number; delai: number }> = [
  { dx: -46, dy: -38, delai: 0 },
  { dx: 42, dy: -52, delai: 60 },
  { dx: -28, dy: -64, delai: 120 },
  { dx: 56, dy: -20, delai: 40 },
  { dx: -60, dy: -10, delai: 100 },
  { dx: 30, dy: -70, delai: 160 },
];

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const carteStyle = (tremble: boolean): CSSProperties => ({
  position: "relative",
  width: "100%",
  maxWidth: 340,
  aspectRatio: "3 / 4",
  borderRadius: 14,
  overflow: "hidden",
  border: "3px solid var(--brass-500)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
  animation: tremble ? "broc-shake 240ms linear infinite" : undefined,
});

const cadranStyle: CSSProperties = {
  position: "absolute",
  left: `${ZONE_CADRAN.cx - ZONE_CADRAN.r}%`,
  // Dans `top`, un % s'évalue contre la hauteur ; carte 3:4 → x % de largeur
  // = x × 3/4 % de hauteur.
  top: `calc(${ZONE_CADRAN.cy}% - ${ZONE_CADRAN.r}% * 3 / 4)`,
  width: `${ZONE_CADRAN.r * 2}%`,
  aspectRatio: "1 / 1",
  pointerEvents: "none",
};

const compteurStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: `${ZONE_COMPTEUR_TOP}%`,
  transform: "translateX(-50%)",
  padding: "6px 14px",
  borderRadius: 12,
  background: "var(--forest-800)",
  border: "1px solid var(--brass-700)",
  textAlign: "center",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
  pointerEvents: "none",
  whiteSpace: "nowrap",
};

/** Cartel laiton « étiquette de musée » — même famille que ScenePlaquesBar. */
const plaqueBtnStyle = (indisponible: boolean): CSSProperties => ({
  position: "absolute",
  left: `${ZONE_PLAQUE.left}%`,
  top: `${ZONE_PLAQUE.top}%`,
  width: `${ZONE_PLAQUE.width}%`,
  height: `${ZONE_PLAQUE.height}%`,
  borderRadius: 4,
  border: indisponible ? "1px solid #4a3a23" : "1px solid #6b4e25",
  background: indisponible
    ? "linear-gradient(180deg, #bcae93 0%, #978769 50%, #756749 100%)"
    : "linear-gradient(180deg, #f0d18b 0%, #d4ad60 45%, #b48a3e 100%)",
  boxShadow: indisponible
    ? "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 5px rgba(20,12,0,0.4)"
    : "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 14px rgba(220,170,60,0.6), 0 3px 8px rgba(20,12,0,0.45)",
  filter: indisponible ? "saturate(0.5) brightness(0.85)" : "none",
  color: "#3a2410",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(12px, 3.4vw, 14px)",
  letterSpacing: "0.05em",
  lineHeight: 1.15,
  textAlign: "center",
  textShadow: indisponible ? "0 1px 0 rgba(255,255,255,0.18)" : "0 1px 0 rgba(255,235,180,0.5)",
  cursor: indisponible ? "not-allowed" : "pointer",
  WebkitTapHighlightColor: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "0 14px",
});

/** Rivets latéraux du cartel (décor). */
const rivetStyle = (side: "left" | "right"): CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: 5,
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "radial-gradient(circle at 30% 30%, #f6e3b2, #6b4e25 80%)",
  transform: "translateY(-50%)",
  boxShadow: "inset 0 1px 1px rgba(0,0,0,0.55)",
});

/** Zone de tap invisible sur le levier peint (redondante : cachée de l'a11y). */
const levierTapStyle = (indisponible: boolean): CSSProperties => ({
  position: "absolute",
  left: `${ZONE_LEVIER.left}%`,
  top: `${ZONE_LEVIER.top}%`,
  width: `${ZONE_LEVIER.width}%`,
  height: `${ZONE_LEVIER.height}%`,
  cursor: indisponible ? "default" : "pointer",
});

export function EnergieRecharge({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const { tempsConfiance, crediterEnergiePub } = useGameActions();
  const [enCours, setEnCours] = useState(false);
  const [etincelles, setEtincelles] = useState(false);
  const [, force] = useState(0);
  const { d, tr } = useLangue();

  // Tick local 1 s pour le minuteur (sans réécrire le state global).
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Coupe la gerbe d'étincelles après l'animation.
  useEffect(() => {
    if (!etincelles) return;
    const id = window.setTimeout(() => setEtincelles(false), 900);
    return () => window.clearTimeout(id);
  }, [etincelles]);

  if (!state) return null;
  const now = tempsConfiance() ?? Date.now();
  const energieMax = ENERGIE_MAX;
  const energie = energieCourante(state, now, energieMax);
  const restantSec = secondesAvantProchaine(state, now, energieMax);
  const pubsRestantes = pubsEnergieRestantes(state.pubsEnergie, now);
  // Quota épuisé : on bloque AVANT de lancer la pub (jamais de pub gâchée).
  const pubIndisponible = enCours || pubsRestantes <= 0;

  const regarderPub = async () => {
    if (pubIndisponible) return;
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (rewarded) {
        crediterEnergiePub();
        setEtincelles(true);
      }
    } finally {
      setEnCours(false);
    }
  };

  const angle = angleAiguille(energie, energieMax);
  const graduations = Array.from({ length: energieMax + 1 }, (_, i) =>
    angleAiguille(i, energieMax),
  );

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={carteStyle(enCours)} onClick={(e) => e.stopPropagation()}>
        {/* La machine du savant fou — l'illustration EST la carte. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MACHINE_IMG}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <button
          onClick={onClose}
          aria-label={d.commun.fermer}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            background: "rgba(15,30,22,0.55)",
            border: "1px solid var(--brass-700)",
            borderRadius: 999,
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--brass-300)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {/* Galvanomètre posé sur le cadran vide de l'illustration. */}
        <div style={cadranStyle}>
          <svg viewBox="-50 -50 100 100" style={{ width: "100%", height: "100%" }}>
            {/* Graduations 0→max le long de l'arc de course. */}
            {graduations.map((a, i) => (
              <g key={i} transform={`rotate(${a})`}>
                <line
                  x1={0}
                  y1={-40}
                  x2={0}
                  y2={i === 0 || i === graduations.length - 1 ? -31 : -34}
                  stroke="var(--forest-800)"
                  strokeWidth={i === graduations.length - 1 ? 3 : 2}
                  strokeLinecap="round"
                />
              </g>
            ))}
            {/* Aiguille — transition ressort quand l'énergie monte. */}
            <g
              data-testid="aiguille-energie"
              transform={`rotate(${angle})`}
              style={{ transition: "transform 600ms cubic-bezier(0.2, 1.6, 0.4, 1)" }}
            >
              <line
                x1={0}
                y1={8}
                x2={0}
                y2={-36}
                stroke="var(--vermillion-600)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
            <circle r={5} fill="var(--brass-500)" stroke="var(--forest-800)" strokeWidth={1.5} />
          </svg>
        </div>

        {/* Compteur n/max + minuteur, sous le cadran. */}
        <div style={compteurStyle}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            <Zap size={16} strokeWidth={2.5} style={{ verticalAlign: "-2px" }} /> {energie}
            <span style={{ opacity: 0.6 }}>/{energieMax}</span>
          </div>
          <div style={{ fontSize: 11, marginTop: 2 }}>
            {restantSec === null
              ? d.chrome.energieAuMaximum
              : tr(d.chrome.prochaineEnergieDans, { temps: formatMMSS(restantSec) })}
          </div>
        </div>

        {/* Le cartel laiton : LE bouton pub (accessible). */}
        <button
          onClick={regarderPub}
          disabled={pubIndisponible}
          style={plaqueBtnStyle(pubIndisponible)}
        >
          <span aria-hidden style={rivetStyle("left")} />
          {enCours
            ? d.chrome.pubEnCours
            : pubsRestantes <= 0
              ? d.chrome.pubEpuisee
              : (
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {d.chrome.regarderPub}
                    <Zap size={16} strokeWidth={2.5} aria-hidden />
                  </span>
                )}
          <span aria-hidden style={rivetStyle("right")} />
        </button>

        {/* Le levier peint : zone de tap redondante, invisible pour l'a11y. */}
        <div aria-hidden style={levierTapStyle(pubIndisponible)} onClick={regarderPub} />

        {/* Gerbe d'étincelles à la récompense (au niveau du cadran). */}
        {etincelles &&
          ETINCELLES.map((e, i) => (
            <span
              key={i}
              aria-hidden
              style={
                {
                  position: "absolute",
                  left: `${ZONE_CADRAN.cx}%`,
                  top: `${ZONE_CADRAN.cy}%`,
                  fontSize: 18,
                  pointerEvents: "none",
                  animation: `broc-spark 700ms ease-out ${e.delai}ms both`,
                  "--dx": `${e.dx}px`,
                  "--dy": `${e.dy}px`,
                } as CSSProperties
              }
            >
              ⚡
            </span>
          ))}
      </div>
    </div>
  );
}
