import type { CSSProperties } from "react";

/**
 * La plaque des étiquettes du Bazar (prix, manque de jetons, « Vendu »).
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

/**
 * La même plaque, ÉTEINTE : l'article est hors de portée de la bourse.
 *
 * Le prix était jusqu'ici BARRÉ. L'auteur a remplacé la règle à la recette du
 * 2026-08-20 : la rature raye un chiffre qu'on cherche justement à lire, et sur
 * une plaque de 0,7 rem elle se confond avec le trait du filet. C'est la
 * COULEUR qui porte l'état, la plaque entière s'éteignant d'un bloc — fond,
 * filet et texte ensemble, pour qu'elle se lise comme un seul objet terni et
 * non comme une plaque normale au texte pâle.
 *
 * Aucune couleur inventée, et aucun gris neutre non plus : la palette du jeu
 * n'en a pas. Chacune des trois teintes est remplacée par sa voisine
 * DÉSATURÉE dans le même nuancier — `forest-800` (vert) → `ink-500` (gris
 * chaud), `brass-500` (or) → `ink-300`, `brass-300` (or clair) → `paper-400`.
 * `ink-300` est déjà la teinte que le jeu emploie pour ses commandes
 * désactivées (cf. `ConcessionSheet`).
 *
 * Lisible, pas fantomatique : `paper-400` sur `ink-500` donne 5,6:1, au-dessus
 * du seuil AA — c'est la contrainte qui a écarté un texte en `ink-300`, à
 * 1,8:1, qui aurait disparu sur le mur peint.
 */
export const PLAQUE_ETIQUETTE_ETEINTE: CSSProperties = {
  ...PLAQUE_ETIQUETTE,
  backgroundColor: "var(--ink-500)",
  border: "1px solid var(--ink-300)",
  color: "var(--paper-400)",
};
