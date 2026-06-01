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
    // Bureau (gauche, 0–100vw) : journal + carnet posés sur la surface du bureau
    // dans la zone laissée libre devant la lampe et l'encrier.
    journal: { left: 55, bottom: 33, width: 10 },
    carnet: { left: 68, bottom: 33, width: 10 },
    // Porte (centre, 100–200vw) : centrée à 150vw, sur la porte peinte dans le fond.
    porte: { left: 138, bottom: 11, width: 24 },
    // Lettres au sol devant la porte, sur le runner persan.
    courrier: { left: 142, bottom: 4, width: 18 },
    // Repos (droite, 200–300vw) : fauteuil sur la zone libre du tapis devant la cheminée.
    fauteuil: { left: 210, bottom: 8, width: 28 },
    // Gramophone sur le guéridon à droite du tapis.
    gramophone: { left: 256, bottom: 24, width: 14 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
