import type { CSSProperties } from "react";

/** Ornement de coin Art déco « stairstep » (partagé : carte brocante, certificat level up). */
export function CornerOrnament({
  position,
  inset = 6,
}: {
  position: "tl" | "tr" | "bl" | "br";
  inset?: number;
}) {
  const rotation = { tl: 0, tr: 90, br: 180, bl: 270 }[position];
  const placement: CSSProperties = {
    position: "absolute",
    width: 18,
    height: 18,
    pointerEvents: "none",
    color: "var(--brass-500)",
    ...(position === "tl" || position === "tr" ? { top: inset } : { bottom: inset }),
    ...(position === "tl" || position === "bl" ? { left: inset } : { right: inset }),
    transform: `rotate(${rotation}deg)`,
  };
  return (
    <svg viewBox="0 0 18 18" style={placement} aria-hidden>
      {/* Petit motif déco "stairstep" + point */}
      <path
        d="M2 16 L2 12 L6 12 L6 8 L10 8 L10 4 L16 4"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="2" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}
