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
    left: 321.0,
    bottom: 36.0,
    width: 6.5,
    categorie: null,
    src: "/qg/boxes/box-all.webp",
    label: "Tous les objets",
  },
  boxMusique: {
    left: 327.5,
    bottom: 36.0,
    width: 6.5,
    categorie: "Musique",
    src: "/qg/boxes/box-musique.webp",
    label: "Musique",
  },
  boxJeux: {
    left: 334.0,
    bottom: 36.0,
    width: 6.5,
    categorie: "Jeux & Loisirs",
    src: "/qg/boxes/box-jeux.webp",
    label: "Jeux & Loisirs",
  },
  boxLivres: {
    left: 321.0,
    bottom: 22.0,
    width: 6.5,
    categorie: "Livres & Papeterie",
    src: "/qg/boxes/box-livres.webp",
    label: "Livres & Papeterie",
  },
  boxMode: {
    left: 327.5,
    bottom: 22.0,
    width: 6.5,
    categorie: "Mode",
    src: "/qg/boxes/box-mode.webp",
    label: "Mode",
  },
  boxMaison: {
    left: 334.0,
    bottom: 22.0,
    width: 6.5,
    categorie: "Maison",
    src: "/qg/boxes/box-maison.webp",
    label: "Maison",
  },
  boxArt: {
    left: 325.0,
    bottom: 12.0,
    width: 6.5,
    categorie: "Objets d'art",
    src: "/qg/boxes/box-art.webp",
    label: "Objets d'art",
  },
  boxBricolage: {
    left: 331.5,
    bottom: 12.0,
    width: 6.5,
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
