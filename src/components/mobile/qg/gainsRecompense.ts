import type { CSSProperties } from "react";
import type { DictionnaireUI, tr as Tr } from "@/lib/i18n/ui";
import type { RecompenseEffective } from "@/lib/recompenses";

export type TypeGain = "argent" | "xp" | "energie" | "bazar";

export interface Gain {
  cle: TypeGain;
  valeur: number;
  texte: string;
  /** Le montant est suivi d'un signe DESSINÉ (le Bazarcoin) et non d'une unité
   *  écrite. Seul le Bazar est dans ce cas : € et XP tiennent dans le texte. */
  signe?: boolean;
}

/**
 * La liste des gains d'une récompense, telle que la dessinent les DEUX
 * pastilles du jeu : le pavé du carnet et le bandeau de la fiche courrier.
 * Elles rendent le même objet sur deux écrans ; les tenir séparées revenait à
 * corriger deux fois chaque défaut — et à en oublier un, ce qui est arrivé au
 * signe Bazarcoin, resté à 12 px fixes des deux côtés.
 *
 * Les palettes, elles, restent chez les appelants : le pavé est posé sur le
 * papier creusé du carnet, le bandeau sur la crème de la lettre.
 */
export function listerGains(
  recompense: RecompenseEffective,
  d: DictionnaireUI,
  tr: typeof Tr,
): Gain[] {
  return (
    [
      { cle: "argent", valeur: recompense.argent, texte: tr(d.carnet.gainArgent, { n: recompense.argent }) },
      { cle: "xp", valeur: recompense.xp, texte: tr(d.carnet.gainXp, { n: recompense.xp }) },
      { cle: "energie", valeur: recompense.energie, texte: tr(d.carnet.gainEnergie, { n: recompense.energie }) },
      { cle: "bazar", valeur: recompense.jetons, texte: tr(d.carnet.gainBazar, { n: recompense.jetons }), signe: true },
    ] as Gain[]
    // Un gain nul ne produit PAS de pastille : la cérémonie d'envol masque
    // celles qu'elle trouve et n'émet d'étape de retour que pour les gains non
    // nuls — une pastille à zéro resterait invisible pour toute la partie.
  ).filter((g) => g.valeur > 0);
}

/**
 * Le corps commun des pastilles de gain.
 *
 * POLICE D'AFFICHAGE, et c'est le fond de l'affaire. En `--font-serif`
 * (Cormorant Garamond), le « € » ne mesure que **0,492 em** — 6,4 px à corps 13
 * — quand le signe Bazarcoin voisin en faisait 12 : le Ƶ paraissait deux fois
 * trop gros alors que c'était le « € » qui était court. Cinzel porte son « € »
 * à **0,727 em**, la hauteur même sur laquelle `HAUTEUR_SIGNE_DISPLAY` a été
 * réglée pour la caisse. Les deux devises y sont donc à la même hauteur par
 * construction, et non par retouche — et le carnet parle enfin la langue de la
 * caisse, qui est l'endroit où le joueur compare ce qu'il gagne à ce qu'il a.
 *
 * CHIFFRES ALIGNÉS explicitement : Cormorant sortait ses chiffres en style
 * ancien (le « 3 » plongeant à -0,276 em sous la ligne de base), ce qui faisait
 * autant pour l'impression de petitesse que le corps lui-même.
 */
export const STYLE_GAIN_BASE: CSSProperties = {
  display: "inline-block",
  // Rogné de 3px 9px : le corps a gagné 4 px, le pavé ne doit pas les prendre
  // en largeur — il a déjà chevauché le titre des quêtes à trois objets.
  padding: "2px 7px",
  borderRadius: 11,
  fontFamily: "var(--font-display)",
  fontSize: 15,
  fontWeight: 700,
  fontVariantNumeric: "lining-nums tabular-nums",
  // Cinzel n'a pas de bas-de-casse : sans ce contre-ordre, un `uppercase` hérité
  // d'un libellé parent passerait inaperçu ici mais pas ailleurs (cf. la forme
  // courte de la caisse, qui s'affichait « 10,6K »).
  textTransform: "none",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

/**
 * L'écart entre le montant et le signe Bazarcoin. Réglé à 3 px sur captures ×8
 * pour la caisse : les approches du signe et celles des chiffres laissent alors
 * moins d'un pixel d'écart entre les deux blancs.
 */
export const ECART_SIGNE_GAIN = 3;

/** Ce qui s'ajoute au corps commun quand la pastille porte un signe dessiné. */
export const STYLE_GAIN_AVEC_SIGNE: CSSProperties = {
  display: "inline-flex",
  // Sur la LIGNE DE BASE du nombre et non au centre de la ligne : centré, le
  // signe tombe plus bas que l'encre des chiffres (mesuré sur la caisse).
  alignItems: "baseline",
  gap: ECART_SIGNE_GAIN,
};
