"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

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

// On garde `scroll-snap-type: x mandatory` pour le confort de scroll
// natif (snap au doigt, élasticité, vitesse). Pour les navigations
// programmatiques (clic TabBar → zone établi), on utilise
// `anchor.scrollIntoView({behavior:"smooth", inline:"center"})` plutôt
// que `scrollTo()` ou `el.scrollLeft = X` : c'est l'API snap-aware du
// navigateur, fiable sur iOS Safari (à la différence des deux autres).
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

/**
 * Position de scroll (en vw) pour chaque zone — utilisée par les anchors
 * et par la conversion scrollLeft → pos pour le parent.
 */
export const ZONE_OFFSETS_VW: Record<ZoneKey, number> = {
  stockage: 18,
  etabli: 108,
  coinL: 195,
};

/**
 * Sélecteur d'anchor d'une zone. Utilisé par AtelierPanoramaView pour
 * appeler `scrollIntoView` programmatique sans coupler les composants.
 */
export function panoramaZoneAnchorSelector(zone: ZoneKey): string {
  return `[data-atelier-zone="${zone}"]`;
}

export function AtelierPanorama({
  initialZone = "etabli",
  children,
  onScrollPos,
}: AtelierPanoramaProps) {
  const { d } = useLangue();
  const ref = useRef<HTMLDivElement>(null);
  const onScrollPosRef = useRef(onScrollPos);
  useEffect(() => {
    onScrollPosRef.current = onScrollPos;
  }, [onScrollPos]);

  // Init au premier montage : `scrollIntoView` sans smooth pour saut
  // instantané, sans fight avec le snap engine iOS.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = ref.current;
    if (!el) return;
    const anchor = el.querySelector(
      panoramaZoneAnchorSelector(initialZone),
    ) as HTMLElement | null;
    if (!anchor) return;
    // Force scrollBehavior=auto le temps du scroll d'init (sinon il
    // serait smooth si on l'a mis ailleurs).
    const saved = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    anchor.scrollIntoView({ inline: "center", block: "nearest" });
    el.style.scrollBehavior = saved;
    didInitRef.current = true;
    onScrollPosRef.current?.(ZONES.indexOf(initialZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener de scroll → position normalisée.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vw = el.clientWidth;
        if (vw <= 0) return;
        const offset0 = ZONE_OFFSETS_VW.stockage;
        const span = ZONE_OFFSETS_VW.coinL - offset0;
        const pos = ((el.scrollLeft / vw) - offset0) * 2 / span;
        onScrollPosRef.current?.(
          Math.max(0, Math.min(ZONES.length - 1, pos)),
        );
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
      aria-label={d.qg.panoAtelierStockage}
      data-atelier-panorama="1"
    >
      {children}
      {ZONES.map((zone) => (
        <div
          key={zone}
          data-atelier-zone={zone}
          style={{
            ...snapAnchorStyle,
            left: `${ZONE_OFFSETS_VW[zone]}vw`,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}
