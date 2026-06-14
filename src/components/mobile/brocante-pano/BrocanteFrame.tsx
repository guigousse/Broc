"use client";

import Image from "next/image";
import { Store } from "lucide-react";
import type { CSSProperties } from "react";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import type { FrameCoord } from "./brocantePanoramaLayout";

interface BrocanteFrameProps {
  brocanteId: string;
  nom: string;
  coord: FrameCoord;
  selected: boolean;
  debloquee: boolean;
  onSelect: (id: string) => void;
}

const frameOuter = (coord: FrameCoord, selected: boolean): CSSProperties => ({
  position: "absolute",
  left: coord.left,
  top: coord.top,
  width: coord.width,
  height: coord.height,
  padding: 0,
  // Si un cadre bois est utilisé, on supprime la bordure CSS (le bois la
  // remplace) ; sinon, bordure laiton classique.
  border: coord.cadreIndex
    ? "none"
    : selected
      ? "3px solid var(--brass-300)"
      : "2px solid var(--brass-700)",
  background: coord.cadreIndex ? "transparent" : "var(--paper-200)",
  boxShadow: coord.cadreIndex
    ? selected
      ? "0 0 18px 4px rgba(220,170,60,0.55), 0 6px 14px rgba(40,25,5,0.25)"
      : "0 4px 10px rgba(40,25,5,0.25)"
    : selected
      ? "0 0 0 2px var(--brass-500), 0 0 18px 4px rgba(220,170,60,0.55), 0 6px 14px rgba(40,25,5,0.25)"
      : "inset 0 0 0 2px var(--paper-100), 0 4px 10px rgba(40,25,5,0.25)",
  overflow: "visible",
  cursor: "pointer",
  opacity: selected ? 1 : 0.92,
  transition: "box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease",
});

const imgClipped: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

const fallbackStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

export function BrocanteFrame({
  brocanteId,
  nom,
  coord,
  selected,
  debloquee,
  onSelect,
}: BrocanteFrameProps) {
  const imageUrl = getBrocanteImageUrl(brocanteId);
  return (
    <button
      type="button"
      onClick={() => onSelect(brocanteId)}
      aria-label={nom}
      aria-pressed={selected}
      aria-disabled={!debloquee}
      style={frameOuter(coord, selected)}
    >
      <div style={imgClipped}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 600px) 20vw, 200px"
            style={{
              objectFit: "cover",
              filter: debloquee ? undefined : "grayscale(1) brightness(0.85)",
            }}
          />
        ) : (
          <div style={fallbackStyle}>
            <Store size={32} strokeWidth={1.2} color="var(--brass-100)" />
          </div>
        )}
      </div>
      {coord.cadreIndex && (
        <img
          src={`/cadres/cadre-${coord.cadreIndex}.webp`}
          alt=""
          style={overlayStyle}
          draggable={false}
        />
      )}
    </button>
  );
}
