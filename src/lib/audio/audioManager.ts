import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

export interface AudioPrefs {
  volume: number;
  /** Gramophone : vinyles + crépitement d'aiguille. */
  musique: boolean;
  /** Effets ponctuels : clics, encaissement, papier, portes, fanfares… */
  effets: boolean;
  /** Boucles d'ambiance : foule, rue, cheminée, ronron du chat. */
  ambiance: boolean;
}

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  volume: 70,
  musique: true,
  effets: true,
  ambiance: true,
};

/** Forme v1 (pré-familles) encore présente dans le storage des anciens joueurs. */
interface AudioPrefsLegacy {
  volume?: number;
  foule?: boolean;
  cash?: boolean;
  clic?: boolean;
}

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
  private gramoTimers: number[] = [];
  private fadeOutTimer?: number;
  // Bus "ambiance gramophone" : un gain + lowpass partagés par la musique
  // ET le crépitement (needle). Permet d'étouffer/atténuer l'ensemble du
  // gramophone selon la pièce (proche = clair/fort, lointain = sourd/bas).
  private vinylAmbianceGain?: GainNode;
  private vinylAmbianceLowpass?: BiquadFilterNode;
  private ambianceVolume = 1;
  private ambianceLowpass = 20000;
  private buffers: Map<string, AudioBuffer> = new Map();
  prefs: AudioPrefs = { ...DEFAULT_AUDIO_PREFS };

  hydrate(prefs: Partial<AudioPrefs>): void {
    this.prefs = { ...DEFAULT_AUDIO_PREFS, ...prefs };
    if (this.master) {
      this.master.gain.value = this.prefs.volume / 100;
    }
  }

  persist(): void {
    safeLocalStorageSet(STORAGE_KEY, this.prefs);
  }

  ensureCtx(): void {
    if (typeof window === "undefined") return;
    if (this.ctx) {
      // iOS (Safari / WKWebView) : le contexte peut rester/repasser "suspended"
      // tant qu'aucun geste utilisateur ne l'a débloqué. On retente un resume.
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ?? (window as WindowAudio).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.prefs.volume / 100;
    this.master.connect(this.ctx.destination);
    // iOS : un AudioContext démarre "suspended" ; on tente un resume immédiat
    // (efficace si on est dans un geste) + des écouteurs de déblocage globaux.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.installUnlockHandlers();
  }

  private unlockInstalled = false;

  /** Débloque l'AudioContext au premier geste utilisateur (requis sur iOS). */
  private installUnlockHandlers(): void {
    if (this.unlockInstalled || typeof window === "undefined") return;
    if (typeof window.addEventListener !== "function") return;
    this.unlockInstalled = true;
    const unlock = () => {
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    };
    for (const ev of ["pointerdown", "touchend", "keydown"] as const) {
      window.addEventListener(ev, unlock, { passive: true });
    }
  }

  setVolume(v: number): void {
    this.prefs.volume = Math.max(0, Math.min(100, v));
    if (this.master) this.master.gain.value = this.prefs.volume / 100;
    this.persist();
  }

  setPref<K extends keyof AudioPrefs>(k: K, v: AudioPrefs[K]): void {
    this.prefs[k] = v;
    this.persist();
    // Couper une famille arrête aussi ses boucles déjà en cours — le gate
    // à la source ne suffit que pour les sons futurs.
    if (k === "ambiance" && v === false) {
      this.stopCrowd();
      this.stopAmbience();
      this.stopFireplace();
      this.stopCatPurr();
    }
    if (k === "musique" && v === false) {
      this.pauseVinyl();
      this.stopNeedle();
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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

  /** Apparition d'une carte de chinage : léger glissando montant, court et doux. */
  playApparition(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.09);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Rareté (rare/lég./unique) : petit arpège cristallin ascendant, superposable. */
  playRarete(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1568.0]; // C6 E6 G6
    const stepMs = 70;
    notes.forEach((freq, i) => {
      const t0 = now + (i * stepMs) / 1000;
      const dur = 0.26;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.14, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });
  }

  /** Fanfare de level-up : arpège majeur montant C5-E5-G5-C6, triangle, ~0,9 s. Placeholder synthé. */
  playLevelUp(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t0 = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = t0 + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(i === notes.length - 1 ? 0.3 : 0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === notes.length - 1 ? 0.55 : 0.28));
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + (i === notes.length - 1 ? 0.6 : 0.32));
    });
  }

  /** Vendeur mystère : deux notes feutrées à intervalle intrigant, longue traîne. */
  playMystere(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    const notes = [369.99, 523.25]; // F#4 -> C5
    const stepMs = 160;
    notes.forEach((freq, i) => {
      const t0 = now + (i * stepMs) / 1000;
      const dur = 0.6;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.12, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  }

  async playCash(): Promise<void> {
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/door-close.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /** Coffre de camionnette qui se ferme (validation chargement). */
  async playCoffreFerme(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/coffre-ferme.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /**
   * Démarrage et départ de la voiture. Lu jusqu'à `durationMs`, avec un
   * fondu de sortie sur la dernière seconde pour simuler l'éloignement final.
   */
  async playDepartVoiture(durationMs: number): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/depart-voiture.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    const end = now + durationMs / 1000;
    const fadeStart = Math.max(now, end - 1);
    gain.gain.setValueAtTime(1, now);
    gain.gain.setValueAtTime(1, fadeStart);
    gain.gain.linearRampToValueAtTime(0, end);
    src.start();
    src.stop(end);
  }

  async startCrowd(): Promise<void> {
    if (!this.prefs.ambiance) return;
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
    gain.gain.linearRampToValueAtTime(0.4, now + 0.8);
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
    if (!this.prefs.effets) return;
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
    if (!this.prefs.ambiance) return;
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
    if (!this.prefs.ambiance) return;
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

  /** Crée le bus ambiance (gain + lowpass) si pas encore là. */
  private ensureVinylAmbiance(): void {
    if (!this.ctx || !this.master) return;
    if (this.vinylAmbianceGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = this.ambianceVolume;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = this.ambianceLowpass;
    gain.connect(lp);
    lp.connect(this.master);
    this.vinylAmbianceGain = gain;
    this.vinylAmbianceLowpass = lp;
  }

  /** Volume global du bus gramophone (musique + crépitement). 0..1. */
  setVinylAmbianceVolume(v: number): void {
    this.ambianceVolume = Math.max(0, Math.min(1, v));
    // Un fondu de sortie en vol possède le gain : on n'écrase pas sa rampe.
    // La cible de route vient d'être mise à jour ci-dessus et sera appliquée
    // à la fin (ou à l'annulation) du fondu.
    if (this.fadeOutTimer !== undefined) return;
    if (!this.ctx || !this.vinylAmbianceGain) return;
    const now = this.ctx.currentTime;
    this.vinylAmbianceGain.gain.cancelScheduledValues(now);
    this.vinylAmbianceGain.gain.setValueAtTime(
      this.vinylAmbianceGain.gain.value,
      now,
    );
    this.vinylAmbianceGain.gain.linearRampToValueAtTime(
      this.ambianceVolume,
      now + 0.4,
    );
  }

  /** Fréquence de coupure du lowpass ambiance. 20000 = clair, 600 = étouffé. */
  setVinylAmbianceLowpass(hz: number): void {
    this.ambianceLowpass = Math.max(80, Math.min(20000, hz));
    if (!this.ctx || !this.vinylAmbianceLowpass) return;
    const now = this.ctx.currentTime;
    this.vinylAmbianceLowpass.frequency.cancelScheduledValues(now);
    this.vinylAmbianceLowpass.frequency.setValueAtTime(
      this.vinylAmbianceLowpass.frequency.value,
      now,
    );
    this.vinylAmbianceLowpass.frequency.linearRampToValueAtTime(
      this.ambianceLowpass,
      now + 0.4,
    );
  }

  /**
   * Démarre la lecture d'un vinyle. L'URL est résolue par le caller
   * (typiquement via `vinylAudioUrl(templateId)` qui regarde la table
   * `VINYLE_AUDIO_URLS` puis fallback `/sounds/vinyles/{templateId}.mp3`).
   * Si absent, lecture silencieuse mais `onEnded` jamais appelé.
   */
  async playVinyl(url: string, onEnded?: () => void): Promise<void> {
    if (!this.prefs.musique) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    this.ensureVinylAmbiance();
    this.stopVinyl();
    const audio = new Audio(url);
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
    // Route via le bus ambiance (gain + lowpass) plutôt que master direct,
    // pour que setVinylAmbianceVolume / Lowpass affectent la musique.
    gain.connect(this.vinylAmbianceGain ?? this.master);
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
    if (!this.prefs.musique) return;
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

  /**
   * Boucle "vinyl noise" du gramophone (crépitement permanent). Conserve
   * le nom historique `startNeedle` côté API publique pour ne pas casser
   * les appelants, mais charge désormais /sounds/vinyl-noise-loop.mp3.
   */
  async startNeedle(): Promise<void> {
    if (!this.prefs.musique) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    this.ensureVinylAmbiance();
    if (this.needleSource) return;
    const buf = await this.loadBuffer("/sounds/vinyl-noise-loop.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    // Idem playVinyl : via le bus ambiance pour que les pièces lointaines
    // étouffent aussi le crépitement.
    gain.connect(this.vinylAmbianceGain ?? this.master);
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.28, now + 0.4);
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

  /** One-shot fire-and-forget (Vinyl 1 / Vinyl 2). */
  private async playOneShot(url: string, volume = 1): Promise<void> {
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer(url);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  /**
   * Séquence audio complète au lancement d'une chanson :
   *   t=0    Vinyl 1 (one-shot intro)
   *   t=1s   Vinyl 2 (one-shot transition) + musique
   *   loop   Vinyl noise (déjà lancé / ramping in)
   * Plus de chanson à la fin : le loop continue jusqu'à stopGramophone().
   */
  async playGramophoneSong(
    musicUrl: string,
    onEnded?: () => void,
  ): Promise<void> {
    if (!this.prefs.musique) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    // Un fondu de sortie en vol tuerait la chanson fraîchement lancée à son
    // échéance (même classe de bug que stopGramophone) : on l'annule.
    this.annulerFadeOut();
    // Annule toute séquence en cours (musique précédente, timers).
    this.gramoTimers.forEach((t) => window.clearTimeout(t));
    this.gramoTimers = [];
    this.stopVinyl();
    // Assure le crépitement de fond.
    void this.startNeedle();
    // Vinyl 1 maintenant.
    void this.playOneShot("/sounds/vinyl-1.mp3", 0.7);
    // Vinyl 2 + musique après 1 seconde.
    const t = window.setTimeout(() => {
      void this.playOneShot("/sounds/vinyl-2.mp3", 0.6);
      void this.playVinyl(musicUrl, onEnded);
    }, 1000);
    this.gramoTimers.push(t);
  }

  /** Annule un fondu de sortie en attente et rend au bus sa cible de route. */
  private annulerFadeOut(): void {
    if (this.fadeOutTimer === undefined) return;
    window.clearTimeout(this.fadeOutTimer);
    this.fadeOutTimer = undefined;
    this.setVinylAmbianceVolume(this.ambianceVolume);
  }

  /** Arrêt complet du gramophone : musique, loop, timers en attente. */
  stopGramophone(): void {
    // Annule aussi un fondu de sortie en attente : sans ça, son timer
    // fantôme réinvoquerait stopGramophone puis écraserait le volume du
    // bus après coup. Le bus est ramené à sa cible de route courante
    // (ambianceVolume) — jamais laissé sur une rampe vers zéro.
    this.annulerFadeOut();
    this.gramoTimers.forEach((t) => window.clearTimeout(t));
    this.gramoTimers = [];
    this.stopVinyl();
    this.stopNeedle();
  }

  /** Vrai si un vinyle est chargé et en lecture (non mis en pause). */
  vinylEnLecture(): boolean {
    return !!this.vinylAudio && !this.vinylAudio.paused;
  }

  /**
   * Fondu de sortie du bus gramophone ENTIER (musique + crépitement) sur
   * `durationMs`, puis arrêt complet (stopGramophone) et bus ramené à sa cible
   * de route courante (ambianceVolume ; 1 sur le titre) — on ne laisse jamais
   * un bus à zéro pour l'écran suivant. Un stopGramophone() externe pendant le
   * fondu annule proprement le timer. Sûr à appeler si rien ne joue (arrêt
   * immédiat, pas de rampe). Un nouvel appel pendant un fondu REMPLACE la rampe
   * en cours (skip de l'intro : 1800 → 300 ms). Utilisé par les départs en
   * partie de l'écran titre, synchronisé avec la fermeture d'iris
   * (spec 2026-07-17-jazz-titre-fondu-design.md).
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
      this.setVinylAmbianceVolume(this.ambianceVolume);
    }, durationMs);
  }

  loadPersisted(): AudioPrefs {
    const parsed = safeLocalStorageGet<Partial<AudioPrefs> & AudioPrefsLegacy>(
      STORAGE_KEY,
      {},
    );
    // Migration v1 → familles : `foule` devient `ambiance`, `cash`/`clic`
    // fusionnent en `effets` (actif si l'un des deux l'était). La forme
    // migrée est réécrite au premier persist() ; en attendant, les clés
    // legacy restantes dans le storage sont ignorées par le spread typé.
    const estLegacy =
      parsed.musique === undefined &&
      (parsed.foule !== undefined ||
        parsed.cash !== undefined ||
        parsed.clic !== undefined);
    if (estLegacy) {
      return {
        ...DEFAULT_AUDIO_PREFS,
        volume:
          typeof parsed.volume === "number"
            ? parsed.volume
            : DEFAULT_AUDIO_PREFS.volume,
        ambiance: parsed.foule ?? true,
        effets: (parsed.cash ?? true) || (parsed.clic ?? true),
      };
    }
    return {
      volume:
        typeof parsed.volume === "number"
          ? parsed.volume
          : DEFAULT_AUDIO_PREFS.volume,
      musique: parsed.musique ?? DEFAULT_AUDIO_PREFS.musique,
      effets: parsed.effets ?? DEFAULT_AUDIO_PREFS.effets,
      ambiance: parsed.ambiance ?? DEFAULT_AUDIO_PREFS.ambiance,
    };
  }
}

export const audioManager = new AudioManager();
