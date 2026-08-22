/**
 * Géométrie de la façade de la borne d'arcade.
 *
 * Ces nombres sont MESURÉS sur `public/bazar/borne-facade.webp`, pas calés à
 * l'œil. Pour les re-mesurer après une régénération de l'asset :
 *
 *     npm run gen:borne -- --from <tirage.png>
 *
 * le script imprime le ratio et les quatre pourcentages à recopier ici. C'est
 * tout ce qu'une nouvelle façade demande — aucun code à retoucher.
 */
export const BORNE_FACADE = {
  /** largeur / hauteur du caisson détouré (1681 × 1791). */
  ratio: 0.939,
  /**
   * Le trou du CRT, en pourcentages du caisson. `right` et `bottom` sont des
   * RETRAITS depuis le bord opposé, pour se poser tels quels en CSS.
   */
  trou: { left: 14.16, right: 14.22, top: 24.57, bottom: 25.96 },
} as const;

/**
 * Part de la largeur disponible que le TROU doit occuper.
 *
 * On cale le trou, pas le caisson : l'auteur a explicitement autorisé le bois
 * à sortir du cadre du moment que l'écran est vu en entier. Sans ça, un
 * caisson entier tenu dans un téléphone ne laisserait qu'un écran de
 * 268 × 196 — trop petit pour porter une capture en grand, qui est tout
 * l'objet de cet écran.
 *
 * 92 % et pas 100 % : il faut un filet de bois de chaque côté, sinon le trou
 * touche les bords et la borne cesse de se lire comme un meuble.
 */
export const PART_LARGEUR_TROU = 0.92;

/**
 * Dimensions du caisson pour une place donnée.
 *
 * Deux règles, la seconde bornant la première :
 *   1. le trou occupe `PART_LARGEUR_TROU` de la largeur disponible ;
 *   2. mais le caisson ENTIER doit tenir en hauteur — c'est ce qui garantit
 *      que le marquee et le pupitre restent visibles, et donc qu'on reconnaît
 *      une borne. Sur un téléphone c'est (1) qui gagne, sur un écran large et
 *      court c'est (2).
 */
export function dimensionnerBorne(dispo: { w: number; h: number }): {
  w: number;
  h: number;
} {
  if (dispo.w <= 0 || dispo.h <= 0) return { w: 0, h: 0 };
  const partTrou = (100 - BORNE_FACADE.trou.left - BORNE_FACADE.trou.right) / 100;
  const parLargeur = (dispo.w * PART_LARGEUR_TROU) / partTrou;
  const parHauteur = dispo.h * BORNE_FACADE.ratio;
  const w = Math.min(parLargeur, parHauteur);
  return { w, h: w / BORNE_FACADE.ratio };
}
