"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

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
  // pan-x : restreint le geste tactile au scroll horizontal uniquement.
  // Empêche l'élastique iOS de tirer l'image vers le haut.
  touchAction: "pan-x",
  // Cache la barre de scroll (Firefox + Edge).
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
  // Aligne la scène en bas pour que le bord inférieur de l'image
  // touche le haut du bandeau inférieur (le surplus passe en haut,
  // confondu avec le bandeau supérieur via le fond forest-800).
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

const ZONES = ["bureau", "porte", "repos"] as const;

export function QgPanorama({
  initialZone = "porte",
  children,
  onScrollPos,
}: QgPanoramaProps) {
  const ref = useRef<HTMLDivElement>(null);

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
    </div>
  );
}
