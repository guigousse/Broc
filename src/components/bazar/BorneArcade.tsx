"use client";

import type { CSSProperties } from "react";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";

/**
 * L'ombre de contact. Sans elle, une image détourée posée sur un plancher
 * peint FLOTTE : rien ne dit où elle touche le sol.
 *
 * `drop-shadow` plutôt qu'une ellipse dessinée sous la borne : l'ombre suit
 * alors l'alpha du dessin, et la base d'une borne est un quadrilatère en
 * fuite, pas un disque — une ellipse dépasserait par les coins.
 *
 * Portée vers la GAUCHE : la lumière du lieu vient de la droite (le jour entre
 * par le verre dépoli de la porte, à l'autre bout du panorama), l'ombre tombe
 * donc du côté de la bibliothèque.
 *
 * En px, et c'est assumé : `drop-shadow` n'accepte pas de pourcentage, et les
 * unités de conteneur (`cqw`) demandent iOS 16. Ces valeurs sont réglées pour
 * le rendu sur téléphone (~128 px de large) ; sur iPad la borne grandit et son
 * ombre reste au même écart, ce qui la resserre imperceptiblement.
 */
const OMBRE_CONTACT = "drop-shadow(-3px 4px 5px rgba(38, 28, 18, 0.42))";

const imgStyle: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  filter: OMBRE_CONTACT,
};

/**
 * La borne d'arcade du coin gauche.
 *
 * DÉCOR, et rien d'autre pour l'instant : c'est le chantier ⑤ qui lui donnera
 * son jeu. Elle est là parce que la zone s'appelle « arcade » et ne montrait
 * qu'une bibliothèque et un pan de mur vide — l'illustration du fond a été
 * dessinée en réservant ce vide pour elle.
 *
 * Muette pour les lecteurs d'écran (`alt=""`, aucun rôle) : annoncer un objet
 * avec lequel on ne peut rien faire, c'est promettre une action qui n'existe
 * pas. Le jour où elle en aura une, elle deviendra un `button` nommé.
 *
 * Coordonnées lues par `useQgObjet` et NON dans le dictionnaire en direct :
 * c'est ce qui la fait suivre quand on tire son cadre en mode calage
 * (`?qgedit=1`).
 */
export function BorneArcade() {
  const coord = useQgObjet("borne");
  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    height: "auto",
  };
  return (
    <div style={style} data-testid="borne-arcade">
      <img src="/bazar/borne-arcade.webp" alt="" draggable={false} style={imgStyle} />
    </div>
  );
}
