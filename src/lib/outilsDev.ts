/**
 * Vrai uniquement en développement local (`npm run dev`). Gate unique de tous
 * les outils d'édition/calage (panneau camion du coffre, éditeur de cadres
 * des brocantes, mode édition du QG) : dans les builds de production la
 * constante est repliée à `false` à la compilation et le code des outils est
 * éliminé du bundle — aucun bouton, query param ou clé localStorage ne peut
 * les réactiver sur l'appareil d'un joueur.
 */
export const OUTILS_DEV = process.env.NODE_ENV === "development";
