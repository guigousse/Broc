"use client";

import { useRef } from "react";
import type { Objet } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate, tailleDe } from "@/data/objetTemplates";

interface Props {
  objet: Objet;
  onDragToCoffre: (objetId: string, clientX: number, clientY: number) => void;
}

const VERTICAL_THRESHOLD = 10;
const PICKUP_THRESHOLD = 8;

export function ItemEnCarrousel({ objet, onDragToCoffre }: Props) {
  const tpl = getTemplate(objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const startRef = useRef<{
    x: number;
    y: number;
    captured: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // On ne capture PAS tout de suite : on attend de voir si le geste est
    // vertical (drag vers le coffre) ou horizontal (scroll du carrousel).
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
    // Le drag-to-coffre ne se déclenche que si le geste a été identifié comme
    // drag (capture en cours) ET qu'il y a un mouvement significatif.
    if (s.captured && moved > PICKUP_THRESHOLD) {
      onDragToCoffre(objet.id, e.clientX, e.clientY);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: 60,
        height: 60,
        background: "var(--paper-100)",
        border: "2px solid var(--brass-500)",
        borderRadius: 4,
        // pan-x : laisse le scroll horizontal du carrousel s'exécuter ;
        // les gestes verticaux passent en pointer events (drag-to-coffre).
        touchAction: "pan-x",
        cursor: "grab",
      }}
    >
      <ItemImage
        templateId={objet.templateId}
        categorie={objet.categorie}
        fit="contain"
        alt={objet.nom}
      />
      <span
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          background: "var(--brass-700)",
          color: "#fff",
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          padding: "1px 3px",
          borderRadius: 2,
        }}
      >
        {taille}
      </span>
    </div>
  );
}
