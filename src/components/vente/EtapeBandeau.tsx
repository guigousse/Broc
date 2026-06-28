import type { CSSProperties, ReactNode } from "react";

/**
 * Texte d'étape du flux vente, dans un encadré Art Déco (même recette que la
 * description des brocantes : boîte papier + double filet laiton + ornements de
 * coin). Même police que le titre des brocantes (`--font-brocante-title`),
 * texte laiton. N'occupe aucune place dans le flux (le contenu / l'image remonte
 * sous le header) : chip flottant fixé juste sous le header.
 */
const wrap: CSSProperties = {
  position: "fixed",
  top: "calc(var(--mobile-header-h) + var(--safe-top) + 12px)",
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 40,
};

const chip: CSSProperties = {
  position: "relative",
  background: "rgba(245,239,225,0.95)",
  borderRadius: 4,
  // Double filet : extérieur brass-700 + intérieur brass-500 via shadow.
  border: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500), 0 6px 16px rgba(20,12,0,0.4)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  padding: "4px 26px 5px",
  // Même police que le titre des brocantes, en laiton.
  fontFamily: "var(--font-brocante-title)",
  fontWeight: 400,
  fontSize: 22,
  lineHeight: 1.15,
  color: "var(--brass-500)",
  textShadow: "0 1px 0 rgba(255,235,180,0.4), 0 1px 2px rgba(80,50,10,0.25)",
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
};

const ornamentBase: CSSProperties = {
  position: "absolute",
  width: 11,
  height: 11,
  pointerEvents: "none",
  color: "var(--brass-500)",
};

/** Ornement de coin Art Déco (motif "stairstep" + point), comme l'encadré des brocantes. */
function CornerOrnament({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const rotation = { tl: 0, tr: 90, br: 180, bl: 270 }[position];
  const placement: CSSProperties = {
    ...ornamentBase,
    ...(position === "tl" || position === "tr" ? { top: 3 } : { bottom: 3 }),
    ...(position === "tl" || position === "bl" ? { left: 3 } : { right: 3 }),
    transform: `rotate(${rotation}deg)`,
  };
  return (
    <svg viewBox="0 0 18 18" style={placement} aria-hidden>
      <path
        d="M2 16 L2 12 L6 12 L6 8 L10 8 L10 4 L16 4"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="2" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function EtapeBandeau({ children }: { children: ReactNode }) {
  return (
    <div style={wrap}>
      <span style={chip}>
        <CornerOrnament position="tl" />
        <CornerOrnament position="tr" />
        <CornerOrnament position="bl" />
        <CornerOrnament position="br" />
        {children}
      </span>
    </div>
  );
}
