# Jazz au titre, fondu iris, tempo ralenti — Design

Date : 2026-07-17 · Statut : validé par Guillaume · Base : feat/sp2-trame-mecanique (inclut la transition iris)

## Contexte

La transition iris menu → bureau est en place (spec `2026-07-17-transition-iris-design.md`) :
fermeture 900 ms / réouverture 700 ms, flag sessionStorage, trois chemins (Continuer, slot,
IntroPorte). L'écran titre (`src/app/page.tsx`) ne joue aujourd'hui que l'ambiance de rue
(`audioManager.startAmbience()`). Le gramophone du bureau enchaîne ses morceaux via le
callback `onEnded` de `playGramophoneSong`/`playVinyl` (`src/app/(qg)/layout.tsx`,
`handleNext`).

État des lieux audio (exploration 2026-07-17) :
- 2 vinyles jazz seulement ont un mp3 : `mus.33tours_jazz_2`, `mus.33tours_jazz_3`
  (`src/data/vinylesAudio.ts`). `mus.33tours_jazz_1` n'a ni mapping ni fichier.
- Guillaume fournit le 3ᵉ morceau : `/Users/guillaume/Desktop/papi/Muted Clarinet Fade.mp3`
  (mp3 48 kHz stéréo, ~3 min 50, 5,3 Mo — cohérent avec les autres vinyles).
- Le bus gramophone (`vinylAmbianceGain` → lowpass → master) porte musique ET crépitement ;
  `GlobalVinylAmbiance` étouffe ce bus sur toute route hors panorama, **y compris `/`**
  (volume 0,22 + lowpass 700 Hz) — conflit avec une musique de titre pleine.
- Aucune rampe de volume paramétrable : les fades existants sont codés en dur (0,3-0,4 s).
- Les départs Continuer/slot font un rechargement dur (l'audio meurt de fait, mais
  brutalement) ; la nouvelle partie navigue en soft (router.push) — rien ne coupe l'audio.

## Objectifs

1. **Musique du titre** : les 3 vinyles jazz joués à la suite et en boucle sur l'écran titre.
2. **Fondu de sortie** : au départ en partie, la musique décroît proportionnellement à la
   fermeture de l'iris, totalement coupée en entrant en partie. Sur les trois chemins.
3. **Iris plus lent** : fermeture 900 → **1800 ms**, réouverture 700 → **1400 ms**.

## Décisions

### 1. Asset et playlist

- Copier `/Users/guillaume/Desktop/papi/Muted Clarinet Fade.mp3` →
  `public/sounds/vinyles/mus.33tours_jazz_1.mp3` et ajouter le mapping dans
  `VINYLE_AUDIO_URLS` (`src/data/vinylesAudio.ts`). Effet bonus voulu : jazz_1 devient
  jouable sur le gramophone en partie (la playlist du bureau filtre par `vinylHasAudio`).
- Playlist du titre, ordre fixe : `mus.33tours_jazz_1` → `mus.33tours_jazz_2` →
  `mus.33tours_jazz_3` → boucle. Enchaînement par le callback `onEnded` (même mécanique que
  `handleNext` du bureau).

### 2. Lecture au titre (pipeline gramophone réutilisé)

Au montage de `TitleScreen` :
- `stopGramophone()` d'abord (état propre si on arrive du jeu en navigation soft) ;
- bus vinyle remis à plein : `setVinylAmbianceVolume(1)` + `setVinylAmbianceLowpass(20000)` ;
- `startNeedle()` (crépitement, une fois) puis `playVinyl(url, onEnded → morceau suivant)` —
  PAS `playGramophoneSong` (éviterait de rejouer les bruitages vinyl-1/vinyl-2 à chaque
  enchaînement).
- **Autoplay iOS** : si la lecture échoue avant le premier geste, réessayer au premier
  `pointerdown` (listener once, même philosophie que l'unlock existant de l'audioManager).
- Préférence « musique OFF » : déjà respectée (gates `prefs.musique` dans
  `playVinyl`/`startNeedle`/`resumeVinyl`).
- Au démontage du titre sans départ en partie (retour impossible aujourd'hui, mais par
  propreté) : rien de spécial — les départs passent par le fondu ci-dessous.

Approche écartée : une chaîne audio dédiée au titre — dupliquerait la gestion
mute/unlock/volume pour un rendu identique.

### 3. `GlobalVinylAmbiance` : la route `/` passe en pilotage local

`/` rejoint la logique « le screen pilote lui-même » (comme les `PANORAMA_PATHS`) : le
contrôleur global n'étouffe plus le titre. Les autres routes gardent leur comportement.

### 4. Fondu de sortie paramétrable

- Nouvelle méthode `audioManager.fadeOutVinylBus(durationMs)` : rampe linéaire du gain du
  bus gramophone (musique + crépitement ensemble) vers 0 sur `durationMs`, puis à
  l'échéance : arrêt propre (`stopGramophone()` + `stopNeedle()`) et gain du bus restauré à
  1 (l'entrée au bureau remet déjà volume/lowpass, mais on ne laisse pas un bus à zéro).
  Idempotente / sûre si rien ne joue. Appelée directement sur `audioManager` (pattern
  existant de `page.tsx` pour l'ambiance) — pas d'indirection SettingsContext.
- Déclenchement :
  - **Continuer / slot** (`src/app/page.tsx`) : `fadeOutVinylBus(DUREE_FERMETURE_MS)` au
    moment de `lancerIrisVers(...)` — le fondu suit exactement la fermeture ; au noir, le
    rechargement dur finit le travail.
  - **Nouvelle partie** (`IntroPorte`) : `fadeOutVinylBus(DUREE_FERMETURE_MS)` au passage
    en phase « iris » (après la contemplation de 600 ms). **Skip** (tap) :
    `fadeOutVinylBus(300)`. Chemin soft (router.push) : l'arrêt à l'échéance du fade coupe
    réellement la musique.
  - **Reduced-motion** : `fadeOutVinylBus(DUREE_FADE_REDUIT_MS)` (400 ms), aligné sur le
    fondu visuel, sur les trois chemins.
- L'ambiance de rue (`startAmbience`) n'est PAS touchée : elle continue au bureau
  (comportement actuel conservé).

### 5. Iris ralenti

Dans `src/lib/transitionIris.ts` : `DUREE_FERMETURE_MS = 1800`, `DUREE_OUVERTURE_MS = 1400`.
Aucun autre changement : composants et tests référencent les constantes. Total nominal
~3,5 s (fermeture 1,8 + noir ≥ 0,25 + réouverture 1,4). IntroPorte passe à ~2,4 s
(600 ms contemplation + 1,8 s iris) — toujours plus courte que l'ancienne version zoom (3,3 s).

## Cas limites

- Musique OFF dans les réglages : pas de lecture, le fade est un no-op silencieux.
- Fichier jazz manquant/illisible : `playVinyl` échoue silencieusement, `onEnded` non
  appelé — pas de crash ; les 2 autres morceaux ne sont pas affectés au prochain cycle
  (l'enchaînement part du morceau demandé, pas d'une position globale).
- Double départ (double clic) : déjà gardé par l'état `iris` ; le fade n'est déclenché
  qu'une fois.
- Arrivée au titre depuis le jeu avec un vinyle du gramophone en cours (navigation soft) :
  `stopGramophone()` au montage du titre → la playlist jazz repart proprement.

## Vérification

- vitest : mapping jazz_1 présent ; enchaînement de la playlist (onEnded → suivant, boucle
  3 → 1) ; `fadeOutVinylBus` appelé avec la bonne durée sur Continuer, slot, IntroPorte
  (phase iris + skip) ; nouvelles valeurs des constantes d'iris.
- Device (simulateur/`scripts/ios-sim.sh`) : autoplay au premier geste, fondu audible et
  synchrone avec l'iris, coupure totale au bureau, perf de l'iris ralenti.
- Filets : `npx eslint src`, suite vitest complète. (Build Turbopack KO dans un worktree à
  node_modules symlinkée — utiliser `npx next build --webpack` si besoin.)
