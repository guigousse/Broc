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
 *
 * Pas de `panoramaWidth` ici : le repère de 300 vw est celui du QG, et
 * `qgPct()` (seule voie de conversion vers un % de scène) divise par
 * `QG_LAYOUT.panoramaWidth`. Un second champ portant le même nombre serait une
 * deuxième source de vérité que rien ne relierait à la première.
 */
export const BAZAR_LAYOUT = {
  panoramaAspect: { w: 2752, h: 1536 },
  objets: {
    // Zone gauche (0..100vw) — réservé, muet.
    borne: { left: 61.0, bottom: 18.0, width: 30.0 },
    // Zone centre (100..200vw) — la grille de six cases, mesurée sur le fond :
    // deux planches, trois emplacements par planche.
    case1: { left: 114.0, bottom: 66.0, width: 20.0 },
    case2: { left: 136.0, bottom: 66.0, width: 20.0 },
    case3: { left: 158.0, bottom: 66.0, width: 20.0 },
    case4: { left: 114.0, bottom: 56.0, width: 20.0 },
    case5: { left: 136.0, bottom: 56.0, width: 20.0 },
    case6: { left: 158.0, bottom: 56.0, width: 20.0 },
    // La bande de mur nu entre le plateau du comptoir et la première planche.
    vendeur: { left: 138.0, bottom: 40.0, width: 24.0 },
    // Zone droite (200..300vw) — réservé et sortie.
    table: { left: 209.0, bottom: 18.0, width: 44.0 },
    sortie: { left: 270.0, bottom: 20.0, width: 28.0 },
  },
} as const;

export type BazarObjetKey = keyof typeof BAZAR_LAYOUT.objets;

/**
 * Toutes les clés du Bazar, dans l'ordre du dictionnaire. C'est la liste que
 * la scène passe à l'overlay de calage et que le panneau dev liste.
 */
export const CLES_BAZAR = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];

/**
 * Les trois lots de pièces vont sur la planche du BAS — la plus proche de la
 * main, et celle que le regard rencontre en premier en arrivant au comptoir.
 */
export const CLES_LOTS: BazarObjetKey[] = ["case4", "case5", "case6"];

/** L'objet de la semaine trône au milieu de la planche du HAUT. */
export const CLE_VITRINE: BazarObjetKey = "case2";
