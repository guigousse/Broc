"use client";

import type { ReactNode } from "react";
import type { CategorieObjet, EtatObjet } from "@/types/game";

interface FrameItemProps {
  categorie: CategorieObjet;
  titre: string;
  prix?: number | null;
  etat: EtatObjet;
  size?: number;
  children?: ReactNode;
}

const W = 240;
const H = 280;
const R = 38;
const INSET = 8;
const STRIP_TOP = H - 64;
const IMG_TOP = 20;
const IMG_LEFT = 20;
const IMG_RIGHT = W - 20;
const IMG_BOTTOM = STRIP_TOP - 4;

const outerPath = [
  `M 3 3`,
  `L ${W - 3} 3`,
  `L ${W - 3} ${H - 3 - R}`,
  `A ${R} ${R} 0 0 1 ${W - 3 - R} ${H - 3}`,
  `L ${R + 3} ${H - 3}`,
  `A ${R} ${R} 0 0 1 3 ${H - 3 - R}`,
  `Z`,
].join(" ");

const innerR = R - 4;
const innerPath = [
  `M ${INSET} ${INSET}`,
  `L ${W - INSET} ${INSET}`,
  `L ${W - INSET} ${H - INSET - innerR}`,
  `A ${innerR} ${innerR} 0 0 1 ${W - INSET - innerR} ${H - INSET}`,
  `L ${INSET + innerR} ${H - INSET}`,
  `A ${innerR} ${innerR} 0 0 1 ${INSET} ${H - INSET - innerR}`,
  `Z`,
].join(" ");

function CategorieGlyph({ categorie }: { categorie: CategorieObjet }) {
  const stroke = "var(--brass-700)";
  switch (categorie) {
    case "Musique":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1" strokeLinecap="square">
          <circle cx="0" cy="0" r="9" />
          <circle cx="0" cy="0" r="5.5" />
          <circle cx="0" cy="0" r="1.8" fill={stroke} />
        </g>
      );
    default:
      return (
        <g fill="none" stroke={stroke} strokeWidth="1">
          <polygon points="0,-9 9,0 0,9 -9,0" />
          <polygon points="0,-4 4,0 0,4 -4,0" />
        </g>
      );
  }
}

export function FrameItem({
  categorie,
  titre,
  prix,
  etat,
  size = 240,
  children,
}: FrameItemProps) {
  const stripCenterLeft = (R + INSET + 4) / W;
  const stripCenterRight = (R + INSET + 4) / W;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        aspectRatio: `${W} / ${H}`,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Paper fill */}
        <path d={outerPath} fill="var(--paper-200)" />

        {/* Outer brass border */}
        <path
          d={outerPath}
          fill="none"
          stroke="var(--brass-700)"
          strokeWidth="1.6"
          strokeLinejoin="miter"
        />

        {/* Inner thin brass rule */}
        <path
          d={innerPath}
          fill="none"
          stroke="var(--brass-500)"
          strokeWidth="0.6"
        />

        {/* Image area background */}
        <rect
          x={IMG_LEFT}
          y={IMG_TOP}
          width={IMG_RIGHT - IMG_LEFT}
          height={IMG_BOTTOM - IMG_TOP}
          fill="var(--paper-100)"
          stroke="var(--brass-500)"
          strokeWidth="0.6"
        />

        {/* Horizontal rule above title strip */}
        <line
          x1={INSET + 4}
          y1={STRIP_TOP}
          x2={W - INSET - 4}
          y2={STRIP_TOP}
          stroke="var(--brass-700)"
          strokeWidth="0.9"
        />
        <line
          x1={INSET + 4}
          y1={STRIP_TOP + 3}
          x2={W - INSET - 4}
          y2={STRIP_TOP + 3}
          stroke="var(--brass-500)"
          strokeWidth="0.4"
        />

        {/* Vertical separators framing the title */}
        <line
          x1={R + INSET + 4}
          y1={STRIP_TOP + 6}
          x2={R + INSET + 4}
          y2={H - INSET - 6}
          stroke="var(--brass-500)"
          strokeWidth="0.5"
        />
        <line
          x1={W - R - INSET - 4}
          y1={STRIP_TOP + 6}
          x2={W - R - INSET - 4}
          y2={H - INSET - 6}
          stroke="var(--brass-500)"
          strokeWidth="0.5"
        />

        {/* Top corner ornaments (left + right) */}
        <g stroke="var(--brass-500)" strokeWidth="0.9" fill="none" strokeLinecap="square">
          <path d="M 14 28 L 14 14 L 28 14" />
          <path d="M 19 23 L 19 19 L 23 19" />
        </g>
        <g
          stroke="var(--brass-500)"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="square"
          transform={`translate(${W} 0) scale(-1 1)`}
        >
          <path d="M 14 28 L 14 14 L 28 14" />
          <path d="M 19 23 L 19 19 L 23 19" />
        </g>

        {/* Category motif — small Art Déco emblem under top border */}
        <g transform={`translate(${W / 2} ${IMG_TOP - 6})`}>
          <line
            x1="-30"
            y1="0"
            x2="-14"
            y2="0"
            stroke="var(--brass-500)"
            strokeWidth="0.5"
          />
          <line
            x1="14"
            y1="0"
            x2="30"
            y2="0"
            stroke="var(--brass-500)"
            strokeWidth="0.5"
          />
          <CategorieGlyph categorie={categorie} />
        </g>

        {/* Subtle arc accents inside the rounded badges */}
        <path
          d={`M ${INSET + 6} ${H - INSET - innerR + 2} A ${innerR - 4} ${innerR - 4} 0 0 0 ${INSET + innerR - 2} ${H - INSET - 6}`}
          fill="none"
          stroke="var(--brass-500)"
          strokeWidth="0.5"
        />
        <path
          d={`M ${W - INSET - innerR + 2} ${H - INSET - 6} A ${innerR - 4} ${innerR - 4} 0 0 0 ${W - INSET - 6} ${H - INSET - innerR + 2}`}
          fill="none"
          stroke="var(--brass-500)"
          strokeWidth="0.5"
        />
      </svg>

      {/* Image slot (children == future <img>) */}
      <div
        style={{
          position: "absolute",
          left: `${(IMG_LEFT / W) * 100}%`,
          top: `${(IMG_TOP / H) * 100}%`,
          width: `${((IMG_RIGHT - IMG_LEFT) / W) * 100}%`,
          height: `${((IMG_BOTTOM - IMG_TOP) / H) * 100}%`,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {children ?? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              opacity: 0.4,
            }}
          >
            — image —
          </span>
        )}
      </div>

      {/* État (bottom-left arc area) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: `${(STRIP_TOP / H) * 100}%`,
          width: `${stripCenterLeft * 100}%`,
          bottom: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 7.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          textAlign: "center",
          padding: "0 6px 6px",
          lineHeight: 1.05,
        }}
      >
        {etat}
      </div>

      {/* Titre (bottom-center) */}
      <div
        style={{
          position: "absolute",
          left: `${stripCenterLeft * 100}%`,
          right: `${stripCenterRight * 100}%`,
          top: `${(STRIP_TOP / H) * 100}%`,
          bottom: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-display)",
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          textAlign: "center",
          padding: "0 8px",
          lineHeight: 1.15,
          overflow: "hidden",
        }}
      >
        {titre}
      </div>

      {/* Prix (bottom-right arc area) */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: `${(STRIP_TOP / H) * 100}%`,
          width: `${stripCenterRight * 100}%`,
          bottom: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-display)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "var(--vermillion-600)",
          textAlign: "center",
          padding: "0 6px 6px",
          fontWeight: 600,
        }}
      >
        {prix != null ? `${prix}€` : "—"}
      </div>
    </div>
  );
}
