# Menu principal, header retour, modale Réglages, audio

**Date :** 2026-05-28
**Branche cible :** branche dédiée (`feat/menu-principal-reglages`).
**Périmètre :** retour au menu principal depuis n'importe quel écran, refonte du menu, modale Réglages plein écran, introduction d'un système audio (clics synthé + sons fichier).

## Objectif

1. Le titre `BROC` du header devient un raccourci universel vers le menu principal.
2. Le menu principal adopte le nouveau logo et un libellé "Nouvelle Partie / Recommencer une nouvelle partie" contextuel avec confirmation.
3. Le bouton Réglages devient fonctionnel et ouvre une modale plein écran avec quatre sections (Son, Affichage, Partie, À propos).
4. Le jeu gagne un système audio : clics synthétisés sur les boutons navigation, son d'encaissement à chaque vente, et bruit de foule en boucle quand le joueur est en mode chinage ou vente.

## 1. Header — BROC retourne au menu principal

**Fichier :** `src/components/mobile/MobileHeader.tsx`

- Remplacer `<Link href="/qg">` par `<Link href="/">`.
- Aucun autre changement (style, comportement, autres liens).

**Conséquence :** depuis QG, Stockage, Atelier, Collection, Compétences, Chiner-liste, Vitrine-liste, le tap sur "BROC" ramène au menu. Aucun warning d'abandon — l'autosave est permanente.

## 2. Menu principal

**Fichier :** `src/app/page.tsx`

### Logo

- Remplacer le bloc `<img src="/assets/broc-crest-light.svg" ... />` (cresset 120×120) par :

  ```tsx
  <img
    src="/assets/broc-logo.png"
    width={180}
    height={180}
    alt="Broc"
    style={{
      display: "block",
      margin: "0 auto 24px",
      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
    }}
  />
  ```

- Garder ensuite l'eyebrow "— une simulation de brocante —" et le wordmark `broc-wordmark-light.svg` inchangés.

### Bouton principal contextuel

Le bouton "Nouvelle Partie" actuel devient :

```tsx
<Button
  variant="primary"
  size="lg"
  onClick={() => {
    if (aSauvegarde) {
      if (!window.confirm("Cela écrasera la partie en cours. Continuer ?")) return;
    }
    nouvellePartie();
  }}
>
  {aSauvegarde ? "Recommencer une nouvelle partie" : "Nouvelle Partie"}
</Button>
```

Si l'utilisateur annule le confirm, on ne fait rien.

### Bouton Continuer

Inchangé (déjà `disabled={!aSauvegarde}`).

### Bouton Réglages · Crédits

Retirer `disabled`. Au clic, ouvrir la modale (§3). État local `const [reglagesOuverts, setReglagesOuverts] = useState(false)`.

## 3. Modale Réglages plein écran

**Fichier nouveau :** `src/components/mobile/ReglagesModal.tsx`

### Structure

- `position: fixed; inset: 0; z-index: 100;`
- Fond `--forest-900` + grain overlay identique à TitleScreen (réutiliser le pattern : radial gradient, repeating-conic-gradient, BrassCorners).
- Header de la modale : barre haute `padding-top: var(--safe-top)` avec à gauche le titre `— RÉGLAGES —` (font-display, brass-300), à droite un bouton `✕` qui ferme la modale.
- Body : scroll vertical, padding 24 px, sections empilées.
- Pas de navigation au router : on monte/démonte la modale via prop `open` + `onClose`.

### Section a. Son

```
[Volume général]
[━━━━●━━━━━━]  72
[ ] Bruit de foule
[ ] Sons d'encaissement
[ ] Clics
```

- Slider volume 0-100, valeur stockée dans `audioPrefs.volume`. Au move, appelle `audioManager.setVolume(v)` en live.
- 3 toggles : `foule`, `cash`, `clic`. Mettent à jour `audioPrefs` puis effet immédiat (couper "foule" arrête `crowdSource` ; couper "clic" rend `playClick` no-op).
- Persistance : à chaque changement, écrire `localStorage["projet-broc:audio:v1"] = JSON.stringify(audioPrefs)`.

### Section b. Affichage

```
[Taille de police]
( Petit )  ( Normal )  ( Grand )
[Thème]      (à venir)
( Auto )  ( Clair )  ( Sombre )
```

- Sélecteur taille = 3 boutons radio-style (le sélectionné = forest-800 fond, brass-300 texte ; les autres = paper-100 + ink-700).
- Au clic, modifier `displayPrefs.tailleFonte` + appliquer immédiatement `document.documentElement.style.setProperty("--font-scale", VAL)` avec VAL ∈ `{ "0.9", "1", "1.15" }`.
- Persistance : `localStorage["projet-broc:display:v1"]`.
- Sélecteur thème entier disabled, opacité 0.4, libellé "(à venir)" en italique au-dessus.

### Section c. Partie

```
[ Supprimer la sauvegarde ]   ← style vermillon
```

- Bouton plein vermillon (`--vermillion-600` fond, `--paper-100` texte, bordure `--velvet-700`).
- Au clic : `if (!window.confirm("Êtes-vous sûr ? Cette action est irréversible.")) return;` puis appel `reset()` du GameContext. Reste sur la modale ouverte (et donc le menu principal en arrière-plan).

### Section d. À propos

Trois lignes simples en monospace 10-11 px :

```
ver. 0.1 · saison de printemps · 1924
Broc — une simulation de brocante
Conçu par G. Fenard · 2026
```

## 4. Système audio

### Fichiers son

Copier les deux mp3 fournis dans `public/sounds/` :

- `public/sounds/crowd.mp3` ← `~/Desktop/jarasnat-crowd-noise-284490.mp3` (~707 Ko, 22 s, 48 kHz mono).
- `public/sounds/cash.mp3` ← `~/Desktop/freesound_community-money-pickup-2-89563.mp3` (~12 Ko, court).

Aucun traitement (le loop gapless est géré par Web Audio API).

### Module `src/lib/audio/audioManager.ts`

Singleton lazy-initialisé au premier `ensureCtx()` (contrainte autoplay des navigateurs : on doit attendre une interaction utilisateur). Interface :

```ts
export interface AudioPrefs {
  volume: number;   // 0-100
  foule: boolean;
  cash: boolean;
  clic: boolean;
}

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  volume: 70,
  foule: true,
  cash: true,
  clic: true,
};

class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private crowdSource?: AudioBufferSourceNode;
  private crowdGain?: GainNode;
  private buffers: Map<string, AudioBuffer> = new Map();
  prefs: AudioPrefs = { ...DEFAULT_AUDIO_PREFS };

  // Public API
  hydrate(prefs: Partial<AudioPrefs>): void;            // appelé au boot avec les prefs persistées
  ensureCtx(): void;                                    // crée AudioContext + master si besoin
  setVolume(v: number): void;                           // 0-100, applique master.gain = v/100
  setPref<K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]): void;
  playClick(): void;                                    // synth: sine 800Hz, 2ms attack, 30ms decay
  playCash(): Promise<void>;                            // load+play one-shot
  startCrowd(): Promise<void>;                          // load + boucle gapless
  stopCrowd(): void;                                    // fade 300ms puis stop

  // Internal
  private async loadBuffer(url: string): Promise<AudioBuffer>;
}

export const audioManager = new AudioManager();
```

**Détails d'implémentation :**

- `ensureCtx` : crée `new AudioContext()`, crée un `GainNode` master connecté à `destination`, applique `master.gain.value = prefs.volume / 100`.
- `loadBuffer(url)` : si déjà en `buffers`, retourne directement ; sinon `fetch → arrayBuffer → ctx.decodeAudioData → set`.
- `playClick()` : si `!prefs.clic` retourner ; sinon oscillator sine 800 Hz, gain envelope (linearRamp attack 0→1 en 2 ms, expRamp 1→0.001 en 30 ms), connecte à master, `start()` puis `stop(now+0.05)`.
- `playCash()` : si `!prefs.cash` retourner ; sinon `loadBuffer("/sounds/cash.mp3")` → `AudioBufferSourceNode` connecté à master, `start()`.
- `startCrowd()` : si `!prefs.foule` retourner ; si `crowdSource` déjà actif retourner. Sinon `loadBuffer("/sounds/crowd.mp3")` → `AudioBufferSourceNode` avec `loop = true` → `crowdGain` (gain 0) → master. `start()` puis ramp gain 0→0.6 en 800 ms (fade-in).
- `stopCrowd()` : si pas de `crowdSource`, return. Sinon ramp `crowdGain` → 0 en 300 ms, `stop(now+0.31)`, libère les références.
- `setPref("foule", false)` doit appeler `stopCrowd()` ; `setPref("foule", true)` ne fait pas de auto-start (le start est piloté par le mount des écrans Chiner/Vitrine).

### Provider React `src/context/SettingsContext.tsx`

Provider racine unique chapeautant audio + display. Monté dans `src/app/layout.tsx` au-dessus de `GameProvider`.

```ts
interface SettingsValue {
  audioPrefs: AudioPrefs;
  setAudioPref<K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]): void;
  setVolume(v: number): void;
  playClick(): void;
  playCash(): void;
  startCrowd(): void;
  stopCrowd(): void;
  tailleFonte: "petit" | "normal" | "grand";
  setTailleFonte(t: "petit" | "normal" | "grand"): void;
}
```

- Lit les prefs depuis localStorage au mount client (`useEffect` post-hydratation).
- Appelle `audioManager.hydrate(prefs)`.
- Applique `--font-scale` via `document.documentElement.style.setProperty` au mount et à chaque changement.

### Câblage des écrans

**Clics synthé** dans :

- `src/app/page.tsx` — les 3 boutons (Nouvelle/Continuer/Réglages) appellent `playClick()` au début de leur `onClick`.
- `src/components/mobile/ReglagesModal.tsx` — les boutons de section (Supprimer save, sélecteurs taille de police, toggles).
- `src/app/qg/page.tsx` — les 3 CTA Chiner/Exposer/Passer.
- `src/components/mobile/TabBar.tsx` — chaque item.

**Cash** dans :

- `src/context/GameContext.tsx` — la fonction `vendreDeVitrine` appelle `audioManager.playCash()` en premier (idempotent, ne casse rien en SSR car le manager n'agit qu'avec un AudioContext).
- Décision : appel direct à `audioManager` (pas de hook), car `vendreDeVitrine` est un callback hors hook. Si besoin, exposer un `playCash` global via `audioManager`.

**Crowd** dans :

- `src/app/chiner/[brocanteId]/ClientPage.tsx` — `useEffect(() => { startCrowd(); return () => stopCrowd(); }, [startCrowd, stopCrowd])`.
- `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` — idem.

## 5. CSS — variable taille de police

**Fichier :** `src/app/globals.css`

Ajouter dans `:root` (ou créer le bloc si absent) :

```css
:root {
  --font-scale: 1;
}
html {
  font-size: calc(16px * var(--font-scale));
}
```

Aucune autre règle CSS n'est touchée. Les composants utilisent des valeurs en `px` mais beaucoup de tailles (lucide icons via `size=`) restent fixes — c'est OK, l'objectif est juste de faire varier le texte global pour l'accessibilité. Si le rendu "Grand" décale trop la mise en page, on ajustera dans une passe ultérieure (hors-scope).

## Hors-scope

- Clics synthé sur les boutons des sous-écrans détaillés (atelier, négociation, vitrine de prep, collection, compétences). Réservé à un passage ultérieur.
- Thème Clair / Sombre (UI désactivée, libellé "à venir").
- Crossfade audio sur le crowd loop (loop natif suffisant).
- Tests automatisés (le projet n'en a pas).
- Compression mp3.
- Page Crédits étendue (texte court suffit pour MVP).
- Animations d'ouverture/fermeture de la modale (fondu sans glissement).

## Fichiers touchés

**Création :**

- `public/sounds/crowd.mp3`
- `public/sounds/cash.mp3`
- `src/lib/audio/audioManager.ts`
- `src/context/SettingsContext.tsx`
- `src/components/mobile/ReglagesModal.tsx`

**Modification :**

- `src/components/mobile/MobileHeader.tsx` — lien BROC → `/`.
- `src/app/page.tsx` — logo, bouton contextuel, ouverture modale Réglages.
- `src/app/layout.tsx` — wrap dans `SettingsProvider`.
- `src/app/globals.css` — `--font-scale`.
- `src/context/GameContext.tsx` — appel `audioManager.playCash()` dans `vendreDeVitrine`.
- `src/app/chiner/[brocanteId]/ClientPage.tsx` — startCrowd/stopCrowd au mount/unmount.
- `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` — idem.
- `src/components/mobile/TabBar.tsx` — playClick.
- `src/app/qg/page.tsx` — playClick sur les 3 CTA.

## Critères d'acceptation

- [ ] Tap sur "BROC" depuis n'importe quel écran in-game ramène au menu principal.
- [ ] Sans sauvegarde, le bouton lit "Nouvelle Partie" et démarre la partie.
- [ ] Avec sauvegarde, le bouton lit "Recommencer une nouvelle partie" et demande confirmation. Si refus : aucun changement.
- [ ] Le logo `broc-logo.png` (180×180) s'affiche en haut du menu sans fond blanc.
- [ ] Cliquer "Réglages · Crédits" ouvre la modale plein écran. Le ✕ la ferme.
- [ ] Le slider volume agit immédiatement sur le son joué.
- [ ] Les 3 toggles Son agissent immédiatement (couper Foule = silence, etc.).
- [ ] Sélectionner "Grand" agrandit visiblement les textes du QG.
- [ ] Bouton "Supprimer la sauvegarde" demande confirmation puis efface ; le menu revient à l'état "Nouvelle Partie".
- [ ] Toutes les valeurs (volume, toggles, taille de police) persistent au refresh.
- [ ] Cliquer un bouton du menu / TabBar / CTA QG joue un click synthé (si toggle Clic on).
- [ ] Naviguer vers `/chiner/<id>` lance la boucle de foule en fade-in. Sortir l'arrête en fade-out.
- [ ] Vendre un objet (vitrine journée) joue le son `cash`.
- [ ] `npx tsc --noEmit` 0 erreur ; `npm run build` réussit.
