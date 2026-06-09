"use client";

import { useRef } from "react";
import type { Objet } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
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

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
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
      {/* Badge taille — coin haut droit */}
      <span
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          background: "var(--brass-700)",
          color: "#fff",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          padding: "1px 4px",
          borderRadius: 2,
          letterSpacing: "0.04em",
        }}
      >
        {taille}
      </span>
      {/* Icône catégorie — coin bas droit */}
      <span
        style={{
          position: "absolute",
          bottom: 3,
          right: 3,
          width: 18,
          height: 18,
          display: "grid",
          placeItems: "center",
          background: "var(--paper-100)",
          border: "1px solid var(--brass-500)",
          borderRadius: 3,
        }}
      >
        <CategorieIcon
          categorie={objet.categorie}
          size={12}
          color="var(--forest-800)"
          strokeWidth={1.6}
        />
      </span>
    </div>
  );
}
