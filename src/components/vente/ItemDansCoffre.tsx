"use client";

import type { ObjetEnVitrine } from "@/types/game";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getScaleCoffre } from "@/data/camion";

interface Props {
  ov: ObjetEnVitrine;
  capacitePlaces: number;
  cotePixels: number;
  active: boolean;   // l'objet est en cours de manipulation
  overlap?: boolean; // l'objet est en collision
}

/**
 * Rendu visuel d'un objet posé dans le coffre. La gestion des pointer events
 * est centralisée dans CoffreCanvas pour assurer une sélection unique.
 */
export function ItemDansCoffre({
  ov,
  capacitePlaces,
  cotePixels,
  active,
  overlap,
}: Props) {
  const tpl = getTemplate(ov.objet.templateId);
  const taille = tpl ? tailleDe(tpl) : "S";
  const scale = getScaleCoffre(taille, capacitePlaces);
  const sizePx = scale * cotePixels;

  const posX = (ov.posX ?? 0.5) * cotePixels;
  const posY = (ov.posY ?? 0.5) * cotePixels;
  const rot = ov.rotation ?? 0;

  // Halo doré (sélection) ou halo rouge (collision).
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
        // touchAction n'a pas d'effet ici car le parent gère le pointer.
        filter: filterStyle || undefined,
        willChange: active ? "transform, filter" : undefined,
        pointerEvents: "none", // CoffreCanvas gère, on évite la captation
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
