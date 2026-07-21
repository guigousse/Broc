# Mini-tuto vinyle : mains de guidage visibles et complètes — design

**Date** : 2026-07-21
**Statut** : validé par Guillaume
**Contexte** : retours device sur le mini-tuto du cadeau d'anniversaire
(commit e881cf4) — la chaîne de guidage `miniTutoVinyle === "ecouter"` :
onglet Bureau → panorama → gramophone → lancement de la musique.

## Problèmes constatés (device)

1. La main au-dessus de l'onglet Bureau est cachée et son index n'est pas
   centré sur le bouton.
2. En arrivant sur `/bureau` (zone « porte », centre du panorama), rien
   n'indique qu'il faut swiper vers la droite pour atteindre le gramophone
   (zone « repos »).
3. La main sur le gramophone passe derrière le chat baladeur.
4. Dans la sheet du gramophone, rien ne pointe le vinyle à cliquer.

## 1. Main de l'onglet Bureau — `TabBar.tsx` + `globals.css`

- **Cause** : `FloatingRoomOverlay` (fenêtre stockage) est à `zIndex: 35`,
  la TabBar à `zIndex: 30` → la main `tuto-main-haut`, qui déborde au-dessus
  de la nav, est recouverte par la fenêtre.
- **Fix z-index** : quand `mainMiniTuto(...)` est vraie pour au moins un
  onglet, le `wrapStyle` de la nav passe à `zIndex: 40` (sinon 30 inchangé).
- **Fix centrage** : dans `.tuto-main-haut::after`, `left: calc(50% - 44px)`
  → `left: calc(50% - 49px)`. La pointe de l'index est excentrée dans
  l'image (doigt en haut du visuel) : après `rotate: 90deg`, elle tombe
  ~5 px à droite du centre de la boîte ; le décalage la remet pile au
  centre de la cible. S'applique à tous les usages de `tuto-main-haut`
  (PorteSheet inclus) — amélioration voulue.

## 2. Doigt directionnel sur le bureau — `(qg)/layout.tsx` + `globals.css`

- Zones du panorama : `["bureau", "porte", "repos"]` (0/1/2), atterrissage
  `initialZone="porte"` (1), gramophone en zone « repos » (2).
- Nouvel indicateur dans le conteneur fixed du panorama (au-dessus des dots,
  `zIndex: 6`) : la main gravée (`/tutoriel/main-pointeuse.webp`, ~88×36),
  ancrée au bord droit (`right: 12px`), à mi-hauteur (`top: 50%`), pointant
  vers la droite, animée du va-et-vient horizontal existant
  (`tuto-main-kf`), `pointer-events: none`, `aria-hidden`.
- Classe CSS dédiée `.tuto-main-swipe` (élément réel, pas un `::after`,
  avec le même `background`/`filter`/`animation` que `.tuto-main::after`).
- **Condition d'affichage** : `state.miniTutoVinyle === "ecouter"` ET
  `zoneActive !== 2`. (Pointer à droite reste correct depuis la zone 0.)
  Disparaît en zone « repos » — la main du gramophone prend le relais.
- Respecte `prefers-reduced-motion` comme les autres mains (animation
  coupée).

## 3. Main du gramophone devant le chat — `QgGramophone.tsx`

- **Cause** : `QgChatBaladeur` (sprite `zIndex: 2`, rendu après dans le DOM)
  recouvre le bouton gramophone (`z-index` auto).
- **Fix** : quand `guide` est vrai, le style du bouton ajoute `zIndex: 3`.
  Hors tuto : aucun changement (le chat peut continuer à chevaucher le
  gramophone).

## 4. Doigt sur le vinyle dans la sheet — `GramophoneSheet.tsx` + `(qg)/layout.tsx`

- Nouvelle prop `guide?: boolean` sur `GramophoneSheet`, branchée dans le
  layout sur `state?.miniTutoVinyle === "ecouter"` (comme `QgGramophone`).
- Quand `guide` ET `vinyles.length > 0` : la **première vignette** de la
  bande reçoit `tuto-main tuto-main-haut` (au moment du tuto, le joueur ne
  possède qu'un vinyle — le 33 tours de jazz offert).
- Pour ne pas rogner la main : pendant le guidage, `bandeWrap` passe
  `overflowX: "visible"` (aucun scroll nécessaire avec 1 vinyle) ; hors
  guidage, styles inchangés.
- Aucun branchement supplémentaire : cliquer la vignette appelle déjà
  `handleSelectVinyle` → musique + `terminerMiniTutoVinyle()` + dialogue de
  clôture.

## Tests

- `TabBar.test.tsx` : nav à `zIndex: 40` quand `miniTutoVinyle` guide un
  onglet non actif ; `30` sinon.
- `GramophoneSheet` (nouveau fichier de test ou extension) : `guide` → la
  1ʳᵉ vignette porte `tuto-main tuto-main-haut` ; sans `guide` → aucune.
- Layout/doigt directionnel : le test unitaire de la condition d'affichage
  (fonction pure extraite si besoin) — visible pour `zoneActive` 0 ou 1 +
  `miniTutoVinyle === "ecouter"`, absent en zone 2 ou hors tuto.
- Vérif device finale par Guillaume (stacking réel WebKit).

## Hors périmètre (YAGNI)

- Pas de refonte du système de mains (`::after` CSS conservé).
- Pas de changement des étapes/états `miniTutoVinyle` en save.
- Pas d'animation de swipe « fantôme » complexe : la main gravée + nudge
  horizontal suffit.
