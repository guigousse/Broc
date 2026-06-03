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

/**
 * Position de scroll (en vw) pour chaque zone. Plutôt que des multiples
 * stricts de 100vw (qui placeraient les snaps aux tiers exacts de l'image),
 * on décale légèrement pour centrer visuellement l'élément clé de chaque
 * zone dans le viewport :
 *   • zone 0 (stockage) — l'étagère est dans la moitié droite du tiers
 *     gauche, on décale donc la snap vers la droite pour la recentrer.
 *   • zone 1 (établi)   — déjà parfaitement centrée à 50% de l'image.
 *   • zone 2 (coin L)   — le retour d'établi est dans la moitié gauche du
 *     tiers droit, on décale donc la snap vers la gauche.
 */
const ZONE_OFFSETS_VW: Record<ZoneKey, number> = {
  stockage: 18,
  etabli: 108,
  coinL: 195,
};

export function AtelierPanorama({
  initialZone = "etabli",
  children,
  onScrollPos,
}: AtelierPanoramaProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Garde un pointeur stable vers le dernier callback : évite que les
  // re-rendus du parent (via setState) remontent l'effet d'init et fassent
  // sauter le scroll en plein swipe.
  const onScrollPosRef = useRef(onScrollPos);
  useEffect(() => {
    onScrollPosRef.current = onScrollPos;
  }, [onScrollPos]);

  // Init UNIQUEMENT au premier montage. `initialZone` peut changer par la
  // suite (navigation entre /atelier et /stockage) mais on ne veut PAS
  // re-snapper, car le scroll en cours est piloté par le doigt de
  // l'utilisateur.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = ref.current;
    if (!el) return;
    const vw = el.clientWidth;
    el.scrollLeft = (ZONE_OFFSETS_VW[initialZone] / 100) * vw;
    el.style.scrollBehavior = "smooth";
    didInitRef.current = true;
    onScrollPosRef.current?.(ZONES.indexOf(initialZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vw = el.clientWidth;
        if (vw <= 0) return;
        // Conversion scrollLeft → position de zone (0..2) en utilisant les
        // offsets décalés. Les snaps stockage/établi/coinL sont à 14/100/186
        // vw : on interpole linéairement (les écarts sont égaux à 86 vw).
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
      aria-label="Panorama atelier et stockage"
      data-atelier-panorama="1"
    >
      {children}
      {ZONES.map((zone) => (
        <div
          key={zone}
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
