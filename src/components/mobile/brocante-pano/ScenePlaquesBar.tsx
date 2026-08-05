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

const barStyle = (position: "top" | "bottom"): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  ...(position === "bottom" ? { bottom: 8 } : { top: 8 }),
  display: "flex",
  justifyContent: "center",
  gap: 10,
  padding: "0 12px",
  zIndex: 25,
  pointerEvents: "none", // les boutons réactivent
});

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
}`}</style>
      )}
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
      {evenementVisible && (
        <button
          type="button"
          onClick={() => onSceneClick("evenement")}
          aria-label={d.chine.badgeEvenement}
          aria-current={currentScene === "evenement" ? "true" : "false"}
          style={plaqueEvenementStyle(currentScene === "evenement")}
        >
          <span aria-hidden style={rivetStyle(currentScene === "evenement", "left")} />
          <Megaphone
            size={18}
            strokeWidth={2}
            color={currentScene === "evenement" ? "#3a2410" : "#2c2018"}
          />
          <span aria-hidden style={rivetStyle(currentScene === "evenement", "right")} />
        </button>
      )}
    </div>
  );
}
