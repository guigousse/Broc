"use client";

import type { CSSProperties, ReactNode } from "react";
import { QG_LAYOUT, type QgObjetKey } from "./layout";

interface QgSceneProps {
  /** Objets interactifs (composants `Qg*`) positionnés par-dessus le fond. */
  children: ReactNode;
}

const wrapStyle: CSSProperties = {
  position: "relative",
  width: `${QG_LAYOUT.panoramaWidth}vw`,
  height: "100%",
  flexShrink: 0,
};

const layerStyle = (zIndex: number): CSSProperties => ({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  // cover : l'image remplit toujours la largeur du panorama (pas de bandes
  // latérales). Si le conteneur est moins haut que l'image naturelle (16:9),
  // c'est le bas de l'image qui est rogné (object-position top).
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
  pointerEvents: "none", // chaque objet réactive son propre pointer-events
};

export function QgScene({ children }: QgSceneProps) {
  return (
    <div style={wrapStyle} aria-label="Décor du QG">
      <img
        src="/qg/fond-cabinet.png"
        alt=""
        style={layerStyle(1)}
        draggable={false}
      />
      <div style={objectsLayer}>{children}</div>
    </div>
  );
}

/** Helper pour positionner un objet à ses coordonnées du layout. */
export function qgObjetStyle(key: QgObjetKey): CSSProperties {
  const { left, bottom, width } = QG_LAYOUT.objets[key];
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
