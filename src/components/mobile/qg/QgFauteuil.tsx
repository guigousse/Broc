"use client";

import { qgObjetStyle } from "./QgScene";

interface QgFauteuilProps {
  onTap: () => void;
}

export function QgFauteuil({ onTap }: QgFauteuilProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Fauteuil — passer la journée"
      style={qgObjetStyle("fauteuil")}
    >
      <img
        src="/qg/fauteuil.png"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
