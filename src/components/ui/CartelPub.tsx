"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Le cartel laiton « étiquette de musée » qui déclenche un visionnage
 * publicitaire — d'abord né sur la machine à énergie, désormais la forme
 * commune à tous les boutons pub du jeu : plaque dorée, texte gravé brun,
 * rivets latéraux.
 *
 * Le module possède l'APPARENCE, l'appelant possède la MISE EN PAGE (même
 * découpage que `namePlate.ts`) : `style` est fusionné après le style de base,
 * ce qui permet à la machine à énergie de rester en positionnement absolu sur
 * son illustration pendant que le tiroir de chinage passe une largeur pleine.
 */
export function CartelPub({
  indisponible = false,
  pulse = false,
  onClick,
  ariaLabel,
  style,
  children,
}: {
  indisponible?: boolean;
  pulse?: boolean;
  onClick?: () => void;
  /** Omis, le nom accessible vient du contenu (cas des états d'indisponibilité). */
  ariaLabel?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={indisponible}
      aria-label={ariaLabel}
      style={{ ...cartelStyle(indisponible, pulse), ...style }}
    >
      <span aria-hidden style={rivetStyle("left")} />
      {children}
      <span aria-hidden style={rivetStyle("right")} />
    </button>
  );
}

/** Plaque dorée gravée. `position: relative` ancre les rivets par défaut ;
 *  un appelant qui passe `position: absolute` les garde ancrés sur lui. */
function cartelStyle(indisponible: boolean, pulse: boolean): CSSProperties {
  return {
    position: "relative",
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
    textShadow: indisponible
      ? "0 1px 0 rgba(255,255,255,0.18)"
      : "0 1px 0 rgba(255,235,180,0.5)",
    cursor: indisponible ? "not-allowed" : "pointer",
    WebkitTapHighlightColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "0 14px",
    animation: pulse ? "broc-cartel-pulse 1.1s ease-in-out infinite" : undefined,
  };
}

/** Rivets latéraux (décor). */
function rivetStyle(side: "left" | "right"): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 5,
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #f6e3b2, #6b4e25 80%)",
    transform: "translateY(-50%)",
    boxShadow: "inset 0 1px 1px rgba(0,0,0,0.55)",
  };
}
