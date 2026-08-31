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

interface SettingsValue {
  audioPrefs: AudioPrefs;
  setAudioPref: <K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]) => void;
  setVolume: (v: number) => void;
  playClick: () => void;
  playPop: () => void;
  playCash: () => void;
  playPaper: () => void;
  playNewspaper: () => void;
  playDoorOpen: () => void;
  playDoorClose: () => void;
  startCrowd: () => void;
  stopCrowd: () => void;
  startCatPurr: () => void;
  stopCatPurr: () => void;
  playVinyl: (url: string, onEnded?: () => void) => void;
  /** Séquence audio Gramophone : Vinyl 1 → +1s → Vinyl 2 + musique. */
  playGramophoneSong: (url: string, onEnded?: () => void) => void;
  pauseVinyl: () => void;
  resumeVinyl: () => void;
  stopVinyl: () => void;
  /** Arrêt complet du gramophone (musique + crépitement + timers). */
  stopGramophone: () => void;
  setVinylTargetVolume: (v: number) => void;
  /** Volume du bus ambiance gramophone (0..1). 1 = pleine pièce, 0.2 = lointain. */
  setVinylAmbianceVolume: (v: number) => void;
  /** Coupure lowpass du bus ambiance (Hz). 20000 = clair, 600 = sourd. */
  setVinylAmbianceLowpass: (hz: number) => void;
  startNeedle: () => void;
  stopNeedle: () => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [audioPrefs, setAudioPrefs] = useState<AudioPrefs>(DEFAULT_AUDIO_PREFS);

  useEffect(() => {
    const persistedAudio = audioManager.loadPersisted();
    audioManager.hydrate(persistedAudio);
    setAudioPrefs({ ...persistedAudio });
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
  const playPop = useCallback(() => audioManager.playPop(), []);
  const playCash = useCallback(() => {
    void audioManager.playCash();
  }, []);
  const playPaper = useCallback(() => {
    void audioManager.playPaper();
  }, []);
  const playNewspaper = useCallback(() => {
    void audioManager.playNewspaper();
  }, []);
  const playDoorOpen = useCallback(() => {
    void audioManager.playDoorOpen();
  }, []);
  const playDoorClose = useCallback(() => {
    void audioManager.playDoorClose();
  }, []);
  const startCrowd = useCallback(() => {
    void audioManager.startCrowd();
  }, []);
  const stopCrowd = useCallback(() => audioManager.stopCrowd(), []);
  const startCatPurr = useCallback(() => {
    void audioManager.startCatPurr();
  }, []);
  const stopCatPurr = useCallback(() => audioManager.stopCatPurr(), []);

  const playVinyl = useCallback(
    (url: string, onEnded?: () => void) => {
      void audioManager.playVinyl(url, onEnded);
    },
    [],
  );
  const playGramophoneSong = useCallback(
    (url: string, onEnded?: () => void) => {
      void audioManager.playGramophoneSong(url, onEnded);
    },
    [],
  );
  const pauseVinyl = useCallback(() => audioManager.pauseVinyl(), []);
  const resumeVinyl = useCallback(() => audioManager.resumeVinyl(), []);
  const stopVinyl = useCallback(() => audioManager.stopVinyl(), []);
  const stopGramophone = useCallback(() => audioManager.stopGramophone(), []);
  const setVinylTargetVolume = useCallback(
    (v: number) => audioManager.setVinylTargetVolume(v),
    [],
  );
  const setVinylAmbianceVolume = useCallback(
    (v: number) => audioManager.setVinylAmbianceVolume(v),
    [],
  );
  const setVinylAmbianceLowpass = useCallback(
    (hz: number) => audioManager.setVinylAmbianceLowpass(hz),
    [],
  );
  const startNeedle = useCallback(() => {
    void audioManager.startNeedle();
  }, []);
  const stopNeedle = useCallback(() => audioManager.stopNeedle(), []);

  const value = useMemo<SettingsValue>(
    () => ({
      audioPrefs,
      setAudioPref,
      setVolume,
      playClick,
      playPop,
      playCash,
      playPaper,
      playNewspaper,
      playDoorOpen,
      playDoorClose,
      startCrowd,
      stopCrowd,
      startCatPurr,
      stopCatPurr,
      playVinyl,
      playGramophoneSong,
      pauseVinyl,
      resumeVinyl,
      stopVinyl,
      stopGramophone,
      setVinylTargetVolume,
      setVinylAmbianceVolume,
      setVinylAmbianceLowpass,
      startNeedle,
      stopNeedle,
    }),
    [
      audioPrefs,
      setAudioPref,
      setVolume,
      playClick,
      playPop,
      playCash,
      playPaper,
      playNewspaper,
      playDoorOpen,
      playDoorClose,
      startCrowd,
      stopCrowd,
      startCatPurr,
      stopCatPurr,
      playVinyl,
      playGramophoneSong,
      pauseVinyl,
      resumeVinyl,
      stopVinyl,
      stopGramophone,
      setVinylTargetVolume,
      setVinylAmbianceVolume,
      setVinylAmbianceLowpass,
      startNeedle,
      stopNeedle,
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

/**
 * Silencieux au lieu de tout un jeu de sons : chaque méthode est un no-op.
 * Utilisée par des composants montés en permanence au fond d'un arbre (ex.
 * `SoutienBorneOverlay`, monté fermé par `EcranArcade`) pour un simple retour
 * sonore de clic — un composant pareil ne doit pas exiger un `SettingsProvider`
 * global juste pour ça, sous peine de rendre fragile chaque test de tout
 * ancêtre qui le monte.
 *
 * Constante de module, comme `NOOP_TOAST` dans `@/components/ui/Toast` — pas
 * de construction paresseuse : `DEFAULT_AUDIO_PREFS` est déjà importé en tête
 * de fichier, et ce fichier l'utilise déjà, sans détour, dans `useState()`
 * plus bas. Le rendre paresseux ici n'aurait rien évité.
 *
 * ⚠ Effet de bord de l'aplatissement : tout import (même transitif, ex. via
 * `TabBar`) de ce fichier référence désormais `DEFAULT_AUDIO_PREFS` DÈS LE
 * CHARGEMENT DU MODULE, plus seulement au premier rendu. Un test qui mocke
 * `@/lib/audio/audioManager` SANS exporter `DEFAULT_AUDIO_PREFS` cassera à
 * l'import — pas avec un `undefined` silencieux : le mock Vitest lève une
 * erreur explicite sur un export non déclaré. Voir le mock corrigé dans
 * `LevelUpOverlay.test.tsx` pour le patron à suivre.
 */
const NOOP_SETTINGS: SettingsValue = {
  audioPrefs: DEFAULT_AUDIO_PREFS,
  setAudioPref: () => {},
  setVolume: () => {},
  playClick: () => {},
  playPop: () => {},
  playCash: () => {},
  playPaper: () => {},
  playNewspaper: () => {},
  playDoorOpen: () => {},
  playDoorClose: () => {},
  startCrowd: () => {},
  stopCrowd: () => {},
  startCatPurr: () => {},
  stopCatPurr: () => {},
  playVinyl: () => {},
  playGramophoneSong: () => {},
  pauseVinyl: () => {},
  resumeVinyl: () => {},
  stopVinyl: () => {},
  stopGramophone: () => {},
  setVinylTargetVolume: () => {},
  setVinylAmbianceVolume: () => {},
  setVinylAmbianceLowpass: () => {},
  startNeedle: () => {},
  stopNeedle: () => {},
};

/**
 * Variante non-bloquante de `useSettings` : renvoie un jeu de réglages no-op
 * si aucun `SettingsProvider` n'est présent, au lieu de lever une erreur —
 * même patron que `useToastSafe` dans `@/components/ui/Toast`, et pour la
 * même raison.
 */
export function useSettingsSafe(): SettingsValue {
  const ctx = useContext(SettingsContext);
  return ctx ?? NOOP_SETTINGS;
}
