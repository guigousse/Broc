"use client";

import type { CSSProperties } from "react";
import { useQgObjet } from "./dev/QgEditContext";

interface QgCourrierProps {
  nbNonLus: number;
  onTap: () => void;
}

const letterBase: CSSProperties = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: "auto",
  display: "block",
};

export function QgCourrier({ nbNonLus, onTap }: QgCourrierProps) {
  const { left, bottom, width } = useQgObjet("courrier");
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
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: nbNonLus > 0 ? "pointer" : "default",
        pointerEvents: nbNonLus > 0 ? "auto" : "none",
        opacity: nbNonLus > 0 ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
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
