"use client";

import { qgObjetStyle } from "./QgScene";

interface QgCarnetProps {
  onTap: () => void;
}

export function QgCarnet({ onTap }: QgCarnetProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Carnet — dernières sessions"
      style={qgObjetStyle("carnet")}
    >
      <img
        src="/qg/carnet.png"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
