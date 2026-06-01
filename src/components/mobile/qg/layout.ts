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
  zones: {
    bureau: 0, // scroll-left à 0vw = vue gauche
    porte: 100, // vue par défaut
    repos: 200,
  },
  objets: {
    journal: { left: 14, bottom: 32, width: 12 },
    carnet: { left: 26, bottom: 32, width: 12 },
    porte: { left: 136, bottom: 14, width: 28 },
    courrier: { left: 134, bottom: 6, width: 14 },
    fauteuil: { left: 226, bottom: 12, width: 32 },
    gramophone: { left: 258, bottom: 22, width: 16 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
