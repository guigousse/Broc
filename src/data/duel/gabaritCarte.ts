import type { Rarete } from "@/types/game";

/**
 * LE GABARIT D'UNE CARTE DE DUEL — où le composant `CarteDuel` écrit sur le
 * fond peint (`public/cartes/fond-<rarete>.webp`).
 *
 * Chaque fond est un cadre Art Déco généré par Gemini (2026-09-04,
 * `scripts/generate-fonds-cartes.mjs`) avec des zones laissées VIDES : un
 * bandeau de nom, une fenêtre d'illustration, un cartouche de texte et
 * quatre médaillons d'angle. Les rectangles ci-dessous sont ces zones,
 * MESURÉES sur les fonds (`--zones` du script : composantes connexes du
 * crème plat), puis resserrées d'une marge à l'œil pour que le texte ne
 * touche pas l'ornement. Un cadre regénéré exige de les remesurer.
 *
 * Unités : % de la LARGEUR de la carte pour `x`/`w`, % de sa HAUTEUR pour
 * `y`/`h`. Le composant pose tout en `position: absolute` là-dessus, donc le
 * gabarit vaut à toute taille — la pochette du classeur comme la fiche.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GabaritCarte {
  /** Le bandeau du nom, en haut, entre les deux médaillons. */
  nom: Rect;
  /** La fenêtre d'illustration (paysage, ~4:3). */
  fenetre: Rect;
  /** Le cartouche du texte d'effet. Le numéro x/50 vit dans son coin bas droit. */
  texte: Rect;
  /** Médaillons d'angle : coût (haut gauche), série (haut droit), attaque (bas gauche), PV (bas droit). */
  cout: Rect;
  serie: Rect;
  attaque: Rect;
  pv: Rect;
}

/** 5:7, le format d'une vraie carte à jouer (63 × 88 mm), celui des fonds. */
export const RATIO_CARTE = "5 / 7";

export const GABARITS: Record<Rarete, GabaritCarte> = {
  commun: {
    nom: { x: 29, y: 9.4, w: 42, h: 5.2 },
    fenetre: { x: 15.2, y: 21.8, w: 69.6, h: 36.6 },
    texte: { x: 19, y: 67.4, w: 62, h: 18.8 },
    cout: { x: 9.6, y: 6.9, w: 12.8, h: 9.4 },
    serie: { x: 77.6, y: 6.9, w: 12.8, h: 9.4 },
    attaque: { x: 10, y: 83.4, w: 12.4, h: 9.4 },
    pv: { x: 77.6, y: 83.4, w: 12.4, h: 9.4 },
  },
  rare: {
    nom: { x: 27, y: 7.2, w: 46, h: 5.2 },
    fenetre: { x: 14.4, y: 18.1, w: 71.2, h: 39.5 },
    texte: { x: 16, y: 67, w: 68, h: 22.4 },
    cout: { x: 5.6, y: 4.3, w: 14.8, h: 10.9 },
    serie: { x: 79.6, y: 4.3, w: 14.8, h: 10.9 },
    attaque: { x: 5.6, y: 84.9, w: 15.2, h: 11.1 },
    pv: { x: 79.2, y: 84.9, w: 15.2, h: 11.1 },
  },
  legendaire: {
    nom: { x: 25.4, y: 8, w: 49.2, h: 5.4 },
    fenetre: { x: 12.4, y: 20.4, w: 75.2, h: 37.8 },
    texte: { x: 14, y: 63.2, w: 72, h: 22.4 },
    cout: { x: 8.4, y: 6.3, w: 13.2, h: 9.7 },
    serie: { x: 78.4, y: 6.3, w: 13.2, h: 9.7 },
    attaque: { x: 8.4, y: 84.6, w: 13.2, h: 9.7 },
    pv: { x: 78.4, y: 84.6, w: 13.6, h: 9.7 },
  },
};

/** Le fond peint d'une rareté. */
export function fondCarteSrc(rarete: Rarete): string {
  return `/cartes/fond-${rarete}.webp`;
}
