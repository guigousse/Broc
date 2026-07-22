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
  /** Opacité du camion (utilisée pour le fondu de sortie au départ). Défaut 1. */
  truckOpacity?: number;
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string, angle: number) => void;
  onRetour: (objetId: string) => void;
  /** Expose le conteneur du coffre (mapping client → posX/posY 0..1) au
   *  parent — sert au drop des objets tirés depuis le carrousel. */
  conteneurRef?: React.MutableRefObject<HTMLDivElement | null>;
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
  truckOpacity = 1,
  onMove,
  onRotate,
  onRetour,
  conteneurRef,
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

  // Position/rotation visuelles du drag en cours : état LOCAL au canvas, mis à
  // jour à la fréquence du doigt. Le commit vers le parent (onMove/onRotate →
  // setState global + auto-save) est throttlé pendant le geste puis flushé au
  // relâcher : commiter chaque pointermove (60-120 Hz) re-rendait toute la
  // page et re-sérialisait l'état à chaque frame. Le throttle garde
  // l'indicateur de chevauchement (calculé par le parent) vivant pendant le drag.
  const [dragVisu, setDragVisu] = useState<{
    x?: number;
    y?: number;
    rot?: number;
  } | null>(null);
  const dragVisuRef = useRef<typeof dragVisu>(null);
  dragVisuRef.current = dragVisu;
  const dernierCommitRef = useRef(0);
  const COMMIT_MS = 100;

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
          // La rotation visuelle locale prime : l'état global peut être en
          // retard d'une fenêtre de throttle (re-pincement dans le même geste).
          startRotation: dragVisuRef.current?.rot ?? ov?.rotation ?? 0,
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
        const rot = pinchRef.current.startRotation + delta;
        setDragVisu((v) => ({ ...v, rot }));
        if (performance.now() - dernierCommitRef.current >= COMMIT_MS) {
          dernierCommitRef.current = performance.now();
          onRotate(id, rot);
        }
        return;
      }

      if (e.pointerId !== dragPointerId.current) return;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setDragVisu((v) => ({ ...v, x: px, y: py }));
      if (performance.now() - dernierCommitRef.current >= COMMIT_MS) {
        dernierCommitRef.current = performance.now();
        onMove(id, px, py);
      }
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
        // Flush final : commit de la dernière position/rotation visuelle
        // (le throttle a pu sauter les derniers pointermove).
        const v = dragVisuRef.current;
        if (id && insideRect && v) {
          if (v.x !== undefined && v.y !== undefined) onMove(id, v.x, v.y);
          if (v.rot !== undefined) onRotate(id, v.rot);
        }
        setDragVisu(null);
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

  // Position et taille du camion sur le fond garage (override dev prioritaire).
  const garageX = devOverride?.x ?? camion.garageX;
  const garageY = devOverride?.y ?? camion.garageY;
  const garageScale = devOverride?.scale ?? camion.garageScale;

  return (
    <div
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        // Hauteur calée sur l'espace dispo (header + carrousel + barre action).
        height:
          "calc(100dvh - var(--mobile-header-h) - 100px - var(--mobile-tabbar-h) - var(--safe-top) - var(--safe-bottom))",
        position: "relative",
        backgroundColor: "var(--paper-200)",
        backgroundImage: "url('/coffre/fond-garage.webp')",
        // 100% auto force la largeur de l'image à 100 % du wrapper, hauteur auto
        // (proportionnelle). Le surplus vertical est croppé par overflow:hidden,
        // ce qui correspond aux marges haut/bas que l'asset prévoit.
        backgroundSize: "100% auto",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
        // Liseré doré à l'intersection avec le carrousel en dessous,
        // miroir de celui de la barre d'action (idem header BROC).
        borderBottom: "2px solid var(--brass-500)",
        boxShadow: "0 1px 0 var(--brass-300)",
      }}
    >
      {/* Conteneur du camion — positionné en absolu, centré à (garageX, garageY). */}
      <div
        ref={(el) => {
          ref.current = el;
          if (conteneurRef) conteneurRef.current = el;
        }}
        onPointerDown={handlePointerDown}
        style={{
          position: "absolute",
          left: `${garageX * 100}%`,
          top: `${garageY * 100}%`,
          width: `${garageScale * 100}%`,
          aspectRatio: `${camion.aspectRatio}`,
          transform: "translate(-50%, -50%)",
          touchAction: "none",
          opacity: truckOpacity,
        }}
      >
        {/* Couche du coffre ouvert : visible par défaut, fondue à 0
            quand on bascule en mode "closing". Les deux images sont
            toujours rendues en parallèle pour permettre un crossfade
            sans blanc transitoire. */}
        {assets?.ouvert && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `center / contain no-repeat url("${assets.ouvert}")`,
              opacity: closing ? 0 : 1,
              transition: "opacity 300ms ease-out",
              pointerEvents: "none",
            }}
          />
        )}
        {assets?.ferme && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `center / contain no-repeat url("${assets.ferme}")`,
              opacity: closing ? 1 : 0,
              transition: "opacity 300ms ease-out",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Overlay du masque (semi-transparent) — délimite la zone de
            chargement pour le joueur, masqué pendant la fermeture. */}
        {assets && !closing && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `center / contain no-repeat url("${assets.mask}")`,
              opacity: 0.6,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}
        {!closing &&
          objets.map((ov) => {
            const w = ref.current?.getBoundingClientRect().width ?? 280;
            const actif = selectedId === ov.objet.id;
            // Pendant le drag, la position/rotation visuelle locale prime sur
            // l'état global (commité seulement au throttle + au relâcher).
            const ovAffiche =
              actif && dragVisu
                ? {
                    ...ov,
                    posX: dragVisu.x ?? ov.posX,
                    posY: dragVisu.y ?? ov.posY,
                    rotation: dragVisu.rot ?? ov.rotation,
                  }
                : ov;
            return (
              <ItemDansCoffre
                key={ov.objet.id}
                ov={ovAffiche}
                capacitePlaces={camion.capacitePlaces}
                cotePixelsX={w}
                cotePixelsY={w / camion.aspectRatio}
                active={actif}
                overlap={overlaps.has(ov.objet.id)}
              />
            );
          })}
      </div>
    </div>
  );
}
