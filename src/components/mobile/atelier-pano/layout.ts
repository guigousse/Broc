/**
 * Coordonnées des objets dans le panorama Atelier + Stockage.
 *
 * Le panorama fait `panoramaWidth` vw de large et est divisé en 3 zones snap :
 *   • zone 0 (stockage)         — gauche  : porte verte + étagère métal
 *   • zone 1 (atelier / établi) — centre  : établi sous fenêtre vitrail
 *   • zone 2 (atelier / coin L) — droite  : retour d'établi sur mur droit
 *
 * Onglet TabBar dérivé :
 *   • zone < 0.5 → "Stockage"
 *   • zone ≥ 0.5 → "Atelier"
 */
export const ATELIER_LAYOUT = {
  panoramaWidth: 300, // vw, idem QG
  /**
   * Aspect ratio réel du fond généré (Gemini Pro 16:9 réel ≈ 1.79:1).
   * À recaler exactement quand on aura mesuré l'asset.
   */
  panoramaAspect: { w: 2752, h: 1536 },
  zones: {
    stockage: 0,
    etabli: 1,
    coinL: 2,
  },
  objets: {
    // À ajuster après visualisation dans /atelier (mode edit).
    porte: { left: 4.5, bottom: 12, width: 14 },
    etagere: { left: 21, bottom: 10, width: 22 },
    etabli: { left: 110, bottom: 16, width: 60 },
    etagereMurale: { left: 235, bottom: 50, width: 16 },
    lustre: { left: 240, bottom: 70, width: 14 },
  },
  /**
   * Rangée de slots de restauration affichée au-dessus de l'établi, sur le
   * rebord intérieur de la fenêtre vitrail. Coordonnées en vw (left), %
   * (bottom) et vw (width / slotSize / gap). Le composant WorkshopSlots
   * centre N slots (N = niveauAtelier) dans cette rangée.
   */
  slotsRangee: {
    centerLeft: 140, // vw — centre horizontal sur l'établi (left=110, width=60 → centre 140)
    bottom: 48,      // %  — sur le rebord de fenêtre, au-dessus de l'établi (bottom=16, devant le vitrail)
    slotSize: 9,     // vw — taille d'un slot (largeur = hauteur)
    gap: 1.5,        // vw — espace entre slots
  },
} as const;

export type AtelierObjetKey = keyof typeof ATELIER_LAYOUT.objets;

/** Convertit une position de scroll (0..2) en onglet TabBar actif. */
export function zoneToTab(pos: number): "stockage" | "atelier" {
  return pos < 0.5 ? "stockage" : "atelier";
}
