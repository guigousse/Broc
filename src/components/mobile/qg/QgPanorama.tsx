"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface QgPanoramaProps {
  initialZone?: "bureau" | "porte" | "repos";
  children: ReactNode;
  /**
   * Appelé à chaque mouvement de scroll avec une position normalisée
   * (0 = bureau, 1 = porte, 2 = repos).
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
  display: "flex",
  flexDirection: "row",
};

const snapAnchorStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  width: "100vw",
  height: "100%",
  scrollSnapAlign: "center",
  pointerEvents: "none",
};

const dotsWrap: CSSProperties = {
  position: "absolute",
  bottom: 8,
  left: 0,
  right: 0,
  display: "flex",
  gap: 6,
  justifyContent: "center",
  zIndex: 10,
  pointerEvents: "none",
};

const dotBase: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.4)",
};

const dotActive: CSSProperties = {
  ...dotBase,
  background: "var(--brass-500)",
};

const ZONES = ["bureau", "porte", "repos"] as const;

export function QgPanorama({
  initialZone = "porte",
  children,
  onScrollPos,
}: QgPanoramaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(ZONES.indexOf(initialZone));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = el.clientWidth;
    el.scrollLeft = ZONES.indexOf(initialZone) * vw;
    el.style.scrollBehavior = "smooth";
    // Notifie la position initiale.
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
        const idx = Math.round(pos);
        setActiveIdx(Math.max(0, Math.min(ZONES.length - 1, idx)));
        if (onScrollPos) onScrollPos(Math.max(0, Math.min(ZONES.length - 1, pos)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onScrollPos]);

  return (
    <div ref={ref} style={containerStyle} aria-label="Panorama du QG" data-qg-panorama="1">
      {children}
      {ZONES.map((_, i) => (
        <div key={i} style={{ ...snapAnchorStyle, left: `${i * 100}vw` }} aria-hidden />
      ))}
      <div style={dotsWrap} aria-hidden>
        {ZONES.map((_, i) => (
          <div key={i} style={i === activeIdx ? dotActive : dotBase} />
        ))}
      </div>
    </div>
  );
}
