"use client";

import type { CSSProperties } from "react";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import { useLangue } from "@/lib/i18n/LangueContext";

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
 * Elle n'est plus muette : c'est le point d'entrée de sa collection de jeux
 * (chantier ⑤), un bouton qui ouvre `BorneArcadeEcran` en plein écran.
 * L'image reste `alt=""` — le nom accessible est porté par le `<button>`
 * (`d.bazar.borneOuvrir`), pas par le dessin qu'il contient.
 *
 * Coordonnées lues par `useQgObjet` et NON dans le dictionnaire en direct :
 * c'est ce qui la fait suivre quand on tire son cadre en mode calage
 * (`?qgedit=1`).
 */
interface BorneArcadeProps {
  onOuvrir: () => void;
}

export function BorneArcade({ onOuvrir }: BorneArcadeProps) {
  const { d } = useLangue();
  const coord = useQgObjet("borne");
  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    height: "auto",
    // Le calque d'objets du panorama est en `pointer-events: none` : sans ce
    // rétablissement, le bouton ne recevrait aucun tap.
    pointerEvents: "auto",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  };
  return (
    <button
      type="button"
      aria-label={d.bazar.borneOuvrir}
      onClick={onOuvrir}
      style={style}
      data-testid="borne-arcade"
    >
      <img src="/bazar/borne-arcade.webp" alt="" draggable={false} style={imgStyle} />
    </button>
  );
}
