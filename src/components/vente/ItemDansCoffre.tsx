"use client";

import type { ObjetEnVitrine } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getScaleCoffre } from "@/data/camion";

interface Props {
  ov: ObjetEnVitrine;
  capacitePlaces: number;
  cotePixelsX: number;
  cotePixelsY: number;
  active: boolean;
  overlap?: boolean;
}

export function ItemDansCoffre({
  ov,
  capacitePlaces,
  cotePixelsX,
  cotePixelsY,
  active,
  overlap,
}: Props) {
  const tpl = getTemplate(ov.objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const scale = getScaleCoffre(taille, capacitePlaces);
  // Le côté de référence est le plus petit des deux pour garder un objet carré.
  const refCote = Math.min(cotePixelsX, cotePixelsY);
  const sizePx = scale * refCote;

  const posX = (ov.posX ?? 0.5) * cotePixelsX;
  const posY = (ov.posY ?? 0.5) * cotePixelsY;
  const rot = ov.rotation ?? 0;

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
      data-coffre-item-id={ov.objet.id}
      style={{
        position: "absolute",
        left: posX - sizePx / 2,
        top: posY - sizePx / 2,
        width: sizePx,
        height: sizePx,
        transform: `rotate(${rot}deg)`,
        transition: active ? "none" : "transform 120ms",
        cursor: active ? "grabbing" : "grab",
        filter: filterStyle || undefined,
        willChange: active ? "transform, filter" : undefined,
        pointerEvents: "none",
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
