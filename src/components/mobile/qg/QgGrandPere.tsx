"use client";

import { type CSSProperties } from "react";
import { useQgObjetStyle } from "@/components/mobile/qg/QgScene";
import { useLangue } from "@/lib/i18n/LangueContext";

interface QgGrandPereProps {
  /** Vrai quand un dialogue important attend (bulle « ! ») — SP2 : chapitres. */
  aDialogue: boolean;
  onTap: () => void;
}

const bulle: CSSProperties = {
  position: "absolute",
  top: -6,
  right: -2,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#f6ecd2",
  border: "2px solid #b89c5e",
  color: "#7a2e1d",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  display: "grid",
  placeItems: "center",
};

export function QgGrandPere({ aDialogue, onTap }: QgGrandPereProps) {
  const style = useQgObjetStyle("grandPere");
  const { d } = useLangue();
  return (
    <button type="button" style={style} onClick={onTap} aria-label={d.qg.grandPere}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/grand-pere-fauteuil.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      {aDialogue && (
        <span style={bulle} aria-hidden>
          !
        </span>
      )}
    </button>
  );
}
