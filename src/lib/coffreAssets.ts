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
  mask: string;
}

export const COFFRE_ASSETS: Record<string, CoffreAssets> = {
  rogers: {
    ouvert: "/coffre/rogers-ouvert.webp",
    ferme: "/coffre/rogers-ferme.webp",
    mask: "/coffre/rogers-mask.webp",
  },
  break: {
    ouvert: "/coffre/break-ouvert.webp",
    ferme: "/coffre/break-ferme.webp",
    mask: "/coffre/break-mask.webp",
  },
};

export function getCoffreAssets(visuelId: string): CoffreAssets | null {
  return COFFRE_ASSETS[visuelId] ?? null;
}
