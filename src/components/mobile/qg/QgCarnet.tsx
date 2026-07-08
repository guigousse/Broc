"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgCarnetProps {
  onTap: () => void;
}

export function QgCarnet({ onTap }: QgCarnetProps) {
  const style = useQgObjetStyle("carnet");
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={d.qg.carnetSessions}
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
