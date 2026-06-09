"use client";

import { useEffect, useRef, useState } from "react";
import type { NiveauCamion, ObjetEnVitrine } from "@/types/game";
import { getCamion, getScaleCoffre } from "@/data/camion";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { ItemDansCoffre } from "./ItemDansCoffre";

interface Props {
  niveauCamion: NiveauCamion;
  objets: ObjetEnVitrine[];
  overlaps: Set<string>;
  closing: boolean;
  /** Overrides dev pour position/scale du camion (cf. CamionDevTool). */
  devOverride?: { x: number; y: number; scale: number } | null;
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string, angle: number) => void;
  onRetour: (objetId: string) => void;
}

interface PointerInfo {
  x: number;
  y: number;
}

function angleBetween(a: PointerInfo, b: PointerInfo): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function CoffreCanvas({
  niveauCamion,
  objets,
  overlaps,
  closing,
  devOverride,
  onMove,
  onRotate,
  onRetour,
}: Props) {
  const camion = getCamion(niveauCamion);
  const assets = getCoffreAssets(camion.visuelId);
  const ref = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const dragPointerId = useRef<number | null>(null);
  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  const pinchRef = useRef<{
    startAngle: number;
    startRotation: number;
    otherId: number;
  } | null>(null);

  const objetsRef = useRef(objets);
  objetsRef.current = objets;

  const hitTest = (clientX: number, clientY: number): string | null => {
    if (!ref.current) return null;
    const rect = ref.current.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return null;
    const items = objetsRef.current;
    for (let i = items.length - 1; i >= 0; i--) {
      const ov = items[i];
      const tpl = getTemplate(ov.objet.templateId);
      if (!tpl) continue;
      const scale = getScaleCoffre(tailleDe(tpl), camion.capacitePlaces);
      const cx = ov.posX ?? 0.5;
      const cy = ov.posY ?? 0.5;
      if (Math.abs(px - cx) <= scale / 2 && Math.abs(py - cy) <= scale / 2) {
        return ov.objet.id;
      }
    }
    return null;
  };

  useEffect(() => {
    if (selectedId === null) return;

    const handleDown = (e: PointerEvent) => {
      if (pointers.current.has(e.pointerId)) return;
      if (dragPointerId.current === null) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const p1 = pointers.current.get(dragPointerId.current);
        const p2 = pointers.current.get(e.pointerId);
        if (!p1 || !p2) return;
        const id = selectedIdRef.current;
        const ov = id ? objetsRef.current.find((o) => o.objet.id === id) : null;
        pinchRef.current = {
          startAngle: angleBetween(p1, p2),
          startRotation: ov?.rotation ?? 0,
          otherId: e.pointerId,
        };
        e.preventDefault();
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const id = selectedIdRef.current;
      if (!id) return;

      if (pinchRef.current && dragPointerId.current !== null) {
        const p1 = pointers.current.get(dragPointerId.current);
        const p2 = pointers.current.get(pinchRef.current.otherId);
        if (!p1 || !p2) return;
        const a = angleBetween(p1, p2);
        const delta = a - pinchRef.current.startAngle;
        onRotate(id, pinchRef.current.startRotation + delta);
        return;
      }

      if (e.pointerId !== dragPointerId.current) return;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      onMove(id, Math.max(0, Math.min(1, px)), Math.max(0, Math.min(1, py)));
    };

    const handleUp = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);

      if (pinchRef.current && e.pointerId === pinchRef.current.otherId) {
        pinchRef.current = null;
        return;
      }

      if (e.pointerId === dragPointerId.current) {
        const id = selectedIdRef.current;
        const insideRect = (() => {
          if (!ref.current) return true;
          const rect = ref.current.getBoundingClientRect();
          return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
        })();
        dragPointerId.current = null;
        pinchRef.current = null;
        pointers.current.clear();
        setSelectedId(null);
        if (id && !insideRect) onRetour(id);
      }
    };

    document.addEventListener("pointerdown", handleDown);
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointerdown", handleDown);
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [selectedId, onMove, onRotate, onRetour]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (closing) return;
    if (selectedIdRef.current !== null) return;
    const itemId = hitTest(e.clientX, e.clientY);
    if (!itemId) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragPointerId.current = e.pointerId;
    setSelectedId(itemId);
  };

  const bgImage = closing ? assets?.ferme : assets?.ouvert;
  // Position et taille du camion sur le fond garage (override dev prioritaire).
  const garageX = devOverride?.x ?? camion.garageX;
  const garageY = devOverride?.y ?? camion.garageY;
  const garageScale = devOverride?.scale ?? camion.garageScale;

  return (
    <div
      style={{
        width: "100%",
        // Pleine largeur, hauteur calée sur l'espace dispo (header + carrousel +
        // barre d'action). L'image est rendue en cover : pleine largeur, crop
        // vertical en haut/bas grâce à la marge prévue dans l'asset.
        height:
          "calc(100dvh - 60px - 100px - 76px - var(--safe-top) - var(--safe-bottom))",
        position: "relative",
        background:
          'var(--paper-200) center / cover no-repeat url("/coffre/fond-garage.webp")',
        overflow: "hidden",
      }}
    >
      {/* Conteneur du camion — positionné en absolu, centré à (garageX, garageY). */}
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        style={{
          position: "absolute",
          left: `${garageX * 100}%`,
          top: `${garageY * 100}%`,
          width: `${garageScale * 100}%`,
          aspectRatio: `${camion.aspectRatio}`,
          transform: "translate(-50%, -50%)",
          touchAction: "none",
          background: bgImage
            ? `center / contain no-repeat url("${bgImage}")`
            : undefined,
          transition: "background-image 250ms ease-out",
        }}
      >
        {!closing &&
          objets.map((ov) => {
            const w = ref.current?.getBoundingClientRect().width ?? 280;
            return (
              <ItemDansCoffre
                key={ov.objet.id}
                ov={ov}
                capacitePlaces={camion.capacitePlaces}
                cotePixelsX={w}
                cotePixelsY={w / camion.aspectRatio}
                active={selectedId === ov.objet.id}
                overlap={overlaps.has(ov.objet.id)}
              />
            );
          })}
      </div>
    </div>
  );
}
