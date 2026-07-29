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

/** La brocante armée par scripts/gen-save-demo.ts (stand garni). */
export const BROCANTE_DEMO = "marche-saint-ouen";

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
    // Le châssis iPhone est dimensionné par sa LARGEUR.
    chassis: { mode: "largeur", valeur: 0.70, haut: 0.18, ratioEcran: 1242 / 2688, island: true },
    titreHaut: 0.042,
    filetHaut: 0.154,
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
    chassis: { mode: "hauteur", valeur: 0.60, haut: 0.17, ratioEcran: 2064 / 2752, island: false },
    titreHaut: 0.040,
    filetHaut: 0.130,
  },
};

export const VISUELS = [
  {
    n: 1, cle: "chiner", expression: "souriant", ouvrirNego: false,
    route: (b) => `/chiner/${b}`,
    ancre: 'img[src*="/items/"]',
  },
  {
    n: 2, cle: "negocier", expression: "rieur", ouvrirNego: true,
    route: (b) => `/chiner/${b}`,
    ancre: 'img[src*="/personas/vendeur-"]',
  },
  {
    n: 3, cle: "vendre", expression: "emu", ouvrirNego: false,
    route: (b) => `/vitrine/${b}/journee`,
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
