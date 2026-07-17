# Transition iris menu → bureau — Design

Date : 2026-07-17 · Statut : validé par Guillaume

## Contexte

Aujourd'hui, le clic sur « Continuer » au menu titre fait un `window.location.href = "/bureau"`
(`src/app/page.tsx:227-230`) : rechargement dur, écran de chargement texte, puis « pop » de
l'image du bureau (`/qg/fond-cabinet.webp`, 633 Ko, jamais préchargée). Trois ruptures
visuelles à la suite, ressenties comme un flash abrupt.

Il existe déjà une transition d'intro pour la nouvelle partie (`src/components/mobile/IntroPorte.tsx`) :
contemplation → zoom ×4 sur la porte (2,2 s) → fondu au noir. CSS pur, centre de la porte
mesuré à **51 % / 66 %** de l'image de façade.

## Objectif

Remplacer le flash par une transition « iris » de style cinéma vintage, identique sur les
trois chemins d'entrée en partie :

1. **Continuer** (menu titre) ;
2. **Chargement d'un slot** (écran des 3 emplacements de sauvegarde) ;
3. **Nouvelle partie** : refonte d'`IntroPorte` — le zoom ×4 est **supprimé**, remplacé par
   la même fermeture d'iris (la contemplation de 600 ms et le tap-pour-passer sont conservés).

Hors périmètre : le retour bureau → titre (pas de transition ajoutée).

## Expérience cible

- Fermeture : un cercle noir se referme en **~900 ms** (ease-in), **centré sur la porte de la
  façade** → écran 100 % noir.
- Noir : minimum **~250 ms**, prolongé le temps de précharger/décoder l'image du bureau.
- Réouverture : dans le bureau, le cercle se rouvre en **~700 ms** (ease-out) depuis le
  **centre de l'écran**.
- Total nominal ~2 s. Bord du cercle **net** (pas de flou) — iris « cinéma muet ».
- `prefers-reduced-motion` : simple fondu au noir / depuis le noir (~400 ms), comme le fait
  déjà IntroPorte.
- Pas de skip sur Continuer/slot (trop court) ; skip conservé sur l'intro nouvelle partie
  (tap = saut direct au noir, puis arrivée bureau normale).

## Architecture

### Technique de l'iris

Un `div` rond avec `box-shadow: 0 0 0 200vmax` noir (couleur `var(--forest-900)`, comme le
scrim d'IntroPorte), animé en `transform: scale()` — GPU-friendly, CSS pur, aucune lib
(cohérent avec le reste du code). Fermé = scale 0 ; ouvert = scale suffisant pour que le
trou sorte de l'écran quel que soit le point d'ancrage.

### Ciblage de la porte

Le centre de la porte est connu en coordonnées **image** (51 % / 66 %). Une fonction
utilitaire convertit ce point en coordonnées **écran** en tenant compte du rendu
`object-fit: cover` (dimensions naturelles de l'image vs viewport) et de l'offset de
parallaxe gyroscopique au moment du clic.

### Traverser la navigation (rechargement dur)

- « Continuer » garde `window.location.href = "/bureau"`. Avant de naviguer, on pose un flag
  `sessionStorage` (« arrivée en iris », clé à aligner sur les conventions existantes).
- Côté bureau, le layout `(qg)` (`src/app/(qg)/layout.tsx`) lit ce flag **au montage** et
  affiche immédiatement un overlay 100 % noir, qui couvre l'écran de chargement texte
  existant et toute l'hydratation. Le rechargement se déroule entièrement sous le noir.
- Le flag est **consommé (supprimé) dès sa lecture** : une arrivée sur `/bureau` par
  refresh ou lien direct ne joue aucun iris (comportement actuel inchangé).

### Préchargement (suppression du « pop »)

Pendant le noir, `new Image()` + `decode()` sur `/qg/fond-cabinet.webp`. L'iris ne se
rouvre qu'une fois l'image décodée **et** le minimum de noir écoulé. Timeout de secours
(~4 s) : si le decode échoue ou traîne, on rouvre quand même — jamais bloqué au noir.
Si l'image est déjà en cache (2ᵉ entrée et suivantes), le decode est quasi instantané et
le noir dure son minimum.

### Fichiers

- **Nouveau** : composant `IrisTransition` (les deux sens : fermeture ancrée sur un point,
  réouverture) + module utilitaire (flag sessionStorage, préchargement/decode, conversion
  point image → écran).
- **Modifiés** :
  - `src/app/page.tsx` — Continuer : fermeture d'iris puis navigation ;
  - écran des slots de sauvegarde — même enchaînement au lancement d'une partie ;
  - `src/components/mobile/IntroPorte.tsx` — zoom ×4 remplacé par la fermeture d'iris,
    contemplation et skip conservés, pose du flag pour la réouverture côté bureau ;
  - `src/app/(qg)/layout.tsx` — lecture du flag, overlay noir immédiat, préchargement,
    réouverture d'iris.

## Cas limites

- Flag orphelin : impossible par construction (consommé à la lecture).
- Image en échec : timeout de secours, réouverture forcée.
- Double clic sur Continuer pendant la fermeture : bouton désactivé dès le premier clic.
- `prefers-reduced-motion` : fondu simple des deux côtés.

## Vérification

- Simulateur iOS (`scripts/ios-sim.sh`) : les trois chemins d'entrée, refresh direct sur
  `/bureau` (pas d'iris), reduced-motion, 1ʳᵉ entrée (image froide) vs entrées suivantes.
- Filets : `npx eslint src` (le `npm run lint` est cassé sous Next 16) + `npm run lint:hooks`.
