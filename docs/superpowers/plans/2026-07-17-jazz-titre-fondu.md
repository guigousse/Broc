# Jazz au titre + fondu iris + iris ralenti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Musique jazz (3 vinyles enchaînés en boucle) sur l'écran titre, fondu de sortie synchronisé avec la fermeture d'iris sur les trois départs en partie, et iris ralenti (1,8 s / 1,4 s).

**Architecture:** Un module `src/lib/audio/titreJazz.ts` (playlist + enchaînement par `onEnded`, testable via un lecteur factice), une méthode `fadeOutVinylBus(durationMs)` + un accesseur `vinylEnLecture()` dans l'`audioManager` (rampe du bus gramophone entier), branchés dans `page.tsx` (montage + `lancerIrisVers`) et `IntroPorte` (phase iris + skip). `GlobalVinylAmbiance` cesse d'étouffer la route `/`. Les constantes d'iris passent à 1800/1400 ms.

**Tech Stack:** Next.js 16, React 19, Web Audio (audioManager maison), vitest + @testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-17-jazz-titre-fondu-design.md`

## Global Constraints

- **Lieu de travail :** worktree `/Users/guillaume/dev/broc-jazz-titre`, branche `feat/jazz-titre-fondu` (déjà créée depuis feat/sp2-trame-mecanique ; node_modules symlinkée, `npx vitest run <fichier>` fonctionne depuis ce dossier). NE PAS toucher au checkout principal (session parallèle).
- **Identifiants et commentaires en français**, style du code existant. Aucune lib ajoutée.
- **Playlist du titre, ordre fixe :** `mus.33tours_jazz_1` → `mus.33tours_jazz_2` → `mus.33tours_jazz_3` → boucle.
- **Asset source :** `/Users/guillaume/Desktop/papi/Muted Clarinet Fade.mp3` → copié en `public/sounds/vinyles/mus.33tours_jazz_1.mp3` (ne pas déplacer/supprimer l'original).
- **Durées de fondu :** normal = `DUREE_FERMETURE_MS` ; skip intro = `300` ms ; reduced-motion = `DUREE_FADE_REDUIT_MS` (400).
- **Nouvelles durées d'iris :** `DUREE_FERMETURE_MS = 1800`, `DUREE_OUVERTURE_MS = 1400` (dans `src/lib/transitionIris.ts` ; tout le code référence ces constantes).
- **Fondu = bus gramophone entier** (`vinylAmbianceGain`, musique + crépitement), jamais le master ; l'ambiance de rue (`startAmbience`) n'est PAS touchée.
- **`fadeOutVinylBus` est appelée directement sur `audioManager`** (pattern existant de `page.tsx`), pas via SettingsContext.
- **Lint :** `npm run lint` cassé → `npx eslint src`. Build : Turbopack KO en worktree symlinkée → `npx next build --webpack` si besoin.

---

### Task 1: Asset jazz_1 + mapping

**Files:**
- Create: `public/sounds/vinyles/mus.33tours_jazz_1.mp3` (copie binaire)
- Modify: `src/data/vinylesAudio.ts:22` (ajout d'une entrée dans `VINYLE_AUDIO_URLS`)
- Test: `src/data/vinylesAudio.test.ts` (nouveau)

**Interfaces:**
- Consumes: rien.
- Produces: `vinylHasAudio("mus.33tours_jazz_1") === true` ; `vinylAudioUrl("mus.33tours_jazz_1") === "/sounds/vinyles/mus.33tours_jazz_1.mp3"`. Le gramophone du bureau (filtre `vinylHasAudio`) gagne automatiquement ce morceau.

- [ ] **Step 1: Écrire le test (échouant)**

Créer `src/data/vinylesAudio.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { vinylAudioUrl, vinylHasAudio } from "./vinylesAudio";

describe("vinylesAudio — les 3 jazz de l'écran titre", () => {
  it.each([
    "mus.33tours_jazz_1",
    "mus.33tours_jazz_2",
    "mus.33tours_jazz_3",
  ])("%s a un audio jouable, hébergé en local", (id) => {
    expect(vinylHasAudio(id)).toBe(true);
    expect(vinylAudioUrl(id)).toBe(`/sounds/vinyles/${id}.mp3`);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/vinylesAudio.test.ts`
Expected: FAIL — `vinylHasAudio("mus.33tours_jazz_1")` retourne `false` (pas encore mappé) ; jazz_2/jazz_3 passent.

- [ ] **Step 3: Copier l'asset et ajouter le mapping**

```bash
cp "/Users/guillaume/Desktop/papi/Muted Clarinet Fade.mp3" "public/sounds/vinyles/mus.33tours_jazz_1.mp3"
```

Dans `src/data/vinylesAudio.ts`, juste AVANT la ligne `"mus.33tours_jazz_2": …` :

```ts
  "mus.33tours_jazz_1": "/sounds/vinyles/mus.33tours_jazz_1.mp3",
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/data/vinylesAudio.test.ts`
Expected: PASS (3 tests). Vérifier aussi `ls -la public/sounds/vinyles/mus.33tours_jazz_1.mp3` (~5,3 Mo).

- [ ] **Step 5: Commit**

```bash
git add public/sounds/vinyles/mus.33tours_jazz_1.mp3 src/data/vinylesAudio.ts src/data/vinylesAudio.test.ts
git commit -m "feat(audio): 3e vinyle jazz (mus.33tours_jazz_1) — asset local + mapping"
```

---

### Task 2: `fadeOutVinylBus` + `vinylEnLecture` dans l'audioManager

**Files:**
- Modify: `src/lib/audio/audioManager.ts` (champ privé vers ~l.52 près de `gramoTimers`, méthodes après `stopGramophone` ~l.864)
- Test: `src/lib/audio/audioManager.fade.test.ts` (nouveau)

**Interfaces:**
- Consumes: internes existants — `ctx`, `vinylAmbianceGain`, `stopGramophone()`, `setVinylAmbianceVolume(v)`, `vinylAudio`.
- Produces (utilisé par Tasks 4 et 5) :
  - `audioManager.fadeOutVinylBus(durationMs: number): void`
  - `audioManager.vinylEnLecture(): boolean`

- [ ] **Step 1: Écrire les tests (échouants)**

Créer `src/lib/audio/audioManager.fade.test.ts` :

```ts
// @vitest-environment jsdom
/**
 * jsdom n'a pas de Web Audio : `ctx` reste undefined, on teste donc les
 * chemins dégradés (qui sont aussi ceux des tests de composants). Le
 * comportement de rampe réel relève de la vérif device.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { audioManager } from "./audioManager";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("audioManager — vinylEnLecture / fadeOutVinylBus", () => {
  it("vinylEnLecture : false quand aucun vinyle n'est chargé", () => {
    expect(audioManager.vinylEnLecture()).toBe(false);
  });

  it("fadeOutVinylBus sans contexte audio : arrêt immédiat, sans lever", () => {
    const stop = vi.spyOn(audioManager, "stopGramophone");
    expect(() => audioManager.fadeOutVinylBus(1800)).not.toThrow();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("fadeOutVinylBus est ré-appelable sans effet cumulatif", () => {
    const stop = vi.spyOn(audioManager, "stopGramophone");
    audioManager.fadeOutVinylBus(1800);
    audioManager.fadeOutVinylBus(300);
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/audio/audioManager.fade.test.ts`
Expected: FAIL — `vinylEnLecture is not a function`.

- [ ] **Step 3: Implémenter**

Dans `src/lib/audio/audioManager.ts` :

1. Près de `private gramoTimers: number[] = [];` (~l.52), ajouter :

```ts
  private fadeOutTimer?: number;
```

2. Après la méthode `stopGramophone()` (~l.864-869), ajouter :

```ts
  /** Vrai si un vinyle est chargé et en lecture (non mis en pause). */
  vinylEnLecture(): boolean {
    return !!this.vinylAudio && !this.vinylAudio.paused;
  }

  /**
   * Fondu de sortie du bus gramophone ENTIER (musique + crépitement) sur
   * `durationMs`, puis arrêt complet (stopGramophone) et bus restauré à 1 —
   * on ne laisse jamais un bus à zéro pour l'écran suivant. Sûr à appeler
   * si rien ne joue (arrêt immédiat, pas de rampe). Un nouvel appel pendant
   * un fondu REMPLACE la rampe en cours (skip de l'intro : 1800 → 300 ms).
   * Utilisé par les départs en partie de l'écran titre, synchronisé avec la
   * fermeture d'iris (spec 2026-07-17-jazz-titre-fondu-design.md).
   */
  fadeOutVinylBus(durationMs: number): void {
    if (this.fadeOutTimer !== undefined) {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = undefined;
    }
    if (!this.ctx || !this.vinylAmbianceGain) {
      // Rien n'a jamais joué (bus jamais créé) : coupe ce qui pourrait
      // rester (timers gramophone) et n'installe aucune rampe.
      this.stopGramophone();
      return;
    }
    const now = this.ctx.currentTime;
    const gain = this.vinylAmbianceGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + durationMs / 1000);
    this.fadeOutTimer = window.setTimeout(() => {
      this.fadeOutTimer = undefined;
      this.stopGramophone();
      this.setVinylAmbianceVolume(1);
    }, durationMs);
  }
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/lib/audio/audioManager.fade.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/audioManager.ts src/lib/audio/audioManager.fade.test.ts
git commit -m "feat(audio): fadeOutVinylBus paramétrable + vinylEnLecture sur l'audioManager"
```

---

### Task 3: Module `titreJazz` (playlist en boucle)

**Files:**
- Create: `src/lib/audio/titreJazz.ts`
- Test: `src/lib/audio/titreJazz.test.ts`

**Interfaces:**
- Consumes: `vinylAudioUrl` (Task 1 garantit le mapping jazz_1).
- Produces (utilisé par Task 4) :
  - `PLAYLIST_TITRE_IDS: readonly ["mus.33tours_jazz_1", "mus.33tours_jazz_2", "mus.33tours_jazz_3"]`
  - `interface LecteurTitre { stopGramophone(): void; setVinylTargetVolume(v: number): void; setVinylAmbianceVolume(v: number): void; setVinylAmbianceLowpass(hz: number): void; startNeedle(): void | Promise<void>; playVinyl(url: string, onEnded?: () => void): void | Promise<void>; }` (l'`audioManager` le satisfait structurellement)
  - `demarrerMusiqueTitre(lecteur: LecteurTitre): () => void` — démarre crépitement + playlist, retourne l'arrêt de l'ENCHAÎNEMENT (n'arrête pas la lecture en cours).

- [ ] **Step 1: Écrire les tests (échouants)**

Créer `src/lib/audio/titreJazz.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  PLAYLIST_TITRE_IDS,
  demarrerMusiqueTitre,
  type LecteurTitre,
} from "./titreJazz";

function fauxLecteur() {
  const appels: string[] = [];
  const finsDeMorceau: Array<() => void> = [];
  const lecteur: LecteurTitre = {
    stopGramophone: () => {
      appels.push("stopGramophone");
    },
    setVinylTargetVolume: (v) => {
      appels.push(`targetVolume:${v}`);
    },
    setVinylAmbianceVolume: (v) => {
      appels.push(`ambianceVolume:${v}`);
    },
    setVinylAmbianceLowpass: (hz) => {
      appels.push(`lowpass:${hz}`);
    },
    startNeedle: () => {
      appels.push("startNeedle");
    },
    playVinyl: (url, onEnded) => {
      appels.push(`play:${url}`);
      if (onEnded) finsDeMorceau.push(onEnded);
    },
  };
  return { lecteur, appels, finsDeMorceau };
}

describe("demarrerMusiqueTitre", () => {
  it("prépare le bus (stop, volumes pleins, crépitement) puis joue jazz_1", () => {
    const { lecteur, appels } = fauxLecteur();
    demarrerMusiqueTitre(lecteur);
    expect(appels).toEqual([
      "stopGramophone",
      "targetVolume:1",
      "ambianceVolume:1",
      "lowpass:20000",
      "startNeedle",
      "play:/sounds/vinyles/mus.33tours_jazz_1.mp3",
    ]);
  });

  it("enchaîne jazz_1 → jazz_2 → jazz_3 → boucle sur jazz_1", () => {
    const { lecteur, appels, finsDeMorceau } = fauxLecteur();
    demarrerMusiqueTitre(lecteur);
    finsDeMorceau[0]();
    finsDeMorceau[1]();
    finsDeMorceau[2]();
    expect(appels.filter((a) => a.startsWith("play:"))).toEqual([
      "play:/sounds/vinyles/mus.33tours_jazz_1.mp3",
      "play:/sounds/vinyles/mus.33tours_jazz_2.mp3",
      "play:/sounds/vinyles/mus.33tours_jazz_3.mp3",
      "play:/sounds/vinyles/mus.33tours_jazz_1.mp3",
    ]);
  });

  it("l'arrêt retourné stoppe l'enchaînement (pas de morceau suivant)", () => {
    const { lecteur, appels, finsDeMorceau } = fauxLecteur();
    const arreter = demarrerMusiqueTitre(lecteur);
    arreter();
    finsDeMorceau[0]();
    expect(appels.filter((a) => a.startsWith("play:"))).toHaveLength(1);
  });

  it("la playlist est fixe et dans l'ordre voulu", () => {
    expect(PLAYLIST_TITRE_IDS).toEqual([
      "mus.33tours_jazz_1",
      "mus.33tours_jazz_2",
      "mus.33tours_jazz_3",
    ]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/audio/titreJazz.test.ts`
Expected: FAIL — module `./titreJazz` introuvable.

- [ ] **Step 3: Implémenter**

Créer `src/lib/audio/titreJazz.ts` :

```ts
/**
 * Musique jazz de l'écran titre — spec
 * docs/superpowers/specs/2026-07-17-jazz-titre-fondu-design.md.
 *
 * Les 3 vinyles jazz sont enchaînés en boucle via le callback `onEnded` de
 * `playVinyl` (même mécanique que `handleNext` du gramophone au bureau,
 * mais sans rejouer les bruitages vinyl-1/vinyl-2 à chaque morceau). Le
 * fondu de sortie appartient aux départs en partie (fadeOutVinylBus).
 */
import { vinylAudioUrl } from "@/data/vinylesAudio";

export const PLAYLIST_TITRE_IDS = [
  "mus.33tours_jazz_1",
  "mus.33tours_jazz_2",
  "mus.33tours_jazz_3",
] as const;

/** Sous-ensemble de l'audioManager utilisé par la musique du titre. */
export interface LecteurTitre {
  stopGramophone: () => void;
  setVinylTargetVolume: (v: number) => void;
  setVinylAmbianceVolume: (v: number) => void;
  setVinylAmbianceLowpass: (hz: number) => void;
  startNeedle: () => void | Promise<void>;
  playVinyl: (url: string, onEnded?: () => void) => void | Promise<void>;
}

/**
 * Démarre crépitement + playlist jazz en boucle. Retourne une fonction qui
 * arrête l'ENCHAÎNEMENT (le morceau en cours n'est pas coupé : les départs
 * en partie passent par fadeOutVinylBus, qui coupe tout proprement).
 */
export function demarrerMusiqueTitre(lecteur: LecteurTitre): () => void {
  let arrete = false;
  // État propre si on arrive du jeu en navigation soft (gramophone encore
  // vivant), puis bus remis à plein : GlobalVinylAmbiance étouffait le
  // titre avant que la route "/" ne passe en pilotage local.
  lecteur.stopGramophone();
  lecteur.setVinylTargetVolume(1);
  lecteur.setVinylAmbianceVolume(1);
  lecteur.setVinylAmbianceLowpass(20000);
  void lecteur.startNeedle();
  const jouer = (idx: number) => {
    if (arrete) return;
    const id = PLAYLIST_TITRE_IDS[idx % PLAYLIST_TITRE_IDS.length];
    void lecteur.playVinyl(vinylAudioUrl(id), () => jouer(idx + 1));
  };
  jouer(0);
  return () => {
    arrete = true;
  };
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/lib/audio/titreJazz.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/titreJazz.ts src/lib/audio/titreJazz.test.ts
git commit -m "feat(audio): playlist jazz du titre en boucle (module titreJazz)"
```

---

### Task 4: Branchement écran titre (lecture + fondu Continuer/slot)

**Files:**
- Modify: `src/app/page.tsx` (imports, effet de montage ~l.189-196, `lancerIrisVers` ~l.185-187)
- Test: `src/app/page.test.tsx` (mock titreJazz + 3 nouveaux tests)

**Interfaces:**
- Consumes: `demarrerMusiqueTitre` (Task 3), `audioManager.fadeOutVinylBus` / `vinylEnLecture` (Task 2), `DUREE_FERMETURE_MS` / `DUREE_FADE_REDUIT_MS` / `prefersReducedMotion` (existants dans `src/lib/transitionIris.ts`).
- Produces: rien de nouveau pour les tâches suivantes (branchement feuille).

- [ ] **Step 1: Étendre les tests (échouants)**

Dans `src/app/page.test.tsx` :

1. Ajouter le mock (après le mock de PartiesModal) et les imports :

```tsx
import { audioManager } from "@/lib/audio/audioManager";
import { DUREE_FERMETURE_MS } from "@/lib/transitionIris";

const demarrerMusiqueTitre = vi.fn(() => vi.fn());
vi.mock("@/lib/audio/titreJazz", () => ({
  demarrerMusiqueTitre: (l: unknown) => demarrerMusiqueTitre(l),
}));
```

2. Dans le `afterEach` existant, ajouter `vi.restoreAllMocks();` (pour les `vi.spyOn` d'audioManager ci-dessous).

3. Nouveau describe :

```tsx
describe("TitleScreen — musique jazz du titre", () => {
  it("démarre la playlist au montage", () => {
    render(<TitleScreen />);
    expect(demarrerMusiqueTitre).toHaveBeenCalledTimes(1);
    expect(demarrerMusiqueTitre).toHaveBeenCalledWith(audioManager);
  });

  it("Continuer : fondu du bus gramophone sur la durée de fermeture de l'iris", () => {
    const fade = vi
      .spyOn(audioManager, "fadeOutVinylBus")
      .mockImplementation(() => {});
    mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);

    fireEvent.click(screen.getByText("Continuer"));

    expect(fade).toHaveBeenCalledTimes(1);
    expect(fade).toHaveBeenCalledWith(DUREE_FERMETURE_MS);
  });

  it("lancement d'un slot : même fondu synchronisé", () => {
    const fade = vi
      .spyOn(audioManager, "fadeOutVinylBus")
      .mockImplementation(() => {});
    mockLocation();
    render(<TitleScreen />);

    act(() => partiesOnLancer!(2));

    expect(fade).toHaveBeenCalledTimes(1);
    expect(fade).toHaveBeenCalledWith(DUREE_FERMETURE_MS);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL sur les 3 nouveaux tests (`demarrerMusiqueTitre` jamais appelé, fade jamais appelé) ; les tests existants passent toujours.

- [ ] **Step 3: Implémenter dans `page.tsx`**

1. Compléter les imports :

```tsx
import { demarrerMusiqueTitre } from "@/lib/audio/titreJazz";
```

et étendre l'import de `@/lib/transitionIris` avec `DUREE_FADE_REDUIT_MS`, `DUREE_FERMETURE_MS`, `prefersReducedMotion` (en plus de l'existant).

2. Remplacer `lancerIrisVers` :

```tsx
const lancerIrisVers = (apresNoir: () => void) => {
  // La musique du titre suit exactement la fermeture de l'iris (fondu de
  // même durée) ; au noir, le rechargement dur coupe ce qui reste.
  audioManager.fadeOutVinylBus(
    prefersReducedMotion() ? DUREE_FADE_REDUIT_MS : DUREE_FERMETURE_MS,
  );
  setIris({ ...pointPorteEcran(facadeRef.current), apresNoir });
};
```

3. Remplacer l'effet de montage audio (actuel `useEffect` qui ne fait que `startAmbience`, l.189-196) par :

```tsx
// Ambiance de rue (comme le QG, reprise telle quelle au bureau) + jazz du
// titre : crépitement puis les 3 vinyles en boucle (cf. titreJazz).
// L'autoplay peut être refusé avant le premier geste (iOS/desktop) : on
// retente au premier pointerdown si rien ne joue encore. Au démontage on
// n'arrête que l'ENCHAÎNEMENT — la coupure du son est le travail du fondu
// des départs en partie (lancerIrisVers / IntroPorte).
useEffect(() => {
  void audioManager.startAmbience();
  let arreter = demarrerMusiqueTitre(audioManager);
  const relance = () => {
    if (audioManager.vinylEnLecture()) return;
    arreter();
    arreter = demarrerMusiqueTitre(audioManager);
  };
  window.addEventListener("pointerdown", relance, { once: true });
  return () => {
    window.removeEventListener("pointerdown", relance);
    arreter();
  };
}, []);
```

- [ ] **Step 4: Vérifier que tous les tests passent**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(titre): playlist jazz au montage + fondu synchronisé sur Continuer/slot"
```

---

### Task 5: Fondu dans IntroPorte (nouvelle partie + skip)

**Files:**
- Modify: `src/components/mobile/IntroPorte.tsx` (import audioManager + `DUREE_FERMETURE_MS`, constante skip, 3 points d'appel)
- Test: `src/components/mobile/IntroPorte.test.tsx` (2 nouveaux tests + spy)

**Interfaces:**
- Consumes: `audioManager.fadeOutVinylBus` (Task 2), `DUREE_FERMETURE_MS` (existant).
- Produces: rien (branchement feuille). Constante locale `DUREE_FADE_SKIP_MS = 300`.

- [ ] **Step 1: Étendre les tests (échouants)**

Dans `src/components/mobile/IntroPorte.test.tsx` :

1. Ajouter les imports :

```tsx
import { audioManager } from "@/lib/audio/audioManager";
import { DUREE_FERMETURE_MS } from "@/lib/transitionIris";
```

2. Dans le `beforeEach` existant, ajouter la neutralisation du fade (avant les fake timers, ordre indifférent) :

```tsx
vi.spyOn(audioManager, "fadeOutVinylBus").mockImplementation(() => {});
```

et dans le `afterEach` existant, ajouter `vi.restoreAllMocks();`.

3. Nouveaux tests dans le describe existant :

```tsx
it("au passage en phase iris : fondu musical de la durée de la fermeture", () => {
  render(<IntroPorte onFini={vi.fn()} />);
  expect(audioManager.fadeOutVinylBus).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(600));

  expect(audioManager.fadeOutVinylBus).toHaveBeenCalledTimes(1);
  expect(audioManager.fadeOutVinylBus).toHaveBeenCalledWith(DUREE_FERMETURE_MS);
});

it("le skip remplace le fondu par une coupure express (300 ms)", () => {
  render(<IntroPorte onFini={vi.fn()} />);

  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Passer l'introduction" }),
  );

  expect(audioManager.fadeOutVinylBus).toHaveBeenCalledTimes(1);
  expect(audioManager.fadeOutVinylBus).toHaveBeenCalledWith(300);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/IntroPorte.test.tsx`
Expected: FAIL sur les 2 nouveaux tests (fade jamais appelé) ; les 4 existants passent.

- [ ] **Step 3: Implémenter dans `IntroPorte.tsx`**

1. Imports : ajouter `DUREE_FERMETURE_MS` à l'import de `@/lib/transitionIris`, et :

```tsx
import { audioManager } from "@/lib/audio/audioManager";
```

2. Sous `const DUREE_CONTEMPLATION_MS = 600;`, ajouter :

```tsx
/** Coupure express de la musique quand le joueur passe l'intro. */
const DUREE_FADE_SKIP_MS = 300;
```

3. Dans l'effet principal, brancher le fondu sur les deux branches :

```tsx
if (reduit) {
  // Fondu musical aligné sur le fondu visuel reduced-motion.
  audioManager.fadeOutVinylBus(DUREE_FADE_REDUIT_MS);
  schedule(declencherFin, DUREE_FADE_REDUIT_MS);
} else {
  // La fermeture est déléguée à IrisFermeture (rendue en phase "iris"),
  // qui rappelle declencherFin via onNoir — pas de timer de fin ici.
  // Le point porte est mesuré au moment du basculement de phase, et le
  // fondu musical suit exactement la fermeture qui démarre.
  schedule(() => {
    audioManager.fadeOutVinylBus(DUREE_FERMETURE_MS);
    setPointIris(pointPorteEcran(imgRef.current));
    setPhase("iris");
  }, DUREE_CONTEMPLATION_MS);
}
```

4. Dans `onSkip`, avant `declencherFin()` :

```tsx
const onSkip = () => {
  timeoutsRef.current.forEach(clearTimeout);
  timeoutsRef.current = [];
  // Un fondu 1800 ms éventuellement en cours est remplacé par la rampe
  // express (fadeOutVinylBus ré-appelable, cf. audioManager).
  audioManager.fadeOutVinylBus(DUREE_FADE_SKIP_MS);
  declencherFin();
};
```

- [ ] **Step 4: Vérifier que tous les tests passent**

Run: `npx vitest run src/components/mobile/IntroPorte.test.tsx src/app/page.test.tsx`
Expected: PASS (6 + 9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/IntroPorte.tsx src/components/mobile/IntroPorte.test.tsx
git commit -m "feat(intro): fondu musical synchronisé avec l'iris, coupure express au skip"
```

---

### Task 6: Route `/` en pilotage local, iris ralenti, filets complets

**Files:**
- Modify: `src/components/mobile/GlobalVinylAmbiance.tsx:36-48` (`ambianceForPathname`)
- Modify: `src/lib/transitionIris.ts:15-16` (constantes)
- Test: `src/components/mobile/GlobalVinylAmbiance.test.tsx` (nouveau)

**Interfaces:**
- Consumes: `audioManager` (spies en test).
- Produces: `ambianceForPathname("/") → null` (comportement) ; `DUREE_FERMETURE_MS = 1800`, `DUREE_OUVERTURE_MS = 1400` (consommés partout via import).

- [ ] **Step 1: Écrire le test GlobalVinylAmbiance (échouant)**

Créer `src/components/mobile/GlobalVinylAmbiance.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { GlobalVinylAmbiance } from "./GlobalVinylAmbiance";
import { audioManager } from "@/lib/audio/audioManager";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GlobalVinylAmbiance", () => {
  it("route / : l'écran titre pilote lui-même — aucun étouffement", () => {
    pathname = "/";
    const vol = vi
      .spyOn(audioManager, "setVinylAmbianceVolume")
      .mockImplementation(() => {});
    render(<GlobalVinylAmbiance />);
    expect(vol).not.toHaveBeenCalled();
  });

  it("route générique (/collection) : mise à distance 0.22 / 700 Hz", () => {
    pathname = "/collection";
    const cible = vi
      .spyOn(audioManager, "setVinylTargetVolume")
      .mockImplementation(() => {});
    const vol = vi
      .spyOn(audioManager, "setVinylAmbianceVolume")
      .mockImplementation(() => {});
    const lp = vi
      .spyOn(audioManager, "setVinylAmbianceLowpass")
      .mockImplementation(() => {});
    render(<GlobalVinylAmbiance />);
    expect(cible).toHaveBeenCalledWith(1);
    expect(vol).toHaveBeenCalledWith(0.22);
    expect(lp).toHaveBeenCalledWith(700);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/GlobalVinylAmbiance.test.tsx`
Expected: FAIL — le test « route / » voit `setVinylAmbianceVolume(0.22)` appelé.

- [ ] **Step 3: Implémenter**

1. Dans `GlobalVinylAmbiance.tsx`, `ambianceForPathname` :

```ts
function ambianceForPathname(pathname: string): Ambiance | null {
  if (PANORAMA_PATHS.has(pathname)) return null; // panorama drives itself
  // L'écran titre pilote lui-même sa musique jazz — pleine, sans lowpass
  // (cf. demarrerMusiqueTitre) : le contrôleur global ne l'étouffe plus.
  if (pathname === "/") return null;
  if (
    pathname.startsWith("/chiner") ||
    pathname.startsWith("/vitrine")
  ) {
    // Chiner / vendre : un peu plus présent (on est dehors mais la
    // musique du local "porte" encore correctement).
    return { volume: 0.32, lowpassHz: 700 };
  }
  // /collection, autres : à distance générique
  return { volume: 0.22, lowpassHz: 700 };
}
```

2. Dans `src/lib/transitionIris.ts`, remplacer les deux constantes (ralentissement demandé par la spec jazz/fondu) :

```ts
export const DUREE_FERMETURE_MS = 1800;
export const DUREE_OUVERTURE_MS = 1400;
```

- [ ] **Step 4: Filets complets**

Run, dans cet ordre :

```bash
npx vitest run
npx eslint src
```

Expected: suite entière verte (tous les tests d'iris/titre référencent les constantes, aucune valeur en dur) ; eslint sans erreur.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/GlobalVinylAmbiance.tsx src/components/mobile/GlobalVinylAmbiance.test.tsx src/lib/transitionIris.ts
git commit -m "feat(transition): iris ralenti (1800/1400 ms) et titre exclu de l'étouffement global"
```

- [ ] **Step 6: Vérification simulateur iOS (manuelle, avec Guillaume)**

`scripts/ios-sim.sh` : jazz au titre (démarrage au premier geste si besoin), enchaînement des 3 morceaux, fondu audible et synchrone avec l'iris ralenti sur Continuer / slot / nouvelle partie / skip, coupure totale au bureau, musique OFF dans les réglages = silence propre.

---

## Self-Review (fait à l'écriture du plan)

- **Couverture spec** : asset+mapping (T1) ; fadeOutVinylBus + restaure bus (T2) ; playlist/enchaînement/boucle + bus remis à plein + stopGramophone au montage (T3) ; branchement titre + autoplay retry + reduced-motion + Continuer/slot (T4) ; IntroPorte phase iris + skip 300 + reduced (T5) ; GlobalVinylAmbiance `/` + iris 1800/1400 + ambiance de rue intacte (T4 conserve startAmbience) (T6). ✓
- **Placeholders** : aucun. ✓
- **Cohérence des types** : `fadeOutVinylBus(durationMs: number): void` et `vinylEnLecture(): boolean` (T2) utilisés tels quels en T4/T5 ; `LecteurTitre` structurellement satisfait par audioManager ; `demarrerMusiqueTitre(lecteur) → () => void` (T3/T4). ✓
