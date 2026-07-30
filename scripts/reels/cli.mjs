/** Analyse de la ligne de commande. Module pur. */

const ETAPES_CONNUES = ["master", "frame", "video", "montage"];
const ETAPES_PAR_DEFAUT = ["frame", "video", "montage"];

/** Drapeaux booléens acceptés tels quels (sans valeur). */
const DRAPEAUX_BOOLEENS = [
  ...ETAPES_CONNUES.map((e) => `--${e}`),
  "--hd",
  "--force",
  "--yes",
  "--dry-run",
  "--verbose",
];

/** Clés acceptées sous la forme `--cle=valeur`. */
const CLES_VALEUR = ["model", "plan", "take1", "take2"];

const DRAPEAUX_ACCEPTES = [...DRAPEAUX_BOOLEENS, ...CLES_VALEUR.map((c) => `--${c}=…`)].join(", ");

function valeur(argv, nom) {
  const prefixe = `--${nom}=`;
  const trouve = argv.find((a) => a.startsWith(prefixe));
  return trouve ? trouve.slice(prefixe.length) : undefined;
}

function entier(argv, nom) {
  const brut = valeur(argv, nom);
  return brut === undefined ? undefined : Number(brut);
}

/** Rejette tout drapeau non reconnu — seul filet avant un appel payant. */
function verifierDrapeauxConnus(argv) {
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    if (DRAPEAUX_BOOLEENS.includes(a)) continue;
    const eq = a.indexOf("=");
    if (eq > 2 && CLES_VALEUR.includes(a.slice(2, eq))) continue;
    throw new Error(`drapeau « ${a} » inconnu : attendu ${DRAPEAUX_ACCEPTES}`);
  }
}

export function parserArgs(argv) {
  verifierDrapeauxConnus(argv);
  const etapes = ETAPES_CONNUES.filter((e) => argv.includes(`--${e}`));
  const plan = entier(argv, "plan");
  if (plan !== undefined && plan !== 1 && plan !== 2) {
    throw new Error(`--plan=${plan} invalide : attendu 1 ou 2`);
  }

  return {
    ids: argv.filter((a) => !a.startsWith("--")),
    etapes: etapes.length ? etapes : ETAPES_PAR_DEFAUT,
    palier: valeur(argv, "model") ?? "lite",
    definition: argv.includes("--hd") ? "1080p" : "720p",
    force: argv.includes("--force"),
    yes: argv.includes("--yes"),
    dryRun: argv.includes("--dry-run"),
    verbose: argv.includes("--verbose"),
    plan,
    take1: entier(argv, "take1"),
    take2: entier(argv, "take2"),
  };
}
