"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { QG_LAYOUT, type QgObjetKey } from "./layout";
import { useQgObjet, useQgEditContext } from "./dev/QgEditContext";
import { QgEditOverlay } from "./dev/QgEditOverlay";

interface QgSceneProps {
  /** Objets interactifs (composants `Qg*`) positionnés par-dessus le fond. */
  children: ReactNode;
}

// La scène a un aspect fixe = aspect du fond. Hauteur en vw pour rester
// proportionnelle à la largeur (et donc ancrer les objets à l'image, pas au
// viewport variable). Sur petit écran, le bas dépasse hors du QgPanorama
// qui le clippe (overflow-y: hidden) ; les coordonnées restent cohérentes.
const wrapStyle: CSSProperties = {
  position: "relative",
  width: `${QG_LAYOUT.panoramaWidth}vw`,
  height: `calc(${QG_LAYOUT.panoramaWidth}vw * ${QG_LAYOUT.panoramaAspect.h} / ${QG_LAYOUT.panoramaAspect.w})`,
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
  const ctx = useQgEditContext();
  return (
    <div style={wrapStyle} aria-label="Décor du QG" data-qg-scene="1">
      <Image
        src="/qg/fond-cabinet.png"
        alt=""
        fill
        sizes={`${QG_LAYOUT.panoramaWidth}vw`}
        priority
        draggable={false}
        style={layerStyle(1)}
      />
      <div style={objectsLayer}>
        {children}
        {ctx?.enabled && <QgEditOverlay />}
      </div>
    </div>
  );
}

/** Hook pour positionner un objet à ses coordonnées effectives (base + override). */
export function useQgObjetStyle(key: QgObjetKey): CSSProperties {
  const { left, bottom, width } = useQgObjet(key);
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
