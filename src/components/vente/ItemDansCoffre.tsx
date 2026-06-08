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
  onRotate: (angle: number) => void;             // degrés, valeur absolue
  onDragOut: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  overlap?: boolean;
}

interface PointerInfo {
  x: number;
  y: number;
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
  // Pointers actifs sur cet objet (multi-touch).
  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  // Etat du geste pinch-rotate.
  const pinchRef = useRef<{ startAngle: number; startRotation: number } | null>(null);
  // Pointer principal qui drag (le premier posé).
  const dragPointer = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const angleBetween = (a: PointerInfo, b: PointerInfo): number =>
    (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      // Premier doigt : drag
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      dragPointer.current = e.pointerId;
      setActive(true);
    } else if (pointers.current.size === 2) {
      // Second doigt : passe en mode rotation pinch
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      const [pA, pB] = Array.from(pointers.current.values());
      pinchRef.current = {
        startAngle: angleBetween(pA, pB),
        startRotation: ov.rotation ?? 0,
      };
      navigator.vibrate?.(10);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchRef.current) {
      // Rotation pinch continue
      const [pA, pB] = Array.from(pointers.current.values());
      const a = angleBetween(pA, pB);
      const delta = a - pinchRef.current.startAngle;
      onRotate(pinchRef.current.startRotation + delta);
      return;
    }

    // Drag single-finger
    if (dragPointer.current !== e.pointerId) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    onMove(Math.max(0, Math.min(1, px)), Math.max(0, Math.min(1, py)));
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    if (pointers.current.size < 2) pinchRef.current = null;

    if (dragPointer.current === e.pointerId) {
      // Le pointeur principal a été levé : check drag-out + repasse au prochain doigt s'il en reste un
      if (pointers.current.size === 0) {
        dragPointer.current = null;
        setActive(false);
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const insideX = e.clientX >= rect.left && e.clientX <= rect.right;
        const insideY = e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!insideX || !insideY) onDragOut();
      } else {
        // Reste un doigt → ce doigt devient le drag
        dragPointer.current = Array.from(pointers.current.keys())[0]!;
      }
    }
  };

  const posX = (ov.posX ?? 0.5) * cotePixels;
  const posY = (ov.posY ?? 0.5) * cotePixels;
  const rot = ov.rotation ?? 0;

  // Filtres CSS : surbrillance dorée si actif, halo rouge si overlap.
  const filters: string[] = [];
  if (overlap) {
    filters.push(
      "drop-shadow(0 0 0 var(--vermillion-600))",
      "drop-shadow(0 0 4px var(--vermillion-600))",
      "drop-shadow(0 0 4px var(--vermillion-600))",
    );
  } else if (active) {
    filters.push(
      "drop-shadow(0 0 3px var(--brass-500))",
      "drop-shadow(0 0 6px var(--brass-500))",
    );
  }
  const filterStyle = filters.join(" ");

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
        transition: active ? "none" : "transform 120ms",
        cursor: active ? "grabbing" : "grab",
        touchAction: "none",
        filter: filterStyle || undefined,
        willChange: active ? "transform, filter" : undefined,
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
