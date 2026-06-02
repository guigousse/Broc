"use client";

import { useQgObjet } from "./dev/QgEditContext";

interface QgGramophoneProps {
  onTap: () => void;
}

export function QgGramophone({ onTap }: QgGramophoneProps) {
  const { left, bottom, width } = useQgObjet("gramophone");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Gramophone — choisir un vinyle"
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        opacity: 0.95,
      }}
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
    </button>
  );
}
