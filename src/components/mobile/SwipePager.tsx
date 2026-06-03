"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TAB_ORDER,
  findActiveTabIndex,
  isTabBarRoute,
} from "@/components/mobile/TabBar";

/**
 * Wrapper de page qui détecte les swipes horizontaux et navigue de tab en tab
 * dans l'ordre cyclique défini par {@link TAB_ORDER}.
 *
 * - Swipe vers la gauche → onglet suivant
 * - Swipe vers la droite → onglet précédent
 * - Boucle entre Collection et Bibliothèque
 *
 * Inactif sur les routes où la TabBar est masquée (`/`, `/chiner/*`, `/vitrine/*`),
 * sur le swipe principalement vertical, et en deçà du seuil X.
 */
const X_THRESHOLD = 60; // px
const Y_RATIO = 0.7; // |dy| / |dx| < ratio → on considère que c'est horizontal

interface PointerStart {
  id: number;
  x: number;
  y: number;
  t: number;
}

export function SwipePager({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const startRef = useRef<PointerStart | null>(null);

  const enabled = isTabBarRoute(pathname);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    if (e.pointerType === "mouse") return; // gardé tactile/stylet
    startRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s || s.id !== e.pointerId) return;
    startRef.current = null;
    if (!enabled) return;

    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < X_THRESHOLD) return;
    if (Math.abs(dy) > Math.abs(dx) * Y_RATIO) return;

    const idx = findActiveTabIndex(pathname);
    if (idx < 0) return;
    const N = TAB_ORDER.length;
    const next = dx < 0 ? (idx + 1) % N : (idx - 1 + N) % N;
    router.push(TAB_ORDER[next].path);
  };

  const onPointerCancel = () => {
    startRef.current = null;
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ touchAction: "pan-y", minHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}
