"use client";

import { type CSSProperties } from "react";
import { GRAND_PERE_PORTRAITS } from "@/data/dialogues";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Pastille du grand-père, fixe en bas à gauche de l'écran (hors panorama).
 * N'apparaît que lorsqu'il a quelque chose à dire (bulle « ! ») ; le tap
 * ouvre le dialogue. SP2 : les chapitres de la trame s'accrochent ici.
 */

const wrap: CSSProperties = {
  position: "fixed",
  left: 12,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 12px)",
  zIndex: 40,
  width: 56,
  height: 56,
  padding: 0,
  borderRadius: "50%",
  border: "2px solid #b89c5e",
  background: "#e7d6a8",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
  WebkitTapHighlightColor: "transparent",
};

const portrait: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  display: "block",
};

const bulle: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
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

export function GrandPereBadge({
  visible,
  onTap,
}: {
  visible: boolean;
  onTap: () => void;
}) {
  const { d } = useLangue();
  if (!visible) return null;
  return (
    <button type="button" style={wrap} onClick={onTap} aria-label={d.qg.grandPere}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={GRAND_PERE_PORTRAITS.souriant} alt="" draggable={false} style={portrait} />
      <span style={bulle} aria-hidden>
        !
      </span>
    </button>
  );
}
