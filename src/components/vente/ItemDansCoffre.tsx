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
  // Pointers actifs sur cet objet : pour détecter le second doigt = rotation.
  const activePointers = useRef<Set<number>>(new Set());
  const dragPointer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.add(e.pointerId);
    // Second doigt sur le même objet → rotation +90° et on annule le drag en cours.
    if (activePointers.current.size >= 2) {
      onRotate();
      navigator.vibrate?.(20);
      if (dragPointer.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(dragPointer.current);
        } catch {
          // pointer déjà relâché — ignore
        }
        dragPointer.current = null;
      }
      setDragging(false);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragPointer.current = e.pointerId;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointer.current !== e.pointerId) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    onMove(Math.max(0, Math.min(1, px)), Math.max(0, Math.min(1, py)));
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (dragPointer.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragPointer.current = null;
      setDragging(false);
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const insideX = e.clientX >= rect.left && e.clientX <= rect.right;
      const insideY = e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!insideX || !insideY) onDragOut();
    }
  };

  const posX = (ov.posX ?? 0.5) * cotePixels;
  const posY = (ov.posY ?? 0.5) * cotePixels;
  const rot = ov.rotation ?? 0;

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        position: "absolute",
        left: posX - sizePx / 2,
        top: posY - sizePx / 2,
        width: sizePx,
        height: sizePx,
        transform: `rotate(${rot}deg)`,
        transition: dragging ? "none" : "transform 120ms",
        outline: overlap ? "3px solid var(--vermillion-600)" : "none",
        outlineOffset: overlap ? 2 : 0,
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
