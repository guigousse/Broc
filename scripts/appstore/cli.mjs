/** Analyse de la ligne de commande. Module pur. */
import { APPAREILS, LANGUES, VISUELS } from "./config.mjs";

const DRAPEAUX_BOOLEENS = ["--skip-capture", "--help"];
const CLES_VALEUR = ["lang", "device", "only"];
const NUMEROS = VISUELS.map((v) => v.n);
const APPAREILS_CONNUS = Object.keys(APPAREILS);

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

  return {
    langues,
    appareils,
    visuels,
    sauterCapture: argv.includes("--skip-capture"),
    aide: argv.includes("--help"),
  };
}
