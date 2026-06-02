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
