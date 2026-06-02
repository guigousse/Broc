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
  /** Aspect ratio de l'image de fond (fond-cabinet.png : 16:9). */
  panoramaAspect: { w: 16, h: 9 },
  zones: {
    bureau: 0, // scroll-left à 0vw = vue gauche
    porte: 100, // vue par défaut
    repos: 200,
  },
  objets: {
    journal: { left: 15.0, bottom: 7.6, width: 25.9 },
    carnet: { left: 11.2, bottom: 20.2, width: 49.1 },
    porte: { left: 135.2, bottom: 27.7, width: 24.0 },
    courrier: { left: 145.2, bottom: 14.8, width: 18.0 },
    fauteuil: { left: 199.1, bottom: 13.1, width: 44.0 },
    gramophone: { left: 247.7, bottom: 30.3, width: 17.0 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
