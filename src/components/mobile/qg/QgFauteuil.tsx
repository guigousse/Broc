"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgFauteuilProps {
  onTap: () => void;
  chat?: boolean;
}

export function QgFauteuil({ onTap, chat = false }: QgFauteuilProps) {
  const style = useQgObjetStyle("fauteuil");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={chat ? "Fauteuil occupé par un chat" : "Fauteuil — passer la journée"}
      style={style}
    >
      <img
        src={chat ? "/qg/fauteuilchat.webp" : "/qg/fauteuil.webp"}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
