"use client";

import {
  useEffect,
  useRef,
  type PointerEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TAB_ORDER,
  findActiveTabIndex,
  isTabBarRoute,
} from "@/components/mobile/TabBar";

/**
 * Wrapper de page qui :
 *  - Détecte les swipes horizontaux et navigue de tab en tab dans l'ordre
 *    cyclique défini par {@link TAB_ORDER}.
 *  - Anime l'entrée de chaque page avec un slide-in horizontal (droite ou
 *    gauche selon le sens cyclique parcouru).
 *
 * Le swipe est ignoré si la zone touchée est à l'intérieur d'un conteneur
 * scrollable horizontalement qui peut encore scroller dans la direction du
 * geste (ex. panorama du Bureau au milieu). Quand le conteneur atteint sa
 * borne (ex. au bord du panorama), le geste suivant déclenche la navigation.
 */
const X_THRESHOLD = 60; // px
const Y_RATIO = 0.7;

/**
 * Routes qui partagent le panorama unifié : on leur attribue la même
 * `pageKey` pour que le sous-arbre ne re-monte PAS entre elles. Sans
 * cette mutualisation, le scroll position du panorama serait perdue à
 * chaque traversée de zone (la layout aurait beau être partagée, le
 * <div key={pathname}> de SwipePager forcerait un unmount/remount).
 */
const PANORAMA_GROUP = new Set<string>([
  "/bureau",
  "/stockage",
  "/atelier",
]);

function pageKeyForPathname(pathname: string): string {
  return PANORAMA_GROUP.has(pathname) ? "_panorama" : pathname;
}

interface PointerStart {
  id: number;
  x: number;
  y: number;
}

function findHorizontallyScrollableAncestor(
  el: Element | null,
): HTMLElement | null {
  let node: Element | null = el;
  while (node && node instanceof HTMLElement) {
    const style = window.getComputedStyle(node);
    if (style.overflowX === "auto" || style.overflowX === "scroll") {
      if (node.scrollWidth - node.clientWidth > 1) return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Sens du déplacement d'un onglet à l'autre dans le cycle. */
function computeDirection(
  prev: string | null,
  curr: string,
): "right" | "left" | "none" {
  if (!prev || prev === curr) return "none";
  const prevIdx = TAB_ORDER.findIndex(
    (t) => prev === t.path || prev.startsWith(`${t.path}/`),
  );
  const currIdx = TAB_ORDER.findIndex(
    (t) => curr === t.path || curr.startsWith(`${t.path}/`),
  );
  if (prevIdx < 0 || currIdx < 0) return "none";
  const N = TAB_ORDER.length;
  const forward = (currIdx - prevIdx + N) % N;
  const backward = (prevIdx - currIdx + N) % N;
  // Forward (sens du cycle) → la nouvelle page entre par la droite
  return forward <= backward ? "right" : "left";
}

export function SwipePager({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const startRef = useRef<PointerStart | null>(null);
  const prevPathnameRef = useRef<string | null>(null);

  const enabled = isTabBarRoute(pathname);
  // L'animation d'entrée ne doit JOUER que si la pageKey change. Pour les
  // transitions internes au groupe panorama (qui partagent "_panorama"),
  // on garde un direction="none" → pas de class CSS rejouée → pas de flash.
  const prevKey = prevPathnameRef.current
    ? pageKeyForPathname(prevPathnameRef.current)
    : null;
  const currKey = pageKeyForPathname(pathname);
  const direction =
    prevKey === currKey
      ? "none"
      : computeDirection(prevPathnameRef.current, pathname);

  useEffect(() => {
    prevPathnameRef.current = pathname;
  }, [pathname]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    if (e.pointerType === "mouse") return;
    startRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
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

    // Si la zone touchée est un scrollable horizontal qui peut encore
    // bouger dans le sens du swipe, on laisse le scroll natif et on
    // n'enclenche pas la navigation. Pour le panorama unifié (data-
    // unified-panorama), les bords correspondent EXACTEMENT aux zones
    // bureau (gauche) et coinL (droite) → pas de cas spécial.
    const target = document.elementFromPoint(s.x, s.y);
    const scrollAncestor = findHorizontallyScrollableAncestor(target);
    if (scrollAncestor) {
      const sl = scrollAncestor.scrollLeft;
      const max = scrollAncestor.scrollWidth - scrollAncestor.clientWidth;
      if (dx < 0 && sl < max - 1) return; // peut encore scroller à droite
      if (dx > 0 && sl > 1) return; // peut encore scroller à gauche
    }

    const idx = findActiveTabIndex(pathname);
    if (idx < 0) return;
    const N = TAB_ORDER.length;
    const next = dx < 0 ? (idx + 1) % N : (idx - 1 + N) % N;
    router.push(TAB_ORDER[next].path);
  };

  const onPointerCancel = () => {
    startRef.current = null;
  };

  const animClass =
    direction === "right"
      ? "broc-page-enter-right"
      : direction === "left"
        ? "broc-page-enter-left"
        : "";

  const pageKey = pageKeyForPathname(pathname);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ touchAction: "pan-y", minHeight: "100dvh" }}
    >
      <div key={pageKey} className={animClass}>
        {children}
      </div>
    </div>
  );
}
