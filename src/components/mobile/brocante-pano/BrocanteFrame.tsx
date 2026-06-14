"use client";

import Image from "next/image";
import { Store } from "lucide-react";
import type { CSSProperties } from "react";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import type { FrameCoord } from "./brocantePanoramaLayout";
import { useBrocanteFramesEdit } from "./BrocanteFramesEditContext";

interface BrocanteFrameProps {
  brocanteId: string;
  nom: string;
  coord: FrameCoord;
  selected: boolean;
  debloquee: boolean;
  onSelect: (id: string) => void;
}

const buttonReset: CSSProperties = {
  padding: 0,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const frameOuter = (coord: FrameCoord, selected: boolean): CSSProperties => ({
  ...buttonReset,
  position: "absolute",
  left: coord.left,
  top: coord.top,
  width: coord.width,
  height: coord.height,
  border: selected
    ? "3px solid var(--brass-300)"
    : "2px solid var(--brass-700)",
  background: "var(--paper-200)",
  boxShadow: selected
    ? "0 0 0 2px var(--brass-500), 0 0 18px 4px rgba(220,170,60,0.55), 0 6px 14px rgba(40,25,5,0.25)"
    : "inset 0 0 0 2px var(--paper-100), 0 4px 10px rgba(40,25,5,0.25)",
  overflow: "hidden",
  opacity: selected ? 1 : 0.92,
  transition: "box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease",
});

const imgWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

const fallbackStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
};

/**
 * Zoom appliqué à la peinture à l'intérieur du cadre. Combiné à
 * `overflow: hidden` sur le cadre, on agrandit la peinture et on clippe
 * ce qui déborde — la peinture occupe plus de surface visible.
 */
const PAINTING_ZOOM = 1.4;

const zoomedImageStyle = (debloquee: boolean): CSSProperties => ({
  objectFit: "cover",
  transform: `scale(${PAINTING_ZOOM})`,
  transformOrigin: "center center",
  filter: debloquee ? undefined : "grayscale(1) brightness(0.85)",
});

export function BrocanteFrame({
  brocanteId,
  nom,
  coord,
  selected,
  debloquee,
  onSelect,
}: BrocanteFrameProps) {
  const imageUrl = getBrocanteImageUrl(brocanteId);
  const { enabled: editing } = useBrocanteFramesEdit();
  // En mode édition, on rend le bouton inerte pour laisser les pointer
  // events filer vers l'overlay d'édition (poignées / coins).
  const onClickHandler = editing ? undefined : () => onSelect(brocanteId);
  const pointerEvents: CSSProperties["pointerEvents"] = editing ? "none" : "auto";

  return (
    <button
      type="button"
      onClick={onClickHandler}
      aria-label={nom}
      aria-pressed={selected}
      aria-disabled={!debloquee}
      style={{ ...frameOuter(coord, selected), pointerEvents }}
    >
      <div style={imgWrap}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 600px) 20vw, 200px"
            style={zoomedImageStyle(debloquee)}
          />
        ) : (
          <div style={fallbackStyle}>
            <Store size={32} strokeWidth={1.2} color="var(--brass-100)" />
          </div>
        )}
      </div>
    </button>
  );
}
