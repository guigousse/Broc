# Level up épique — séquence en 2 temps

Date : 2026-07-22 · Statut : validé par Guillaume

## Objectif

Rendre la célébration de montée de niveau plus épique : détacher le « Niveau X »
de la carte de déblocages, le faire apparaître avec un grossissement (zoom) et
un vrai son de level up (remplace l'arpège synthé placeholder).

## Son

- Copier `/Users/guillaume/Desktop/pointeur.mp3` (1,7 s, 256 kbps) vers
  `public/sounds/level-up.mp3`.
- `audioManager.playLevelUp()` : supprimer l'arpège synthé (C5-E5-G5-C6) et
  jouer le buffer `/sounds/level-up.mp3` sur le modèle de `playCash()`
  (`loadBuffer` + `createBufferSource`), guard `this.prefs.effets` conservé.
- La signature peut devenir `async` ; l'appelant (`LevelUpOverlay`) ne
  l'attend pas, comme les autres one-shots.
- Déclenchement inchangé : au montage de l'overlay (`useEffect` sur
  `niveauACelebrer`, hors session de vente).

## Visuel — `LevelUpOverlay.tsx`

Structure en colonne centrée sur le scrim sombre existant (`rgba(20,20,16,0.72)`,
z-index 60, `role="dialog"` et `aria-label` inchangés).

### Temps 1 — bloc titre détaché (t = 0)

- Sorti de la carte papier : affiché directement sur le scrim.
- Eyebrow « Niveau brocanteur » (style mono uppercase existant, adapté pour
  fond sombre) au-dessus du titre.
- Titre « Niveau X » : `var(--font-display)`, ~56 px, couleur `var(--brass-300)`,
  ornements `✦` de part et d'autre, légère lueur (`text-shadow`).
- Animation `levelup-slam` (~600 ms) : `scale(3)` → léger overshoot
  (~`scale(0.95)`) → `scale(1)`, opacité 0 → 1.

### Temps 2 — carte de déblocages (t = ~1 s)

- La carte papier existante perd son eyebrow et son titre ; elle garde :
  ligne « +1 point de compétence » (si plafond non atteint), lignes de
  déblocages avec chips famille, « prochain niveau… », bouton Continuer
  (comportements inchangés, `marquerNiveauVu`).
- Apparition : fondu + léger `translateY`, `animation-delay: 1s`,
  `animation-fill-mode: backwards` (invisible avant le délai).

### CSS

- Keyframes ajoutées dans `globals.css` à côté des existantes
  (`broc-fade-in`, …). ⚠ Pas de `calc()` dans les transforms de `@keyframes`
  (Lightning CSS/Turbopack jette silencieusement la règle).
- `prefers-reduced-motion: reduce` : pas de zoom ni translation — fondu
  simple, carte sans délai.

## Tests

- `LevelUpOverlay.test.tsx` : contenu sémantique inchangé (titre rendu,
  `aria-label`, bouton) — doit rester vert, ajuster les sélecteurs si besoin.
- `audioManager.test.ts` : adapter le test de `playLevelUp` au chargement de
  buffer (mock `fetch`/`decodeAudioData` comme pour les autres one-shots).

## Hors périmètre

- Pas de particules/confettis ni de refonte de la carte.
- Les exports réutilisés par `ParcoursSheet` (`COULEUR_FAMILLE`,
  `chipFamille`) ne bougent pas.
