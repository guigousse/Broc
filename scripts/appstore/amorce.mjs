/** Construction du script d'amorçage du localStorage. Module pur. */
import { LANGUES } from "./config.mjs";

/** Horodatage figé : une save de démo ne doit pas dépendre de l'heure. */
const HORODATAGE = 1753005600000;

/**
 * Source JavaScript à injecter avant hydratation (`page.addInitScript`) :
 * écrit la sauvegarde de démo et la langue, exactement comme le fait
 * scripts/seed-demo-sim.sh pour le simulateur iOS.
 */
export function scriptAmorce(saveJson, langue) {
  if (!LANGUES.includes(langue)) {
    throw new Error(`langue « ${langue} » inconnue : attendu ${LANGUES.join(", ")}`);
  }
  const index = {
    actif: 1,
    slots: { 1: { nom: "Démo App Store", derniereSession: HORODATAGE }, 2: null, 3: null },
  };
  // JSON.stringify d'une chaîne produit un littéral JS sûr (guillemets et
  // antislashs échappés) — c'est ce qui rend l'injection inoffensive.
  return [
    "try {",
    `  var s = ${JSON.stringify(saveJson)};`,
    '  localStorage.setItem("projet-broc:slot:1:v1", s);',
    '  localStorage.setItem("projet-broc:slot:1:v1:backup", s);',
    `  localStorage.setItem("projet-broc:slots:v1", ${JSON.stringify(JSON.stringify(index))});`,
    `  localStorage.setItem("projet-broc:langue:v1", ${JSON.stringify(JSON.stringify({ locale: langue }))});`,
    "} catch (e) {}",
  ].join("\n");
}
