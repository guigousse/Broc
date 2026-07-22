# Level up — détail épique des atouts, suppression des pills

Date : 2026-07-22 · Statut : validé par Guillaume · Suite de
`2026-07-22-levelup-epique-design.md`

## Objectif

Dans la carte de level up : mettre en avant les atouts débloqués (grand format
avec description) et supprimer les pills de famille (« Active », « Jalon »…).
Vérifié : le ParcoursSheet (arbre de déblocages) n'affiche déjà plus de pill —
rien à y changer.

## Grand format atout (`LevelUpOverlay.tsx`)

Toute entrée `famille === "active"` (déblocage initial N5→30 **et** paliers
« 2ᵉ/3ᵉ usage » N35→90) est rendue comme un bloc encadré au lieu d'une ligne :

- **Emoji géant** (~40 px) extrait du titre localisé par regex pictographique
  (`/\p{Extended_Pictographic}/u`) — les overlays en/es/el conservent l'emoji
  dans les titres. Fallback : pas d'emoji trouvé → bloc sans emoji.
- **Titre** en `var(--font-display)` ~17 px, `--ink-900`, sans l'emoji inline
  (retiré du texte pour éviter le doublon), centré.
- **Description** complète via `descriptionDeblocage(dep, locale)` :
  `var(--font-serif)` ~13 px, `--forest-800`, lineHeight ~1.45, centrée.
- **Cadre** : `border: 1px solid var(--brass-500)`, fond `var(--paper-300)`,
  padding ~12px, façon étiquette de musée.

Les autres familles (jalon, contenu, economie, confort) restent des lignes
titre-seulement, sans pill. La ligne « Prochain — Niv. X : … » et le bouton
Continuer ne changent pas.

## Suppression des pills et code mort

- `LevelUpOverlay.tsx` : supprimer `COULEUR_FAMILLE`, `chipFamille` (exports
  sans consommateur — le commentaire « réutilisé par ParcoursSheet » est
  périmé) et l'import/usage de `libelleFamille`.
- `src/lib/i18n/libelles.ts` : supprimer `libelleFamille`.
- Dictionnaires UI `fr/en/es/el.ts` : supprimer le bloc `familles` (et le
  type dérivé suit, fr étant la référence).
- `src/lib/i18n/libelles.test.ts` : supprimer le test `libelleFamille`.
- `LIBELLE_FAMILLE` dans `deblocagesNiveau.ts` : conservé seulement s'il a
  d'autres consommateurs, sinon supprimé aussi.

## Tests

`LevelUpOverlay.test.tsx` :
- niveau débloquant un atout (ex. N5, Le Flair) → la description de l'atout
  est visible et l'emoji géant est rendu ;
- niveau sans atout (ex. N1) → pas de bloc atout, titre du déblocage visible
  en ligne simple ;
- plus aucune pill : le libellé de famille (« Jalon »…) n'apparaît plus.

## Hors périmètre

- ParcoursSheet (aucun changement).
- Pas de nouvelle animation pour le bloc atout (il hérite du fondu de la
  carte).
