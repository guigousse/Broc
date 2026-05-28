"use client";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getRarityColors } from "@/lib/rarityColors";
import type { CategorieObjet, EtatObjet, Rarete } from "@/types/game";

interface FrameItemProps {
  categorie: CategorieObjet;
  titre: string;
  rarete: Rarete;
  unique?: boolean;
  /** État affiché en étoiles. Si omis, aucune étoile n'est rendue. */
  etat?: EtatObjet;
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
  const colors = getRarityColors(rarete, unique);
  const filledStars = etat ? etoileCount(etat) : 0;

  // Sunburst rays positions for prestige >= 2
  const sunburstDegrees = [0, 30, 60, 120, 150, 180, 210, 240, 300, 330];

  return (
    <div
      style={{
        position: "relative",
        width: size,
        aspectRatio: `${W} / ${H}`,
        filter:
          colors.prestige >= 3
            ? `drop-shadow(0 0 18px ${colors.shadow}) drop-shadow(0 14px 22px rgba(0,0,0,0.35))`
            : `drop-shadow(0 14px 22px ${colors.shadow}) drop-shadow(0 4px 6px rgba(0,0,0,0.25))`,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Halo extérieur pour Unique (prestige 3) */}
        {colors.prestige >= 3 && (
          <rect
            x="-3"
            y="-3"
            width={W + 6}
            height={H + 6}
            fill="none"
            stroke={colors.accent}
            strokeWidth="0.8"
            opacity="0.6"
          />
        )}

        {/* Fond papier */}
        <rect x="0" y="0" width={W} height={H} fill="var(--paper-100)" />

        {/* Lavis radial coloré subtil (légendaire et unique) */}
        {colors.prestige >= 2 && (
          <>
            <defs>
              <radialGradient
                id={`bgWash-${colors.label}`}
                cx="50%"
                cy="50%"
                r="60%"
              >
                <stop offset="0%" stopColor={colors.accent} stopOpacity="0.18" />
                <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect
              x="0"
              y="0"
              width={W}
              height={H}
              fill={`url(#bgWash-${colors.label})`}
            />
          </>
        )}

        {/* Bordure extérieure */}
        <rect
          x="2"
          y="2"
          width={W - 4}
          height={H - 4}
          fill="none"
          stroke={colors.outer}
          strokeWidth={colors.prestige >= 2 ? 2.4 : 2}
        />

        {/* Filet intérieur */}
        <rect
          x="8"
          y="8"
          width={W - 16}
          height={H - 16}
          fill="none"
          stroke={colors.inner}
          strokeWidth="0.7"
        />

        {/* Filet supplémentaire pour prestige >= 2 */}
        {colors.prestige >= 2 && (
          <rect
            x="11"
            y="11"
            width={W - 22}
            height={H - 22}
            fill="none"
            stroke={colors.accent}
            strokeWidth="0.4"
            opacity="0.85"
          />
        )}

        {/* Bandeau titre : double trait */}
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
          strokeWidth="0.5"
        />

        {/* Chevrons bandeau titre */}
        <g
          stroke={colors.outer}
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="square"
        >
          <path d={`M 18 ${TITRE_STRIP / 2 - 4} L 22 ${TITRE_STRIP / 2} L 18 ${TITRE_STRIP / 2 + 4}`} />
          <path d={`M ${W - 18} ${TITRE_STRIP / 2 - 4} L ${W - 22} ${TITRE_STRIP / 2} L ${W - 18} ${TITRE_STRIP / 2 + 4}`} />
        </g>

        {/* Zone image */}
        <rect
          x={IMG_LEFT}
          y={IMG_TOP}
          width={IMG_RIGHT - IMG_LEFT}
          height={IMG_BOTTOM - IMG_TOP}
          fill="var(--paper-100)"
          stroke={colors.inner}
          strokeWidth="0.5"
        />

        {/* Ornements coins haut */}
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

        {/* Ornements coins bas — prestige >= 1 (rare et +) */}
        {colors.prestige >= 1 && (
          <>
            <g
              stroke={colors.inner}
              strokeWidth="1"
              fill="none"
              strokeLinecap="square"
              transform={`translate(0 ${H}) scale(1 -1)`}
            >
              <path d="M 14 26 L 14 14 L 26 14" />
            </g>
            <g
              stroke={colors.inner}
              strokeWidth="1"
              fill="none"
              strokeLinecap="square"
              transform={`translate(${W} ${H}) scale(-1 -1)`}
            >
              <path d="M 14 26 L 14 14 L 26 14" />
            </g>
          </>
        )}

        {/* Losanges décoratifs sur les milieux des côtés — prestige >= 2 */}
        {colors.prestige >= 2 && (
          <g fill={colors.outer}>
            <polygon
              points={`8,${H / 2 - 5} 13,${H / 2} 8,${H / 2 + 5} 3,${H / 2}`}
            />
            <polygon
              points={`${W - 8},${H / 2 - 5} ${W - 3},${H / 2} ${W - 8},${H / 2 + 5} ${W - 13},${H / 2}`}
            />
          </g>
        )}

        {/* Sunburst derrière médaillon — prestige >= 2 */}
        {colors.prestige >= 2 && (
          <g
            stroke={colors.accent}
            strokeWidth="0.7"
            opacity="0.85"
            transform={`translate(${W / 2} ${MEDAL_CY})`}
          >
            {sunburstDegrees.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={Math.cos(rad) * (MEDAL_R + 7)}
                  y1={Math.sin(rad) * (MEDAL_R + 7)}
                  x2={Math.cos(rad) * (MEDAL_R + 16)}
                  y2={Math.sin(rad) * (MEDAL_R + 16)}
                />
              );
            })}
          </g>
        )}

        {/* Médaillon */}
        <circle
          cx={W / 2}
          cy={MEDAL_CY}
          r={MEDAL_R + 4}
          fill="var(--paper-100)"
          stroke={colors.outer}
          strokeWidth={colors.prestige >= 2 ? 1.8 : 1.5}
        />
        <circle
          cx={W / 2}
          cy={MEDAL_CY}
          r={MEDAL_R}
          fill="var(--paper-100)"
          stroke={colors.inner}
          strokeWidth="0.7"
        />
        {colors.prestige >= 2 && (
          <circle
            cx={W / 2}
            cy={MEDAL_CY}
            r={MEDAL_R - 3}
            fill="none"
            stroke={colors.accent}
            strokeWidth="0.4"
          />
        )}
      </svg>

      {/* Titre (bandeau haut) — centré entre filet fin (y=8) et barre lourde (y=TITRE_STRIP) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${(8 / H) * 100}%`,
          height: `${((TITRE_STRIP - 8) / H) * 100}%`,
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

      {/* Slot image */}
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

      {/* Icône catégorie dans médaillon */}
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

      {/* Étoiles d'état — plaque blanche bordée, centrée sur l'arête basse */}
      {etat && (
      <div
        style={{
          position: "absolute",
          // Centre horizontal entre x=0 et x=(W/2 - MEDAL_R - 4), soit x = (W/2 - MEDAL_R - 4)/2
          left: `${(((W / 2 - MEDAL_R - 4) / 2) / W) * 100}%`,
          top: "100%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          gap: 3,
          padding: "5px 7px",
          background: "var(--paper-100)",
          border: `1.5px solid ${colors.outer}`,
          boxShadow:
            "0 6px 10px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.22)",
        }}
        aria-label={`État : ${etat}`}
      >
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            size={22}
            strokeWidth={1.8}
            fill={i < filledStars ? colors.outer : "var(--paper-100)"}
            color={colors.outer}
          />
        ))}
      </div>
      )}
    </div>
  );
}
