"use client";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { CategorieObjet, EtatObjet, Rarete } from "@/types/game";

interface FrameItemProps {
  categorie: CategorieObjet;
  titre: string;
  rarete: Rarete;
  unique?: boolean;
  etat: EtatObjet;
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

interface FrameColors {
  outer: string;
  inner: string;
  shadow: string;
}

function getFrameColors(rarete: Rarete, unique: boolean): FrameColors {
  if (unique) {
    return {
      outer: "#4B8CB0",
      inner: "#7BBAD3",
      shadow: "rgba(75,140,176,0.42)",
    };
  }
  switch (rarete) {
    case "legendaire":
      return {
        outer: "#C99A1F",
        inner: "#E2B33D",
        shadow: "rgba(201,154,31,0.38)",
      };
    case "rare":
      return {
        outer: "#A07832",
        inner: "#C5A059",
        shadow: "rgba(160,120,50,0.32)",
      };
    case "commun":
    default:
      return {
        outer: "#7A5226",
        inner: "#A07346",
        shadow: "rgba(122,82,38,0.28)",
      };
  }
}

function etoileCount(etat: EtatObjet): number {
  switch (etat) {
    case "Mauvais":
      return 0;
    case "Bon":
      return 1;
    case "Très bon":
      return 2;
    case "Pristin état":
      return 3;
  }
}

export function FrameItem({
  categorie,
  titre,
  rarete,
  unique = false,
  etat,
  size = 240,
  children,
}: FrameItemProps) {
  const colors = getFrameColors(rarete, unique);
  const filledStars = etoileCount(etat);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        aspectRatio: `${W} / ${H}`,
        filter: `drop-shadow(0 14px 22px ${colors.shadow}) drop-shadow(0 4px 6px rgba(15,31,24,0.22))`,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Paper fill */}
        <rect x="0" y="0" width={W} height={H} fill="var(--paper-200)" />

        {/* Outer border */}
        <rect
          x="2"
          y="2"
          width={W - 4}
          height={H - 4}
          fill="none"
          stroke={colors.outer}
          strokeWidth="2"
        />

        {/* Inner thin rule */}
        <rect
          x="8"
          y="8"
          width={W - 16}
          height={H - 16}
          fill="none"
          stroke={colors.inner}
          strokeWidth="0.7"
        />

        {/* Title strip separator */}
        <line
          x1="12"
          y1={TITRE_STRIP}
          x2={W - 12}
          y2={TITRE_STRIP}
          stroke={colors.outer}
          strokeWidth="1"
        />
        <line
          x1="12"
          y1={TITRE_STRIP + 3}
          x2={W - 12}
          y2={TITRE_STRIP + 3}
          stroke={colors.inner}
          strokeWidth="0.4"
        />

        {/* Chevron flourishes on title strip ends */}
        <g
          stroke={colors.outer}
          strokeWidth="0.9"
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
          stroke={colors.inner}
          strokeWidth="0.5"
        />

        {/* Top corner ornaments */}
        <g
          stroke={colors.inner}
          strokeWidth="1"
          fill="none"
          strokeLinecap="square"
        >
          <path d="M 14 26 L 14 14 L 26 14" />
        </g>
        <g
          stroke={colors.inner}
          strokeWidth="1"
          fill="none"
          strokeLinecap="square"
          transform={`translate(${W} 0) scale(-1 1)`}
        >
          <path d="M 14 26 L 14 14 L 26 14" />
        </g>

        {/* Medallion */}
        <circle
          cx={W / 2}
          cy={MEDAL_CY}
          r={MEDAL_R + 4}
          fill="var(--paper-200)"
          stroke={colors.outer}
          strokeWidth="1.6"
        />
        <circle
          cx={W / 2}
          cy={MEDAL_CY}
          r={MEDAL_R}
          fill="var(--paper-100)"
          stroke={colors.inner}
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
              color: colors.outer,
              opacity: 0.45,
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

      {/* État stars — overlapping the cadre at bottom-left */}
      <div
        style={{
          position: "absolute",
          left: -6,
          bottom: 24,
          display: "flex",
          gap: 2,
          padding: "3px 6px",
          background: "var(--paper-100)",
          border: `1px solid ${colors.outer}`,
          boxShadow: "0 2px 4px rgba(15,31,24,0.2)",
        }}
        aria-label={`État : ${etat}`}
      >
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            size={11}
            strokeWidth={1.5}
            fill={i < filledStars ? colors.outer : "transparent"}
            color={colors.outer}
          />
        ))}
      </div>
    </div>
  );
}
