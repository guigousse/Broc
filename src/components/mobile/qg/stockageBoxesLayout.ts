import type { CategorieObjet } from "@/types/game";

/**
 * Cartons cliquables sur l'étagère de stockage du panorama (zone atelier).
 *
 * Une boîte "all" (toutes catégories) + 7 boîtes (une par catégorie).
 * Chaque carton est positionné en `left` (vw absolu dans le panorama 600vw)
 * et `bottom` (% depuis le bas de la scène). Cliquer → /stockage/gerer
 * pré-filtré sur la catégorie (ou sans filtre pour "all").
 *
 * Coordonnées initiales = estimations placeholder. À ajuster via le dev edit
 * tool (?qgedit=1) puis copier les nouvelles valeurs ici.
 */

export type StockageBoxKey =
  | "boxAll"
  | "boxMusique"
  | "boxJeux"
  | "boxLivres"
  | "boxMode"
  | "boxMaison"
  | "boxArt"
  | "boxBricolage";

interface BoxLayout {
  left: number;
  bottom: number;
  width: number;
  /** Catégorie cible. `null` = pas de filtre (carton "tous"). */
  categorie: CategorieObjet | null;
  /** Image à afficher (sous /public). */
  src: string;
  /** Label accessible. */
  label: string;
}

/**
 * Source de vérité unique pour les 8 cartons.
 * `left` est en vw absolu dans le panorama unifié (la zone atelier commence
 * à 300vw, donc les valeurs sont typiquement dans [318, 340]).
 */
export const STOCKAGE_BOXES_LAYOUT: Record<StockageBoxKey, BoxLayout> = {
  boxAll: {
    left: 349.3,
    bottom: 43.3,
    width: 20.1,
    categorie: null,
    src: "/qg/boxes/box-all.webp",
    label: "Tous les objets",
  },
  boxMusique: {
    left: 367.4,
    bottom: 43.1,
    width: 20.1,
    categorie: "Musique",
    src: "/qg/boxes/box-musique.webp",
    label: "Musique",
  },
  boxJeux: {
    left: 385.1,
    bottom: 43.5,
    width: 20.1,
    categorie: "Jeux & Loisirs",
    src: "/qg/boxes/box-jeux.webp",
    label: "Jeux & Loisirs",
  },
  boxLivres: {
    left: 348.2,
    bottom: 29.8,
    width: 20.1,
    categorie: "Livres & Papeterie",
    src: "/qg/boxes/box-livres.webp",
    label: "Livres & Papeterie",
  },
  boxMode: {
    left: 366.9,
    bottom: 29.6,
    width: 21.6,
    categorie: "Mode",
    src: "/qg/boxes/box-mode.webp",
    label: "Mode",
  },
  boxMaison: {
    left: 385.1,
    bottom: 30.0,
    width: 20.1,
    categorie: "Maison",
    src: "/qg/boxes/box-maison.webp",
    label: "Maison",
  },
  boxArt: {
    left: 352.3,
    bottom: 16.5,
    width: 20.1,
    categorie: "Objets d'art",
    src: "/qg/boxes/box-art.webp",
    label: "Objets d'art",
  },
  boxBricolage: {
    left: 382.0,
    bottom: 16.1,
    width: 20.1,
    categorie: "Bricolage",
    src: "/qg/boxes/box-bricolage.webp",
    label: "Bricolage",
  },
};

export const STOCKAGE_BOX_ORDER: readonly StockageBoxKey[] = [
  "boxAll",
  "boxMusique",
  "boxJeux",
  "boxLivres",
  "boxMode",
  "boxMaison",
  "boxArt",
  "boxBricolage",
];

/**
 * Masque vertical au-dessus des cartons pour faire passer les cartons
 * "derrière" le montant droit de l'étagère (effet de profondeur).
 *
 * Le composant `EtagereLegMask` re-rend l'image de fond atelier dans
 * une fenêtre découpée (overflow:hidden) positionnée pile sur le
 * montant. zIndex 3 > cartons (zIndex 2 hérité).
 *
 * Coords éditables via le dev tool (?qgedit=1) sous la key `etagereLegRight`.
 */
export const ETAGERE_LEG_MASK_LAYOUT = {
  left: 407.0, // vw absolu (scène 600vw)
  bottom: 6.0, // % depuis le bas de la scène
  width: 6.0, // vw
  /** Hauteur du masque en % de la hauteur de scène (non éditable). */
  heightPct: 84,
} as const;
