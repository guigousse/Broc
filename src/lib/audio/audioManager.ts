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
  private catPurrSource?: AudioBufferSourceNode;
  private catPurrGain?: GainNode;
  private ambienceSource?: AudioBufferSourceNode;
  private ambienceGain?: GainNode;
  private fireplaceSource?: AudioBufferSourceNode;
  private fireplaceGain?: GainNode;
  private needleSource?: AudioBufferSourceNode;
  private needleGain?: GainNode;
  private vinylAudio?: HTMLAudioElement;
  private vinylSource?: MediaElementAudioSourceNode;
  private vinylGain?: GainNode;
  private vinylEndedHandler?: () => void;
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

  /** Précharge des fichiers audio pour éliminer le délai au premier play. */
  async preload(urls: string[]): Promise<void> {
    this.ensureCtx();
    if (!this.ctx) return;
    await Promise.all(urls.map((u) => this.loadBuffer(u)));
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

  /**
   * Tic discret de drag, plus aigu et plus court que playClick.
   * Pensé pour être joué en rafale pendant un drag, throttlé côté appelant.
   */
  playTick(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Petite mélodie enthousiaste à 3 notes (do-mi-sol majeur), jouée
   * quand un item est ajouté à un emplacement (atelier / collection).
   */
  playPickup(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    // Accord arpégé : C5 (523), E5 (659), G5 (784) — gamme ascendante joyeuse
    const notes = [523.25, 659.25, 783.99];
    const stepMs = 80;
    notes.forEach((freq, i) => {
      const t0 = now + (i * stepMs) / 1000;
      const dur = 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });
    // Petit "sparkle" final (note plus aiguë C6)
    const tEnd = now + (notes.length * stepMs) / 1000;
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(1046.5, tEnd);
    sparkleGain.gain.setValueAtTime(0, tEnd);
    sparkleGain.gain.linearRampToValueAtTime(0.22, tEnd + 0.01);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, tEnd + 0.32);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(master);
    sparkle.start(tEnd);
    sparkle.stop(tEnd + 0.35);
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

  async playRepair(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/repair.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  async playBreak(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/break.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /** Bruit de manipulation de papier (ouverture de lettre). */
  async playPaper(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/paper.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /** Bruit de journal qu'on déplie (ouverture de la Gazette). */
  async playNewspaper(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/newspaper.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /** Porte qui s'ouvre. */
  async playDoorOpen(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/door-open.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /** Porte qui se ferme. */
  async playDoorClose(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/door-close.mp3");
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

  /** Ronronnement du chat en boucle (volume réduit). */
  async startCatPurr(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.catPurrSource) return;
    const buf = await this.loadBuffer("/sounds/cat-purr.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.45, now + 0.15);
    src.start();
    this.catPurrSource = src;
    this.catPurrGain = gain;
  }

  stopCatPurr(): void {
    if (!this.ctx || !this.catPurrSource || !this.catPurrGain) return;
    const now = this.ctx.currentTime;
    const src = this.catPurrSource;
    const gain = this.catPurrGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    src.stop(now + 0.21);
    this.catPurrSource = undefined;
    this.catPurrGain = undefined;
  }

  /** Ambiance de rue calme du QG, en boucle. */
  async startAmbience(): Promise<void> {
    if (!this.prefs.foule) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.ambienceSource) return;
    const buf = await this.loadBuffer("/sounds/ambience-qg.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.35, now + 0.6);
    src.start();
    this.ambienceSource = src;
    this.ambienceGain = gain;
  }

  stopAmbience(): void {
    if (!this.ctx || !this.ambienceSource || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const src = this.ambienceSource;
    const gain = this.ambienceGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    src.stop(now + 0.31);
    this.ambienceSource = undefined;
    this.ambienceGain = undefined;
  }

  /** Cheminée en boucle. Volume géré dynamiquement par setFireplaceVolume(). */
  async startFireplace(initialVolume: number = 0.3): Promise<void> {
    if (!this.prefs.foule) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.fireplaceSource) return;
    const buf = await this.loadBuffer("/sounds/fireplace.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, initialVolume)),
      now + 0.6,
    );
    src.start();
    this.fireplaceSource = src;
    this.fireplaceGain = gain;
  }

  /** Ajuste le volume de la cheminée en douceur (0..1). */
  setFireplaceVolume(volume: number): void {
    if (!this.ctx || !this.fireplaceGain) return;
    const v = Math.max(0, Math.min(1, volume));
    const now = this.ctx.currentTime;
    this.fireplaceGain.gain.cancelScheduledValues(now);
    this.fireplaceGain.gain.setValueAtTime(this.fireplaceGain.gain.value, now);
    this.fireplaceGain.gain.linearRampToValueAtTime(v, now + 0.12);
  }

  stopFireplace(): void {
    if (!this.ctx || !this.fireplaceSource || !this.fireplaceGain) return;
    const now = this.ctx.currentTime;
    const src = this.fireplaceSource;
    const gain = this.fireplaceGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    src.stop(now + 0.31);
    this.fireplaceSource = undefined;
    this.fireplaceGain = undefined;
  }

  /* ---------------------------------------------------------------- */
  /* Gramophone — vinyle + aiguille                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Démarre la lecture d'un vinyle. Le fichier est cherché à
   * `/sounds/vinyles/{templateId}.mp3`. Si absent, lecture silencieuse
   * mais `onEnded` jamais appelé (pas de durée connue).
   */
  async playVinyl(templateId: string, onEnded?: () => void): Promise<void> {
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    this.stopVinyl();
    const audio = new Audio(`/sounds/vinyles/${templateId}.mp3`);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    let source: MediaElementAudioSourceNode;
    try {
      source = this.ctx.createMediaElementSource(audio);
    } catch {
      // Échec inattendu : on garde l'élément <audio> orphelin, lecture muette.
      return;
    }
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(this.master);
    const handler = () => {
      if (onEnded) onEnded();
    };
    audio.addEventListener("ended", handler);
    this.vinylAudio = audio;
    this.vinylSource = source;
    this.vinylGain = gain;
    this.vinylEndedHandler = handler;
    try {
      await audio.play();
    } catch {
      // Lecture refusée (par ex. autoplay sans user gesture) — on laisse
      // l'élément en place, le caller peut retenter.
    }
  }

  pauseVinyl(): void {
    if (!this.vinylAudio) return;
    this.vinylAudio.pause();
  }

  resumeVinyl(): void {
    if (!this.vinylAudio) return;
    void this.vinylAudio.play().catch(() => {
      /* ignore */
    });
  }

  stopVinyl(): void {
    if (this.vinylAudio && this.vinylEndedHandler) {
      this.vinylAudio.removeEventListener("ended", this.vinylEndedHandler);
    }
    if (this.vinylAudio) {
      this.vinylAudio.pause();
      this.vinylAudio.src = "";
    }
    if (this.vinylSource) {
      try {
        this.vinylSource.disconnect();
      } catch {
        /* ignore */
      }
    }
    if (this.vinylGain) {
      try {
        this.vinylGain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.vinylAudio = undefined;
    this.vinylSource = undefined;
    this.vinylGain = undefined;
    this.vinylEndedHandler = undefined;
  }

  /** Ramp doux (~300 ms) vers le volume cible (0..1) pour le vinyle. */
  setVinylTargetVolume(volume: number): void {
    if (!this.ctx || !this.vinylGain) return;
    const v = Math.max(0, Math.min(1, volume));
    const now = this.ctx.currentTime;
    this.vinylGain.gain.cancelScheduledValues(now);
    this.vinylGain.gain.setValueAtTime(this.vinylGain.gain.value, now);
    this.vinylGain.gain.linearRampToValueAtTime(v, now + 0.3);
  }

  /** Son d'aiguille en boucle (légèrement audible). */
  async startNeedle(): Promise<void> {
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.needleSource) return;
    const buf = await this.loadBuffer("/sounds/needle.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
    src.start();
    this.needleSource = src;
    this.needleGain = gain;
  }

  stopNeedle(): void {
    if (!this.ctx || !this.needleSource || !this.needleGain) return;
    const now = this.ctx.currentTime;
    const src = this.needleSource;
    const gain = this.needleGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    src.stop(now + 0.31);
    this.needleSource = undefined;
    this.needleGain = undefined;
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
