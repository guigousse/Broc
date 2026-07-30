/** Construction des scripts d'amorçage (localStorage, graine RNG). Module pur. */
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

/**
 * Source JavaScript à injecter avant hydratation (`page.addInitScript`) :
 * remplace `Math.random` par un générateur déterministe à graine (mulberry32).
 *
 * Tout le tirage aléatoire du jeu (objet proposé, vendeur, humeur, apparition
 * du vendeur mystère…) passe par `Math.random` — aucun appel à
 * `crypto.getRandomValues` sur ces chemins. En figeant la graine, une même
 * exécution du pipeline produit le même contenu quelle que soit la langue ou
 * l'appareil : sans ce correctif, les quatre langues d'un même visuel
 * afficheraient quatre objets différents sur le même emplacement de capture.
 *
 * Duplique volontairement l'algorithme de `mulberry32.mjs` (implémentation
 * canonique, utilisée côté Node par gen-save-demo.ts) : cette source doit
 * rester une chaîne JS autonome, sans import, pour être injectable telle
 * quelle dans la page — un test croisé (amorce.test.mjs) verrouille
 * l'équivalence des deux copies.
 */
export function scriptGraine(graine) {
  if (!Number.isFinite(graine)) {
    throw new Error(`graine invalide : ${graine}`);
  }
  return [
    "try {",
    `  var _a = ${JSON.stringify(graine)} | 0;`,
    "  Math.random = function () {",
    "    _a |= 0; _a = (_a + 0x6D2B79F5) | 0;",
    "    var t = Math.imul(_a ^ (_a >>> 15), 1 | _a);",
    "    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;",
    "    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;",
    "  };",
    "} catch (e) {}",
  ].join("\n");
}
