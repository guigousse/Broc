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

export const UNIFIED_ZONE_ORDER: UnifiedZoneKey[] = ["bureau", "porte", "repos"];

/**
 * Centre de chaque zone en FRACTION de la largeur de la scène (0..1). Les 3
 * zones occupent des tiers égaux de l'image de fond → centres à 1/6, 1/2, 5/6.
 * Indépendant du device : la scène est dimensionnée par sa HAUTEUR (voir
 * sceneStyle), pas par une largeur fixe en vw.
 */
export const UNIFIED_ZONE_CENTER_FRACTION: Record<UnifiedZoneKey, number> = {
  bureau: 1 / 6,
  porte: 1 / 2,
  repos: 5 / 6,
};

/** Aspect exact de l'image de fond (fond-cabinet.webp : 2752×1536). */
const PANO_ASPECT_W = 2752;
const PANO_ASPECT_H = 1536;

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

// Ancre de snap : trait vertical fin au centre d'une zone, centré dans le
// viewport par scroll-snap. Positionnée en % de la largeur de la scène.
const snapAnchorStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  width: 1,
  height: "100%",
  transform: "translateX(-50%)",
  scrollSnapAlign: "center",
  pointerEvents: "none",
};

const sceneStyle: CSSProperties = {
  position: "relative",
  // Dimensionnée par la HAUTEUR : la scène remplit toujours toute la hauteur
  // visible (header↔tabbar), et sa largeur suit l'aspect de l'image. Sur écran
  // large (iPad), on voit une zone en entier + l'amorce des zones latérales,
  // au lieu de l'ancien modèle « 300vw » qui sur-zoomait et rognait le haut
  // (porte coupée). Sur téléphone, largeur ≈ 3 écrans → comportement inchangé.
  height: "100%",
  aspectRatio: `${PANO_ASPECT_W} / ${PANO_ASPECT_H}`,
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
  const sceneRef = useRef<HTMLDivElement>(null);
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
        const scene = sceneRef.current;
        if (!scene || el.clientWidth <= 0) return;
        // Centre du viewport dans le repère de la scène (px), comparé aux
        // centres de zone (fraction × largeur de scène).
        const viewportCenter = el.scrollLeft + el.clientWidth / 2;
        const sceneWidth = scene.offsetWidth;
        let closestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < UNIFIED_ZONE_ORDER.length; i++) {
          const z = UNIFIED_ZONE_ORDER[i];
          const centerPx = sceneWidth * UNIFIED_ZONE_CENTER_FRACTION[z];
          const dz = Math.abs(viewportCenter - centerPx);
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
      <div ref={sceneRef} style={sceneStyle} data-unified-scene="1">
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

        {/* Snap anchors (1 par zone), au centre de chaque zone (% de scène). */}
        {UNIFIED_ZONE_ORDER.map((zone) => (
          <div
            key={zone}
            data-unified-zone={zone}
            style={{
              ...snapAnchorStyle,
              left: `${UNIFIED_ZONE_CENTER_FRACTION[zone] * 100}%`,
            }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
