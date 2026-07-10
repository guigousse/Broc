# Atelier en fenêtre flottante (migration sur le châssis FloatingRoomOverlay)

**Date** : 2026-07-10
**Statut** : validé par Guillaume (« ok go »)

Migration de l'onglet Atelier sur le style validé du stockage
(cf. `2026-07-10-stockage-fenetre-flottante-design.md`) : fenêtre flottante
par-dessus le panorama du bureau flouté.

## 1. Route

- `src/app/atelier/page.tsx` → `src/app/(qg)/atelier/page.tsx` (layout
  partagé `(qg)`). URL `/atelier` inchangée, badge « prêt » TabBar inchangé.

## 2. Re-housing

- `bande` = `PageHeaderBar` actuel (titre, compteur d'établi n/max,
  UpgradeButton/MAX) + `PiecesInventoryBar` en dessous (marginTop 4,
  comme le CategoriePicker du stockage).
- `panneau` = flash + tout le contenu actuel (sections travaux en cours /
  restaurables, animations de vol internes cible `travaux` conservées).
- Les 2 `BottomSheet` (restauration, démantèlement) restent hors châssis
  (z 40/41 > 35).
- Suppression : imports `MobileLayout`/`MobileHeader`/`StickyTop`, effet
  `router.replace("/")` (le layout `(qg)` gate déjà), early return réduit à
  `if (!isHydrated || !state) return null;`. Clé i18n `preparationEtabli`
  purgée des 3 dictionnaires si orpheline.

## 3. Navigation & audio

- `SwipePager` : `QG_GROUP` += `/atelier`.
- `GlobalVinylAmbiance` : `PANORAMA_PATHS` += `/atelier` ; la branche
  étouffée 0.28/800 Hz disparaît (plus aucune « pièce voisine »).
  Commentaires d'en-tête mis à jour.

## 4. Vérification

Gates habituels (`npx tsc --noEmit`, `npx eslint src`, `npm run lint:hooks`,
`npm run test:run`, build) + vérification navigateur : animations d'entrée,
sheets au-dessus du châssis, swipe d'onglets, ambiance sonore continue,
transition /bureau ↔ /atelier sans remontage du panorama.

Hors périmètre : Collection (chantier suivant), tout changement fonctionnel
de l'atelier.
