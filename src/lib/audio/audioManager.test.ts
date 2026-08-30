import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioPrefs } from "./audioManager";
import { VOLUME_AMBIANCE_QG } from "./audioManager";

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
  playbackRate: FakeParam;
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
  // "running" par défaut : le manager retente un resume() sur tout état ≠
  // "running" (couvre "suspended" ET "interrupted" WebKit).
  state: AudioContextState = "running";
  resume = vi.fn(async () => {
    this.state = "running";
  });
  // Comme le vrai navigateur : suspend() notifie statechange, ce qui a fait
  // croire au manager qu'iOS l'interrompait alors qu'il se taisait lui-même.
  suspend = vi.fn(async () => {
    this.state = "suspended";
    this.onstatechange?.();
  });
  // WebKit ferme le contexte de son côté (reset du service média, pression
  // mémoire) : le manager doit savoir en rebâtir un.
  close = vi.fn(async () => {
    this.state = "closed";
  });
  onstatechange: (() => void) | null = null;
  /** Simule une transition subie : pose l'état PUIS notifie, comme le fait iOS. */
  subirEtat(etat: AudioContextState): void {
    this.state = etat;
    this.onstatechange?.();
  }
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
      playbackRate: createFakeParam(1),
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
  // La borne d'arcade s'en sert : `loop` pour tourner sans fin comme un
  // attract mode, `playbackRate` pour l'allumage et le dérapage du glitch.
  // Sur un vrai <audio>, `playbackRate` est un NOMBRE et pas un AudioParam —
  // il ne s'automatise pas, d'où l'échelonnage à la main côté manager.
  loop = false;
  playbackRate = 1;
  currentTime = 0;
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

  it("setPref persiste et coupe la foule quand ambiance passe à false", async () => {
    const { audioManager } = await freshManager();
    audioManager.ensureCtx();
    await audioManager.startCrowd();
    const ctx = FakeAudioContext.instances[0];
    const crowdSrc = ctx.bufferSources[0];
    expect(crowdSrc.start).toHaveBeenCalled();

    audioManager.setPref("ambiance", false);
    expect(crowdSrc.stop).toHaveBeenCalled();
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!) as AudioPrefs;
    expect(stored.ambiance).toBe(false);
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
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: 15, effets: false }),
    );
    expect(audioManager.loadPersisted()).toEqual({
      ...DEFAULT_AUDIO_PREFS,
      volume: 15,
      effets: false,
    });
  });

  it("loadPersisted retombe sur les défauts si le JSON est corrompu", async () => {
    const { audioManager, DEFAULT_AUDIO_PREFS } = await freshManager();
    storage.setItem(STORAGE_KEY, "{pas-du-json");
    expect(audioManager.loadPersisted()).toEqual(DEFAULT_AUDIO_PREFS);
  });

  it("loadPersisted migre la forme v1 : foule→ambiance, cash|clic→effets", async () => {
    const { audioManager } = await freshManager();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: 33, foule: false, cash: false, clic: true }),
    );
    expect(audioManager.loadPersisted()).toEqual({
      volume: 33,
      musique: true,
      ambiance: false,
      // clic était encore actif : la famille effets reste active.
      effets: true,
    });

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: 33, foule: true, cash: false, clic: false }),
    );
    expect(audioManager.loadPersisted()).toEqual({
      volume: 33,
      musique: true,
      ambiance: true,
      // cash ET clic coupés : effets coupés.
      effets: false,
    });
  });

  it("setPref musique=false met la lecture en pause et coupe le crépitement", async () => {
    const { audioManager } = await freshManager();
    audioManager.ensureCtx();
    await audioManager.startNeedle();
    const ctx = FakeAudioContext.instances[0];
    const needleSrc = ctx.bufferSources[0];
    expect(needleSrc.start).toHaveBeenCalled();

    audioManager.setPref("musique", false);
    expect(needleSrc.stop).toHaveBeenCalled();

    // Musique coupée : ni le crépitement ni la séquence gramophone ne
    // redémarrent.
    await audioManager.startNeedle();
    expect(ctx.bufferSources).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* Effets one-shot et préférences mute                                  */
/* ------------------------------------------------------------------ */

describe("audioManager — effets et préférences", () => {
  beforeEach(stubBrowserGlobals);

  it("playClick crée un oscillateur avec enveloppe quand effets est actif", async () => {
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

  it("playClick / playTick muets quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    audioManager.playClick();
    audioManager.playTick();
    // Pas de contexte créé : retour immédiat avant ensureCtx.
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  // Le carillon qui remplace le son SYSTÈME d'une notification reçue en jouant
  // (celui-ci prenait la session audio iOS et coupait tout le son du jeu).
  it("playNotif joue les deux notes du carillon", async () => {
    const { audioManager } = await freshManager();
    audioManager.playNotif();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators[0].start).toHaveBeenCalled();
    expect(ctx.oscillators[1].start).toHaveBeenCalled();
  });

  // Il passe par le bus du jeu, donc par ses réglages — c'est précisément ce
  // que le son système ignorait.
  it("playNotif est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    audioManager.playNotif();
    expect(FakeAudioContext.instances[0]?.oscillators ?? []).toHaveLength(0);
  });

  it("playApparition crée un oscillateur avec enveloppe quand effets est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playApparition();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.oscillators[0].start).toHaveBeenCalled();
    expect(ctx.oscillators[0].stop).toHaveBeenCalled();
  });

  it("playRarete joue un arpège de 3 notes quand effets est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playRarete();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(3);
  });

  it("playExplosion charge /sounds/explosion.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playExplosion();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/explosion.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playExplosion : `force` règle le gain, `vitesse` la hauteur", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playExplosion(0.6, 1.14);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources[0].playbackRate.value).toBeCloseTo(1.14, 5);
    expect(ctx.gains.at(-1)!.gain.value).toBeCloseTo(0.6, 5);
  });

  it("playExplosion est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playExplosion();
    // Muet au point de ne pas même aller chercher le fichier.
    expect(fetchMock).not.toHaveBeenCalledWith("/sounds/explosion.mp3");
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("playMystere joue 2 notes quand effets est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playMystere();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(2);
  });

  it("playDecouverte joue la cloche (2 notes) et ses 3 éclats", async () => {
    const { audioManager } = await freshManager();
    audioManager.playDecouverte();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(5);
    for (const osc of ctx.oscillators) {
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    }
  });

  it("les sons de chinage sont muets quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    audioManager.playApparition();
    audioManager.playRarete();
    audioManager.playMystere();
    audioManager.playDecouverte();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("playLevelUp charge /sounds/level-up.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playLevelUp();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/level-up.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playLevelUp est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playLevelUp();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // La montée d'état d'un objet restauré (cérémonie de l'Atelier, 2026-08-28).
  it("playUpgrade charge /sounds/upgrade.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playUpgrade();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/upgrade.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playUpgrade est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playUpgrade();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // La couche « magie » superposée quand un objet atteint le pristin.
  it("playPristinMagie charge /sounds/pristin-magie.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playPristinMagie();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/pristin-magie.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playPristinMagie est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playPristinMagie();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Le tintement des Bazarcoins qui tombent dans la caisse, au bout de leur vol
  // depuis le carnet de quêtes (2026-08-26).
  it("playJetonBazar charge /sounds/jeton-bazar.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playJetonBazar();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/jeton-bazar.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playJetonBazar se tait quand les effets sont coupés", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playJetonBazar();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("playCash respecte la préférence effets désactivée (aucun fetch)", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
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

  // Le garde d'idempotence (`if (this.ambienceSource) return`) est posé AVANT
  // le `await` du décodage : deux appels rapprochés le franchissent tous les
  // deux et la boucle part en double, deux fois trop fort. C'est le cas réel
  // du montage/démontage/remontage de React en dev, et de deux navigations
  // enchaînées ailleurs.
  it("deux startAmbience concurrents ne lancent QU'UNE boucle", async () => {
    const { audioManager } = await freshManager();
    await Promise.all([audioManager.startAmbience(), audioManager.startAmbience()]);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
  });

  // Corollaire : un stop arrivé pendant le décodage doit être tenu. Sinon la
  // boucle démarre APRÈS que l'écran a été quitté, et joue dans le vide.
  it("stopAmbience pendant le chargement annule le démarrage", async () => {
    const { audioManager } = await freshManager();
    const enCours = audioManager.startAmbience();
    audioManager.stopAmbience();
    await enCours;
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(0);
  });

  // F-05 : les boucles longues (~86 Mo de PCM à elles quatre) ne restent pas
  // en cache une fois arrêtées. Observable par le re-fetch au redémarrage.
  it("stopAmbience évince le tampon : un nouveau startAmbience re-télécharge", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startAmbience();
    audioManager.stopAmbience();
    await audioManager.startAmbience();
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.filter((u) => u === "/sounds/ambience-qg.mp3")).toHaveLength(2);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(2);
  });

  it("stopAmbience annulant un démarrage en vol évince aussi le tampon décodé", async () => {
    const { audioManager } = await freshManager();
    const enCours = audioManager.startAmbience();
    audioManager.stopAmbience();
    await enCours;
    await audioManager.startAmbience();
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.filter((u) => u === "/sounds/ambience-qg.mp3")).toHaveLength(2);
    // Une seule boucle joue : celle du second start.
    expect(FakeAudioContext.instances[0].bufferSources).toHaveLength(1);
  });

  it("stopCrowd / stopFireplace / stopNeedle évincent leur tampon", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startCrowd();
    audioManager.stopCrowd();
    await audioManager.startCrowd();
    await audioManager.startFireplace(0.3);
    audioManager.stopFireplace();
    await audioManager.startFireplace(0.3);
    await audioManager.startNeedle();
    audioManager.stopNeedle();
    await audioManager.startNeedle();
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    for (const u of ["/sounds/crowd.mp3", "/sounds/fireplace.mp3", "/sounds/vinyl-noise-loop.mp3"]) {
      expect(urls.filter((x) => x === u)).toHaveLength(2);
    }
  });

  it("stopAmbience / stopFireplace / stopNeedle sans start ne jettent pas", async () => {
    const { audioManager } = await freshManager();
    expect(() => audioManager.stopAmbience()).not.toThrow();
    expect(() => audioManager.stopFireplace()).not.toThrow();
    expect(() => audioManager.stopNeedle()).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
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

  // Le Bazar rejoue l'ambiance du bureau, mais son volume dépend de la
  // distance à la porte : il lui faut une commande, comme la cheminée.
  it("setAmbienceVolume clampe la cible dans [0, 1]", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startAmbience();
    const ctx = FakeAudioContext.instances[0];
    const ambGain = ctx.gains[1];

    audioManager.setAmbienceVolume(2.5);
    expect(ambGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      1,
      expect.any(Number),
    );
    audioManager.setAmbienceVolume(-1);
    expect(ambGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      expect.any(Number),
    );
  });

  // Sans volume d'entrée, l'ambiance du Bazar monterait au niveau du bureau
  // avant de retomber à sa vraie valeur — un coup de rue à l'ouverture.
  it("startAmbience monte au volume demandé", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startAmbience(0.1);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.1, 0.6);
  });

  it("startAmbience sans argument garde le volume du bureau", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startAmbience();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      VOLUME_AMBIANCE_QG,
      0.6,
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

  /**
   * Le passage vers le Bazar fait taire le gramophone en même temps que
   * l'iris se ferme : la rampe doit donc pouvoir durer autre chose que les
   * 0,4 s du réglage de pièce.
   */
  it("setVinylAmbianceVolume rampe sur la durée demandée", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startNeedle();
    const ctx = FakeAudioContext.instances[0];
    const busGain = ctx.gains[1];

    audioManager.setVinylAmbianceVolume(0, 1260);
    expect(busGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      1.26,
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

  /**
   * Audit 2026-08-03 (H3) : le cache d'AudioBuffer n'avait aucune éviction.
   * depart-voiture.mp3 décodé pèse ~23 Mo de PCM (le double avec la copie
   * inversée du garage) pour un one-shot rare — il ne doit pas rester en
   * cache à vie dans la WKWebView (jetsam iOS). Preuve par le re-fetch :
   * un second appel doit re-télécharger le fichier.
   */
  it("playDepartVoiture évince le tampon du cache après lancement", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playDepartVoiture(3000);
    await audioManager.playDepartVoiture(3000);
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.filter((u) => u === "/sounds/depart-voiture.mp3")).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/* playEclair — coup de tonnerre de l'achat énergie infinie             */
/* ------------------------------------------------------------------ */

describe("audioManager — playEclair (achat énergie infinie)", () => {
  beforeEach(stubBrowserGlobals);

  it("playEclair charge /sounds/eclair.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playEclair();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/eclair.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playEclair est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playEclair();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * One-shot unique par vie d'app (achat « énergie infinie ») : même motif
   * d'éviction que depart-voiture (audit H3, ligne ~692 ci-dessus). Preuve
   * par le re-fetch : un second appel doit re-télécharger le fichier, signe
   * que le tampon n'est pas resté en cache après la première lecture.
   */
  it("playEclair évince le tampon du cache après lancement", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playEclair();
    await audioManager.playEclair();
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.filter((u) => u === "/sounds/eclair.mp3")).toHaveLength(2);
  });
});

/**
 * Le carillon de la porte du Bazar : il sonne à l'ARRIVÉE sur l'écran, pas au
 * tap qui a lancé la navigation — c'est la porte de la boutique qu'on pousse,
 * pas celle du bureau qu'on referme (`playDoorClose`, côté QG).
 */
describe("audioManager — playCarillon (porte du Bazar)", () => {
  beforeEach(stubBrowserGlobals);

  it("playCarillon charge /sounds/carillon-bazar.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playCarillon();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/carillon-bazar.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playCarillon est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playCarillon();
    // Muet au point de ne pas même aller chercher le fichier.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* La borne d'arcade du Bazar                                          */
/* ------------------------------------------------------------------ */

describe("audioManager — la borne d'arcade", () => {
  beforeEach(stubBrowserGlobals);

  const PISTE = "/sounds/arcade/jx.cartouche_bluebot_8_bit.m4a";
  const AUTRE = "/sounds/arcade/jx.jeu_foxy_crush_32_bit.m4a";

  it("ne joue rien si la famille « musique » est coupée", async () => {
    const { audioManager } = await freshManager();
    audioManager.hydrate({ musique: false });
    await audioManager.playArcadeTrack(PISTE);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("crée un <audio> EN BOUCLE sur la piste et le route vers le master", async () => {
    const { audioManager, VOLUME_BORNE_ARCADE } = await freshManager();
    await audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe(PISTE);
    // Sans `loop`, la piste la plus courte (30 s) laisserait la borne muette
    // au bout d'une demi-minute, sans que rien ne le dise à l'écran.
    expect(audio.loop).toBe(true);
    expect(audio.paused).toBe(false);
    const ctx = FakeAudioContext.instances[0];
    const master = ctx.gains[0];
    const busBorne = ctx.gains[ctx.gains.length - 1];
    expect(busBorne.connect).toHaveBeenCalledWith(master);
    expect(busBorne.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      VOLUME_BORNE_ARCADE,
      expect.any(Number),
    );
  });

  it("la première piste ALLUME le meuble : la vitesse part de loin", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const audio = FakeAudio.instances[0];
    // Le meuble qui prend le courant : le son monte en hauteur pendant que
    // le gain monte en niveau.
    expect(audio.playbackRate).toBeCloseTo(0.82, 5);
    vi.advanceTimersByTime(500);
    expect(audio.playbackRate).toBeCloseTo(1, 5);
  });

  // Le manager tranche SEUL entre les deux, sur le simple fait qu'une piste
  // tourne déjà : aucun appelant n'a de drapeau à tenir, donc aucun ne peut
  // se tromper (en développement, le double montage de StrictMode faisait
  // perdre l'allumage à la version qui laissait le choix au composant).
  it("la piste suivante est un changement de cartouche : la vitesse part de plus près", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    void audioManager.playArcadeTrack(AUTRE);
    await flushMicrotasks();
    vi.advanceTimersByTime(80);
    await flushMicrotasks();
    expect(FakeAudio.instances[1].playbackRate).toBeCloseTo(0.94, 5);
  });

  it("rallume vraiment le meuble après un écran éteint", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    // Le joueur swipe sur un jeu pas encore trouvé : la borne s'éteint…
    audioManager.stopArcade();
    vi.advanceTimersByTime(200);
    // …puis sur un jeu trouvé. L'écran était noir : c'est un allumage.
    void audioManager.playArcadeTrack(AUTRE);
    await flushMicrotasks();
    expect(FakeAudio.instances[1].playbackRate).toBeCloseTo(0.82, 5);
  });

  it("changement de cartouche : l'ancienne piste est coupée avant la nouvelle", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const premiere = FakeAudio.instances[0];

    void audioManager.playArcadeTrack(AUTRE);
    await flushMicrotasks();
    // Coupure FRANCHE, et un blanc : rien ne démarre pendant que l'ancienne
    // s'éteint. C'est ce qui sonne comme une cartouche qu'on arrache, là où
    // un fondu enchaîné sonnerait comme une playlist.
    expect(FakeAudio.instances).toHaveLength(1);
    vi.advanceTimersByTime(200);
    await flushMicrotasks();
    expect(FakeAudio.instances).toHaveLength(2);
    expect(FakeAudio.instances[1].src).toBe(AUTRE);
    expect(premiere.paused).toBe(true);
  });

  it("stopArcade éteint la borne et relâche l'élément", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const audio = FakeAudio.instances[0];
    audioManager.stopArcade();
    vi.advanceTimersByTime(200);
    expect(audio.paused).toBe(true);
    expect(audio.src).toBe("");
  });

  it("couper la famille « musique » éteint la borne en cours", async () => {
    vi.useFakeTimers();
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const audio = FakeAudio.instances[0];
    audioManager.setPref("musique", false);
    vi.advanceTimersByTime(200);
    expect(audio.paused).toBe(true);
  });

  it("le glitch coupe puis rétablit le gain, et se reprogramme tout seul", async () => {
    vi.useFakeTimers();
    // Math.random figé au minimum : le premier glitch tombe au plus tôt, et
    // le test n'a pas à parier sur un délai tiré au hasard.
    const hasard = vi.spyOn(Math, "random").mockReturnValue(0);
    const { audioManager, VOLUME_BORNE_ARCADE } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const ctx = FakeAudioContext.instances[0];
    const bus = ctx.gains[ctx.gains.length - 1];
    bus.gain.setValueAtTime.mockClear();

    // 12 050 ms et non 12 500 : avec Math.random() figé à 0 l'accroc tombe à
    // 12 000 ms pile, et son rétablissement de vitesse 120 ms plus tard. Une
    // avance trop large franchirait les deux d'un coup et on ne verrait
    // jamais le dérapage.
    vi.advanceTimersByTime(12_050);
    // Une micro-coupure = le gain tombe à 0 puis revient à son niveau, à des
    // instants programmés d'avance sur l'horloge audio.
    expect(bus.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(bus.gain.setValueAtTime).toHaveBeenCalledWith(
      VOLUME_BORNE_ARCADE,
      expect.any(Number),
    );
    const audio = FakeAudio.instances[0];
    // Le son « accroche » : ce n'est pas qu'un blanc, la vitesse dérape aussi.
    expect(audio.playbackRate).toBeLessThan(1);
    vi.advanceTimersByTime(300);
    expect(audio.playbackRate).toBeCloseTo(1, 5);

    // …et il y en aura un autre : le glitch se reprogramme, il n'arrive pas
    // qu'une fois par ouverture.
    bus.gain.setValueAtTime.mockClear();
    vi.advanceTimersByTime(12_500);
    expect(bus.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    hasard.mockRestore();
  });

  it("le glitch s'arrête avec la borne", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { audioManager } = await freshManager();
    void audioManager.playArcadeTrack(PISTE);
    await flushMicrotasks();
    const ctx = FakeAudioContext.instances[0];
    const bus = ctx.gains[ctx.gains.length - 1];
    audioManager.stopArcade();
    bus.gain.setValueAtTime.mockClear();
    vi.advanceTimersByTime(60_000);
    expect(bus.gain.setValueAtTime).not.toHaveBeenCalled();
  });

  it("est sans effet et sans crash hors navigateur", async () => {
    vi.unstubAllGlobals();
    const { audioManager } = await freshManager();
    await expect(audioManager.playArcadeTrack(PISTE)).resolves.toBeUndefined();
    expect(() => audioManager.stopArcade()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Atténuation de l'ambiance (la borne passe devant la rue)            */
/* ------------------------------------------------------------------ */

describe("audioManager — setAmbienceDuck", () => {
  beforeEach(stubBrowserGlobals);

  /** Démarre l'ambiance et rend son gain. */
  async function ambianceEnPlace(mod: Awaited<ReturnType<typeof freshManager>>) {
    await mod.audioManager.startAmbience(0.4);
    await flushMicrotasks();
    const ctx = FakeAudioContext.instances[0];
    return ctx.gains[ctx.gains.length - 1];
  }

  it("multiplie le volume de zone au lieu de le remplacer", async () => {
    const mod = await freshManager();
    const gain = await ambianceEnPlace(mod);
    gain.gain.linearRampToValueAtTime.mockClear();
    mod.audioManager.setAmbienceDuck(0.3);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.4 * 0.3, 5),
      expect.any(Number),
    );
  });

  it("un changement de zone PENDANT l'atténuation reste atténué", async () => {
    const mod = await freshManager();
    const gain = await ambianceEnPlace(mod);
    mod.audioManager.setAmbienceDuck(0.3);
    gain.gain.linearRampToValueAtTime.mockClear();
    // Le joueur ne peut pas bouger dans le panorama borne ouverte, mais le
    // panorama, lui, ré-émet son index au remontage. Sans la mémoire du
    // facteur, ce simple rappel rétablirait la rue à plein volume par-dessus
    // la musique.
    mod.audioManager.setAmbienceVolume(0.2);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.2 * 0.3, 5),
      expect.any(Number),
    );
  });

  it("revenir à 1 rend son volume de zone à la rue", async () => {
    const mod = await freshManager();
    const gain = await ambianceEnPlace(mod);
    mod.audioManager.setAmbienceDuck(0.3);
    gain.gain.linearRampToValueAtTime.mockClear();
    mod.audioManager.setAmbienceDuck(1);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.4, 5),
      expect.any(Number),
    );
  });

  it("stopAmbience remet le facteur à neutre", async () => {
    const mod = await freshManager();
    await ambianceEnPlace(mod);
    mod.audioManager.setAmbienceDuck(0.3);
    mod.audioManager.stopAmbience();
    // LE piège qu'on ferme ici : une atténuation oubliée derrière soi rendrait
    // l'ambiance du BUREAU trois fois trop basse au prochain écran, sans que
    // rien ne relie la panne à la borne du Bazar.
    await mod.audioManager.startAmbience(0.4);
    await flushMicrotasks();
    const ctx = FakeAudioContext.instances[0];
    const gain2 = ctx.gains[ctx.gains.length - 1];
    expect(gain2.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0.4, 5),
      expect.any(Number),
    );
  });
});

/* ------------------------------------------------------------------ */
/* Auto-réparation du contexte (le son qui se coupe en pleine session)  */
/* ------------------------------------------------------------------ */

/*
 * LE défaut que ferme cette suite : tout le jeu sonne à travers UN seul
 * AudioContext, et le seul rattrapage était un `resume()` tiré au petit
 * bonheur. Un contexte qu'iOS ferme (reset du service média, pression
 * mémoire) ou qu'il laisse « interrupted » (pub récompensée, notification,
 * appel) ne revient jamais de lui-même : le `return` anticipé d'ensureCtx
 * garantissait qu'on retente éternellement sur un contexte mort. Symptôme
 * côté joueur : tout se tait d'un coup, en pleine partie, jusqu'au
 * redémarrage de l'app.
 */
describe("audioManager — un contexte mort est rebâti", () => {
  beforeEach(stubBrowserGlobals);

  it("un contexte fermé par iOS est rebâti au son suivant", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx1 = FakeAudioContext.instances[0];

    ctx1.state = "closed";
    audioManager.playClick();

    expect(FakeAudioContext.instances).toHaveLength(2);
    // Le son demandé sort sur le NOUVEAU contexte, pas dans le vide.
    expect(FakeAudioContext.instances[1].oscillators).toHaveLength(1);
    // Un contexte déjà fermé n'est pas refermé — WebKit lève sur un second
    // close(), et le graphe neuf partirait alors sur une exception.
    expect(ctx1.close).not.toHaveBeenCalled();
  });

  it("un resume refusé (contexte mort) fait rebâtir le graphe", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx1 = FakeAudioContext.instances[0];

    ctx1.state = "suspended";
    ctx1.resume.mockRejectedValueOnce(new Error("InvalidStateError"));
    audioManager.playClick();
    await flushMicrotasks();

    expect(FakeAudioContext.instances).toHaveLength(2);
    // L'ancien, lui, est encore ouvert : il DOIT être relâché. WebKit
    // plafonne le nombre d'AudioContext par page, en accumuler des morts
    // finirait par tuer le son pour de bon.
    expect(ctx1.close).toHaveBeenCalled();
  });

  // Non-régression : un contexte simplement endormi (le cas de tous les jours)
  // se réveille par resume. Le rebâtir serait une coupure gratuite.
  it("un contexte seulement suspendu est repris, pas rebâti", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx1 = FakeAudioContext.instances[0];

    ctx1.state = "suspended";
    audioManager.playClick();
    await flushMicrotasks();

    expect(ctx1.resume).toHaveBeenCalled();
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  // Le cas WebKit : resume() tient sa promesse mais l'état ne bouge pas.
  // Sans escalade, on retenterait la même chose pour l'éternité.
  it("un « interrupted » que resume ne réveille pas finit par être rebâti", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx1 = FakeAudioContext.instances[0];
    ctx1.resume.mockImplementation(async () => {});
    ctx1.state = "interrupted" as AudioContextState;

    for (let i = 0; i < 4; i++) {
      audioManager.playClick();
      await flushMicrotasks();
    }

    expect(FakeAudioContext.instances).toHaveLength(2);
  });

  it("l'ambiance qui tournait repart sur le contexte rebâti", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startAmbience(0.4);
    const ctx1 = FakeAudioContext.instances[0];
    expect(ctx1.bufferSources).toHaveLength(1);

    ctx1.state = "closed";
    audioManager.playClick();
    await flushMicrotasks();

    const ctx2 = FakeAudioContext.instances[1];
    expect(ctx2.bufferSources).toHaveLength(1);
    expect(ctx2.bufferSources[0].loop).toBe(true);
  });

  it("le disque reprend à la seconde où il s'est tu", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playVinyl("/sounds/vinyles/aaa.m4a");
    const disque1 = FakeAudio.instances[0];
    disque1.currentTime = 42;

    FakeAudioContext.instances[0].state = "closed";
    audioManager.playClick();
    await flushMicrotasks();

    const disque2 = FakeAudio.instances[FakeAudio.instances.length - 1];
    expect(disque2).not.toBe(disque1);
    expect(disque2.src).toBe("/sounds/vinyles/aaa.m4a");
    expect(disque2.currentTime).toBe(42);
    expect(disque2.paused).toBe(false);
  });

  // Un disque que le joueur a mis en pause doit RESTER en pause : une panne
  // technique n'est pas une raison de rallumer la musique qu'il a coupée.
  it("un disque mis en pause par le joueur ne redémarre pas tout seul", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playVinyl("/sounds/vinyles/aaa.m4a");
    audioManager.pauseVinyl();
    const avant = FakeAudio.instances.length;

    FakeAudioContext.instances[0].state = "closed";
    audioManager.playClick();
    await flushMicrotasks();

    expect(FakeAudio.instances).toHaveLength(avant);
  });

  // Sans ça, la reprise attend le prochain tap du joueur : dans un dialogue
  // ou une cinématique, le silence dure.
  it("une interruption subie déclenche la reprise sans attendre un tap", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx1 = FakeAudioContext.instances[0];
    ctx1.resume.mockClear();

    ctx1.subirEtat("suspended");
    await flushMicrotasks();

    expect(ctx1.resume).toHaveBeenCalled();
  });

  // La panne n'est observable ni au simulateur ni au débogueur : elle n'arrive
  // qu'en session longue sur l'appareil. Le journal est la seule pièce à
  // conviction disponible si le rattrapage lui-même échoue.
  it("le journal garde la trace des états subis", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx1 = FakeAudioContext.instances[0];

    ctx1.subirEtat("interrupted" as AudioContextState);
    await flushMicrotasks();

    const journal = audioManager.journalAudio();
    expect(journal.length).toBeGreaterThan(0);
    expect(journal.some((l) => l.etat === "interrupted")).toBe(true);
  });

  // Le contexte qui se réveille ne suffit pas : iOS met AUSSI en pause les
  // éléments <audio>. Les boucles d'ambiance (des AudioBufferSource) repartent
  // toutes seules, la musique du gramophone non — d'où « tout revient sauf la
  // musique », qui n'aurait ressemblé à rien.
  it("après une reprise, le disque qu'iOS avait mis en pause repart", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playVinyl("/sounds/vinyles/aaa.m4a");
    const disque = FakeAudio.instances[0];
    disque.paused = true;

    FakeAudioContext.instances[0].subirEtat("suspended");
    await flushMicrotasks();

    expect(disque.paused).toBe(false);
  });

  it("un disque en pause volontaire n'est pas relancé par la reprise", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playVinyl("/sounds/vinyles/aaa.m4a");
    const disque = FakeAudio.instances[0];
    audioManager.pauseVinyl();

    FakeAudioContext.instances[0].subirEtat("suspended");
    await flushMicrotasks();

    expect(disque.paused).toBe(true);
  });

  it("la borne éteinte ne se rallume pas sur le contexte rebâti", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playArcadeTrack("/sounds/arcade/jeu.m4a");
    audioManager.stopArcade();
    const avant = FakeAudio.instances.length;

    FakeAudioContext.instances[0].state = "closed";
    audioManager.playClick();
    await flushMicrotasks();

    expect(FakeAudio.instances).toHaveLength(avant);
  });

  // Garde-fou : deux pannes coup sur coup ne doivent pas partir en fabrique à
  // contextes. WebKit en plafonne le nombre par page.
  it("deux pannes rapprochées ne rebâtissent qu'une fois", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();

    FakeAudioContext.instances[0].state = "closed";
    audioManager.playClick();
    await flushMicrotasks();
    expect(FakeAudioContext.instances).toHaveLength(2);

    FakeAudioContext.instances[1].state = "closed";
    audioManager.playClick();
    await flushMicrotasks();
    expect(FakeAudioContext.instances).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/* Sortie et retour dans l'app                                          */
/* ------------------------------------------------------------------ */

describe("audioManager — sortie de l'app", () => {
  let listeners: Record<string, Array<() => void>>;
  let visibilityState: string;

  beforeEach(() => {
    stubBrowserGlobals();
    listeners = {};
    visibilityState = "visible";
    const on = (ev: string, fn: () => void) => {
      (listeners[ev] ??= []).push(fn);
    };
    vi.stubGlobal("window", {
      AudioContext: FakeAudioContext,
      localStorage: storage,
      setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms),
      clearTimeout: (t: number) => globalThis.clearTimeout(t),
      addEventListener: on,
    });
    vi.stubGlobal("document", {
      addEventListener: on,
      get visibilityState() {
        return visibilityState;
      },
    });
  });

  const cacher = () => {
    visibilityState = "hidden";
    listeners.visibilitychange?.forEach((fn) => fn());
  };
  const montrer = () => {
    visibilityState = "visible";
    listeners.visibilitychange?.forEach((fn) => fn());
  };

  // Sortie de l'app : la musique se tait comme si le joueur l'avait mise en
  // pause, et le contexte est laissé à iOS. Un `suspend()` de notre main
  // empêchait WebKit de rouvrir le contexte au retour sans geste — c'est le
  // « son coupé au retour » de la build 165/166.
  it("en arrière-plan : le disque se met en pause volontaire, le contexte n'est pas touché", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playVinyl("/sounds/vinyles/test.mp3");
    const audio = FakeAudio.instances[0];
    const ctx = FakeAudioContext.instances[0];
    expect(audio.paused).toBe(false);

    cacher();
    await flushMicrotasks();
    expect(audio.paused).toBe(true);
    expect(ctx.suspend).not.toHaveBeenCalled();
    expect(ctx.resume).not.toHaveBeenCalled();
    expect(audioManager.vinylEnLecture()).toBe(false);
  });

  it("au retour : les sons du jeu repartent, la musique reste en pause", async () => {
    const { audioManager } = await freshManager();
    await audioManager.startCrowd();
    await audioManager.playVinyl("/sounds/vinyles/test.mp3");
    const audio = FakeAudio.instances[0];
    const ctx = FakeAudioContext.instances[0];
    ctx.resume.mockClear();

    cacher();
    // iOS interrompt le contexte en arrière-plan : on ne réagit pas.
    ctx.subirEtat("interrupted" as AudioContextState);
    await flushMicrotasks();
    expect(ctx.resume).not.toHaveBeenCalled();

    montrer();
    await flushMicrotasks();
    expect(ctx.resume).toHaveBeenCalled();
    expect(ctx.state).toBe("running");
    // La foule (boucle Web Audio) n'a jamais été arrêtée : elle suit le contexte.
    expect(ctx.bufferSources[0].stop).not.toHaveBeenCalled();
    expect(audio.paused).toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it("aucune reconstruction ne part tant que l'app est cachée", async () => {
    const { audioManager } = await freshManager();
    audioManager.playClick();
    const ctx = FakeAudioContext.instances[0];

    cacher();
    ctx.subirEtat("closed");
    await flushMicrotasks();
    expect(FakeAudioContext.instances).toHaveLength(1);

    montrer();
    await flushMicrotasks();
    expect(FakeAudioContext.instances).toHaveLength(2);
  });

  it("un disque que le joueur avait mis en pause ne repart pas au retour", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playVinyl("/sounds/vinyles/test.mp3");
    const audio = FakeAudio.instances[0];
    audioManager.pauseVinyl();

    cacher();
    montrer();
    await flushMicrotasks();
    expect(audio.paused).toBe(true);
  });

  it("la borne d'arcade se tait aussi et reste tue au retour", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playArcadeTrack("/sounds/arcade/jx.cartouche_bluebot_8_bit.m4a");
    await flushMicrotasks();
    const borne = FakeAudio.instances.at(-1)!;
    expect(borne.paused).toBe(false);

    cacher();
    expect(borne.paused).toBe(true);
    montrer();
    await flushMicrotasks();
    expect(borne.paused).toBe(true);
  });
});
