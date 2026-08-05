"use client";

import { Crown, Megaphone } from "lucide-react";
import type { CSSProperties } from "react";
import type { BrocanteTier } from "@/types/game";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { SceneId } from "./brocantePanoramaLayout";

interface ScenePlaquesBarProps {
  currentScene: SceneId;
  onSceneClick: (s: SceneId) => void;
  /** La braderie est-elle présente dans la liste → 5ᵉ plaque Événement. */
  evenementVisible: boolean;
  /** Place la barre en haut (défaut) ou en bas de la zone panorama. */
  position?: "top" | "bottom";
}

const TIERS: BrocanteTier[] = [1, 2, 3, 4];

// La barre empile deux rangées : les 4 plaques de tier, puis (jours de
// braderie) la plaque Événement seule, centrée et un peu plus grande.
const barStyle = (position: "top" | "bottom"): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  ...(position === "bottom" ? { bottom: 8 } : { top: 8 }),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  rowGap: 8,
  padding: "0 12px",
  zIndex: 25,
  pointerEvents: "none", // les boutons réactivent
});

const rangeeTiersStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
  width: "100%",
};

/**
 * Cartel laiton style étiquette de musée : rectangle aux coins arrondis,
 * deux rivets latéraux, dégradé de laiton, ombrage interne pour le relief.
 */
const plaqueStyle = (active: boolean): CSSProperties => ({
  pointerEvents: "auto",
  position: "relative",
  flex: "0 1 80px",
  height: 32,
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  background: active
    ? "linear-gradient(180deg, #f0d18b 0%, #d4ad60 45%, #b48a3e 100%)"
    : "linear-gradient(180deg, #bcae93 0%, #978769 50%, #756749 100%)",
  border: active ? "1px solid #6b4e25" : "1px solid #4a3a23",
  borderRadius: 4,
  boxShadow: active
    ? "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 14px rgba(220,170,60,0.6), 0 3px 8px rgba(20,12,0,0.45)"
    : "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 5px rgba(20,12,0,0.4)",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  filter: active ? "none" : "saturate(0.5) brightness(0.85)",
  transition: "filter 200ms ease, box-shadow 200ms ease, background 200ms ease",
});

const rivetStyle = (active: boolean, side: "left" | "right"): CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: 4,
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: active
    ? "radial-gradient(circle at 30% 30%, #f6e3b2, #6b4e25 80%)"
    : "radial-gradient(circle at 30% 30%, #c0b08a, #3a2c19 80%)",
  transform: "translateY(-50%)",
  boxShadow: "inset 0 1px 1px rgba(0,0,0,0.55)",
});

const starsStyle = (active: boolean): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: active ? "#3a2410" : "#2c2018",
  lineHeight: 1,
  textShadow: active
    ? "0 1px 0 rgba(255,235,180,0.5)"
    : "0 1px 0 rgba(255,255,255,0.18)",
});

// Surcharge de `plaqueStyle` pour la plaque Événement : même cartel, plus
// l'aura dorée pulsante (l'animation elle-même est déclarée dans le
// `<style>` inline ci-dessous — jamais dans globals.css, cf. piège connu).
const plaqueEvenementStyle = (active: boolean): CSSProperties => ({
  ...plaqueStyle(active),
  animation: "aura-evenement 1.6s ease-in-out infinite",
});

/**
 * Conteneur de la plaque Événement : porte le slot flex du cartel et sert
 * d'ancre aux étincelles. Elles vivent en FRÈRES du bouton (pas dedans) :
 * la plaque inactive applique `filter: saturate/brightness` qui ternirait
 * tout enfant — hors du bouton, l'or scintille à pleine intensité.
 */
const conteneurEvenementStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  marginTop: 10, // léger décrochage sous la rangée des tiers (+ rowGap 8)
  pointerEvents: "none", // le bouton réactive (comme barStyle)
};

/** La plaque Événement est un cran plus grande que les cartels de tier. */
const plaqueEvenementTaille: CSSProperties = {
  flex: "0 0 auto",
  height: 38,
  minWidth: 104,
  padding: "0 24px",
};

/**
 * Étincelles dorées qui émanent de la plaque Événement : ✦ absolus autour
 * du cartel, chacun avec sa taille, sa position et son déphasage — le cycle
 * scintille-evenement (opacité + échelle) les fait clignoter en quinconce.
 * Décoratif pur (aria-hidden).
 */
const ETINCELLES: readonly {
  top: string;
  left: string;
  size: number;
  delay: number;
  duree: number;
}[] = [
  { top: "-11px", left: "-8px", size: 15, delay: 0, duree: 1.5 },
  { top: "-13px", left: "60%", size: 11, delay: 0.45, duree: 1.9 },
  { top: "36%", left: "calc(100% - 3px)", size: 16, delay: 0.9, duree: 1.6 },
  { top: "calc(100% - 4px)", left: "16%", size: 11, delay: 1.25, duree: 2.1 },
  { top: "calc(100% - 8px)", left: "calc(100% - 10px)", size: 13, delay: 0.65, duree: 1.7 },
  { top: "26%", left: "-13px", size: 10, delay: 1.6, duree: 1.8 },
];

const etincelleStyle = (e: (typeof ETINCELLES)[number]): CSSProperties => ({
  position: "absolute",
  top: e.top,
  left: e.left,
  fontSize: e.size,
  lineHeight: 1,
  color: "#ffe28a",
  textShadow:
    "0 0 4px rgba(255,215,100,1), 0 0 10px rgba(255,200,70,0.85), 0 0 18px rgba(255,180,50,0.5)",
  pointerEvents: "none",
  zIndex: 2,
  opacity: 0,
  animation: `scintille-evenement ${e.duree}s ease-in-out ${e.delay}s infinite`,
});

function plaqueLabel(tier: BrocanteTier, active: boolean) {
  if (tier === 4) {
    return (
      <Crown
        size={18}
        strokeWidth={2}
        color={active ? "#3a2410" : "#2c2018"}
        style={{
          filter: active
            ? "drop-shadow(0 1px 0 rgba(255,235,180,0.5))"
            : undefined,
        }}
      />
    );
  }
  return <span style={starsStyle(active)}>{"★".repeat(tier)}</span>;
}

export function ScenePlaquesBar({
  currentScene,
  onSceneClick,
  evenementVisible,
  position = "top",
}: ScenePlaquesBarProps) {
  const { d, tr } = useLangue();
  const ariaLabel = (tier: BrocanteTier) =>
    tier === 4
      ? d.chine.tier4Aria
      : tr(d.chine.tierEtoilesAria, { tier, etoiles: "★".repeat(tier) });
  return (
    <div style={barStyle(position)} aria-label={d.chine.navigationParTierAria}>
      {evenementVisible && (
        // Aura dorée pulsante — inline pour éviter le piège du globals.css périmé.
        <style>{`@keyframes aura-evenement {
  0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 0 10px rgba(240,185,70,0.55), 0 3px 8px rgba(20,12,0,0.45); }
  50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 0 22px rgba(255,205,90,0.95), 0 3px 8px rgba(20,12,0,0.45); }
}
@keyframes scintille-evenement {
  0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  45% { opacity: 1; transform: scale(1) rotate(20deg); }
  60% { opacity: 0.85; transform: scale(0.85) rotate(28deg); }
}`}</style>
      )}
      <div style={rangeeTiersStyle}>
        {TIERS.map((t) => {
          const active = t === currentScene;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSceneClick(t)}
              aria-label={ariaLabel(t)}
              aria-current={active ? "true" : "false"}
              style={plaqueStyle(active)}
            >
              <span aria-hidden style={rivetStyle(active, "left")} />
              {plaqueLabel(t, active)}
              <span aria-hidden style={rivetStyle(active, "right")} />
            </button>
          );
        })}
      </div>
      {/* Rangée dédiée sous les tiers : la plaque Événement, centrée, plus grande. */}
      {evenementVisible && (
        <span style={conteneurEvenementStyle}>
          <button
            type="button"
            onClick={() => onSceneClick("evenement")}
            aria-label={d.chine.badgeEvenement}
            aria-current={currentScene === "evenement" ? "true" : "false"}
            style={{
              ...plaqueEvenementStyle(currentScene === "evenement"),
              ...plaqueEvenementTaille,
            }}
          >
            <span aria-hidden style={rivetStyle(currentScene === "evenement", "left")} />
            <Megaphone
              size={22}
              strokeWidth={2}
              color={currentScene === "evenement" ? "#3a2410" : "#2c2018"}
            />
            <span aria-hidden style={rivetStyle(currentScene === "evenement", "right")} />
          </button>
          {ETINCELLES.map((e, i) => (
            <span key={i} aria-hidden style={etincelleStyle(e)}>
              ✦
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
