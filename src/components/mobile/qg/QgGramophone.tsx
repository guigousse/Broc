"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgGramophoneProps {
  onTap: () => void;
}

export function QgGramophone({ onTap }: QgGramophoneProps) {
  const style = useQgObjetStyle("gramophone");
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={d.qg.gramophone}
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
