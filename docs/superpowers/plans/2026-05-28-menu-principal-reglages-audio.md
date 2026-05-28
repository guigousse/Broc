# Menu principal, header, modale Réglages, audio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au joueur un retour permanent vers le menu principal via le titre du header, refaire le menu (nouveau logo + bouton contextuel avec confirmation), ouvrir une modale Réglages plein écran avec préférences audio/affichage/partie, et brancher un système audio (clics synth, son d'encaissement, boucle de foule).

**Architecture :** Un singleton `audioManager` (TypeScript pur, Web Audio API + HTML5) gère AudioContext, master gain, buffers et préférences. Un `SettingsProvider` React (au-dessus de `GameProvider` dans `layout.tsx`) charge les prefs persistées depuis localStorage, hydrate le manager et expose un hook `useSettings()`. Les écrans qui jouent des sons (TitleScreen, QG, TabBar, Reglages, Chiner, Vitrine/journée) consomment ce hook. `vendreDeVitrine` appelle directement le singleton (callback hors React). La taille de police est appliquée via une CSS var `--font-scale` sur `<html>`.

**Tech Stack :** Next.js 15 (app router), React 19, TypeScript, Web Audio API (natif), HTML5 `<audio>`, lucide-react, localStorage.

**Spec :** `docs/superpowers/specs/2026-05-28-menu-principal-reglages-audio-design.md`

**Pas de tests automatisés** dans ce projet. Validation = `npx tsc --noEmit`, `npm run build`, inspection manuelle dans le navigateur.

---

### Task 1 : Copier les fichiers son dans `public/sounds/`

**Files :**
- Create : `public/sounds/crowd.mp3` (copie depuis `~/Desktop/jarasnat-crowd-noise-284490.mp3`)
- Create : `public/sounds/cash.mp3` (copie depuis `~/Desktop/freesound_community-money-pickup-2-89563.mp3`)

- [ ] **Step 1 : Créer le dossier et copier les fichiers**

Run :
```bash
mkdir -p "public/sounds" && \
cp "/Users/guillaume/Desktop/jarasnat-crowd-noise-284490.mp3" "public/sounds/crowd.mp3" && \
cp "/Users/guillaume/Desktop/freesound_community-money-pickup-2-89563.mp3" "public/sounds/cash.mp3"
```

- [ ] **Step 2 : Vérifier la présence**

Run : `ls -la public/sounds/`
Expected : voir `crowd.mp3` et `cash.mp3` listés.

- [ ] **Step 3 : Commit**

```bash
git add public/sounds/crowd.mp3 public/sounds/cash.mp3
git commit -m "feat(audio): ajoute crowd.mp3 et cash.mp3 dans public/sounds"
```

---

### Task 2 : `audioManager` singleton

**Files :**
- Create : `src/lib/audio/audioManager.ts`

- [ ] **Step 1 : Créer le fichier avec le code complet**

Contenu de `src/lib/audio/audioManager.ts` :

```ts
export interface AudioPrefs {
  volume: number;
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

const STORAGE_KEY = "projet-broc:audio:v1";

type WindowAudio = typeof window & { webkitAudioContext?: typeof AudioContext };

class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private crowdSource?: AudioBufferSourceNode;
  private crowdGain?: GainNode;
  private buffers: Map<string, AudioBuffer> = new Map();
  prefs: AudioPrefs = { ...DEFAULT_AUDIO_PREFS };

  hydrate(prefs: Partial<AudioPrefs>): void {
    this.prefs = { ...DEFAULT_AUDIO_PREFS, ...prefs };
    if (this.master) {
      this.master.gain.value = this.prefs.volume / 100;
    }
  }

  persist(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      /* localStorage indisponible */
    }
  }

  ensureCtx(): void {
    if (typeof window === "undefined") return;
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ?? (window as WindowAudio).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.prefs.volume / 100;
    this.master.connect(this.ctx.destination);
  }

  setVolume(v: number): void {
    this.prefs.volume = Math.max(0, Math.min(100, v));
    if (this.master) this.master.gain.value = this.prefs.volume / 100;
    this.persist();
  }

  setPref<K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]): void {
    this.prefs[k] = v;
    this.persist();
    if (k === "foule" && v === false) {
      this.stopCrowd();
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    const cached = this.buffers.get(url);
    if (cached) return cached;
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr);
      this.buffers.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  }

  playClick(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  async playCash(): Promise<void> {
    if (!this.prefs.cash) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/cash.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  async startCrowd(): Promise<void> {
    if (!this.prefs.foule) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.crowdSource) return;
    const buf = await this.loadBuffer("/sounds/crowd.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.6, now + 0.8);
    src.start();
    this.crowdSource = src;
    this.crowdGain = gain;
  }

  stopCrowd(): void {
    if (!this.ctx || !this.crowdSource || !this.crowdGain) return;
    const now = this.ctx.currentTime;
    const src = this.crowdSource;
    const gain = this.crowdGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    src.stop(now + 0.31);
    this.crowdSource = undefined;
    this.crowdGain = undefined;
  }

  loadPersisted(): AudioPrefs {
    if (typeof window === "undefined") return { ...DEFAULT_AUDIO_PREFS };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_PREFS };
      const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
      return { ...DEFAULT_AUDIO_PREFS, ...parsed };
    } catch {
      return { ...DEFAULT_AUDIO_PREFS };
    }
  }
}

export const audioManager = new AudioManager();
```

- [ ] **Step 2 : Vérifier le typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/audio/audioManager.ts
git commit -m "feat(audio): audioManager singleton (Web Audio + buffers + prefs)"
```

---

### Task 3 : CSS var `--font-scale`

**Files :**
- Modify : `src/app/globals.css`

- [ ] **Step 1 : Lire le fichier pour situer où ajouter**

Run : `head -40 src/app/globals.css` pour voir la structure existante.

- [ ] **Step 2 : Ajouter la variable dans `:root` et la règle `html`**

Si le bloc `:root { ... }` existe déjà, ajouter `--font-scale: 1;` à la fin de ses déclarations. Sinon ajouter en tête du fichier (avant tout le reste) :

```css
:root {
  --font-scale: 1;
}
html {
  font-size: calc(16px * var(--font-scale));
}
```

Si une règle `html { font-size: ... }` existe déjà, la remplacer par `font-size: calc(16px * var(--font-scale));`.

- [ ] **Step 3 : Vérifier typecheck et build**

Run : `npx tsc --noEmit && npm run build`
Expected : succès.

- [ ] **Step 4 : Commit**

```bash
git add src/app/globals.css
git commit -m "feat(display): CSS var --font-scale (16px * scale) pour Réglages"
```

---

### Task 4 : `SettingsContext` (audio + display)

**Files :**
- Create : `src/context/SettingsContext.tsx`

- [ ] **Step 1 : Créer le fichier**

Contenu de `src/context/SettingsContext.tsx` :

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  audioManager,
  DEFAULT_AUDIO_PREFS,
  type AudioPrefs,
} from "@/lib/audio/audioManager";

export type TailleFonte = "petit" | "normal" | "grand";

const FONT_SCALE: Record<TailleFonte, string> = {
  petit: "0.9",
  normal: "1",
  grand: "1.15",
};

const DISPLAY_KEY = "projet-broc:display:v1";

interface DisplayPrefs {
  tailleFonte: TailleFonte;
}

const DEFAULT_DISPLAY: DisplayPrefs = { tailleFonte: "normal" };

interface SettingsValue {
  audioPrefs: AudioPrefs;
  setAudioPref: <K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]) => void;
  setVolume: (v: number) => void;
  playClick: () => void;
  playCash: () => void;
  startCrowd: () => void;
  stopCrowd: () => void;
  tailleFonte: TailleFonte;
  setTailleFonte: (t: TailleFonte) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

function loadDisplay(): DisplayPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_DISPLAY };
  try {
    const raw = window.localStorage.getItem(DISPLAY_KEY);
    if (!raw) return { ...DEFAULT_DISPLAY };
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    return { ...DEFAULT_DISPLAY, ...parsed };
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

function persistDisplay(p: DisplayPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [audioPrefs, setAudioPrefs] = useState<AudioPrefs>(DEFAULT_AUDIO_PREFS);
  const [tailleFonte, setTailleFonteState] = useState<TailleFonte>("normal");

  useEffect(() => {
    const persistedAudio = audioManager.loadPersisted();
    audioManager.hydrate(persistedAudio);
    setAudioPrefs({ ...persistedAudio });

    const display = loadDisplay();
    setTailleFonteState(display.tailleFonte);
    document.documentElement.style.setProperty(
      "--font-scale",
      FONT_SCALE[display.tailleFonte],
    );
  }, []);

  const setAudioPref = useCallback(
    <K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]) => {
      audioManager.setPref(k, v);
      setAudioPrefs({ ...audioManager.prefs });
    },
    [],
  );

  const setVolume = useCallback((v: number) => {
    audioManager.setVolume(v);
    setAudioPrefs({ ...audioManager.prefs });
  }, []);

  const playClick = useCallback(() => audioManager.playClick(), []);
  const playCash = useCallback(() => {
    void audioManager.playCash();
  }, []);
  const startCrowd = useCallback(() => {
    void audioManager.startCrowd();
  }, []);
  const stopCrowd = useCallback(() => audioManager.stopCrowd(), []);

  const setTailleFonte = useCallback((t: TailleFonte) => {
    setTailleFonteState(t);
    document.documentElement.style.setProperty("--font-scale", FONT_SCALE[t]);
    persistDisplay({ tailleFonte: t });
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      audioPrefs,
      setAudioPref,
      setVolume,
      playClick,
      playCash,
      startCrowd,
      stopCrowd,
      tailleFonte,
      setTailleFonte,
    }),
    [
      audioPrefs,
      setAudioPref,
      setVolume,
      playClick,
      playCash,
      startCrowd,
      stopCrowd,
      tailleFonte,
      setTailleFonte,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings doit être utilisé dans <SettingsProvider>.");
  }
  return ctx;
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/context/SettingsContext.tsx
git commit -m "feat(settings): SettingsContext (audio + taille de police, persistance)"
```

---

### Task 5 : Layout wiring — wrap dans `SettingsProvider`

**Files :**
- Modify : `src/app/layout.tsx`

- [ ] **Step 1 : Ajouter l'import et wrapper le tree**

Remplacer le contenu de `src/app/layout.tsx` par :

```tsx
import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/context/GameContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { TabBar } from "@/components/mobile/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broc — Une simulation de brocante",
  description:
    "Chinez, restaurez, négociez. Faites parler les objets de leur siècle.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Broc",
  },
  applicationName: "Broc",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A3326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ minHeight: "100dvh", overflowX: "hidden" }}>
        <SettingsProvider>
          <GameProvider>
            {children}
            <TabBar />
          </GameProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(settings): wrap layout dans SettingsProvider"
```

---

### Task 6 : Header BROC → menu principal

**Files :**
- Modify : `src/components/mobile/MobileHeader.tsx`

- [ ] **Step 1 : Changer la cible du lien**

Dans `src/components/mobile/MobileHeader.tsx`, remplacer :

```tsx
<Link
  href="/qg"
```

par :

```tsx
<Link
  href="/"
```

(Ligne ~35, aucun autre changement.)

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/MobileHeader.tsx
git commit -m "feat(header): BROC ramène au menu principal (/)"
```

---

### Task 7 : Menu principal — logo + bouton contextuel + ouverture Réglages

**Files :**
- Modify : `src/app/page.tsx`

- [ ] **Step 1 : Réécrire le composant `TitleScreen`**

Remplacer intégralement le contenu de `src/app/page.tsx` par :

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { ReglagesModal } from "@/components/mobile/ReglagesModal";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";

export default function TitleScreen() {
  const { nouvellePartie, state, isHydrated } = useGame();
  const { playClick } = useSettings();
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const aSauvegarde = isHydrated && state !== null;

  const onNouvellePartie = () => {
    playClick();
    if (aSauvegarde) {
      if (!window.confirm("Cela écrasera la partie en cours. Continuer ?"))
        return;
    }
    nouvellePartie();
  };

  const onContinuer = () => {
    playClick();
    if (aSauvegarde) window.location.href = "/qg";
  };

  const onReglages = () => {
    playClick();
    setReglagesOuverts(true);
  };

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        backgroundColor: "var(--forest-900)",
        backgroundImage:
          "radial-gradient(ellipse at 50% 35%, rgba(40,74,56,0.7) 0%, rgba(15,31,24,0) 65%), url(/assets/grain-overlay.svg)",
        backgroundSize: "cover, 320px 320px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "40px 24px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-conic-gradient(
            from 0deg at 50% 38%,
            rgba(197,160,89,0.05) 0deg 4deg,
            rgba(0,0,0,0) 4deg 12deg
          )`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid var(--brass-700)",
          boxShadow:
            "inset 0 0 0 5px transparent, inset 0 0 0 6px var(--brass-700)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 32,
          border: "1px solid var(--brass-500)",
          pointerEvents: "none",
        }}
      />
      <BrassCorners color="var(--brass-500)" inset={34} size={40} />

      <div
        style={{
          position: "relative",
          textAlign: "center",
          maxWidth: 720,
          padding: "0 20px",
        }}
      >
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

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "var(--brass-500)",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          — une simulation de brocante —
        </div>

        <img
          src="/assets/broc-wordmark-light.svg"
          width={520}
          alt="Broc"
          style={{
            display: "block",
            margin: "0 auto 6px",
            maxWidth: "100%",
            filter:
              "drop-shadow(0 8px 20px rgba(0,0,0,0.45)) brightness(1.05)",
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 20,
            color: "var(--paper-300)",
            margin: "8px auto 36px",
            maxWidth: 560,
            lineHeight: 1.4,
          }}
        >
          « Chinez, restaurez, négociez.
          <br />
          Faites parler les objets de leur siècle. »
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            alignItems: "center",
          }}
        >
          <Button variant="primary" size="lg" onClick={onNouvellePartie}>
            {aSauvegarde
              ? "Recommencer une nouvelle partie"
              : "Nouvelle Partie"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={!aSauvegarde}
            onClick={onContinuer}
            style={{
              background: "transparent",
              color: "var(--brass-300)",
              borderColor: "var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px transparent, inset 0 0 0 4px var(--brass-500)",
            }}
          >
            Continuer · Sauvegarde
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReglages}
            style={{ color: "var(--brass-300)" }}
          >
            Réglages · Crédits
          </Button>
        </div>

        <div
          style={{
            marginTop: 48,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--brass-700)",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          ver. 0.1 · saison de printemps · 1924
        </div>
      </div>

      <ReglagesModal
        open={reglagesOuverts}
        onClose={() => setReglagesOuverts(false)}
      />
    </main>
  );
}
```

(Note : ce code importe `ReglagesModal` qui sera créée dans Task 8 — l'ordre d'implémentation doit être Task 8 AVANT Task 7 pour que le typecheck passe à chaque étape. **Inverser donc l'ordre d'exécution : faire Task 8 d'abord, puis Task 7.**)

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur (ne marchera qu'après Task 8 livrée).

- [ ] **Step 3 : Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(menu): nouveau logo + bouton Nouvelle/Recommencer + ouverture Réglages"
```

---

### Task 8 : Composant `ReglagesModal` (4 sections)

**Files :**
- Create : `src/components/mobile/ReglagesModal.tsx`

- [ ] **Step 1 : Créer le composant complet**

Contenu de `src/components/mobile/ReglagesModal.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { useGame } from "@/context/GameContext";
import { useSettings, type TailleFonte } from "@/context/SettingsContext";
import type { AudioPrefs } from "@/lib/audio/audioManager";

interface ReglagesModalProps {
  open: boolean;
  onClose: () => void;
}

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  backgroundColor: "var(--forest-900)",
  backgroundImage:
    "radial-gradient(ellipse at 50% 35%, rgba(40,74,56,0.7) 0%, rgba(15,31,24,0) 65%), url(/assets/grain-overlay.svg)",
  backgroundSize: "cover, 320px 320px",
  paddingTop: "var(--safe-top)",
  paddingBottom: "var(--safe-bottom)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: "1px solid var(--brass-700)",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  fontWeight: 700,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  padding: 6,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const section: CSSProperties = {
  padding: "20px 24px",
  borderBottom: "1px dotted var(--brass-700)",
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--brass-500)",
  marginBottom: 14,
};

const rowLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--paper-300)",
  marginBottom: 8,
};

const segBtn = (active: boolean, disabled = false): CSSProperties => ({
  flex: 1,
  padding: "10px 6px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: active ? "var(--forest-800)" : "var(--paper-100)",
  color: active ? "var(--brass-300)" : "var(--ink-700)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

const togglesRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 0",
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  color: "var(--paper-300)",
};

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "1px solid var(--brass-500)",
        background: on ? "var(--forest-700)" : "var(--paper-500)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: 9,
          background: "var(--brass-300)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}

export function ReglagesModal({ open, onClose }: ReglagesModalProps) {
  const {
    audioPrefs,
    setAudioPref,
    setVolume,
    playClick,
    tailleFonte,
    setTailleFonte,
  } = useSettings();
  const { reset } = useGame();

  if (!open) return null;

  const onToggleAudio = (k: keyof AudioPrefs) => {
    playClick();
    setAudioPref(k, !audioPrefs[k]);
  };

  const onTaille = (t: TailleFonte) => {
    playClick();
    setTailleFonte(t);
  };

  const onSupprimerSave = () => {
    playClick();
    if (
      !window.confirm("Êtes-vous sûr ? Cette action est irréversible.")
    )
      return;
    reset();
  };

  const onFermer = () => {
    playClick();
    onClose();
  };

  const tailles: { id: TailleFonte; nom: string }[] = [
    { id: "petit", nom: "Petit" },
    { id: "normal", nom: "Normal" },
    { id: "grand", nom: "Grand" },
  ];

  const themes = [
    { id: "auto", nom: "Auto" },
    { id: "clair", nom: "Clair" },
    { id: "sombre", nom: "Sombre" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Réglages" style={wrap}>
      <BrassCorners color="var(--brass-500)" inset={10} size={32} />
      <div style={topBar}>
        <h2 style={titleStyle}>— Réglages —</h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          style={closeBtn}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* a. Son */}
      <section style={section}>
        <h3 style={sectionTitle}>Son</h3>

        <div style={rowLabel}>Volume général — {audioPrefs.volume}</div>
        <input
          type="range"
          min={0}
          max={100}
          value={audioPrefs.volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ width: "100%", marginBottom: 14 }}
          aria-label="Volume général"
        />

        <div style={togglesRow}>
          <span>Bruit de foule</span>
          <Toggle
            on={audioPrefs.foule}
            onToggle={() => onToggleAudio("foule")}
          />
        </div>
        <div style={togglesRow}>
          <span>Sons d&apos;encaissement</span>
          <Toggle
            on={audioPrefs.cash}
            onToggle={() => onToggleAudio("cash")}
          />
        </div>
        <div style={togglesRow}>
          <span>Clics</span>
          <Toggle
            on={audioPrefs.clic}
            onToggle={() => onToggleAudio("clic")}
          />
        </div>
      </section>

      {/* b. Affichage */}
      <section style={section}>
        <h3 style={sectionTitle}>Affichage</h3>

        <div style={rowLabel}>Taille de police</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {tailles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTaille(t.id)}
              style={segBtn(tailleFonte === t.id)}
            >
              {t.nom}
            </button>
          ))}
        </div>

        <div
          style={{
            ...rowLabel,
            fontStyle: "italic",
            color: "var(--brass-700)",
          }}
        >
          Thème (à venir)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled
              style={segBtn(false, true)}
            >
              {t.nom}
            </button>
          ))}
        </div>
      </section>

      {/* c. Partie */}
      <section style={section}>
        <h3 style={sectionTitle}>Partie</h3>
        <button
          type="button"
          onClick={onSupprimerSave}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "var(--vermillion-600)",
            color: "var(--paper-100)",
            border: "1px solid var(--velvet-700)",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Supprimer la sauvegarde
        </button>
      </section>

      {/* d. À propos */}
      <section style={section}>
        <h3 style={sectionTitle}>À propos</h3>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            lineHeight: 1.8,
          }}
        >
          <div>ver. 0.1 · saison de printemps · 1924</div>
          <div>Broc — une simulation de brocante</div>
          <div>Conçu par G. Fenard · 2026</div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/ReglagesModal.tsx
git commit -m "feat(reglages): modale plein écran (Son, Affichage, Partie, À propos)"
```

**Note d'ordre :** ce Task 8 doit être exécuté AVANT Task 7 pour éviter une erreur de typecheck transitoire.

---

### Task 9 : `playCash` dans `vendreDeVitrine`

**Files :**
- Modify : `src/context/GameContext.tsx`

- [ ] **Step 1 : Importer le manager**

En haut de `src/context/GameContext.tsx`, ajouter (vers la fin du bloc d'imports) :

```ts
import { audioManager } from "@/lib/audio/audioManager";
```

- [ ] **Step 2 : Appeler `playCash` au début de `vendreDeVitrine`**

Trouver la fonction `vendreDeVitrine` (vers la ligne 646) :

```tsx
const vendreDeVitrine = useCallback(
  (objetIds: string[], prixTotal: number) => {
    setState((prev) => {
      ...
    });
  },
  [],
);
```

La remplacer par :

```tsx
const vendreDeVitrine = useCallback(
  (objetIds: string[], prixTotal: number) => {
    void audioManager.playCash();
    setState((prev) => {
      if (!prev || !prev.vitrine) return prev;
      const ids = new Set(objetIds);
      return {
        ...prev,
        vitrine: {
          ...prev.vitrine,
          objets: prev.vitrine.objets.filter((e) => !ids.has(e.objet.id)),
        },
        budget: prev.budget + prixTotal,
      };
    });
  },
  [],
);
```

- [ ] **Step 3 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(audio): cash sound joué à chaque vente (vendreDeVitrine)"
```

---

### Task 10 : Boucle de foule sur `/chiner/[id]` et `/vitrine/[id]/journee`

**Files :**
- Modify : `src/app/chiner/[brocanteId]/ClientPage.tsx`
- Modify : `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`

- [ ] **Step 1 : Lire l'en-tête de `chiner/[brocanteId]/ClientPage.tsx`**

Run : `head -30 "src/app/chiner/[brocanteId]/ClientPage.tsx"` pour repérer les imports existants et le composant.

- [ ] **Step 2 : Ajouter l'import et le useEffect dans chiner**

Dans `src/app/chiner/[brocanteId]/ClientPage.tsx` :

- Si `useEffect` n'est pas déjà importé, l'ajouter à l'import depuis `react`.
- Ajouter `import { useSettings } from "@/context/SettingsContext";` avec les autres imports de context.
- Dans le composant client, juste après les autres hooks, ajouter :

```tsx
const { startCrowd, stopCrowd } = useSettings();
useEffect(() => {
  startCrowd();
  return () => stopCrowd();
}, [startCrowd, stopCrowd]);
```

- [ ] **Step 3 : Idem pour `vitrine/[brocanteId]/journee/ClientPage.tsx`**

Appliquer exactement les mêmes ajouts (import `useEffect` si absent, import `useSettings`, et le bloc `useEffect` identique).

- [ ] **Step 4 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/app/chiner/[brocanteId]/ClientPage.tsx "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx"
git commit -m "feat(audio): boucle de foule sur chiner et vitrine/journée"
```

---

### Task 11 : Clics synth sur QG CTA + TabBar

**Files :**
- Modify : `src/app/qg/page.tsx`
- Modify : `src/components/mobile/TabBar.tsx`

- [ ] **Step 1 : QG — ajouter l'import et brancher les 3 CTA**

Dans `src/app/qg/page.tsx`, ajouter en haut avec les autres imports React/context :

```ts
import { useSettings } from "@/context/SettingsContext";
```

Dans le composant, juste après le `useGame()` destructure :

```tsx
const { playClick } = useSettings();
```

Ensuite, modifier les `onClick` des 3 CTA en enveloppant l'action :

Bouton Chiner : `onClick={() => { playClick(); router.push("/chiner"); }}`
Bouton Exposer/Reprendre : `onClick={() => { playClick(); router.push("/vitrine"); }}`
Bouton Passer : `onClick={() => { playClick(); avancerJour(1); }}`

- [ ] **Step 2 : TabBar — ajouter l'import et brancher les items**

Dans `src/components/mobile/TabBar.tsx`, ajouter l'import :

```ts
import { useSettings } from "@/context/SettingsContext";
```

Dans le composant `TabBar`, juste après `const { state, isHydrated } = useGame();` :

```tsx
const { playClick } = useSettings();
```

Modifier le `onClick` des items (ligne ~110) :

```tsx
onClick={() => {
  playClick();
  router.push(t.path);
}}
```

- [ ] **Step 3 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/app/qg/page.tsx src/components/mobile/TabBar.tsx
git commit -m "feat(audio): clic synth sur CTA QG (Chiner/Exposer/Passer) et TabBar"
```

---

### Task 12 : Validation finale

**Files :** aucun

- [ ] **Step 1 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 2 : Build production**

Run : `npm run build`
Expected : succès, aucune erreur bloquante.

- [ ] **Step 3 : Test visuel `npm run dev`**

Lancer `npm run dev`, ouvrir `http://localhost:3000` et vérifier :

1. **Menu principal** — le logo `broc-logo.png` (180×180) s'affiche sans fond blanc. Le bouton lit "Nouvelle Partie" si aucune save (test : effacer `localStorage` dans DevTools puis reload), "Recommencer une nouvelle partie" sinon.
2. **Confirmation Recommencer** — cliquer "Recommencer..." et choisir Annuler → la partie reste intacte. Cliquer et confirmer → nouvelle partie démarre.
3. **Réglages** — cliquer "Réglages · Crédits" ouvre la modale. ✕ ferme.
4. **Volume** — bouger le slider → le clic suivant change d'intensité.
5. **Toggles Son** — couper "Clics" → plus de bip aux boutons. Couper "Bruit de foule" pendant qu'elle joue → silence.
6. **Taille de police** — sélectionner "Grand" → le texte du QG visiblement plus gros. Refresh → la valeur tient.
7. **Supprimer la sauvegarde** — depuis Réglages, cliquer "Supprimer la sauvegarde" → confirm → le menu (en arrière-plan ou rouvert) repasse à "Nouvelle Partie".
8. **BROC universel** — depuis /qg, /stockage, /atelier, /collection, /competences : tap sur "BROC" → arrivée sur menu principal.
9. **Crowd** — depuis QG, cliquer "Chiner" → entrer dans une brocante → la foule fade-in (~800 ms). Sortir → fade-out (~300 ms). Idem en passant en vitrine puis "journée".
10. **Cash** — pendant la vitrine/journée, vendre un objet → son d'encaissement.

- [ ] **Step 4 : Reporter à l'utilisateur**

Si tout est OK : la branche est prête. Si un point échoue, escalader.

---

## Self-review (controller)

- Spec §1 (Header) → Task 6. ✓
- Spec §2 (Menu principal logo + bouton) → Task 7 + assets (déjà committés). ✓
- Spec §3 (Modale Réglages, 4 sections) → Task 8. ✓
- Spec §4 (Audio: files, manager, provider, câblage) → Tasks 1, 2, 4, 5, 9, 10, 11. ✓
- Spec §5 (CSS --font-scale) → Task 3 + Task 4 (application via SettingsContext). ✓
- Cohérence des noms : `AudioPrefs`, `audioPrefs`, `playClick`, `playCash`, `startCrowd`, `stopCrowd`, `setAudioPref`, `setTailleFonte`, `tailleFonte` — tous utilisés cohéremment dans tasks 2/4/7/8/9/10/11. ✓
- Ordre Task 7 vs Task 8 : noté explicitement, Task 8 d'abord pour que Task 7 typecheck. ✓
