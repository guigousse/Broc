"use client";

import Image from "next/image";
import { Lock, Store } from "lucide-react";
import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import type { FrameCoord } from "./brocantePanoramaLayout";
import { useBrocanteFramesEdit } from "./BrocanteFramesEditContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomBrocante } from "@/lib/i18n/contenu";

interface BrocanteFrameProps {
  brocante: Brocante;
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
  // overflow:hidden pour cliper la peinture, mais on autorise le badge à
  // déborder en utilisant un wrapper interne + un badge en absolute hors clip.
  overflow: "visible",
  opacity: selected ? 1 : 0.92,
  transition: "box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease",
});

const paintingWrap: CSSProperties = {
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

const PAINTING_ZOOM = 1.4;

const zoomedImageStyle = (debloquee: boolean): CSSProperties => ({
  objectFit: "cover",
  transform: `scale(${PAINTING_ZOOM})`,
  transformOrigin: "center center",
  filter: debloquee ? undefined : "grayscale(1) brightness(0.7)",
});

// Cadenas centré (overlay) pour les brocantes verrouillées.
const lockOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  zIndex: 3,
};

const lockBubbleStyle: CSSProperties = {
  width: "44%",
  aspectRatio: "1 / 1",
  maxWidth: 56,
  borderRadius: "50%",
  background: "rgba(20,12,0,0.65)",
  border: "2px solid var(--brass-500)",
  display: "grid",
  placeItems: "center",
  boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
  color: "var(--brass-300)",
};

export function BrocanteFrame({
  brocante,
  coord,
  selected,
  debloquee,
  onSelect,
}: BrocanteFrameProps) {
  const imageUrl = getBrocanteImageUrl(brocante.id);
  const { locale } = useLangue();
  const { enabled: editing } = useBrocanteFramesEdit();
  const onClickHandler = editing ? undefined : () => onSelect(brocante.id);
  const pointerEvents: CSSProperties["pointerEvents"] = editing ? "none" : "auto";

  return (
    <button
      type="button"
      onClick={onClickHandler}
      aria-label={nomBrocante(brocante, locale)}
      aria-pressed={selected}
      aria-disabled={!debloquee}
      style={{ ...frameOuter(coord, selected), pointerEvents }}
    >
      <div style={paintingWrap}>
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
        {!debloquee && (
          <div style={lockOverlayStyle} aria-hidden>
            <div style={lockBubbleStyle}>
              <Lock size={20} strokeWidth={2.2} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
