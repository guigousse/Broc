# Compétences en fenêtre flottante (migration sur le châssis)

**Date** : 2026-07-10
**Statut** : validé par Guillaume (« lets go »)

Migration de l'onglet Compétences (/bibliotheque) sur le style validé
stockage/atelier : fenêtre flottante par-dessus le panorama du bureau flouté.

- **Route** : `src/app/bibliotheque/page.tsx` → `src/app/(qg)/bibliotheque/page.tsx`.
  URL/TabBar inchangés (masquage avant niveau 1 intact — logique TabBar).
- **Re-housing** : `bande` = tout l'actuel StickyTop (titre, TreePicker, nom
  d'arbre, encadré niveau/XP/points, ligne de progression, bouton Parcours) ;
  `panneau` = branches de compétences. BottomSheet détail + ParcoursSheet
  hors châssis. Effet redirect supprimé (layout (qg) gate), early return →
  narrowing `return null` ; écran d'attente/clé i18n purgés si orphelins.
- **Navigation & audio** : SwipePager `QG_GROUP` += `/bibliotheque` ;
  GlobalVinylAmbiance `PANORAMA_PATHS` += `/bibliotheque`.
- **Vérifs** : gates habituels + build (routes) + navigateur.
- Noté pour plus tard : si la bande est trop haute à l'usage, déplacer la
  barre niveau/XP en tête de panneau (retouche future, hors périmètre).
