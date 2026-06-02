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
    // Bureau (gauche, 0–100vw) : journal + carnet posés au PREMIER PLAN
    // dans le coin avant-droit du plateau de bureau, devant les objets de
    // déco déjà peints (lampe, encrier, sous-main).
    journal: { left: 22, bottom: 17, width: 9 },
    carnet: { left: 35, bottom: 18, width: 9 },
    // Porte (centre, 100–200vw) : zone invisible cliquable, la porte est
    // déjà peinte dans le fond. L'aspect-ratio est géré dans QgPorte.tsx.
    porte: { left: 138, bottom: 11, width: 24 },
    // Lettres au sol devant la porte, sur le runner persan.
    courrier: { left: 142, bottom: 4, width: 18 },
    // Repos (droite, 200–300vw) : fauteuil sur la zone libre du tapis.
    fauteuil: { left: 203, bottom: 13, width: 51 },
    // Gramophone sur le guéridon, miroir géré dans QgGramophone.tsx.
    gramophone: { left: 245, bottom: 23, width: 56 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
