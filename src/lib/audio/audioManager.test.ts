import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioPrefs } from "./audioManager";

/* ------------------------------------------------------------------ */
/* Mocks Web Audio API (Vitest tourne en environnement Node, sans DOM) */
/* ------------------------------------------------------------------ */

function createFakeParam(initial = 1) {
  return {
    value: initial,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

type FakeParam = ReturnType<typeof createFakeParam>;

interface FakeNode {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeGain extends FakeNode {
  gain: FakeParam;
}

interface FakeOscillator extends FakeNode {
  type: string;
  frequency: FakeParam;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeBufferSource extends FakeNode {
  buffer: unknown;
  loop: boolean;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeBiquad extends FakeNode {
  type: string;
  frequency: FakeParam;
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  destination = { connect: vi.fn(), disconnect: vi.fn() };
  gains: FakeGain[] = [];
  oscillators: FakeOscillator[] = [];
  bufferSources: FakeBufferSource[] = [];
  biquads: FakeBiquad[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain(): FakeGain {
    const g: FakeGain = {
      gain: createFakeParam(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.gains.push(g);
    return g;
  }

  createOscillator(): FakeOscillator {
    const o: FakeOscillator = {
      type: "sine",
      frequency: createFakeParam(440),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.oscillators.push(o);
    return o;
  }

  createBufferSource(): FakeBufferSource {
    const s: FakeBufferSource = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.bufferSources.push(s);
    return s;
  }

  createBiquadFilter(): FakeBiquad {
    const b: FakeBiquad = {
      type: "lowpass",
      frequency: createFakeParam(350),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.biquads.push(b);
    return b;
  }

  createMediaElementSource(): FakeNode {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }

  decodeAudioData(arr: ArrayBuffer): Promise<{ byteLength: number }> {
    return Promise.resolve({ byteLength: arr.byteLength });
  }
}

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  crossOrigin: string | null = null;
  preload = "";
  paused = true;
  private listeners = new Map<string, Set<() => void>>();

  constructor(src = "") {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(type: string, fn: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }

  removeEventListener(type: string, fn: () => void): void {
    this.listeners.get(type)?.delete(fn);
  }

  dispatch(type: string): void {
    this.listeners.get(type)?.forEach((fn) => fn());
  }
}

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

const STORAGE_KEY = "projet-broc:audio:v1";

/** Vide la file de microtâches (les play* async enchaînent plusieurs await). */
async function flushMicrotasks(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

let storage: MemoryStorage;
let fetchMock: ReturnType<typeof vi.fn>;

/** Importe un singleton frais (l'état du module ne fuit pas entre tests). */
async function freshManager() {
  vi.resetModules();
  const mod = await import("./audioManager");
  return mod;
}

function stubBrowserGlobals(): void {
  storage = new MemoryStorage();
  fetchMock = vi.fn(() =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
  );
  vi.stubGlobal("window", {
    AudioContext: FakeAudioContext,
    localStorage: storage,
    setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (t: number) => globalThis.clearTimeout(t),
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Audio", FakeAudio);
}

beforeEach(() => {
  FakeAudioContext.instances = [];
  FakeAudio.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* SSR-safe : aucun `window` (environnement Node nu)                    */
/* ------------------------------------------------------------------ */

describe("audioManager — SSR-safe (sans window)", () => {
  it("ensureCtx ne crashe pas et ne crée aucun contexte", async () => {
    const { audioManager } = await freshManager();
    expect(() => audioManager.ensureCtx()).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("playClick / setVolume / stopCrowd ne crashent pas sans window", async () => {
    const { audioManager } = await freshManager();
    expect(() => {
      audioManager.playClick();
      audioManager.playTick();
      audioManager.setVolume(50);
      audioManager.stopCrowd();
      audioManager.stopGramophone();
    }).not.toThrow();
  });

  it("loadPersisted retourne les préférences par défaut", async () => {
    const { audioManager, DEFAULT_AUDIO_PREFS } = await freshManager();
    expect(audioManager.loadPersisted()).toEqual(DEFAULT_AUDIO_PREFS);
  });
});

/* ------------------------------------------------------------------ */
/* Volume, clamp et persistance                                        */
/* ------------------------------------------------------------------ */

describe("audioManager — volume et persistance", () => {
  beforeEach(stubBrowserGlobals);

  it("setVolume clampe dans [0, 100] et met à jour le gain master", async () => {
    const { audioManager } = await freshManager();
    audioManager.ensureCtx();
    const ctx = FakeAudioContext.instances[0];
    const master = ctx.gains[0];

    audioManager.setVolume(150);
    expect(audioManager.prefs.volume).toBe(100);
    expect(master.gain.value).toBe(1);

    audioManager.setVolume(-30);
    expect(audioManager.prefs.volume).toBe(0);
    expect(master.gain.value).toBe(0);

    audioManager.setVolume(70);
    expect(master.gain.value).toBeCloseTo(0.7);
  });

  it("setVolume persiste les préférences dans localStorage", async () => {
    const { audioManager } = await freshManager();
    audioManager.setVolume(42);
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!) as AudioPrefs;
    expect(stored.volume).toBe(42);
  });

  it("setPref persiste et coupe la foule quand foule passe à false", async () => {
    const { audioManager } = await freshManager();
    audioManager.ensureCtx();
    await audioManager.startCrowd();
    const ctx = FakeAudioContext.instances[0];
    const crowdSrc = ctx.bufferSources[0];
    expect(crowdSrc.start).toHaveBeenCalled();

    audioManager.setPref("foule", false);
    expect(crowdSrc.stop).toHaveBeenCalled();
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!) as AudioPrefs;
    expect(stored.foule).toBe(false);
  });

  it("hydrate fusionne avec les défauts et applique le gain master", async () => {
    const { audioManager, DEFAULT_AUDIO_PREFS } = await freshManager();
    audioManager.ensureCtx();
    const master = FakeAudioContext.instances[0].gains[0];
    audioManager.hydrate({ volume: 20 });
    expect(audioManager.prefs).toEqual({ ...DEFAULT_AUDIO_PREFS, volume: 20 });
    expect(master.gain.value).toBeCloseTo(0.2);
  });

  it("loadPersisted relit les prefs sauvées et complète les champs manquants", async () => {
    const { audioManager, DEFAULT_AUDIO_PREFS } = await freshManager();
    storage.setItem(STORAGE_KEY, JSON.stringify({ volume: 15, cash: false }));
    expect(audioManager.loadPersisted()).toEqual({
      ...DEFAULT_AUDIO_PREFS,
      volume: 15,
      cash: false,
    });
  });

  it("loadPersisted retombe sur les défauts si le JSON est corrompu", async () => {
    const { audioManager, DEFAULT_AUDIO_PREFS } = await freshManager();
    storage.setItem(STORAGE_KEY, "{pas-du-json");
    expect(audioManager.loadPersisted()).toEqual(DEFAULT_AUDIO_PREFS);
  });
});

/* ------------------------------------------------------------------ */
/* Effets one-shot et préférences mute                                  */
/* ------------------------------------------------------------------ */

describe("audioManager — effets et préférences", () => {
  beforeEach(stubBrowserGlobals);

  it("playClick crée un oscillateur avec enveloppe quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(1);
    const osc = ctx.oscillators[0];
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
    // Enveloppe attaque + décroissance exponentielle sur le gain dédié.
    const fxGain = ctx.gains[1];
    expect(fxGain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(fxGain.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
  });

  it("playClick / playTick muets quand la préférence clic est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("clic", false);
    audioManager.playClick();
    audioManager.playTick();
    // Pas de contexte créé : retour immédiat avant ensureCtx.
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("playApparition crée un oscillateur avec enveloppe quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playApparition();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.oscillators[0].start).toHaveBeenCalled();
    expect(ctx.oscillators[0].stop).toHaveBeenCalled();
  });

  it("playRarete joue un arpège de 3 notes quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playRarete();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(3);
  });

  it("playMystere joue 2 notes quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playMystere();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(2);
  });

  it("les sons de chinage sont muets quand la préférence clic est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("clic", false);
    audioManager.playApparition();
    audioManager.playRarete();
    audioManager.playMystere();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("playCash respecte la préférence cash désactivée (aucun fetch)", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("cash", false);
    await audioManager.playCash();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("playCash charge le buffer, le met en cache et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playCash();
    await audioManager.playCash();
    // Le cache de buffers évite un second fetch sur la même URL.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/sounds/cash.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(2);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("un échec de fetch ne crashe pas et ne lance aucune source", async () => {
    const { audioManager } = await freshManager();
    fetchMock.mockRejectedValueOnce(new Error("réseau"));
    await expect(audioManager.playCash()).resolves.toBeUndefined();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(0);
  });

  it("preload charge toutes les URLs en une passe", async () => {
    const { audioManager } = await freshManager();
    await audioManager.preload(["/sounds/a.mp3", "/sounds/b.mp3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

/* ------------------------------------------------------------------ */
/* Boucles d'ambiance (foule, cheminée)                                 */
/* ------------------------------------------------------------------ */

describe("audioManager — boucles d'ambiance", () => {
  beforeEach(stubBrowserGlobals);

  it("startCrowd est idempotent (une seule source en boucle)", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startCrowd();
    await audioManager.startCrowd();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].loop).toBe(true);
  });

  it("stopCrowd fait un fade-out vers 0 puis arrête la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startCrowd();
    const ctx = FakeAudioContext.instances[0];
    const src = ctx.bufferSources[0];
    const gain = ctx.gains[1];
    audioManager.stopCrowd();
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 0.3);
    expect(src.stop).toHaveBeenCalledWith(0.31);
    // Un second stop est un no-op sûr.
    expect(() => audioManager.stopCrowd()).not.toThrow();
  });

  it("setFireplaceVolume clampe la cible dans [0, 1]", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startFireplace(0.3);
    const ctx = FakeAudioContext.instances[0];
    const fireGain = ctx.gains[1];

    audioManager.setFireplaceVolume(2.5);
    expect(fireGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      1,
      expect.any(Number),
    );
    audioManager.setFireplaceVolume(-1);
    expect(fireGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      expect.any(Number),
    );
  });

  it("startFireplace clampe aussi le volume initial", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startFireplace(9);
    const ctx = FakeAudioContext.instances[0];
    const fireGain = ctx.gains[1];
    expect(fireGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 0.6);
  });
});

/* ------------------------------------------------------------------ */
/* Gramophone : vinyle, bus ambiance, séquence minutée                  */
/* ------------------------------------------------------------------ */

describe("audioManager — gramophone", () => {
  beforeEach(stubBrowserGlobals);

  it("setVinylAmbianceVolume clampe dans [0, 1] et rampe le bus", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startNeedle(); // crée le bus ambiance
    const ctx = FakeAudioContext.instances[0];
    const busGain = ctx.gains[1];

    audioManager.setVinylAmbianceVolume(3);
    expect(busGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      1,
      0.4,
    );
    audioManager.setVinylAmbianceVolume(-0.5);
    expect(busGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      0.4,
    );
  });

  it("setVinylAmbianceLowpass clampe dans [80, 20000]", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startNeedle();
    const ctx = FakeAudioContext.instances[0];
    const lp = ctx.biquads[0];

    audioManager.setVinylAmbianceLowpass(5);
    expect(lp.frequency.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      80,
      0.4,
    );
    audioManager.setVinylAmbianceLowpass(99999);
    expect(lp.frequency.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      20000,
      0.4,
    );
  });

  it("playVinyl lance l'élément audio et déclenche onEnded à la fin", async () => {
    const { audioManager } = await freshManager();
    const onEnded = vi.fn();
    await audioManager.playVinyl("/sounds/vinyles/test.mp3", onEnded);
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe("/sounds/vinyles/test.mp3");
    expect(audio.paused).toBe(false);
    audio.dispatch("ended");
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("stopVinyl détache le handler ended (onEnded plus jamais appelé)", async () => {
    const { audioManager } = await freshManager();
    const onEnded = vi.fn();
    await audioManager.playVinyl("/sounds/vinyles/test.mp3", onEnded);
    const audio = FakeAudio.instances[0];
    audioManager.stopVinyl();
    expect(audio.paused).toBe(true);
    audio.dispatch("ended");
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("playGramophoneSong : vinyl-1 immédiat, vinyl-2 + musique après 1 s", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playGramophoneSong("/sounds/vinyles/chanson.mp3");
    await flushMicrotasks();

    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls).toContain("/sounds/vinyl-1.mp3");
    expect(urls).toContain("/sounds/vinyl-noise-loop.mp3");
    expect(urls).not.toContain("/sounds/vinyl-2.mp3");
    expect(FakeAudio.instances).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();

    const urlsApres = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urlsApres).toContain("/sounds/vinyl-2.mp3");
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe("/sounds/vinyles/chanson.mp3");
  });

  it("stopGramophone annule les timers en attente (pas de musique fantôme)", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playGramophoneSong("/sounds/vinyles/chanson.mp3");
    await flushMicrotasks();
    audioManager.stopGramophone();

    await vi.advanceTimersByTimeAsync(5000);
    await flushMicrotasks();
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls).not.toContain("/sounds/vinyl-2.mp3");
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("playDepartVoiture programme un fondu de sortie sur la dernière seconde", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playDepartVoiture(3000);
    const ctx = FakeAudioContext.instances[0];
    const src = ctx.bufferSources[0];
    const gain = ctx.gains[1];
    expect(src.start).toHaveBeenCalled();
    expect(src.stop).toHaveBeenCalledWith(3);
    // Tenue à 1 jusqu'à end-1s, puis rampe vers 0 à end.
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(1, 2);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 3);
  });
});
