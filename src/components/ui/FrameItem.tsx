"use client";

import type { CSSProperties, ReactNode } from "react";
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
const H = 280;
const TITRE_STRIP = 44;
const MEDAL_R = 26;
const MEDAL_CY = H - 14;
// Zone image = pile à l'intérieur du filet fin, juste sous le bandeau titre.
const IMG_TOP = TITRE_STRIP + 3;
const IMG_BOTTOM = H - 8;
const IMG_LEFT = 8;
const IMG_RIGHT = W - 8;

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

const overlaySvgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  overflow: "visible",
};

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
      {/* ─── SVG arrière-plan : fond papier sous l'image ─── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Halo extérieur pour Unique */}
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

        {/* Fond papier (visible derrière l'image si transparente, et dans le bandeau titre) */}
        <rect x="0" y="0" width={W} height={H} fill="var(--paper-100)" />

        {/* Lavis radial subtil (Légendaire / Unique) — dans le bandeau titre uniquement
            puisque l'image couvre tout le reste */}
        {colors.prestige >= 2 && (
          <>
            <defs>
              <radialGradient
                id={`bgWash-${colors.label}`}
                cx="50%"
                cy="50%"
                r="60%"
              >
                <stop
                  offset="0%"
                  stopColor={colors.accent}
                  stopOpacity="0.22"
                />
                <stop
                  offset="100%"
                  stopColor={colors.accent}
                  stopOpacity="0"
                />
              </radialGradient>
            </defs>
            <rect
              x="0"
              y="0"
              width={W}
              height={TITRE_STRIP}
              fill={`url(#bgWash-${colors.label})`}
            />
          </>
        )}
      </svg>

      {/* ─── Slot image (HTML, entre les deux SVG) ─── */}
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

      {/* ─── SVG avant-plan : bordures, ornements, médaillon (au-dessus de l'image) ─── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={overlaySvgStyle}
      >
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

        {/* Bandeau titre : double trait continu (s'étend bord à bord) */}
        <line
          x1="2"
          y1={TITRE_STRIP}
          x2={W - 2}
          y2={TITRE_STRIP}
          stroke={colors.outer}
          strokeWidth="1"
        />
        <line
          x1="8"
          y1={TITRE_STRIP + 3}
          x2={W - 8}
          y2={TITRE_STRIP + 3}
          stroke={colors.inner}
          strokeWidth="0.5"
        />

        {/* Boucles Art Déco — coins supérieurs (quarts d'arc concentriques + point central) */}
        <g
          stroke={colors.inner}
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        >
          {/* Haut-gauche */}
          <path d="M 12 30 A 18 18 0 0 1 30 12" />
          <path d="M 16 22 A 6 6 0 0 1 22 16" />
        </g>
        <circle cx="19" cy="19" r="1.4" fill={colors.inner} />
        <g
          stroke={colors.inner}
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
          transform={`translate(${W} 0) scale(-1 1)`}
        >
          {/* Haut-droit (miroir) */}
          <path d="M 12 30 A 18 18 0 0 1 30 12" />
          <path d="M 16 22 A 6 6 0 0 1 22 16" />
        </g>
        <circle cx={W - 19} cy="19" r="1.4" fill={colors.inner} />

        {/* Ornements coins bas — prestige >= 1 */}
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

        {/* Médaillon (à plat sur l'image) */}
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

      {/* ─── Titre (bandeau haut) ─── */}
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
          pointerEvents: "none",
        }}
      >
        {titre}
      </div>

      {/* ─── Icône catégorie dans médaillon ─── */}
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
          pointerEvents: "none",
        }}
      >
        <CategorieIcon
          categorie={categorie}
          size={26}
          strokeWidth={1.2}
          color="var(--forest-800)"
        />
      </div>

      {/* ─── Étoiles d'état (plaque blanche bordée) ─── */}
      {etat && (
        <div
          style={{
            position: "absolute",
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
            pointerEvents: "none",
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
