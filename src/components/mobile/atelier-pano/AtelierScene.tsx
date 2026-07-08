"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { ATELIER_LAYOUT, type AtelierObjetKey } from "./layout";

interface AtelierSceneProps {
  /** Objets interactifs positionnés par-dessus le fond. */
  children?: ReactNode;
}

const wrapStyle: CSSProperties = {
  position: "relative",
  width: `${ATELIER_LAYOUT.panoramaWidth}vw`,
  height: `calc(${ATELIER_LAYOUT.panoramaWidth}vw * ${ATELIER_LAYOUT.panoramaAspect.h} / ${ATELIER_LAYOUT.panoramaAspect.w})`,
  flexShrink: 0,
};

const layerStyle = (zIndex: number): CSSProperties => ({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  pointerEvents: "none",
  userSelect: "none",
  display: "block",
  zIndex,
});

const objectsLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  pointerEvents: "none",
};

export function AtelierScene({ children }: AtelierSceneProps) {
  const { d } = useLangue();
  return (
    <div style={wrapStyle} aria-label={d.qg.decorAtelier} data-atelier-scene="1">
      <img
        src="/atelier/fond-atelier.png"
        alt=""
        style={layerStyle(1)}
        draggable={false}
      />
      <div style={objectsLayer}>{children}</div>
    </div>
  );
}

/** Hook pour positionner un objet interactif sur la scène atelier. */
export function useAtelierObjetStyle(key: AtelierObjetKey): CSSProperties {
  const { left, bottom, width } = ATELIER_LAYOUT.objets[key];
  return {
    position: "absolute",
    left: `${left}vw`,
    bottom: `${bottom}%`,
    width: `${width}vw`,
    height: "auto",
    pointerEvents: "auto",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    padding: 0,
  };
}
