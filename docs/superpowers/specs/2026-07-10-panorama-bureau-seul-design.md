# Panorama bureau seul — suppression des sections collection & atelier

**Date** : 2026-07-10
**Statut** : validé par Guillaume

## Objectif

Revenir à un panorama à **une seule image** (le bureau). Les sections
collection et atelier du panorama unifié disparaissent. Stockage, atelier,
compétences et collection restent accessibles **directement** via les boutons
de la TabBar, qui mènent aux écrans de gestion existants (promus en routes
racines). Les images de fond atelier/collection et tous les assets associés
sont supprimés.

## Décisions validées

- **Routage** : promotion des pages — `/stockage/gerer` → `/stockage`,
  `/atelier/gerer` → `/atelier`, `/collection/grille` → `/collection`.
  Pas de redirections (app mobile, URLs jamais persistées en save).
- **Chat baladeur** : conservé avec les 2 positions restantes
  (`qg-fenetre` + fauteuil). Les entrées `atelier-fenetre` et
  `atelier-marche` sont supprimées.
- **Bureau** : reste navigable en 3 sections (bureau · porte · repos) avec
  swipe horizontal, snap et points indicateurs. Entrée par défaut : `porte`.
  L'URL est `/bureau` en permanence, quelle que soit la zone.
- **Approche technique** : on rétrécit `UnifiedPanorama` en place (composant
  maintenu, testé, intégré à l'outillage `qgedit`) plutôt que de restaurer le
  legacy `QgPanorama.tsx` — qui est supprimé au passage.

## 1. Panorama

`src/components/mobile/panorama/UnifiedPanorama.tsx` :

- Scène de **300vw** (au lieu de 900), une seule image de fond
  `/qg/fond-cabinet.webp`.
- 3 zones de snap : `bureau` (0) · `porte` (100) · `repos` (200).
  `UnifiedZoneKey` réduit à ces 3 clés.
- Suppression : prop `collectionChildren`, wrapper `translateX(300vw)`
  (`COLLECTION_X_SHIFT_VW`) — les coordonnées baked des objets QG
  redeviennent directes —, `zoneIndexToTab`.
- L'overlay d'édition `qgedit` reste dans la couche objets (sans wrapper).

`src/app/(panorama)/layout.tsx` (déplacé, cf. §2) :

- Suppression de toute la sync URL↔scroll : `pathnameToTab`,
  `tabToInitialZone`, debounce 350 ms, mount guard, `router.replace`,
  smooth-scroll sur changement de pathname, `panoramaActiveStore`.
- Virtualisation `showQgZone` recalée sur les index 0/1/2 ;
  `CollectionVitrine`, `WorkshopSlots`, `QgStockageBoxes` retirés du rendu.
- 3 points indicateurs (au lieu de 9).

`src/components/mobile/panorama/audioCurves.ts` :

- Courbes cheminée/vinyle recalées sur 3 zones : max sur `repos` (idx 2),
  fondu vers `bureau` (idx 0). Tests `audioCurves.test.ts` mis à jour.

`src/lib/panoramaActiveStore.ts` : supprimé ; la TabBar retombe sur le
tracking pathname seul (`useSyncExternalStore` retiré de `TabBar.tsx`).

## 2. Routes & TabBar

- Le groupe `(panorama)` est supprimé. Le layout panorama devient
  `src/app/bureau/layout.tsx` + `src/app/bureau/page.tsx`.
- Promotions de routes :
  - `src/app/stockage/gerer/page.tsx` → `src/app/stockage/page.tsx`
  - `src/app/atelier/gerer/page.tsx` → `src/app/atelier/page.tsx`
  - `src/app/collection/grille/page.tsx` → `src/app/collection/page.tsx`
- Mise à jour de **toutes** les références internes aux anciennes routes
  (`router.push`, comparaisons de pathname) : `GameContext.tsx`,
  `StockageItemRow.tsx`, `GlobalVinylAmbiance.tsx` (gating lowpass sur
  `/atelier/gerer` → `/atelier`), `SwipePager.tsx`, layout panorama,
  et toute autre occurrence trouvée par grep.
- `TabBar.tsx` : chemins et ordre inchangés (Collection · Bibliothèque ·
  Bureau · Stockage · Atelier). Le tracking « live » du scroll disparaît.
  Les badges (restaurations prêtes, points de compétence) sont conservés.
- `SwipePager` : l'ordre cyclique de swipe entre onglets reste le même,
  appliqué aux pages promues.

## 3. Suppressions

Code :

- `src/components/mobile/atelier-pano/` (AtelierPanorama, AtelierPanoramaView,
  AtelierScene, WorkshopSlots, layout.ts, slotsLayout.ts)
- `src/components/mobile/collection-pano/` (CollectionVitrine, layout.ts)
- `src/components/mobile/qg/QgStockageBoxes.tsx` + `stockageBoxesLayout.ts`
- `src/components/mobile/qg/QgPanorama.tsx` (legacy mort)
- Pages marqueurs `(panorama)/{atelier,collection,stockage,bureau}/page.tsx`
  (bureau recréé hors groupe, cf. §2)
- Entrées `atelier-*` de `chatBaladeurLayout.ts` et `lib/chatBaladeur.ts`
- Références atelier dans l'outillage dev `qgedit`
  (`QgEditContext/Panel/Overlay`)

Assets :

- `public/atelier/` (fond-atelier.png)
- `public/collection/` (fond-collection.webp)
- `public/qg/boxes/` (10 fichiers)
- `public/qg/chat-baladeur/atelier-fenetre.webp`, `atelier-marche.webp`

Ne PAS toucher : `public/brocantes/` (dont `atelier-bricoleur.webp` — c'est
une brocante), `public/items/*atelier*` (objets du jeu),
`src/components/mobile/brocante-pano/` (panorama des brocantes, feature
distincte), `panorama-fusionne.png` / `panorama-rue.png` à la racine
(fichiers de travail non trackés).

## 4. La perte fonctionnelle assumée

- Les slots de restauration visibles dans le panorama (`WorkshopSlots`,
  progression + tap pour récolter) disparaissent : le badge de l'onglet
  Atelier (nombre d'objets prêts) et l'écran `/atelier` couvrent le besoin.
- Les cartons de stockage cliquables disparaissent : accès direct par
  l'onglet Stockage.
- La vitrine de collection dans le panorama disparaît : accès direct par
  l'onglet Collection.

## 5. Tests & vérification

- Mise à jour : `unifiedZones.test.ts`, `audioCurves.test.ts` ;
  `BrocantePanorama.test.tsx` vérifié (à priori non impacté).
- `npx eslint src` (le `npm run lint` global est cassé — Next 16),
  `npm run lint:hooks`, suite de tests complète.
- Vérification visuelle au simulateur iOS (`scripts/ios-sim.sh`) :
  swipe 3 zones, entrée sur porte, dots, audio cheminée/gramophone,
  onglets TabBar → écrans directs, chat baladeur.
