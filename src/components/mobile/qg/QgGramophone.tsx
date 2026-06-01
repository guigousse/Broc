"use client";

import type { CSSProperties } from "react";
import { QG_LAYOUT } from "./layout";

const wrap: CSSProperties = {
  position: "absolute",
  left: `${QG_LAYOUT.objets.gramophone.left}vw`,
  bottom: `${QG_LAYOUT.objets.gramophone.bottom}%`,
  width: `${QG_LAYOUT.objets.gramophone.width}vw`,
  pointerEvents: "none",
  opacity: 0.95,
};

export function QgGramophone() {
  return (
    <div style={wrap} aria-hidden>
      <img
        src="/qg/gramophone.png"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          transform: "scaleX(-1)", // pavillon vers la gauche (effet miroir)
        }}
      />
    </div>
  );
}
