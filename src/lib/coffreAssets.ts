/**
 * URL des assets visuels par niveau de camion (key = `CamionConfig.visuelId`).
 *
 * Convention dossier : `public/coffre/{visuelId}-{etat}.webp` où `etat` est
 * `ouvert`, `ferme` ou `mask`.
 *
 * Si un visuel n'est pas listé, l'UI tombe sur un fallback générique (carré).
 */
export interface CoffreAssets {
  ouvert: string;
  ferme: string;
  /** Masque strict du contenant (silhouette blanche exacte) — sert à la collision. */
  mask: string;
  /** Masque dilaté de 20 px (offset autour du contenant) — sert au clip CSS. */
  maskExpanded: string;
}

export const COFFRE_ASSETS: Record<string, CoffreAssets> = {
  rogers: {
    ouvert: "/coffre/rogers-ouvert.webp",
    ferme: "/coffre/rogers-ferme.webp",
    mask: "/coffre/rogers-mask.webp",
    maskExpanded: "/coffre/rogers-mask-expanded.webp",
  },
  break: {
    ouvert: "/coffre/break-ouvert.webp",
    ferme: "/coffre/break-ferme.webp",
    mask: "/coffre/break-mask.webp",
    maskExpanded: "/coffre/break-mask-expanded.webp",
  },
  utilitaire: {
    ouvert: "/coffre/utilitaire-ouvert.webp",
    ferme: "/coffre/utilitaire-ferme.webp",
    mask: "/coffre/utilitaire-mask.webp",
    maskExpanded: "/coffre/utilitaire-mask-expanded.webp",
  },
};

export function getCoffreAssets(visuelId: string): CoffreAssets | null {
  return COFFRE_ASSETS[visuelId] ?? null;
}
