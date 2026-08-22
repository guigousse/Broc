"use client";

import type { JSX } from "react";

interface BazarcoinIconProps {
  /**
   * HAUTEUR en px — le signe se dimensionne comme un caractère, pas comme une
   * vignette carrée. Défaut 13, la hauteur d'œil du texte des plaques de prix.
   */
  size?: number;
  /**
   * Signe éteint, au nuancier des plaques hors de portée de la bourse. Sans
   * ça, un signe rouge vif resterait allumé au milieu d'une plaque qui s'est
   * éteinte d'un bloc (cf. `etiquette.ts`).
   */
  terni?: boolean;
  /**
   * Le signe est posé sur un fond CLAIR (la fiche d'un article, sur papier
   * crème). Le bleu du bandeau et des plaques y tombe à 2,6:1 et devient
   * illisible ; celui-ci y mesure 6,3:1.
   */
  surClair?: boolean;
}

/**
 * Le Bazarcoin : la monnaie du Bazar, un Z barré à la manière de l'euro.
 *
 * Dessiné par l'auteur dans `public/dev-bazarcoin.html` et exporté tel quel.
 * C'est un SIGNE, pas une pièce : il n'a pas de flan autour, comme € ou £ n'en
 * ont pas. Trois traits pour le Z — deux barres bombées et leur diagonale — et
 * deux barres traversantes, ce qui fait au total les cinq horizontales que
 * l'œil lit comme « monnaie » plutôt que comme « lettre ». La courbe est
 * poussée à fond : c'est elle qui écarte le signe de la lettre Z.
 *
 * LE CADRE EST SERRÉ sur le tracé (`viewBox` 6.43 4.40 11.44 15.20). Le dessin
 * a été composé dans un repère de 24×24 qui contenait aussi un flan rond ;
 * celui-ci retiré, garder ce repère laisserait un tiers de vide autour et le
 * signe ne ferait plus que 9 px de haut là où on en demande 14.
 *
 * BLEU ÉLECTRIQUE, et c'est une exigence : la caisse porte les deux monnaies
 * sous un même libellé, et tout le reste du jeu est en laiton. C'est la
 * couleur, et elle seule, qui dit d'un coup d'œil laquelle des deux on lit.
 *
 * DÉCORATIF : c'est l'étiquette qui le nomme (« 4 Bazarcoins »). Répété par un
 * lecteur d'écran à chaque prix, il n'ajouterait que du bruit.
 */

/** Largeur / hauteur du tracé, épaisseur de trait comprise. */
const RAPPORT = 11.44 / 15.2;

export function BazarcoinIcon({
  size = 13,
  terni = false,
  surClair = false,
}: BazarcoinIconProps): JSX.Element {
  const couleur = terni
    ? "var(--paper-400)"
    : surClair
      ? "var(--azur-600)"
      : "var(--azur-400)";
  return (
    <svg
      width={+(size * RAPPORT).toFixed(2)}
      height={size}
      viewBox="6.43 4.40 11.44 15.20"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path
        d="M7.03 6.50Q12.15 3.50 17.27 6.50
           M17.27 6.50Q9.96 9.95 7.03 17.50
           M7.03 17.50Q12.15 20.50 17.27 17.50
           M7.03 10.17H17.27
           M7.03 13.83H17.27"
        fill="none"
        stroke={couleur}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
