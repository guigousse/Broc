"use client";

import Image from "next/image";
import { Lock, Store } from "lucide-react";
import type { CSSProperties } from "react";
import type { Brocante } from "@/types/game";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import { estGrandeBraderie } from "@/lib/evenements";
import type { FrameCoord } from "./brocantePanoramaLayout";
import { useBrocanteFramesEdit } from "./BrocanteFramesEditContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomBrocante } from "@/lib/i18n/contenu";

interface BrocanteFrameProps {
  brocante: Brocante;
  coord: FrameCoord;
  selected: boolean;
  debloquee: boolean;
  /** Vente : bourse à thème incompatible avec le coffre actuel — même rendu
   *  qu'une brocante verrouillée (toile grise + cadenas), toujours cliquable
   *  pour que la carte explique « Musique uniquement ». */
  horsTheme?: boolean;
  onSelect: (id: string) => void;
  /** Tutoriel : main pointeuse sur ce cadre (miroir — le cadre tuto est près du bord gauche). */
  tutoMain?: boolean;
}

const buttonReset: CSSProperties = {
  padding: 0,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const frameOuter = (coord: FrameCoord, selected: boolean): CSSProperties => ({
  ...buttonReset,
  position: "absolute",
  left: coord.left,
  top: coord.top,
  width: coord.width,
  height: coord.height,
  // Cadre laiton épais : bord sombre extérieur, filet clair (arête éclairée),
  // puis le relief est donné par l'ombre portée intérieure sur la toile.
  border: selected
    ? "4px solid var(--brass-300)"
    : "4px solid var(--brass-700)",
  background: "var(--paper-200)",
  boxShadow: selected
    ? "0 0 0 2px var(--brass-500), 0 0 18px 4px rgba(220,170,60,0.55), 7px 9px 14px rgba(40,25,5,0.45)"
    : "0 0 0 1px var(--brass-900), 7px 9px 14px rgba(40,25,5,0.45)",
  // overflow:hidden pour cliper la peinture, mais on autorise le badge à
  // déborder en utilisant un wrapper interne + un badge en absolute hors clip.
  overflow: "visible",
  opacity: selected ? 1 : 0.92,
  transition: "box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease",
});

const paintingWrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

// Lumière venant du haut à gauche : le cadre porte son ombre sur la toile
// dans l'angle supérieur gauche (ici), et sur le mur en bas à droite
// (boxShadow de frameOuter). Posée au-dessus de l'image, sans capter les taps.
const paintingReliefStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  boxShadow:
    "inset 0 0 0 1px var(--brass-300), inset 6px 7px 9px rgba(20,12,0,0.7), inset 0 0 6px 1px rgba(20,12,0,0.3)",
};

const fallbackStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
};

const PAINTING_ZOOM = 1.4;

const zoomedImageStyle = (debloquee: boolean): CSSProperties => ({
  objectFit: "cover",
  transform: `scale(${PAINTING_ZOOM})`,
  transformOrigin: "center center",
  filter: debloquee ? undefined : "grayscale(1) brightness(0.7)",
});

// Cadenas centré (overlay) pour les brocantes verrouillées.
const lockOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  zIndex: 3,
};

const lockBubbleStyle: CSSProperties = {
  width: "44%",
  aspectRatio: "1 / 1",
  maxWidth: 56,
  borderRadius: "50%",
  background: "rgba(20,12,0,0.65)",
  border: "2px solid var(--brass-500)",
  display: "grid",
  placeItems: "center",
  boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
  color: "var(--brass-300)",
};

// Badge « Événement » (braderie) au-dessus du cadre.
const badgeEvenementStyle: CSSProperties = {
  position: "absolute",
  top: "-0.5em",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 3,
  padding: "0.15em 0.6em",
  background: "var(--brass-500)",
  color: "var(--ink-900)",
  fontSize: "0.62rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "2px",
  whiteSpace: "nowrap",
};

export function BrocanteFrame({
  brocante,
  coord,
  selected,
  debloquee,
  horsTheme = false,
  onSelect,
  tutoMain = false,
}: BrocanteFrameProps) {
  const verrouillee = !debloquee || horsTheme;
  const imageUrl = getBrocanteImageUrl(brocante.id);
  const { d, locale } = useLangue();
  const { enabled: editing } = useBrocanteFramesEdit();
  const onClickHandler = editing ? undefined : () => onSelect(brocante.id);
  const pointerEvents: CSSProperties["pointerEvents"] = editing ? "none" : "auto";
  const nom = nomBrocante(brocante, locale);
  const ariaLabel = estGrandeBraderie(brocante)
    ? `${d.chine.badgeEvenement} — ${nom}`
    : nom;

  return (
    <button
      type="button"
      onClick={onClickHandler}
      aria-label={ariaLabel}
      aria-pressed={selected}
      aria-disabled={verrouillee}
      className={tutoMain ? "tuto-main tuto-main-droite" : undefined}
      style={{ ...frameOuter(coord, selected), pointerEvents }}
    >
      {estGrandeBraderie(brocante) && (
        <span style={badgeEvenementStyle} aria-hidden>
          {d.chine.badgeEvenement}
        </span>
      )}
      <div style={paintingWrap}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 600px) 20vw, 200px"
            style={zoomedImageStyle(!verrouillee)}
          />
        ) : (
          <div style={fallbackStyle}>
            <Store size={32} strokeWidth={1.2} color="var(--brass-100)" />
          </div>
        )}
        <div style={paintingReliefStyle} aria-hidden />
        {verrouillee && (
          <div style={lockOverlayStyle} aria-hidden data-testid="cadre-cadenas">
            <div style={lockBubbleStyle}>
              <Lock size={20} strokeWidth={2.2} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
