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
  playPaper: () => void;
  playNewspaper: () => void;
  playDoorOpen: () => void;
  playDoorClose: () => void;
  startCrowd: () => void;
  stopCrowd: () => void;
  startCatPurr: () => void;
  stopCatPurr: () => void;
  playVinyl: (templateId: string, onEnded?: () => void) => void;
  pauseVinyl: () => void;
  resumeVinyl: () => void;
  stopVinyl: () => void;
  setVinylTargetVolume: (v: number) => void;
  startNeedle: () => void;
  stopNeedle: () => void;
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
    (templateId: string, onEnded?: () => void) => {
      void audioManager.playVinyl(templateId, onEnded);
    },
    [],
  );
  const pauseVinyl = useCallback(() => audioManager.pauseVinyl(), []);
  const resumeVinyl = useCallback(() => audioManager.resumeVinyl(), []);
  const stopVinyl = useCallback(() => audioManager.stopVinyl(), []);
  const setVinylTargetVolume = useCallback(
    (v: number) => audioManager.setVinylTargetVolume(v),
    [],
  );
  const startNeedle = useCallback(() => {
    void audioManager.startNeedle();
  }, []);
  const stopNeedle = useCallback(() => audioManager.stopNeedle(), []);

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
      playPaper,
      playNewspaper,
      playDoorOpen,
      playDoorClose,
      startCrowd,
      stopCrowd,
      startCatPurr,
      stopCatPurr,
      playVinyl,
      pauseVinyl,
      resumeVinyl,
      stopVinyl,
      setVinylTargetVolume,
      startNeedle,
      stopNeedle,
      tailleFonte,
      setTailleFonte,
    }),
    [
      audioPrefs,
      setAudioPref,
      setVolume,
      playClick,
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
      pauseVinyl,
      resumeVinyl,
      stopVinyl,
      setVinylTargetVolume,
      startNeedle,
      stopNeedle,
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
