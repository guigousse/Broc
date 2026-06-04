"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { QgEditOverlay } from "../qg/dev/QgEditOverlay";

/**
 * Panorama unifié 6 sections : bureau (1,2,3) → atelier (4,5,6).
 *
 * Un seul conteneur de scroll horizontal continu. Les images de fond
 * (qg + atelier) sont stitchées côte à côte. Les snap anchors couvrent
 * les 6 zones avec scroll-snap natif. L'expérience est fluide :
 * depuis la zone 4 (stockage), swipe vers la droite → zone 3 (repos)
 * sans interruption.
 *
 * Persistance : ce composant DOIT être monté dans une layout partagée
 * couvrant /bureau, /stockage, /atelier (sinon SwipePager re-key sur
 * pathname change et le scroll se perd).
 */

export type UnifiedZoneKey =
  | "bureau"
  | "porte"
  | "repos"
  | "stockage"
  | "etabli"
  | "coinL";

/**
 * Offsets en vw dans le panorama unifié (largeur totale 600vw).
 * Les offsets atelier sont décalés de +300vw (après l'image bureau).
 */
export const UNIFIED_ZONE_OFFSETS: Record<UnifiedZoneKey, number> = {
  bureau: 0,
  porte: 100,
  repos: 200,
  stockage: 18 + 300, // 318
  etabli: 108 + 300, // 408
  coinL: 195 + 300, // 495
};

export const UNIFIED_ZONE_ORDER: UnifiedZoneKey[] = [
  "bureau",
  "porte",
  "repos",
  "stockage",
  "etabli",
  "coinL",
];

export const UNIFIED_PANORAMA_WIDTH_VW = 600;
/** Décalage des coordonnées atelier en vw (à ajouter aux `left` originaux). */
export const ATELIER_X_SHIFT_VW = 300;

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
  // Hauteur = aspect d'une image (les 2 ont le même aspect 2752:1536),
  // proportionnée à la largeur d'UNE moitié (300vw).
  height: `calc(300vw * 1536 / 2752)`,
  flexShrink: 0,
};

const bgQgStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "300vw",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  pointerEvents: "none",
  userSelect: "none",
  display: "block",
};

const bgAtelierStyle: CSSProperties = {
  position: "absolute",
  left: "300vw",
  top: 0,
  width: "300vw",
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
   * Index de zone fractionnaire (0 = bureau ... 5 = coinL). Émis à
   * chaque rAF de scroll, après ré-interpolation depuis scrollLeft.
   */
  onZoneIndex?: (idx: number) => void;
}

export function UnifiedPanorama({
  initialZone = "porte",
  children,
  onZoneIndex,
}: UnifiedPanoramaProps) {
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
        // Trouve la zone la plus proche (en vw).
        let closestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < UNIFIED_ZONE_ORDER.length; i++) {
          const z = UNIFIED_ZONE_ORDER[i];
          const d = Math.abs(currentVw - UNIFIED_ZONE_OFFSETS[z]);
          if (d < bestDist) {
            bestDist = d;
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
      aria-label="Panorama du local (bureau, stockage, atelier)"
      data-unified-panorama="1"
    >
      <div style={sceneStyle} data-unified-scene="1">
        {/* Fonds stitchés */}
        <img
          src="/qg/fond-cabinet.webp"
          alt=""
          style={bgQgStyle}
          draggable={false}
        />
        <img
          src="/atelier/fond-atelier.png"
          alt=""
          style={bgAtelierStyle}
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

/** Mappe un index de zone (0-5) vers le tab URL associé. */
export function zoneIndexToTab(idx: number): "bureau" | "stockage" | "atelier" {
  if (idx <= 2) return "bureau";
  if (idx === 3) return "stockage";
  return "atelier";
}

/** Sélecteur d'un anchor de zone, pour scrollIntoView programmatique. */
export function unifiedZoneAnchorSelector(zone: UnifiedZoneKey): string {
  return `[data-unified-zone="${zone}"]`;
}
