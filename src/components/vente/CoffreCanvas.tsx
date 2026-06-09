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
  /** Si vrai, le coffre est représenté fermé (transition de validation). */
  closing: boolean;
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

  const aspectRatio = camion.aspectRatio;
  const relativeSize = camion.relativeSize ?? 1;
  const zoom = camion.displayZoom ?? 1;
  const centerX = camion.displayCenterX ?? 0.5;
  const centerY = camion.displayCenterY ?? 0.5;
  const bgImage = closing ? assets?.ferme : assets?.ouvert;
  const clipMask = assets?.maskExpanded;
  const sizePct = `${100 * zoom}%`;
  // Aligne (centerX, centerY) du source sur le centre du container.
  const bgPosX = zoom === 1 ? 50 : ((0.5 - zoom * centerX) / (1 - zoom)) * 100;
  const bgPosY = zoom === 1 ? 50 : ((0.5 - zoom * centerY) / (1 - zoom)) * 100;
  const posStr = `${bgPosX.toFixed(2)}% ${bgPosY.toFixed(2)}%`;

  return (
    <div
      style={{
        padding: 14,
        background: "var(--paper-200)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        style={{
          width: `${relativeSize * 100}%`,
          aspectRatio: `${aspectRatio}`,
          position: "relative",
          background: bgImage
            ? `${posStr} / ${sizePct} no-repeat url("${bgImage}")`
            : "repeating-linear-gradient(45deg, var(--ink-700), var(--ink-700) 6px, var(--ink-500) 6px, var(--ink-500) 12px)",
          // Clip silhouette + 40 px de halo.
          maskImage: clipMask ? `url("${clipMask}")` : undefined,
          maskSize: sizePct,
          maskRepeat: "no-repeat",
          maskPosition: posStr,
          WebkitMaskImage: clipMask ? `url("${clipMask}")` : undefined,
          WebkitMaskSize: sizePct,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: posStr,
          borderRadius: 6,
          touchAction: "none",
          overflow: "hidden",
          transition: "background-image 250ms ease-out, width 200ms ease-out",
        }}
      >
        {!bgImage && (
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--brass-300)",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          >
            — coffre ouvert —
          </div>
        )}
        {assets && !closing && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `${posStr} / ${sizePct} no-repeat url("${assets.mask}")`,
              opacity: 0.65,
              pointerEvents: "none",
              transition: "opacity 200ms ease-out",
              zIndex: 1,
            }}
          />
        )}
        {!closing &&
          objets.map((ov) => {
            const w = ref.current?.getBoundingClientRect().width ?? 280;
            const h = ref.current?.getBoundingClientRect().height ?? 280;
            // Les items sont positionnés en pourcent du coffre, on les rend en px.
            return (
              <ItemDansCoffre
                key={ov.objet.id}
                ov={ov}
                capacitePlaces={camion.capacitePlaces}
                cotePixelsX={w}
                cotePixelsY={h}
                active={selectedId === ov.objet.id}
                overlap={overlaps.has(ov.objet.id)}
              />
            );
          })}
      </div>
    </div>
  );
}
