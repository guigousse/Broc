/** Analyse de la ligne de commande. Module pur. */
import { APPAREILS, LANGUES, VISUELS } from "./config.mjs";

const DRAPEAUX_BOOLEENS = ["--skip-capture", "--help"];
const CLES_VALEUR = ["lang", "device", "only", "seed", "carte"];
const NUMEROS = VISUELS.map((v) => v.n);
const APPAREILS_CONNUS = Object.keys(APPAREILS);

/**
 * Graine par défaut du générateur pseudo-aléatoire (voir scriptGraine dans
 * amorce.mjs). Valeur arbitraire mais fixe : `--seed=N` permet d'en essayer
 * d'autres et de garder celle qui donne une scène satisfaisante.
 */
export const GRAINE_DEFAUT = 424242;

function valeur(argv, nom) {
  const prefixe = `--${nom}=`;
  const trouve = argv.find((a) => a.startsWith(prefixe));
  return trouve ? trouve.slice(prefixe.length) : undefined;
}

function convertirNombre(s) {
  const n = Number(s);
  if (isNaN(n)) {
    throw new Error(`non numérique`);
  }
  return n;
}

function liste(argv, nom, connus, etiquette, convertir = String) {
  const brut = valeur(argv, nom);
  if (brut === undefined) return [...connus];

  const brutes = brut.split(",").map((s) => s.trim()).filter(Boolean);
  if (brutes.length === 0) {
    throw new Error(`${etiquette} vide : au moins une valeur requise`);
  }

  const demandes = brutes.map((s) => {
    try {
      return convertir(s);
    } catch {
      throw new Error(`${etiquette} « ${s} » invalide : attendu ${connus.join(", ")}`);
    }
  });

  for (const d of demandes) {
    if (!connus.includes(d)) {
      throw new Error(`${etiquette} « ${d} » inconnu : attendu ${connus.join(", ")}`);
    }
  }

  return connus.filter((c) => demandes.includes(c));
}

function nombre(argv, nom, etiquette, defaut) {
  const brut = valeur(argv, nom);
  if (brut === undefined) return defaut;
  if (brut.trim() === "") {
    throw new Error(`${etiquette} vide : un entier est requis`);
  }
  const n = Number(brut);
  if (isNaN(n)) {
    throw new Error(`${etiquette} « ${brut} » non numérique`);
  }
  if (!Number.isInteger(n)) {
    throw new Error(`${etiquette} « ${brut} » doit être un entier`);
  }
  return n;
}

function verifierDrapeauxConnus(argv) {
  for (const a of argv) {
    if (!a.startsWith("--")) {
      throw new Error(`argument « ${a} » inconnu : attendu un drapeau (--...)`);
    }
    if (DRAPEAUX_BOOLEENS.includes(a)) continue;
    const eq = a.indexOf("=");
    if (eq > 2 && CLES_VALEUR.includes(a.slice(2, eq))) continue;
    const acceptes = [...DRAPEAUX_BOOLEENS, ...CLES_VALEUR.map((c) => `--${c}=…`)].join(", ");
    throw new Error(`drapeau « ${a} » inconnu : attendu ${acceptes}`);
  }
}

export function parserArgs(argv) {
  verifierDrapeauxConnus(argv);

  const langues = liste(argv, "lang", LANGUES, "langue");
  const appareils = liste(argv, "device", APPAREILS_CONNUS, "appareil");
  const visuelsBruts = liste(argv, "only", NUMEROS, "visuel", convertirNombre);
  // Trier explicitement les numéros de visuels en ordre croissant
  const visuels = [...visuelsBruts].sort((a, b) => a - b);
  const graine = nombre(argv, "seed", "graine", GRAINE_DEFAUT);
  // Rang de la carte à capturer dans le carrousel de chinage. Le jeu met
  // rarement une pièce de valeur en tête de pile : changer de graine ne fait
  // que retirer une carte au sort parmi les plus communes, alors qu'avancer
  // dans le paquet permet de choisir l'objet mis en vitrine.
  // null = pas de surcharge : chaque visuel garde son propre rang (config.mjs).
  const carte = nombre(argv, "carte", "carte", null);
  if (carte !== null && carte < 0) {
    throw new Error(`carte « ${carte} » négatif : le rang part de 0`);
  }

  return {
    langues,
    appareils,
    visuels,
    graine,
    carte,
    sauterCapture: argv.includes("--skip-capture"),
    aide: argv.includes("--help"),
  };
}
