import type { CSSProperties } from "react";

/** Profondeur du pan coupé de la plaque, en px. */
export const BISEAU_PLAQUE_PX = 12;

/**
 * LA PLAQUE DE LAITON — un nom gravé, partagé par la fiche d'article du Bazar
 * et la fiche d'objet du stockage (qui l'a reprise le 2026-08-28).
 *
 * Art déco par ses PANS COUPÉS : les quatre coins tombés à 45°, dessinés au
 * `clip-path` et non par un `border-radius`, qui n'arrondit que des arcs. Le
 * biseau est en PIXELS, donc constant : un nom du catalogue peut passer à la
 * ligne (« Aquarelle fauviste de Roland Duff (signée) » en fait deux) sans que
 * les coins s'étirent en pointes.
 *
 * Le dégradé est celui des bandeaux de laiton du jeu (`namePlateStyle`) —
 * clair, moyen, clair, comme une plaque prise en lumière rasante. Ce qui
 * appartient à celle-ci : les deux FILETS GRAVÉS, en retrait des bords, tirés
 * en `inset` d'ombre plutôt qu'en bordures — une bordure suivrait le biseau et
 * dessinerait un liseré tout autour, là où une plaque gravée porte deux traits
 * droits, en haut et en bas.
 *
 * Pas de `border` non plus, pour la même raison : `clip-path` coupe la
 * bordure au ras du pan et la laisse ouverte aux quatre coins.
 */
export const plaqueLaiton: CSSProperties = {
  position: "relative",
  padding: "12px 22px",
  background:
    "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 52%, var(--brass-300) 100%)",
  clipPath: `polygon(${BISEAU_PLAQUE_PX}px 0, calc(100% - ${BISEAU_PLAQUE_PX}px) 0, 100% ${BISEAU_PLAQUE_PX}px, 100% calc(100% - ${BISEAU_PLAQUE_PX}px), calc(100% - ${BISEAU_PLAQUE_PX}px) 100%, ${BISEAU_PLAQUE_PX}px 100%, 0 calc(100% - ${BISEAU_PLAQUE_PX}px), 0 ${BISEAU_PLAQUE_PX}px)`,
  boxShadow:
    "inset 0 5px 0 -4px var(--brass-700), inset 0 -5px 0 -4px var(--brass-700)",
  fontFamily: "var(--font-display)",
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  textAlign: "center",
  lineHeight: 1.35,
  color: "var(--forest-800)",
  textShadow: "0 1px 0 rgba(255,243,213,0.6)",
};
