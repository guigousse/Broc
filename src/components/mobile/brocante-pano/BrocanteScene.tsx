"use client";

import type { CSSProperties } from "react";
import type { Brocante, BrocanteTier } from "@/types/game";
import { BrocanteFrame } from "./BrocanteFrame";
import { ScenePlaque } from "./ScenePlaque";
import { SCENE_FRAMES, SCENE_PLAQUE } from "./brocantePanoramaLayout";

interface BrocanteSceneProps {
  tier: BrocanteTier;
  brocantesById: Map<string, Brocante>;
  selectedId: string | null;
  debloqueesIds: Set<string>;
  onSelect: (id: string) => void;
}

// Dégradés de stub par tier (en attendant les vraies illustrations).
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
  height: "100%",
  scrollSnapAlign: "start",
  background: STUB_GRADIENT[tier],
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
  return (
    <section style={sceneStyle(tier)} data-brocante-scene={tier} aria-label={`Scène tier ${tier}`}>
      {frames.map((coord) => {
        const b = brocantesById.get(coord.id);
        if (!b) return null;
        return (
          <BrocanteFrame
            key={b.id}
            brocanteId={b.id}
            nom={b.nom}
            coord={coord}
            selected={selectedId === b.id}
            debloquee={debloqueesIds.has(b.id)}
            onSelect={onSelect}
          />
        );
      })}
      <div style={plaqueWrapper(tier)}>
        <ScenePlaque tier={tier} />
      </div>
    </section>
  );
}
