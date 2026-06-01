"use client";

import { qgObjetStyle } from "./QgScene";

interface QgPorteProps {
  onTap: () => void;
}

export function QgPorte({ onTap }: QgPorteProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Porte d'entrée"
      style={qgObjetStyle("porte")}
    >
      <img
        src="/qg/porte.png"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
