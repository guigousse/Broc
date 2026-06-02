"use client";

import { useQgObjet } from "./dev/QgEditContext";

export function QgPortemanteau() {
  const { left, bottom, width } = useQgObjet("portemanteau");
  return (
    <div
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <img
        src="/qg/portemanteau.png"
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
