"use client";

import { useRef } from "react";
import type { NiveauCamion, ObjetEnVitrine } from "@/types/game";
import { getCamion } from "@/data/camion";
import { ItemDansCoffre } from "./ItemDansCoffre";

interface Props {
  niveauCamion: NiveauCamion;
  objets: ObjetEnVitrine[];
  overlaps: Set<string>;
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string) => void;
  onRetour: (objetId: string) => void;
}

export function CoffreCanvas({
  niveauCamion,
  objets,
  overlaps,
  onMove,
  onRotate,
  onRetour,
}: Props) {
  const camion = getCamion(niveauCamion);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div style={{ padding: 14, background: "var(--paper-200)" }}>
      <div
        ref={ref}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          position: "relative",
          background:
            "repeating-linear-gradient(45deg, var(--ink-700), var(--ink-700) 6px, var(--ink-500) 6px, var(--ink-500) 12px)",
          border: "4px solid var(--ink-700)",
          borderRadius: 6,
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          — coffre ouvert —
        </div>
        {objets.map((ov) => {
          const w = ref.current?.getBoundingClientRect().width ?? camion.cotePixels;
          return (
            <ItemDansCoffre
              key={ov.objet.id}
              ov={ov}
              capacitePlaces={camion.capacitePlaces}
              cotePixels={w}
              containerRef={ref}
              overlap={overlaps.has(ov.objet.id)}
              onMove={(x, y) => onMove(ov.objet.id, x, y)}
              onRotate={() => onRotate(ov.objet.id)}
              onDragOut={() => onRetour(ov.objet.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
