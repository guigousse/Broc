/**
 * Coordonnées des objets de la scène du Bazar.
 *
 * MÊME REPÈRE QUE LE QG : `left`/`width` en vw sur un panorama de référence de
 * 300vw, `bottom` en % de la hauteur de scène. Ce n'est pas un hasard —
 * l'outil de calage dev (`?qgedit=1`) calcule ses déplacements en
 * `window.innerWidth / 100`. Une convention en % ici rendrait l'outil
 * inutilisable sur cette scène.
 *
 * Valeurs de départ posées à la lecture du fond ; à affiner à la souris.
 */
export const BAZAR_LAYOUT = {
  panoramaWidth: 300,
  panoramaAspect: { w: 2752, h: 1536 },
  objets: {
    // Zone gauche (0..100vw) — réservé, muet.
    borne: { left: 61.0, bottom: 18.0, width: 30.0 },
    // Zone centre (100..200vw) — la grille de neuf cases, mesurée sur le fond :
    // l'étagère occupe 36 %..64 % de la largeur, ses trois rangées sont à
    // 53 %, 62 % et 71 % de la hauteur.
    case1: { left: 111.0, bottom: 71.0, width: 24.0 },
    case2: { left: 139.0, bottom: 71.0, width: 24.0 },
    case3: { left: 167.0, bottom: 71.0, width: 24.0 },
    case4: { left: 111.0, bottom: 62.0, width: 24.0 },
    case5: { left: 139.0, bottom: 62.0, width: 24.0 },
    case6: { left: 167.0, bottom: 62.0, width: 24.0 },
    case7: { left: 111.0, bottom: 53.0, width: 24.0 },
    case8: { left: 139.0, bottom: 53.0, width: 24.0 },
    case9: { left: 167.0, bottom: 53.0, width: 24.0 },
    // La bande de mur nu entre le plateau du comptoir et la première planche.
    vendeur: { left: 138.0, bottom: 40.0, width: 24.0 },
    // Zone droite (200..300vw) — réservé et sortie.
    table: { left: 209.0, bottom: 18.0, width: 44.0 },
    porte: { left: 270.0, bottom: 20.0, width: 28.0 },
  },
} as const;

export type BazarObjetKey = keyof typeof BAZAR_LAYOUT.objets;

/**
 * Les trois lots de pièces vont sur la rangée du BAS — la plus proche de la
 * main, et la seule que la suspension n'éclipse pas.
 */
export const CLES_LOTS: BazarObjetKey[] = ["case7", "case8", "case9"];

/** L'objet de la semaine trône au centre de la grille. */
export const CLE_VITRINE: BazarObjetKey = "case5";
