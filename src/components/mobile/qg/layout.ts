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
    // dans le coin avant du plateau. Le journal est agrandi (×2) et
    // tourné -30° (anti-horaire). Voir QgJournal.tsx pour le transform.
    journal: { left: 18, bottom: 7, width: 22 },
    // Nouveau carnet = livre ouvert (asset ~3:1 wide), nettement plus grand.
    carnet: { left: 42, bottom: 14, width: 26 },
    // Porte (centre, 100–200vw) : zone invisible cliquable, la porte est
    // déjà peinte dans le fond. L'aspect-ratio est géré dans QgPorte.tsx.
    porte: { left: 138, bottom: 11, width: 24 },
    // Lettres au sol devant la porte, sur le runner persan.
    courrier: { left: 142, bottom: 4, width: 18 },
    // Repos (droite, 200–300vw) : fauteuil sur la zone libre du tapis.
    fauteuil: { left: 201, bottom: 10, width: 51 },
    // Gramophone : nouveau PNG sans pedestal, à poser sur le guéridon
    // peint dans le fond.
    gramophone: { left: 250, bottom: 26, width: 20 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
