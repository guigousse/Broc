"use client";

import { useRef, type CSSProperties } from "react";
import type { Brocante, BrocanteTier } from "@/types/game";
import { BrocanteFrame } from "./BrocanteFrame";
import { ScenePlaque } from "./ScenePlaque";
import { SCENE_FRAMES, SCENE_PLAQUE } from "./brocantePanoramaLayout";
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

const sceneStyle = (tier: BrocanteTier): CSSProperties => ({
  position: "relative",
  flex: "0 0 100vw",
  width: "100vw",
  alignSelf: "stretch",
  scrollSnapAlign: "start",
  // Tente d'abord l'image générée (`gen:scenes`), sinon le dégradé stub.
  backgroundImage: `url("/brocantes/scenes/scene-tier-${tier}.webp"), ${STUB_GRADIENT[tier]}`,
  backgroundSize: "cover, cover",
  backgroundPosition: "center, center",
  backgroundRepeat: "no-repeat, no-repeat",
  overflow: "hidden",
});

const plaqueWrapper = (tier: BrocanteTier): CSSProperties => ({
  position: "absolute",
  left: SCENE_PLAQUE[tier].left,
  top: SCENE_PLAQUE[tier].top,
  width: SCENE_PLAQUE[tier].width,
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
  const sceneRef = useRef<HTMLElement | null>(null);
  return (
    <section
      ref={sceneRef}
      style={sceneStyle(tier)}
      data-brocante-scene={tier}
      aria-label={`Scène tier ${tier}`}
    >
      {frames.map((coord) => {
        const b = brocantesById.get(coord.id);
        if (!b) return null;
        const merged = applyOverride(coord, overrides[coord.id]);
        return (
          <BrocanteFrame
            key={b.id}
            brocanteId={b.id}
            nom={b.nom}
            coord={merged}
            selected={selectedId === b.id}
            debloquee={debloqueesIds.has(b.id)}
            onSelect={onSelect}
          />
        );
      })}
      <div style={plaqueWrapper(tier)}>
        <ScenePlaque tier={tier} />
      </div>
      {editEnabled && (
        <>
          <EditGridOverlay />
          <BrocanteFramesEditOverlay tier={tier} sceneRef={sceneRef} />
        </>
      )}
    </section>
  );
}
