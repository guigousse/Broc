"use client";

import { useRef, useState } from "react";
import type { ObjetEnVitrine } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getScaleCoffre } from "@/data/camion";

interface Props {
  ov: ObjetEnVitrine;
  capacitePlaces: number;
  cotePixels: number;
  onMove: (posX: number, posY: number) => void; // 0..1
  onRotate: () => void;
  onDragOut: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  overlap?: boolean;
}

const LONG_PRESS_MS = 300;
const LONG_PRESS_MAX_MOVE = 5;

export function ItemDansCoffre({
  ov,
  capacitePlaces,
  cotePixels,
  onMove,
  onRotate,
  onDragOut,
  containerRef,
  overlap,
}: Props) {
  const tpl = getTemplate(ov.objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const scale = getScaleCoffre(taille, capacitePlaces);
  const sizePx = scale * cotePixels;

  const elRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MAX_MOVE) startRef.current.moved = true;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    onMove(Math.max(0, Math.min(1, px)), Math.max(0, Math.min(1, py)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const s = startRef.current;
    startRef.current = null;
    setDragging(false);
    if (!s) return;
    const heldMs = Date.now() - s.t;
    if (!s.moved && heldMs >= LONG_PRESS_MS) {
      onRotate();
      navigator.vibrate?.(20);
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const insideX = e.clientX >= rect.left && e.clientX <= rect.right;
    const insideY = e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!insideX || !insideY) onDragOut();
  };

  const posX = (ov.posX ?? 0.5) * cotePixels;
  const posY = (ov.posY ?? 0.5) * cotePixels;
  const rot = ov.rotation ?? 0;

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "absolute",
        left: posX - sizePx / 2,
        top: posY - sizePx / 2,
        width: sizePx,
        height: sizePx,
        transform: `rotate(${rot}deg)`,
        transition: dragging ? "none" : "transform 120ms",
        outline: overlap ? "2px solid var(--vermillion-600)" : "none",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      <ItemImage
        templateId={ov.objet.templateId}
        categorie={ov.objet.categorie}
        fit="contain"
        alt={ov.objet.nom}
      />
    </div>
  );
}
