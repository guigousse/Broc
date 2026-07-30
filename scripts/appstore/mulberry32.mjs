/**
 * Générateur pseudo-aléatoire déterministe à graine (mulberry32). Module pur.
 *
 * Implémentation canonique, utilisée directement côté Node (gen-save-demo.ts)
 * et reproduite en source JS inline côté navigateur (amorce.mjs::scriptGraine,
 * injectée via Playwright — pas d'import de module possible dans ce contexte).
 * Un test croisé (amorce.test.mjs) verrouille l'équivalence des deux copies.
 */

/**
 * Fabrique un générateur initialisé à `graine`. Chaque appel de la fonction
 * renvoyée produit un flottant dans [0, 1), comme `Math.random()`.
 */
export function mulberry32(graine) {
  if (!Number.isFinite(graine)) {
    throw new Error(`graine invalide : ${graine}`);
  }
  let a = graine | 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
