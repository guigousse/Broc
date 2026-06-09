"use client";

import { useRef, type CSSProperties } from "react";
import type { Objet } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";

interface Props {
  objet: Objet;
  onDragToCoffre: (objetId: string, clientX: number, clientY: number) => void;
}

const VERTICAL_THRESHOLD = 10;
const PICKUP_THRESHOLD = 8;

interface CornerLProps {
  position: "tl" | "tr" | "bl" | "br";
  color: string;
}
function CornerL({ position, color }: CornerLProps) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        width: 8,
        height: 8,
        top: isTop ? 5 : undefined,
        bottom: isTop ? undefined : 5,
        left: isLeft ? 5 : undefined,
        right: isLeft ? undefined : 5,
        borderTop: isTop ? `1px solid ${color}` : "none",
        borderBottom: isTop ? "none" : `1px solid ${color}`,
        borderLeft: isLeft ? `1px solid ${color}` : "none",
        borderRight: isLeft ? "none" : `1px solid ${color}`,
        pointerEvents: "none",
      }}
    />
  );
}

export function ItemEnCarrousel({ objet, onDragToCoffre }: Props) {
  const tpl = getTemplate(objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const colors = getRarityColors(objet.rarete, !!tpl?.unique);
  const filledStars = etoileCount(objet.etat);

  const startRef = useRef<{
    x: number;
    y: number;
    captured: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY, captured: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (
      !startRef.current.captured &&
      Math.abs(dy) > VERTICAL_THRESHOLD &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      startRef.current.captured = true;
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    if (s.captured) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (s.captured && moved > PICKUP_THRESHOLD) {
      onDragToCoffre(objet.id, e.clientX, e.clientY);
    }
  };

  const cellStyle: CSSProperties = {
    position: "relative",
    aspectRatio: "1 / 1",
    width: "100%",
    boxSizing: "border-box",
    border: `1.5px solid ${colors.outer}`,
    background: colors.thumbBg,
    boxShadow: `inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px ${colors.inner}`,
    touchAction: "none",
    cursor: "grab",
    overflow: "hidden",
  };

  // Image rétrécie à 80 % pour respirer dans le filet intérieur, comme la
  // grille de la Collection.
  const innerImage: CSSProperties = {
    position: "absolute",
    inset: 6,
    display: "grid",
    placeItems: "stretch",
    overflow: "hidden",
    pointerEvents: "none",
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={cellStyle}
    >
      <CornerL position="tl" color={colors.inner} />
      <CornerL position="tr" color={colors.inner} />
      <CornerL position="bl" color={colors.inner} />
      <CornerL position="br" color={colors.inner} />

      <div style={innerImage}>
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="contain"
          fallbackIconSize={28}
          fallbackIconColor={colors.thumbIcon}
          alt={objet.nom}
          padded
        />
      </div>

      {/* Badge taille — coin haut droit */}
      <span
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          background: "var(--brass-700)",
          color: "#fff",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          padding: "1px 4px",
          borderRadius: 2,
          letterSpacing: "0.04em",
          zIndex: 1,
        }}
      >
        {taille}
      </span>

      {/* Icône catégorie — coin bas droit */}
      <span
        style={{
          position: "absolute",
          bottom: 4,
          right: 4,
          width: 18,
          height: 18,
          display: "grid",
          placeItems: "center",
          background: "var(--paper-100)",
          border: `1px solid ${colors.inner}`,
          borderRadius: 3,
          zIndex: 1,
        }}
      >
        <CategorieIcon
          categorie={objet.categorie}
          size={12}
          color="var(--forest-800)"
          strokeWidth={1.6}
        />
      </span>

      {/* Étoiles d'état — coin bas gauche */}
      <StarRow
        filled={filledStars}
        color={colors.outer}
        size={9}
        gap={1}
        emptyFill="var(--paper-100)"
        dropShadow
        display="flex"
        style={{
          position: "absolute",
          left: 5,
          bottom: 5,
          gap: 1,
          pointerEvents: "none",
          zIndex: 1,
        }}
        aria-label={`État : ${objet.etat}`}
      />
    </div>
  );
}
