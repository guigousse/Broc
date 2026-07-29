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

function liste(argv, nom, connus, etiquette) {
  const brut = valeur(argv, nom);
  if (brut === undefined) return [...connus];
  const demandes = brut.split(",").map((s) => s.trim()).filter(Boolean);
  for (const d of demandes) {
    if (!connus.includes(d)) {
      throw new Error(`${etiquette} « ${d} » inconnu : attendu ${connus.join(", ")}`);
    }
  }
  return connus.filter((c) => demandes.includes(c));
}

function verifierDrapeauxConnus(argv) {
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    if (DRAPEAUX_BOOLEENS.includes(a)) continue;
    const eq = a.indexOf("=");
    if (eq > 2 && CLES_VALEUR.includes(a.slice(2, eq))) continue;
    const acceptes = [...DRAPEAUX_BOOLEENS, ...CLES_VALEUR.map((c) => `--${c}=…`)].join(", ");
    throw new Error(`drapeau « ${a} » inconnu : attendu ${acceptes}`);
  }
}

export function parserArgs(argv) {
  verifierDrapeauxConnus(argv);
  const brutVisuels = valeur(argv, "only");
  let visuels = [...NUMEROS];
  if (brutVisuels !== undefined) {
    const demandes = brutVisuels.split(",").map((s) => Number(s.trim()));
    for (const d of demandes) {
      if (!NUMEROS.includes(d)) {
        throw new Error(`visuel « ${d} » inconnu : attendu ${NUMEROS.join(", ")}`);
      }
    }
    visuels = NUMEROS.filter((n) => demandes.includes(n));
  }
  return {
    langues: liste(argv, "lang", LANGUES, "langue"),
    appareils: liste(argv, "device", APPAREILS_CONNUS, "appareil"),
    visuels,
    sauterCapture: argv.includes("--skip-capture"),
    aide: argv.includes("--help"),
  };
}
