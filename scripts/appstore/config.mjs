/**
 * Configuration du pipeline des visuels App Store.
 * Module pur : chemins, constantes, interfaces.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const CHEMINS = {
  racine: RACINE,
  export: path.join(RACINE, "out"),
  sorties: path.join(RACINE, "marketing/appstore"),
  captures: path.join(RACINE, "marketing/appstore/.captures"),
  saveDemo: path.join(RACINE, "scripts/save-demo.json"),
  portraitsHd: path.join(RACINE, "public/personas/grand-pere/hd"),
  personas: path.join(RACINE, "public/personas"),
  globalsCss: path.join(RACINE, "src/app/globals.css"),
  fonts: path.join(RACINE, "public"),
};

export const LANGUES = ["fr", "en", "es", "el"];

/** La brocante armée par scripts/gen-save-demo.ts (stand garni) — visuel 3. */
export const BROCANTE_DEMO = "marche-saint-ouen";

/**
 * Brocante des visuels de chinage (1 et 2). Le stock d'une session est tiré
 * selon `MIX_RARETE_PAR_TIER` (src/lib/chine.ts) : un palier 2 ne sort que du
 * commun — les dix cartes des Grandes Puces valent de 4 à 29 €, ce qui dessert
 * la promesse « dénichez des trésors ». La Grande Foire aux Antiquités est de
 * palier 3, avec un pool exclusif de légendaires et un décor plus cossu.
 * Elle est débloquée dans la save de démo (chapitre 8 livré, niveau 75).
 */
export const BROCANTE_CHINE = "foire-chatou";

export const APPAREILS = {
  iphone: {
    id: "iphone-6.5",
    viewport: { width: 414, height: 896 },
    densite: 3,
    sortie: { width: 1242, height: 2688 },
    grille: { colonnes: 4, lignes: 4 },
    // Part de la largeur du visuel occupée par la fonte du titre / de la bulle.
    titreRatio: 0.091,
    bulleRatio: 0.071,
    gpLargeur: 0.52,
    // Le châssis iPhone est dimensionné par sa LARGEUR. `rayon`, `cadre` et
    // `lunette` sont des fractions de la largeur du châssis (pas de L) :
    // rayon ~12 % donne les coins arrondis d'un iPhone récent (mesuré sur
    // les gabarits Apple, ~55 pt sur 430 pt de large) ; `cadre` est la
    // tranche métallique (fine) ; `lunette` est le bord noir plein entre le
    // cadre et la dalle — c'est lui qui manquait, l'écran touchait presque
    // le cadre directement.
    chassis: {
      mode: "largeur", valeur: 0.70, haut: 0.18, ratioEcran: 1242 / 2688, island: true,
      rayon: 0.12, cadre: 0.012, lunette: 0.028,
      // iPhone : bouton silence isolé + volume haut/bas séparés + veille.
      volumeSepare: true,
    },
    titreHaut: 0.042,
    // Espace entre le bas du bloc de titre (quel que soit son nombre de
    // lignes) et le filet doré, en fraction de la hauteur de sortie. Le
    // filet suit désormais le titre en flux normal (gabarit.mjs) : cette
    // valeur ne fixe plus une position absolue, seulement un écart constant
    // — un titre à trois lignes pousse le filet plus bas au lieu d'être
    // traversé par lui.
    filetEcart: 0.021,
  },
  ipad: {
    id: "ipad-13",
    viewport: { width: 1032, height: 1376 },
    densite: 2,
    sortie: { width: 2064, height: 2752 },
    grille: { colonnes: 5, lignes: 4 },
    titreRatio: 0.055,
    bulleRatio: 0.045,
    gpLargeur: 0.40,
    // Le châssis iPad est dimensionné par sa HAUTEUR — à 70 % de largeur il
    // déborderait, le format étant bien moins allongé (0,750 contre 0,462).
    // `rayon` nettement plus faible que sur iPhone : coins d'iPad, moins
    // arrondis en proportion de la largeur du châssis.
    chassis: {
      mode: "hauteur", valeur: 0.60, haut: 0.17, ratioEcran: 2064 / 2752, island: false,
      rayon: 0.045, cadre: 0.010, lunette: 0.022,
      // iPad : pas de bouton silence, un seul rocker de volume + veille —
      // le châssis dessinait à tort les 4 boutons du gabarit iPhone.
      volumeSepare: false,
    },
    titreHaut: 0.040,
    // Voir le commentaire sur iphone.filetEcart : même logique, l'ancienne
    // valeur fixe (filetHaut: 0.130) ne laissait que ~2px de marge sur un
    // titre à deux lignes — un piège identique, juste pas encore déclenché.
    filetEcart: 0.021,
  },
};

export const VISUELS = [
  {
    n: 1, cle: "chiner", expression: "souriant", ouvrirNego: false,
    route: () => `/chiner/${BROCANTE_CHINE}`,
    ancre: 'img[src*="/items/"]',
    // Feuillet original de la Bible de Gutenberg, 4595 € — le légendaire du
    // pool exclusif de la Grande Foire. Seule carte du paquet qui tienne la
    // promesse du titre ; les neuf autres plafonnent à 51 €.
    carte: 1,
  },
  {
    n: 2, cle: "negocier", expression: "rieur", ouvrirNego: true,
    route: () => `/chiner/${BROCANTE_CHINE}`,
    ancre: 'img[src*="/personas/vendeur-"]',
    // Vase en verre moulé Laluck, 51 € — un entre-deux entre le trésor et la
    // babiole, plus représentatif d'une négociation ordinaire que le Gutenberg.
    carte: 5,
  },
  {
    n: 3, cle: "vendre", expression: "emu", ouvrirNego: false,
    route: () => `/vitrine/${BROCANTE_DEMO}/journee`,
    ancre: 'img[src*="/personas/clients/"]',
  },
  {
    n: 4, cle: "collection", expression: "songeur", ouvrirNego: false,
    route: () => "/collection",
    ancre: 'img[src*="/items/thumbs/"]',
  },
  {
    n: 5, cle: "personnages", expression: "souriant", ouvrirNego: false,
    route: null,
    ancre: null,
  },
];
