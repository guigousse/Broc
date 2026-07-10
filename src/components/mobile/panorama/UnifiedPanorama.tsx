"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { QgEditOverlay } from "../qg/dev/QgEditOverlay";

/**
 * Panorama du bureau : une seule image de fond (`/qg/fond-cabinet.webp`,
 * 300vw), 3 zones de snap (bureau · porte · repos) avec scroll horizontal
 * natif. Le stockage, l'atelier et la collection ne sont plus des sections
 * du panorama : on y accède directement par la TabBar.
 */

export type UnifiedZoneKey = "bureau" | "porte" | "repos";

/** Offsets en vw des centres de zone (largeur totale 300vw). */
export const UNIFIED_ZONE_OFFSETS: Record<UnifiedZoneKey, number> = {
  bureau: 0,
  porte: 100,
  repos: 200,
};

export const UNIFIED_ZONE_ORDER: UnifiedZoneKey[] = ["bureau", "porte", "repos"];

export const UNIFIED_PANORAMA_WIDTH_VW = 300;

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

const sceneStyle: CSSProperties = {
  position: "relative",
  width: `${UNIFIED_PANORAMA_WIDTH_VW}vw`,
  // Hauteur proportionnée à l'aspect de l'image bureau (2752:1536).
  height: `calc(${UNIFIED_PANORAMA_WIDTH_VW}vw * 1536 / 2752)`,
  flexShrink: 0,
};

const bgStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  pointerEvents: "none",
  userSelect: "none",
  display: "block",
};

const objectsLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  pointerEvents: "none",
};

interface UnifiedPanoramaProps {
  initialZone?: UnifiedZoneKey;
  children?: ReactNode;
  /**
   * Index de la zone la plus proche (0 = bureau … 2 = repos), émis à
   * chaque rAF de scroll. Seule l'init (mount) émet l'index exact de la
   * zone cible ; ensuite l'index est celui de la zone la plus proche
   * (entier snappé), pas une valeur fractionnaire.
   */
  onZoneIndex?: (idx: number) => void;
}

export function UnifiedPanorama({
  initialZone = "porte",
  children,
  onZoneIndex,
}: UnifiedPanoramaProps) {
  const { d } = useLangue();
  const ref = useRef<HTMLDivElement>(null);
  const onZoneIndexRef = useRef(onZoneIndex);
  useEffect(() => {
    onZoneIndexRef.current = onZoneIndex;
  }, [onZoneIndex]);

  // Init scroll position sur la zone cible (au mount UNIQUEMENT).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = ref.current;
    if (!el) return;
    const anchor = el.querySelector(
      `[data-unified-zone="${initialZone}"]`,
    ) as HTMLElement | null;
    if (!anchor) return;
    const saved = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    anchor.scrollIntoView({ inline: "center", block: "nearest" });
    el.style.scrollBehavior = saved;
    didInitRef.current = true;
    onZoneIndexRef.current?.(UNIFIED_ZONE_ORDER.indexOf(initialZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener de scroll → index de zone fractionnaire vers le parent.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const clientWidth = el.clientWidth;
        if (clientWidth <= 0) return;
        // scrollLeft en vw (1vw = 1% de la largeur du viewport ≈ clientWidth).
        const currentVw = (el.scrollLeft / clientWidth) * 100;
        let closestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < UNIFIED_ZONE_ORDER.length; i++) {
          const z = UNIFIED_ZONE_ORDER[i];
          const dz = Math.abs(currentVw - UNIFIED_ZONE_OFFSETS[z]);
          if (dz < bestDist) {
            bestDist = dz;
            closestIdx = i;
          }
        }
        onZoneIndexRef.current?.(closestIdx);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={containerStyle}
      aria-label={d.qg.panorama}
      data-unified-panorama="1"
    >
      <div style={sceneStyle} data-unified-scene="1">
        <img
          src="/qg/fond-cabinet.webp"
          alt=""
          style={bgStyle}
          draggable={false}
        />
        {/* Objets interactifs positionnés au-dessus */}
        <div style={objectsLayer}>
          {children}
          {/* L'overlay s'auto-gate via le contexte d'édition (enabled + active). */}
          <QgEditOverlay />
        </div>
      </div>

      {/* Snap anchors (1 par zone) */}
      {UNIFIED_ZONE_ORDER.map((zone) => (
        <div
          key={zone}
          data-unified-zone={zone}
          style={{
            ...snapAnchorStyle,
            left: `${UNIFIED_ZONE_OFFSETS[zone]}vw`,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}
