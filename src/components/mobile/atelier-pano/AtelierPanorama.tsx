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

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  scrollSnapType: "x mandatory",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
};

const snapAnchorStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  width: "100vw",
  height: "100%",
  scrollSnapAlign: "center",
  pointerEvents: "none",
};

const ZONES: ZoneKey[] = ["stockage", "etabli", "coinL"];

export function AtelierPanorama({
  initialZone = "etabli",
  children,
  onScrollPos,
}: AtelierPanoramaProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = el.clientWidth;
    el.scrollLeft = ZONES.indexOf(initialZone) * vw;
    el.style.scrollBehavior = "smooth";
    if (onScrollPos) onScrollPos(ZONES.indexOf(initialZone));
  }, [initialZone, onScrollPos]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vw = el.clientWidth;
        if (vw <= 0) return;
        const pos = el.scrollLeft / vw;
        if (onScrollPos)
          onScrollPos(Math.max(0, Math.min(ZONES.length - 1, pos)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onScrollPos]);

  return (
    <div
      ref={ref}
      style={containerStyle}
      aria-label="Panorama atelier et stockage"
      data-atelier-panorama="1"
    >
      {children}
      {ZONES.map((_, i) => (
        <div
          key={i}
          style={{ ...snapAnchorStyle, left: `${i * 100}vw` }}
          aria-hidden
        />
      ))}
    </div>
  );
}
