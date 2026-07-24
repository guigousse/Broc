"use client";

import { useQgObjet } from "./dev/QgEditContext";
import { qgPct } from "./layout";

export function QgPortemanteau() {
  const { left, bottom, width } = useQgObjet("portemanteau");
  return (
    <div
      style={{
        position: "absolute",
        left: `${qgPct(left)}%`,
        bottom: `${bottom}%`,
        width: `${qgPct(width)}%`,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <img
        src="/qg/portemanteau.webp"
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
