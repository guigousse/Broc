"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgGramophoneProps {
  onTap: () => void;
}

export function QgGramophone({ onTap }: QgGramophoneProps) {
  const style = useQgObjetStyle("gramophone");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Gramophone — choisir un vinyle"
      style={style}
    >
      <img
        src="/qg/gramophone.webp"
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
