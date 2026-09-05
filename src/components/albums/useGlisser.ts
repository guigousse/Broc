"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Un glisser suivi au doigt (dx, dy depuis le point d'appui), validé au
 * relâcher par `onValide(dx, dy)` — qui dit si le geste comptait ; sinon
 * `onRate` (un tap, un glisser trop court ou dans le mauvais sens) peut
 * secouer une invite. Partagé par les cérémonies d'ouverture : la
 * déchirure du booster (horizontal), la carte suivante (vers la droite),
 * le rabat de la pochette de timbres (vers le haut).
 */
export function useGlisser(
  onValide: (dx: number, dy: number) => boolean,
  onRate?: () => void,
) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const enCours = depart.current !== null;
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    depart.current = { x: e.clientX, y: e.clientY };
    // jsdom n'a pas de capture de pointeur ; sur appareil, elle garde le
    // glisser même quand le doigt sort de l'élément.
    if (typeof e.currentTarget.setPointerCapture === "function" && e.pointerId !== undefined) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointeur déjà parti */
      }
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (depart.current === null) return;
    setDx(e.clientX - depart.current.x);
    setDy(e.clientY - depart.current.y);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (depart.current === null) return;
    const ddx = e.clientX - depart.current.x;
    const ddy = e.clientY - depart.current.y;
    depart.current = null;
    setDx(0);
    setDy(0);
    if (!onValide(ddx, ddy)) onRate?.();
  };
  const onPointerCancel = () => {
    depart.current = null;
    setDx(0);
    setDy(0);
  };
  return { dx, dy, enCours, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
}
