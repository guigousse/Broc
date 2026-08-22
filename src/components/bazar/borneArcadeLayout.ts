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
 * Ce qui manque alors sous sa base, ce n'est pas un vide : c'est le bas du
 * meuble — panneau de bois, monnayeur, plinthe — qui vient s'y poser (cf.
 * `SOCLE_BORNE`).
 */
export const PART_AIR_AU_DESSUS = 0.14;

/**
 * Le BAS DU MEUBLE : la partie en bois et son monnayeur.
 *
 * Le tirage de la façade s'arrête juste sous le pupitre — c'est écrit dans son
 * prompt, et c'est voulu : un meuble entier dans un téléphone donnerait un
 * écran minuscule. Ce bas-là est donc un SECOND dessin
 * (`--socle-generer` / `--socle-from`), pas un étirement : il porte le panneau
 * de bois, le monnayeur et la plinthe.
 *
 * Son modèle est `borne-arcade.webp`, LA BORNE DE LA SCÈNE, et surtout pas la
 * façade : la façade ne sait rien du bas du meuble, s'en servir revient à faire
 * inventer un monnayeur. Le dessin d'origine en a déjà un — plaque grise, deux
 * fentes rouges, deux boutons carrés, serrure ronde, trappe à monnaie sous
 * elle, galon terracotta et or à l'intérieur des montants de bois — et c'est
 * celui-là qu'on reproduit, à l'identique.
 *
 * Le raccord ne tient pas à la chance. Le script cale l'échelle du tirage sur
 * la largeur de la silhouette À LA LIGNE DE COUPE, et la cible n'est pas la
 * base de la façade mais sa largeur AU CENTRE DE L'ÉCRAN : le meuble est vu en
 * légère plongée, son bas est plus renfoncé que le plan de l'écran, et une
 * base aussi large que le pupitre le ferait paraître en avant. Mesuré sur la
 * façade : 857 px à mi-hauteur de l'écran contre 994 à la dernière ligne,
 * 13,8 % de fuyant. Le pupitre déborde donc du corps, ce qui est juste.
 *
 * Deux pièces font le joint, et pas une bande de couleur — la première
 * version en posait une, et elle se lisait comme une barre mauve en travers du
 * meuble : un TRAIT D'ENCRE à la largeur de la FAÇADE, qui rend son arête basse
 * au pupitre tranché net par le cadrage du tirage, et une OMBRE PORTÉE en haut
 * du corps, qui s'éteint vers le bas. Sans l'ombre, un corps simplement plus
 * étroit se lit comme un meuble plus petit et non comme un meuble en retrait.
 */
export const SOCLE_BORNE = {
  src: "/bazar/borne-socle.webp",
  /** largeur / hauteur du dessin (1000 × 733), imprimé par `--socle-from`. */
  ratio: 1.364,
  /**
   * La plinthe, en une ligne étirable.
   *
   * Filet de sécurité et rien d'autre : sur les gabarits d'aujourd'hui le
   * dessin remplit déjà la place, mais un cadre plus élancé que 2:1 en
   * laisserait sous lui. Elle est tirée de la DERNIÈRE ligne du socle, donc
   * elle le prolonge exactement.
   */
  bande: "/bazar/borne-socle-bande.webp",
  /**
   * Le socle remonte d'un pixel sous la façade, et la bande d'un pixel sous le
   * socle. Sans ces recouvrements, un arrondi de sous-pixel ouvre par moments
   * un cheveu de fond entre deux pièces. Chaque pièce est peinte APRÈS celle
   * qu'elle recouvre, donc le recouvrement ne se voit pas.
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
