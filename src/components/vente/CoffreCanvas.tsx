"use client";

import { useEffect, useRef, useState } from "react";
import type { NiveauCamion, ObjetEnVitrine } from "@/types/game";
import { getCamion } from "@/data/camion";
import { ItemDansCoffre } from "./ItemDansCoffre";

interface Props {
  niveauCamion: NiveauCamion;
  objets: ObjetEnVitrine[];
  overlaps: Set<string>;
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
  onMove,
  onRotate,
  onRetour,
}: Props) {
  const camion = getCamion(niveauCamion);
  const ref = useRef<HTMLDivElement>(null);

  // Sélection unique : un seul objet à la fois.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  // Pointer principal qui drag l'objet sélectionné.
  const dragPointerId = useRef<number | null>(null);
  // Tous les pointeurs actuellement actifs (n'importe où).
  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  // État de la rotation en cours (pinch).
  const pinchRef = useRef<{ startAngle: number; startRotation: number; otherId: number } | null>(null);

  // Accès direct aux objets actuels pour récupérer la rotation au moment du pinch.
  const objetsRef = useRef(objets);
  objetsRef.current = objets;

  const hitTest = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    let cursor: HTMLElement | null = el;
    while (cursor) {
      const id = cursor.getAttribute?.("data-coffre-item-id");
      if (id) return id;
      cursor = cursor.parentElement;
    }
    return null;
  };

  /* --- Listener global pour gérer le 2e doigt n'importe où ----------- */
  useEffect(() => {
    if (selectedId === null) return;

    const handleDown = (e: PointerEvent) => {
      // Premier doigt déjà actif (drag). Ce nouveau pointeur est le second → rotation.
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

      // Si pinch en cours, rotation prioritaire (le drag est suspendu).
      if (pinchRef.current && dragPointerId.current !== null) {
        const p1 = pointers.current.get(dragPointerId.current);
        const p2 = pointers.current.get(pinchRef.current.otherId);
        if (!p1 || !p2) return;
        const a = angleBetween(p1, p2);
        const delta = a - pinchRef.current.startAngle;
        onRotate(id, pinchRef.current.startRotation + delta);
        return;
      }

      // Sinon, drag normal sur le pointeur principal.
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

      // 2e doigt relâché → fin du pinch, on conserve la sélection.
      if (pinchRef.current && e.pointerId === pinchRef.current.otherId) {
        pinchRef.current = null;
        return;
      }

      // Doigt principal relâché → fin de la sélection.
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
        // Cleanup
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

  /* --- Pointer down sur le canvas : initie la sélection ------------- */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Si une sélection est déjà active, on laisse le listener global gérer.
    if (selectedIdRef.current !== null) return;
    const itemId = hitTest(e.clientX, e.clientY);
    if (!itemId) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragPointerId.current = e.pointerId;
    setSelectedId(itemId);
  };

  return (
    <div style={{ padding: 14, background: "var(--paper-200)" }}>
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          position: "relative",
          background:
            "repeating-linear-gradient(45deg, var(--ink-700), var(--ink-700) 6px, var(--ink-500) 6px, var(--ink-500) 12px)",
          border: "4px solid var(--ink-700)",
          borderRadius: 6,
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.4)",
          touchAction: "none",
        }}
      >
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
        {objets.map((ov) => {
          const w = ref.current?.getBoundingClientRect().width ?? camion.cotePixels;
          return (
            <ItemDansCoffre
              key={ov.objet.id}
              ov={ov}
              capacitePlaces={camion.capacitePlaces}
              cotePixels={w}
              active={selectedId === ov.objet.id}
              overlap={overlaps.has(ov.objet.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
