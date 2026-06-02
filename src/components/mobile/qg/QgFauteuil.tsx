"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgFauteuilProps {
  onTap: () => void;
}

export function QgFauteuil({ onTap }: QgFauteuilProps) {
  const style = useQgObjetStyle("fauteuil");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Fauteuil — passer la journée"
      style={style}
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
