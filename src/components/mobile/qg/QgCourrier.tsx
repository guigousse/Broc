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
  const n = Math.min(nbNonLus, 3);
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${nbNonLus} lettre${nbNonLus > 1 ? "s" : ""} non lue${
        nbNonLus > 1 ? "s" : ""
      }`}
      style={wrap(nbNonLus)}
    >
      {Array.from({ length: n }).map((_, i) => (
        <img
          key={i}
          src="/qg/lettre.png"
          alt=""
          draggable={false}
          style={{
            ...letterBase,
            transform: `translateX(${(i - 1) * 18}%) rotate(${(i - 1) * 6}deg)`,
            zIndex: i,
          }}
        />
      ))}
    </button>
  );
}
