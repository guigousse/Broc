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
 * Part de la largeur disponible que le CAISSON occupe.
 *
 * On calait auparavant le TROU sur 92 % de la largeur, et le bois débordait :
 * l'auteur l'avait autorisé pour gagner un écran plus grand. Il est revenu
 * dessus à la recette du 2026-08-23 — une borne dont les flancs sortent du
 * cadre ne se lit plus comme un meuble posé dans la boutique, on ne voit plus
 * qu'un panneau. C'est donc le caisson entier qui tient en largeur, et l'écran
 * paie la différence : sur un iPhone 12 il passe de 359 × 264 à 268 × 197.
 * C'est le prix décidé, pas un oubli.
 *
 * 96 % et pas 100 % : un filet d'air de chaque côté, sinon les flancs touchent
 * les bords du cadre et la borne a l'air encastrée dans l'écran.
 */
export const PART_LARGEUR_CAISSON = 0.96;

/**
 * Dimensions du caisson pour une place donnée.
 *
 * Une seule règle, prise deux fois : le caisson ENTIER tient dans le cadre,
 * en largeur comme en hauteur. La plus contraignante des deux gagne — sur un
 * téléphone c'est la largeur, sur un écran large et court c'est la hauteur,
 * et c'est elle qui garantit alors que le marquee et le pupitre restent
 * visibles, donc qu'on reconnaît une borne.
 */
export function dimensionnerBorne(dispo: { w: number; h: number }): {
  w: number;
  h: number;
} {
  if (dispo.w <= 0 || dispo.h <= 0) return { w: 0, h: 0 };
  const parLargeur = dispo.w * PART_LARGEUR_CAISSON;
  const parHauteur = dispo.h * BORNE_FACADE.ratio;
  const w = Math.min(parLargeur, parHauteur);
  return { w, h: w / BORNE_FACADE.ratio };
}
