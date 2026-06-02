# Gramophone interactif — sélection et lecture de vinyles

**Date** : 2026-06-02
**Branche** : `feat/qg-decor-ludique`
**Composant principal** : `src/components/mobile/qg/sheets/GramophoneSheet.tsx` (nouveau)

## Contexte

Le gramophone du QG est aujourd'hui décoratif (`QgGramophone.tsx`, `pointerEvents: none`). On veut le rendre interactif : tap → ouverture d'un sheet plein écran avec l'illustration `gramophoeface.png`, bande horizontale des vinyles de la collection, contrôles ▶/⏸/⏭, et lecture audio par vinyle.

## Cinématique

- Tap sur `QgGramophone` → ouvre `GramophoneSheet` (overlay scrim + image gramophone centrée). ESC/scrim → ferme.
- Sélection d'un vinyle → vient se poser sur le plateau, démarre lecture.
- ▶/⏸ → toggle même bouton (icône change).
- ⏭ → vinyle suivant dans la liste, joue immédiatement.
- Fin de morceau (`onended`) → auto-next.
- Fin de liste → revient au premier (cycle).
- Fermeture sheet → musique continue dans le QG au volume zonal.
- Sortie page QG → musique stoppée ; son d'aiguille continue en loop si un vinyle était sur le plateau.
- Retour page QG → si vinyle était sur platine : aiguille seule continue, joueur doit reclic ▶ pour relancer la musique.

## Layout du sheet

```
┌────────────────────────────────────┐
│                                    │
│         [pavillon doré]            │
│           ╲   ╱                    │
│      ┌──────────────┐              │  Image gramophoeface.png ~70% hauteur
│      │   PLATEAU    │              │  Vinyle posé en overlay absolute
│      │   ⚫ ▽      │              │  Spin 2.5s linear infinite si isPlaying
│      └──────────────┘              │
│           PATHÉ                    │
│                                    │
│  ─────────────────────             │
│       Brel — Amsterdam             │  ← titre vinyle courant
│  ─────────────────────             │
│      ⏵    ▶/⏸    ⏭                 │  ← contrôles, ▶/⏸ centre, ⏭ droite
│  ─────────────────────             │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐ ←        │
│  │💿││💿││💿││💿││💿││💿│ scroll    │  ← bande vinyles, encadré doré = courant
│  └──┘└──┘└──┘└──┘└──┘└──┘ →        │
└────────────────────────────────────┘
```

Note : la maquette mentionne « bouton play à gauche du gramophone et suivant à droite » ; pour un mobile en portrait, on regroupe en bas dans une barre de contrôles unique sous le titre (3 boutons sur une ligne). Si après test visuel la disposition gauche/droite du gramophone est préférable, on déplacera les boutons hors de la barre, en absolute à mi-hauteur du gramophone.

## Sélection des vinyles

```ts
const VINYLE_PREFIXES = ["mus.vinyle_", "mus.33tours_"];

function vinylesEnCollection(state: GameState): CollectionSlot[] {
  return state.collection["Musique"].filter(
    (s) => s.vu && VINYLE_PREFIXES.some((p) => s.templateId.startsWith(p)),
  );
}
```

Ordre fixe = ordre dans `state.collection["Musique"]` (déjà aligné sur l'ordre du catalogue).

État vide (liste de 0) : bande remplacée par message *« Aucun vinyle dans votre collection. Trouvez-en chez vos vendeurs. »*

## État

État au niveau `QgPageInner` (pas dans GameContext — éphémère à la session, stoppé en quittant la page) :

```ts
const [gramophoneOuvert, setGramophoneOuvert] = useState(false);
const [vinyleCourantIdx, setVinyleCourantIdx] = useState<number | null>(null);
const [vinyleEnLecture, setVinyleEnLecture] = useState(false);
```

Liste calculée par `useMemo` à chaque changement de collection. Si l'index courant pointe sur un vinyle qui sort de la collection (cas rare), `null` et stop.

## Audio

### Pattern : élément `<audio>` + WebAudio
On passe d'un `BufferSource` (one-shot) à un `HTMLAudioElement` invisible + `MediaElementAudioSourceNode` + `GainNode` connectés au `master` :

- permet `audio.onended` → notifier auto-next
- permet `pause()` / `play()` natifs
- permet de changer `audio.src` au vol pour switcher de vinyle
- `gain.gain.value` réglable dynamiquement (ramping doux)

### Méthodes ajoutées à `audioManager`

```ts
playVinyl(templateId: string, onEnded?: () => void): Promise<void>;
pauseVinyl(): void;
resumeVinyl(): void;
stopVinyl(): void;                  // stoppe et détruit la source
setVinylTargetVolume(v: number): void; // ramp ~300ms vers v (0–1)
startNeedle(): Promise<void>;       // loop son d'aiguille
stopNeedle(): void;
```

### Convention de fichiers
- Dossier : `public/sounds/vinyles/`
- Fichier : `{templateId}.mp3` (ex. `mus.vinyle_brel_amsterdam.mp3`)
- Son d'aiguille : `public/sounds/needle.mp3`
- Tant que les mp3 ne sont pas fournis : `loadBuffer` / fetch échoue silencieusement → lecture muette, mais le plateau tourne quand même (et `onended` n'est jamais appelé, donc auto-next à la main au prochain clic).

### Calcul du volume zonal

Position du panorama déjà remontée par `onScrollPos(pos: number)` dans `page.tsx`. Mapping :

| pos (panorama) | Zone | Volume vinyle |
|---|---|---|
| 0 (bureau) | Bureau | 0.30 |
| 1 (porte) | Entrée | 0.50 |
| 2 (repos) | Cheminée | 0.80 |
| (sheet ouvert) | Plein écran | 1.00 |

Pour pos fractionnaire (transition entre deux zones), interpolation linéaire entre les bornes. Quand le sheet est ouvert, on bypasse la zone et on cible 1.00.

Volume final envoyé au gain : `target × master` (multiplication par le master des préférences, c.f. décision (a)).

### Cycle de vie

- Mount QG : aucune lecture.
- Tap sur vinyle : `audioManager.startNeedle()` (loop), `audioManager.playVinyl(templateId, onEnded)`, `setVinyleEnLecture(true)`.
- Pause : `pauseVinyl()` ; needle continue.
- Resume : `resumeVinyl()`.
- Next : `stopVinyl()` + `playVinyl(next, onEnded)`.
- `onEnded` callback → `setVinyleCourantIdx((i) => (i + 1) % liste.length)`, déclenche un useEffect qui rappelle `playVinyl`.
- Fermeture sheet : on garde l'audio actif, on change juste `setVinylTargetVolume` selon la zone.
- Unmount `QgPageInner` (sortie page) :
  - `stopVinyl()` (musique stoppée)
  - `startNeedle()` reste actif (l'aiguille tourne en fond)
  - Au retour QG : `vinyleCourantIdx` est perdu (state local React démonté). Décision : on persiste le `vinyleCourantIdx` + `aiguilleActive` dans **`localStorage`** sous une clé éphémère `broc.gramo.session`, restauré au mount. Si on trouve `aiguilleActive=true`, on relance `startNeedle()`. Pas de relance auto de la musique.

> Persistance technique mais éphémère : pas de migration nécessaire, écrasé librement, ignoré si parse échoue.

## Composants

### `GramophoneSheet.tsx` (nouveau)
Props :
```ts
interface GramophoneSheetProps {
  open: boolean;
  onClose: () => void;
  vinyles: CollectionSlot[];        // déjà filtrés/triés
  vinyleCourantIdx: number | null;
  enLecture: boolean;
  onSelect: (idx: number) => void;  // tap sur tile de la bande
  onPlayPause: () => void;
  onNext: () => void;
}
```
Rendu : scrim + image gramophone centrée + plateau overlay (image vinyle si idx≠null, anim spin) + titre + contrôles + bande horizontale.

### `QgGramophone.tsx` (modif)
Devient cliquable. Props :
```ts
interface QgGramophoneProps {
  onTap: () => void;
}
```
Remplace `<div aria-hidden>` par `<button>` (comme `QgJournal`). Garde l'image `/qg/gramophone.png` (vue de profil, dans la scène). Le sheet utilise `/qg/gramophoeface.png` (vue de face).

### `page.tsx` (QgPageInner) — modifs
- État local : `gramophoneOuvert`, `vinyleCourantIdx`, `vinyleEnLecture`.
- `vinyles = useMemo(() => vinylesEnCollection(state), [state.collection])`.
- Handlers : `handlePlayPause`, `handleNext`, `handleSelect`.
- `useEffect` pour piloter volume zonal (déclenché par `pos` du panorama + `gramophoneOuvert`).
- `useEffect` au mount : restore session `broc.gramo.session` → si aiguille active, `startNeedle()`.
- Cleanup : sur unmount, `stopVinyl()` (mais pas `stopNeedle()`).
- `QgGramophone` reçoit `onTap={() => setGramophoneOuvert(true)}`.
- Rend `<GramophoneSheet … />`.

### `audioManager.ts` — modifs
- Nouvelle propriété `vinylSource: { audio: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode } | null`.
- Nouvelle propriété `needleSource: AudioBufferSourceNode + gain` (loop).
- Méthodes listées ci-dessus.

### `SettingsContext.tsx` — modifs
Expose `playVinyl`, `pauseVinyl`, `resumeVinyl`, `stopVinyl`, `setVinylTargetVolume`, `startNeedle`, `stopNeedle`.

## Hors scope

- Persistance entre sessions (rechargement total = silence)
- Shuffle / playlist personnalisée / favoris
- Vinyle physiquement visible sur le gramophone décoratif du QG quand le sheet est fermé
- Égaliseur / contrôle de volume vinyle séparé du master
- Image dédiée carrée des pochettes (utilisation directe des `.png` des items, format rectangulaire affiché en carré comme dans la Collection)
- Affichage de la pochette qui tourne avec rognage en disque (`border-radius: 50%`) — paufinage ultérieur
