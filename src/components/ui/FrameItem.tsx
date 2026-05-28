"use client";

import type { ReactNode } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CategorieObjet } from "@/types/game";

interface FrameItemProps {
  categorie: CategorieObjet;
  titre: string;
  size?: number;
  children?: ReactNode;
}

const W = 240;
const H = 320;
const TITRE_STRIP = 44;
const MEDAL_R = 26;
const MEDAL_CY = H - 14;
const IMG_TOP = TITRE_STRIP + 8;
const IMG_BOTTOM = H - 20;
const IMG_LEFT = 14;
const IMG_RIGHT = W - 14;

export function FrameItem({
  categorie,
  titre,
  size = 240,
  children,
}: FrameItemProps) {
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
        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          fill="var(--paper-200)"
        />

        {/* Outer brass border */}
        <rect
          x="2"
          y="2"
          width={W - 4}
          height={H - 4}
          fill="none"
          stroke="var(--brass-700)"
          strokeWidth="1.6"
        />

        {/* Inner thin brass rule */}
        <rect
          x="8"
          y="8"
          width={W - 16}
          height={H - 16}
          fill="none"
          stroke="var(--brass-500)"
          strokeWidth="0.6"
        />

        {/* Titre strip separator */}
        <line
          x1="12"
          y1={TITRE_STRIP}
          x2={W - 12}
          y2={TITRE_STRIP}
          stroke="var(--brass-700)"
          strokeWidth="1"
        />
        <line
          x1="12"
          y1={TITRE_STRIP + 3}
          x2={W - 12}
          y2={TITRE_STRIP + 3}
          stroke="var(--brass-500)"
          strokeWidth="0.4"
        />

        {/* Small chevron flourishes on title strip ends */}
        <g
          stroke="var(--brass-700)"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="square"
        >
          <path d={`M 18 ${TITRE_STRIP / 2 - 4} L 22 ${TITRE_STRIP / 2} L 18 ${TITRE_STRIP / 2 + 4}`} />
          <path d={`M ${W - 18} ${TITRE_STRIP / 2 - 4} L ${W - 22} ${TITRE_STRIP / 2} L ${W - 18} ${TITRE_STRIP / 2 + 4}`} />
        </g>

        {/* Image area background */}
        <rect
          x={IMG_LEFT}
          y={IMG_TOP}
          width={IMG_RIGHT - IMG_LEFT}
          height={IMG_BOTTOM - IMG_TOP}
          fill="var(--paper-100)"
          stroke="var(--brass-500)"
          strokeWidth="0.5"
        />

        {/* Top corner ornaments (above title strip) */}
        <g stroke="var(--brass-500)" strokeWidth="0.9" fill="none" strokeLinecap="square">
          <path d="M 14 26 L 14 14 L 26 14" />
        </g>
        <g
          stroke="var(--brass-500)"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="square"
          transform={`translate(${W} 0) scale(-1 1)`}
        >
          <path d="M 14 26 L 14 14 L 26 14" />
        </g>

        {/* Medallion outer ring — straddling bottom border */}
        <circle
          cx={W / 2}
          cy={MEDAL_CY}
          r={MEDAL_R + 4}
          fill="var(--paper-200)"
          stroke="var(--brass-700)"
          strokeWidth="1.4"
        />
        <circle
          cx={W / 2}
          cy={MEDAL_CY}
          r={MEDAL_R}
          fill="var(--paper-100)"
          stroke="var(--brass-500)"
          strokeWidth="0.6"
        />
      </svg>

      {/* Titre (top strip) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: `${(TITRE_STRIP / H) * 100}%`,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-display)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          textAlign: "center",
          padding: "0 32px",
          lineHeight: 1.15,
          overflow: "hidden",
        }}
      >
        {titre}
      </div>

      {/* Image slot */}
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

      {/* Medallion icon overlay */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${(MEDAL_CY / H) * 100}%`,
          transform: "translate(-50%, -50%)",
          display: "grid",
          placeItems: "center",
          width: MEDAL_R * 1.6,
          height: MEDAL_R * 1.6,
        }}
      >
        <CategorieIcon
          categorie={categorie}
          size={26}
          strokeWidth={1.2}
          color="var(--forest-800)"
        />
      </div>
    </div>
  );
}
