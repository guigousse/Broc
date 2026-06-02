"use client";

import { useQgObjet } from "./dev/QgEditContext";

export function QgGramophone() {
  const { left, bottom, width } = useQgObjet("gramophone");
  return (
    <div
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        pointerEvents: "none",
        opacity: 0.95,
      }}
      aria-hidden
    >
      <img
        src="/qg/gramophone.png"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      />
    </div>
  );
}
