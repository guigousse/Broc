"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgFauteuilProps {
  onTap: () => void;
  chat?: boolean;
}

export function QgFauteuil({ onTap, chat = false }: QgFauteuilProps) {
  const style = useQgObjetStyle("fauteuil");
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={chat ? d.qg.fauteuilChat : d.qg.fauteuilPasser}
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
