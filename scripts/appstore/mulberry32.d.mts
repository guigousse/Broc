/**
 * Déclaration de types pour mulberry32.mjs (module JS pur, non typé).
 *
 * Permet à scripts/gen-save-demo.ts (TypeScript) d'importer directement
 * l'implémentation canonique sans dupliquer l'algorithme — la
 * déduplication et le test croisé avec amorce.mjs (amorce.test.mjs)
 * restent valables.
 */

/**
 * Fabrique un générateur pseudo-aléatoire déterministe initialisé à
 * `graine`. Chaque appel de la fonction renvoyée produit un flottant
 * dans [0, 1), comme `Math.random()`.
 */
export function mulberry32(graine: number): () => number;
