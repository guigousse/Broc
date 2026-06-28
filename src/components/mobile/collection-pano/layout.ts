import type { CSSProperties } from "react";

/**
 * Coordonnées de la section Collection (cabinet du grand-père).
 *
 * Section de 300vw, posée à GAUCHE du bureau dans le panorama unifié (offsets
 * 0–300). La vitrine est rendue NON décalée (left absolu 0–300vw) — contrairement
 * aux objets QG/atelier qui sont décalés de +300vw par un wrapper (cf. Task 4).
 *
 * `left`/`width` en vw, `bottom` en % depuis le bas de la scène.
 * Valeurs initiales estimées sur l'image — à affiner en Task 9 (npm run dev).
 */
export const COLLECTION_LAYOUT = {
  panoramaWidth: 300, // vw
  panoramaAspect: { w: 2752, h: 1536 },
  objets: {
    // Grande vitrine vitrée centrale (le hotspot).
    vitrine: { left: 118, bottom: 40, width: 64, aspectRatio: "1 / 0.95" },
  },
} as const;

export type CollectionObjetKey = keyof typeof COLLECTION_LAYOUT.objets;

/** Style absolu d'un objet de la section Collection (pas de surcouche d'édition). */
export function collectionObjetStyle(key: CollectionObjetKey): CSSProperties {
  const o = COLLECTION_LAYOUT.objets[key];
  return {
    position: "absolute",
    left: `${o.left}vw`,
    bottom: `${o.bottom}%`,
    width: `${o.width}vw`,
    aspectRatio: o.aspectRatio,
    pointerEvents: "auto",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    padding: 0,
  };
}
