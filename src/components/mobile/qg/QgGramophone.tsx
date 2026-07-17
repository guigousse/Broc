"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgGramophoneProps {
  onTap: () => void;
  /** Mini-tuto vinyles : main pointeuse sur le gramophone. */
  guide?: boolean;
}

export function QgGramophone({ onTap, guide = false }: QgGramophoneProps) {
  const style = useQgObjetStyle("gramophone");
  const { d } = useLangue();
  return (
    <button
      className={guide ? "tuto-main" : undefined}
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
