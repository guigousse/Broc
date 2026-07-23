"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgCarnetProps {
  onTap: () => void;
  /** Mini-tuto carnet : main au-dessus du livre, doigt pointé vers lui. */
  tutoMain?: boolean;
}

export function QgCarnet({ onTap, tutoMain = false }: QgCarnetProps) {
  const style = useQgObjetStyle("carnet");
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={d.qg.carnetSessions}
      className={tutoMain ? "tuto-main tuto-main-haut" : undefined}
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
