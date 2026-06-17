/**
 * Coordonnées des objets dans le panorama du QG.
 *
 * Le panorama fait `panoramaWidth` vw de large. Chaque objet est positionné
 * en `left` (vw, depuis la gauche du panorama) et `bottom` (vh, depuis le bas
 * de la zone du panorama). `width` est en vw, la hauteur s'ajuste.
 *
 * Ces valeurs sont à ajuster après livraison des assets Gemini en regardant
 * le rendu dans `npm run dev` (Task 23 du plan).
 */
export const QG_LAYOUT = {
  panoramaWidth: 300, // vw
  /**
   * Aspect ratio EXACT de l'image de fond (fond-cabinet.png : 2752×1536).
   * Gemini Pro produit du 21:9 demandé mais sort en réalité ~1.79:1, pas
   * pile 16:9 — on cale ici sur les dimensions réelles du PNG pour que
   * `object-fit: cover` ne crop pas et que les coordonnées des objets
   * restent ancrées à l'image sur tous les viewports.
   */
  panoramaAspect: { w: 2752, h: 1536 },
  zones: {
    bureau: 0, // scroll-left à 0vw = vue gauche
    porte: 100, // vue par défaut
    repos: 200,
  },
  objets: {
    carnet: { left: 11.2, bottom: 20.2, width: 49.1 },
    carnetRouge: { left: 16.4, bottom: 8.2, width: 14.0 },
    porteRevues: { left: 108.0, bottom: 4.0, width: 16.0 },
    porte: { left: 135.2, bottom: 27.7, width: 24.0 },
    courrier: { left: 145.2, bottom: 14.8, width: 18.0 },
    fauteuil: { left: 202.8, bottom: 14.6, width: 36.3 },
    gramophone: { left: 245.7, bottom: 30.3, width: 17.0 },
    portemanteau: { left: 172.7, bottom: 15.4, width: 23.4 },
    calendrier: { left: 109.6, bottom: 54.3, width: 11.8 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
