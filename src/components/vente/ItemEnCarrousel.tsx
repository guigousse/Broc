"use client";

import { useRef, type CSSProperties } from "react";
import type { Objet } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";

interface Props {
  objet: Objet;
  /** Tap simple : l'objet est ajouté automatiquement au centre du coffre. */
  onTap: (objetId: string) => void;
  /** Début de drag (maintien ou tirer vertical) : l'objet suit le doigt. */
  onDragStart: (objetId: string, clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  /** Fin de drag : le parent décide (dans le coffre → dépose, sinon annule). */
  onDragEnd: (clientX: number, clientY: number) => void;
}

/** Maintien sans bouger au-delà de ce délai → le drag démarre. */
const HOLD_MS = 200;
/** En deçà de ce déplacement au relâcher : simple tap. */
const TAP_SLOP = 8;
/** Tirer vertical au-delà de ce seuil → drag immédiat (sans attendre le hold). */
const VERTICAL_THRESHOLD = 10;
/** Déplacement horizontal franc avant le hold → scroll du carrousel, pas un drag. */
const SCROLL_SLOP = 12;

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

export function ItemEnCarrousel({ objet, onTap, onDragStart, onDragMove, onDragEnd }: Props) {
  const { d, tr, locale } = useLangue();
  const tpl = getTemplate(objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const colors = getRarityColors(objet.rarete, !!tpl?.unique);
  const filledStars = etoileCount(objet.etat);

  // Geste (retour device 2026-07-17) : tap = ajout au centre ; maintien
  // (HOLD_MS sans bouger) OU tirer vertical = l'objet suit le doigt.
  // Un déplacement horizontal franc avant le hold = scroll du carrousel.
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const dernierRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const annulerHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const demarrerDrag = (el: HTMLDivElement, pointerId: number, x: number, y: number) => {
    annulerHold();
    dragRef.current = true;
    try {
      el.setPointerCapture(pointerId);
    } catch {
      // ignore (jsdom / pointeur déjà relâché)
    }
    onDragStart(objet.id, x, y);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    dernierRef.current = { x: e.clientX, y: e.clientY };
    dragRef.current = false;
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    annulerHold();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (startRef.current && !dragRef.current) {
        demarrerDrag(el, pointerId, dernierRef.current.x, dernierRef.current.y);
      }
    }, HOLD_MS);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    dernierRef.current = { x: e.clientX, y: e.clientY };
    if (dragRef.current) {
      onDragMove(e.clientX, e.clientY);
      return;
    }
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dy) > VERTICAL_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      demarrerDrag(e.currentTarget, e.pointerId, e.clientX, e.clientY);
    } else if (Math.abs(dx) > SCROLL_SLOP) {
      // Scroll horizontal du carrousel : on laisse le pan-x natif faire.
      annulerHold();
      startRef.current = null;
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    annulerHold();
    const s = startRef.current;
    startRef.current = null;
    if (dragRef.current) {
      dragRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      // pointercancel (scroll natif qui reprend la main) : coords hors coffre
      // → le parent annule la dépose, c'est le comportement voulu.
      onDragEnd(e.clientX, e.clientY);
      return;
    }
    if (!s) return;
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (e.type === "pointerup" && moved <= TAP_SLOP) {
      onTap(objet.id);
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
    // pan-x : laisse le scroll horizontal du carrousel s'exécuter ; les gestes
    // verticaux (drag vers le coffre) sont gérés par nos pointer events.
    touchAction: "pan-x",
    cursor: "grab",
    overflow: "hidden",
    // Maintien sans menu contextuel ni sélection (long-press iOS).
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
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
          alt={nomObjet(objet, locale)}
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
          fontSize: 10,
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
        aria-label={tr(d.chine.etatAriaLabel, { etat: objet.etat })}
      />
    </div>
  );
}
