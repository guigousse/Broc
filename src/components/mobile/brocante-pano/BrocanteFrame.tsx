"use client";

import Image from "next/image";
import { Store } from "lucide-react";
import type { CSSProperties } from "react";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import type { FrameCoord } from "./brocantePanoramaLayout";
import { CADRE_HOLES } from "./cadreHoles.generated";
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
  border: "none",
  background: "transparent",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const frameOuter = (
  coord: FrameCoord,
  selected: boolean,
  cadreAspect: number,
): CSSProperties => ({
  ...buttonReset,
  position: "absolute",
  left: coord.left,
  top: coord.top,
  width: coord.width,
  // Pas de `height` : on laisse `aspect-ratio` calculer la hauteur pour
  // que le cadre garde ses proportions naturelles (pas de déformation).
  aspectRatio: String(cadreAspect),
  overflow: "visible",
  opacity: selected ? 1 : 0.94,
  filter: selected
    ? "drop-shadow(0 0 12px rgba(220,170,60,0.55)) drop-shadow(0 4px 8px rgba(40,25,5,0.35))"
    : "drop-shadow(0 4px 6px rgba(40,25,5,0.35))",
  transition: "opacity 200ms ease, filter 200ms ease",
});

const cadreImgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 2,
  // Étire le bois pour qu'il remplisse exactement le slot — l'utilisateur
  // peut ajuster width/height via l'outil dev (?cadreedit=1) pour conserver
  // l'aspect naturel du cadre s'il le souhaite.
  objectFit: "fill",
};

const fallbackStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
};

// Style fallback pour les tiers SANS cadre bois (laiton CSS).
const brassFrameOuter = (coord: FrameCoord, selected: boolean): CSSProperties => ({
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

const brassImgWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

/**
 * Zoom appliqué à la peinture à l'intérieur du cadre. La combinaison
 * `object-fit: cover` + `transform: scale()` agrandit l'image et le wrapper
 * (`overflow: hidden`) clippe ce qui déborde — la peinture occupe plus de
 * surface visible dans le cadre.
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
  // Quand on édite, on désactive le click handler pour ne pas voler les
  // pointer events de l'overlay d'édition (poignées de déplacement / coins).
  const onClickHandler = editing ? undefined : () => onSelect(brocanteId);
  const pointerEvents: CSSProperties["pointerEvents"] = editing ? "none" : "auto";

  // Cas SANS cadre bois (tier 2/3/4 — bordure laiton CSS).
  if (!coord.cadreIndex) {
    return (
      <button
        type="button"
        onClick={onClickHandler}
        aria-label={nom}
        aria-pressed={selected}
        aria-disabled={!debloquee}
        style={{ ...brassFrameOuter(coord, selected), pointerEvents }}
      >
        <div style={brassImgWrap}>
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

  // Cas AVEC cadre bois : la peinture est positionnée EXACTEMENT dans le
  // trou intérieur du cadre (mesuré par `scripts/measure-cadres.mjs`).
  // `overflow: hidden` sur le conteneur de peinture garantit qu'aucun
  // pixel ne déborde dans le bois.
  const hole = CADRE_HOLES[coord.cadreIndex];
  const paintingWrapStyle: CSSProperties = {
    position: "absolute",
    left: `${hole.left}%`,
    top: `${hole.top}%`,
    width: `${hole.width}%`,
    height: `${hole.height}%`,
    overflow: "hidden",
    zIndex: 1,
  };

  return (
    <button
      type="button"
      onClick={onClickHandler}
      aria-label={nom}
      aria-pressed={selected}
      aria-disabled={!debloquee}
      style={{ ...frameOuter(coord, selected, hole.cadreAspect), pointerEvents }}
    >
      {/* Peinture clipée dans le trou + zoom 1.4× */}
      <div style={paintingWrapStyle}>
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
      {/* Cadre bois en surcouche */}
      <img
        src={`/cadres/cadre-${coord.cadreIndex}.webp`}
        alt=""
        style={cadreImgStyle}
        draggable={false}
      />
    </button>
  );
}
