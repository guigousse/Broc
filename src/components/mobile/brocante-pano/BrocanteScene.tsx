"use client";

import { useRef, type CSSProperties } from "react";
import type { Brocante, BrocanteTier } from "@/types/game";
import { BrocanteFrame } from "./BrocanteFrame";
import { SCENE_FRAMES } from "./brocantePanoramaLayout";
import { applyOverride, useBrocanteFramesEdit } from "./BrocanteFramesEditContext";
import { BrocanteFramesEditOverlay } from "./BrocanteFramesEditOverlay";
import { EditGridOverlay } from "./EditGridOverlay";

interface BrocanteSceneProps {
  tier: BrocanteTier;
  brocantesById: Map<string, Brocante>;
  selectedId: string | null;
  debloqueesIds: Set<string>;
  onSelect: (id: string) => void;
}

// Dégradés de stub par tier (utilisés tant que `scene-tier-{n}.webp`
// n'est pas généré par `npm run gen:scenes`).
const STUB_GRADIENT: Record<BrocanteTier, string> = {
  1: "linear-gradient(180deg, #c9d3c2 0%, #8a9a82 60%, #5c6b58 100%)",
  2: "linear-gradient(180deg, #b8a382 0%, #8a6f4a 60%, #5b4527 100%)",
  3: "linear-gradient(180deg, #d6c2a2 0%, #a98455 50%, #5d3d1d 100%)",
  4: "linear-gradient(180deg, #6c1d22 0%, #2d0d10 100%)",
};

/**
 * Ratio largeur/hauteur de la BOÎTE DE CONTENU de la scène (portrait, < 1).
 *
 * La boîte fait toujours `height: 100%` (pleine hauteur garantie → le décor
 * n'est jamais rogné en haut/bas) ; sa largeur en découle (= AR × hauteur).
 * Comme ce ratio est CONSTANT quel que soit l'écran, les cadres (en % de la
 * boîte) restent alignés partout — aucun re-réglage nécessaire.
 *
 * 👉 SEUL bouton de calibrage : ajuster cette valeur pour que, sur le
 * téléphone de référence, la boîte remplisse exactement la largeur (≈ 100vw /
 * hauteur du scroller). Sur iPad/grand écran, la boîte (plus étroite) se
 * centre et laisse des bandes latérales.
 */
const SCENE_AR = 0.65;

const sceneStyle: CSSProperties = {
  position: "relative",
  flex: "0 0 100vw",
  width: "100vw",
  alignSelf: "stretch",
  scrollSnapAlign: "start",
  // Centre la boîte de contenu ; le reste forme les bandes latérales.
  display: "flex",
  justifyContent: "center",
  alignItems: "stretch",
  overflow: "hidden",
  // Bandes latérales : vignette laiton (style cadre doré de musée).
  background:
    "radial-gradient(130% 100% at 50% 50%, var(--brass-300) 0%, var(--brass-500) 62%, var(--brass-700) 100%)",
};

// Boîte de contenu : ratio constant, pleine hauteur, porte le décor + cadres.
const sceneInnerStyle = (tier: BrocanteTier): CSSProperties => ({
  position: "relative",
  height: "100%",
  aspectRatio: String(SCENE_AR),
  flexShrink: 0,
  // Image générée (`gen:scenes`) sinon dégradé stub. La boîte = même ratio
  // partout → `cover` ne rogne plus que les côtés, jamais le haut/bas.
  backgroundImage: `url("/brocantes/scenes/scene-tier-${tier}.webp"), ${STUB_GRADIENT[tier]}`,
  backgroundSize: "cover, cover",
  backgroundPosition: "center, center",
  backgroundRepeat: "no-repeat, no-repeat",
  overflow: "hidden",
  // Léger liseré pour détacher la scène des bandes (effet tableau encadré).
  boxShadow: "0 0 0 1px rgba(0,0,0,0.55), 0 6px 28px rgba(0,0,0,0.4)",
});

export function BrocanteScene({
  tier,
  brocantesById,
  selectedId,
  debloqueesIds,
  onSelect,
}: BrocanteSceneProps) {
  const frames = SCENE_FRAMES[tier];
  const { enabled: editEnabled, overrides } = useBrocanteFramesEdit();
  // sceneRef pointe sur la BOÎTE DE CONTENU : c'est la base des % des cadres
  // (et la mesure px→% de l'outil d'édition).
  const sceneRef = useRef<HTMLDivElement | null>(null);
  return (
    <section
      style={sceneStyle}
      data-brocante-scene={tier}
      aria-label={`Scène tier ${tier}`}
    >
      <div ref={sceneRef} style={sceneInnerStyle(tier)}>
        {frames.map((coord) => {
          const b = brocantesById.get(coord.id);
          if (!b) return null;
          const merged = applyOverride(coord, overrides[coord.id]);
          return (
            <BrocanteFrame
              key={b.id}
              brocante={b}
              coord={merged}
              selected={selectedId === b.id}
              debloquee={debloqueesIds.has(b.id)}
              onSelect={onSelect}
            />
          );
        })}
        {editEnabled && (
          <>
            <EditGridOverlay />
            <BrocanteFramesEditOverlay tier={tier} sceneRef={sceneRef} />
          </>
        )}
      </div>
    </section>
  );
}
