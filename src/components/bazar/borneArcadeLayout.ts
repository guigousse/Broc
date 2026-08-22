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
 * Part de la hauteur du cadre laissée en AIR au-dessus du marquee.
 *
 * La borne était posée sur la barre d'onglets et le reste du cadre lui passait
 * au-dessus : 46 % de flou vide sur un iPhone 12, une fois le caisson rentré
 * en largeur. Elle remonte donc d'une part FIXE de la hauteur — fixe, pour que
 * le cadrage se ressemble d'un téléphone à l'autre au lieu de dépendre du
 * hasard des proportions.
 *
 * Ce qui manque alors sous sa base, c'est le socle qui le comble (cf.
 * `SOCLE_BORNE`), et non un vide.
 */
export const PART_AIR_AU_DESSUS = 0.14;

/**
 * La bande qui prolonge le bas du caisson, étirée verticalement.
 *
 * Le tirage de la façade s'arrête juste sous le pupitre — c'est écrit dans le
 * prompt de `scripts/generate-borne-arcade.mjs`, et c'est voulu : un meuble
 * entier dans un téléphone donnerait un écran minuscule. `borne-socle.webp`
 * est DÉRIVÉ de la façade par ce même script (`--socle`) : c'est sa dernière
 * ligne de pixels, moyennée puis dégradée vers l'ombre du sol. Étirée en
 * `background-size: 100% 100%`, elle continue le panneau bas exactement, avec
 * ses montants de bois et son liseré d'encre.
 */
export const SOCLE_BORNE = {
  src: "/bazar/borne-socle.webp",
  /**
   * Le socle remonte d'un pixel sous la façade. Sans ce recouvrement, un
   * arrondi de sous-pixel ouvre par moments un cheveu de fond entre les deux.
   * La façade est peinte APRÈS, donc par-dessus : le recouvrement ne se voit
   * pas.
   */
  recouvrementPx: 1,
} as const;

/**
 * Place et dimensionne le caisson dans le cadre.
 *
 * `w`/`h` sont ceux du CAISSON DESSINÉ (marquee → bas du pupitre), `top` l'air
 * laissé au-dessus. Ce qui reste entre `top + h` et le bas du cadre revient au
 * socle — c'est un reste, jamais une valeur choisie, ce qui est exactement la
 * garantie qu'il n'y a jamais de trou.
 *
 * La largeur reste bornée deux fois : par la largeur du cadre, et par la
 * hauteur QUI RESTE sous l'air du haut. Sur un téléphone c'est la largeur qui
 * gagne ; sur un écran large et court c'est la hauteur, et le socle se réduit
 * alors à rien — le caisson touche déjà le bas.
 */
export function dimensionnerBorne(dispo: { w: number; h: number }): {
  w: number;
  h: number;
  top: number;
} {
  if (dispo.w <= 0 || dispo.h <= 0) return { w: 0, h: 0, top: 0 };
  const top = dispo.h * PART_AIR_AU_DESSUS;
  const parLargeur = dispo.w * PART_LARGEUR_CAISSON;
  const parHauteur = (dispo.h - top) * BORNE_FACADE.ratio;
  const w = Math.min(parLargeur, parHauteur);
  return { w, h: w / BORNE_FACADE.ratio, top };
}
