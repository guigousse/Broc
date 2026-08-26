import type { CSSProperties } from "react";

/**
 * La plaque des étiquettes du Bazar — depuis le 2026-08-26, le seul « Vendu ».
 *
 * Elle a porté les prix de l'étagère, et une seconde version ÉTEINTE disait
 * l'article hors de portée de la bourse. Le prix ayant quitté l'étagère pour
 * la fiche, ces deux emplois sont partis avec lui : rien ne s'éteint plus,
 * et la variante éteinte a été supprimée plutôt que laissée en décor mort.
 *
 * Les étiquettes sont posées à même l'illustration — un mur de sauge pâle
 * derrière le comptoir. Écrites en `--brass-700` sur ce fond, elles ne se
 * lisaient pas (constat de recette sur capture du décor fini), et la bulle du
 * manque n'annonçait aucune couleur du tout : elle héritait de la couleur de
 * texte du corps de page, sur le même mur.
 *
 * Aucune couleur n'est inventée ici : c'est le couple de la chrome du jeu —
 * fond `--forest-800`, filet `--brass-500`, texte `--brass-300` — celui de
 * `MobileHeader`, de `Toast` et du jour courant de `WeekTimeline`. Le choix de
 * `--brass-300` plutôt que `--brass-700` pour le texte est déjà documenté deux
 * fois dans `MobileHeader` : 7,6:1 sur `forest-800` contre 2,7:1, sous AA.
 *
 * `backgroundColor` (longhand) et non `background` : c'est cette propriété que
 * les tests interrogent pour attester que la plaque existe, et un raccourci ne
 * survit pas toujours au `var()` dans un moteur CSS d'appoint comme jsdom.
 */
export const PLAQUE_ETIQUETTE: CSSProperties = {
  display: "inline-block",
  backgroundColor: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-pill)",
  padding: "2px 8px",
  color: "var(--brass-300)",
  fontSize: "0.7rem",
  lineHeight: 1.3,
  whiteSpace: "nowrap",
};
