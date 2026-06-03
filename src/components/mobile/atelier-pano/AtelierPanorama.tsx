"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type ZoneKey = "stockage" | "etabli" | "coinL";

interface AtelierPanoramaProps {
  initialZone?: ZoneKey;
  children: ReactNode;
  /**
   * Appelé à chaque mouvement de scroll avec une position normalisée
   * (0 = stockage, 1 = établi, 2 = coin L).
   */
  onScrollPos?: (pos: number) => void;
}

// IMPORTANT : on N'UTILISE PAS `scroll-snap-type: mandatory` ici.
// iOS Safari le rend incompatible avec tout scroll programmatique
// (`scrollTo`, `el.scrollLeft = X`), au point que les sets sont soit
// ignorés, soit annulés par le snap engine. Conséquence observée :
// arrivée sur /atelier → scrollLeft reste à 0 → premier event de scroll
// dit "zone stockage" → router.replace("/stockage") → retour systématique.
// On gère donc le snap nous-mêmes en JS (animation rAF + snap à la fin
// d'un swipe utilisateur, cf. plus bas).
const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
};

const ZONES: ZoneKey[] = ["stockage", "etabli", "coinL"];

/**
 * Position de scroll (en vw) pour chaque zone. Plutôt que des multiples
 * stricts de 100vw (qui placeraient les snaps aux tiers exacts de l'image),
 * on décale légèrement pour centrer visuellement l'élément clé de chaque
 * zone dans le viewport.
 */
const ZONE_OFFSETS_VW: Record<ZoneKey, number> = {
  stockage: 18,
  etabli: 108,
  coinL: 195,
};

/** Anime scrollLeft vers `targetPx` en ~`duration` ms via rAF (easeOutCubic). */
function animateScrollLeft(
  el: HTMLElement,
  targetPx: number,
  duration: number,
  onDone?: () => void,
): () => void {
  const startPx = el.scrollLeft;
  const distance = targetPx - startPx;
  if (Math.abs(distance) < 1) {
    onDone?.();
    return () => {};
  }
  const start = performance.now();
  let rafId = 0;
  let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const t = Math.min((performance.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.scrollLeft = startPx + distance * eased;
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      el.scrollLeft = targetPx;
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

export function AtelierPanorama({
  initialZone = "etabli",
  children,
  onScrollPos,
}: AtelierPanoramaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onScrollPosRef = useRef(onScrollPos);
  useEffect(() => {
    onScrollPosRef.current = onScrollPos;
  }, [onScrollPos]);

  // Init au premier montage : positionne le scroll sur la zone initiale.
  // Plus de scroll-snap CSS → set direct fiable, pas de fight iOS.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = ref.current;
    if (!el) return;
    const vw = el.clientWidth;
    el.scrollLeft = (ZONE_OFFSETS_VW[initialZone] / 100) * vw;
    didInitRef.current = true;
    onScrollPosRef.current?.(ZONES.indexOf(initialZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener de scroll → propage la position normalisée au parent.
  // Snap JS : après 140 ms sans nouvel event de scroll (= fin de swipe),
  // on anime vers la zone la plus proche. C'est l'équivalent JS de
  // `scroll-snap-type: mandatory`, sans les bugs iOS.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let snapTimer: number | null = null;
    let snapAnim: (() => void) | null = null;
    let animating = false;

    const reportPos = () => {
      const vw = el.clientWidth;
      if (vw <= 0) return;
      const offset0 = ZONE_OFFSETS_VW.stockage;
      const span = ZONE_OFFSETS_VW.coinL - offset0;
      const pos = ((el.scrollLeft / vw) - offset0) * 2 / span;
      onScrollPosRef.current?.(
        Math.max(0, Math.min(ZONES.length - 1, pos)),
      );
    };

    const scheduleSnap = () => {
      if (snapTimer !== null) window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        snapTimer = null;
        if (animating) return;
        const vw = el.clientWidth;
        if (vw <= 0) return;
        // Trouve la zone la plus proche (en vw) de la position courante.
        const currentVw = el.scrollLeft / vw;
        let nearest: ZoneKey = "etabli";
        let bestDist = Infinity;
        for (const z of ZONES) {
          const d = Math.abs(currentVw - ZONE_OFFSETS_VW[z]);
          if (d < bestDist) {
            bestDist = d;
            nearest = z;
          }
        }
        const targetPx = (ZONE_OFFSETS_VW[nearest] / 100) * vw;
        if (Math.abs(el.scrollLeft - targetPx) < 2) return;
        animating = true;
        snapAnim = animateScrollLeft(el, targetPx, 260, () => {
          animating = false;
          snapAnim = null;
        });
      }, 140);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reportPos);
      if (!animating) scheduleSnap();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      if (snapTimer !== null) window.clearTimeout(snapTimer);
      if (snapAnim) snapAnim();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={containerStyle}
      aria-label="Panorama atelier et stockage"
      data-atelier-panorama="1"
    >
      {children}
    </div>
  );
}

export { animateScrollLeft, ZONE_OFFSETS_VW };
