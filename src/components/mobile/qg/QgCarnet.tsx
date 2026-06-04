"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgCarnetProps {
  onTap: () => void;
}

export function QgCarnet({ onTap }: QgCarnetProps) {
  const style = useQgObjetStyle("carnet");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Carnet — dernières sessions"
      style={style}
    >
      <img
        src="/qg/carnet.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
