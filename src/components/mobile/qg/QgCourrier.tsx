"use client";

import type { CSSProperties } from "react";
import { QG_LAYOUT } from "./layout";

interface QgCourrierProps {
  nbNonLus: number;
  onTap: () => void;
}

const wrap = (nb: number): CSSProperties => ({
  position: "absolute",
  left: `${QG_LAYOUT.objets.courrier.left}vw`,
  bottom: `${QG_LAYOUT.objets.courrier.bottom}%`,
  width: `${QG_LAYOUT.objets.courrier.width}vw`,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: nb > 0 ? "pointer" : "default",
  pointerEvents: nb > 0 ? "auto" : "none",
  opacity: nb > 0 ? 1 : 0,
  transition: "opacity 200ms ease",
});

const letterBase: CSSProperties = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: "auto",
  display: "block",
};

export function QgCourrier({ nbNonLus, onTap }: QgCourrierProps) {
  if (nbNonLus <= 0) return null;
  // 1 lettre → single envelope ; 2+ → pile multilettre.
  const src = nbNonLus === 1 ? "/qg/lettre.png" : "/qg/multilettre.png";
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${nbNonLus} lettre${nbNonLus > 1 ? "s" : ""} non lue${
        nbNonLus > 1 ? "s" : ""
      }`}
      style={wrap(nbNonLus)}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={letterBase}
      />
    </button>
  );
}
