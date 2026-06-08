"use client";

import { useRef } from "react";
import type { Objet } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate, tailleDe } from "@/data/objetTemplates";

interface Props {
  objet: Objet;
  onDragToCoffre: (objetId: string, clientX: number, clientY: number) => void;
}

export function ItemEnCarrousel({ objet, onDragToCoffre }: Props) {
  const tpl = getTemplate(objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!startRef.current) return;
    const moved = Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y);
    startRef.current = null;
    if (moved < 8) return; // tap court : ignorer
    onDragToCoffre(objet.id, e.clientX, e.clientY);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: 60,
        height: 60,
        background: "var(--paper-100)",
        border: "2px solid var(--brass-500)",
        borderRadius: 4,
        touchAction: "none",
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
