import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";
import { inverserEtRogner } from "@/lib/audio/inverserSon";

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

/**
 * Vitesse de lecture du coffre qui s'ouvre (le son de fermeture retourné).
 * Sous 1, le battant se relève lentement et sonne plus grave — un coffre
 * qu'on ouvre n'a pas la sécheresse d'un coffre qu'on claque.
 */
const COFFRE_OUVRE_VITESSE = 0.6;

/** Le blanc entre deux cartouches, en ms. Court : c'est un geste, pas une pause. */
const ARCADE_BLANC_CARTOUCHE_MS = 60;

/** Fourchette entre deux accrocs de la borne, en ms. */
const ARCADE_GLITCH_MIN_MS = 12_000;
const ARCADE_GLITCH_MAX_MS = 30_000;

/**
 * Volume de l'ambiance de rue telle qu'on l'entend au bureau — la référence
 * dont les autres écrans se déduisent. Le Bazar rejoue la MÊME boucle mais
 * plus ou moins fort selon la distance à sa porte : « plein volume » y veut
 * dire « comme au bureau », pas « gain 1 », qui hurlerait.
 */
export const VOLUME_AMBIANCE_QG = 0.35;

/**
 * Niveau de la bande-son de la borne d'arcade du Bazar.
 *
 * Plus haut que l'ambiance de rue (0,35 au bureau) parce que c'est le premier
 * plan quand la borne est ouverte, et que les pistes sont normalisées à
 * -18 LUFS puis compressées par `build-arcade-audio.mjs` : elles arrivent déjà
 * denses, un gain de 1 hurlerait.
 */
export const VOLUME_BORNE_ARCADE = 0.55;

/** Détonation d'un bouquet de feu d'artifice (écran de level-up). */
export const SON_EXPLOSION = "/sounds/explosion.mp3";

/**
 * Position de la détonation DANS le fichier, mesurée sur l'échantillon
 * définitif (crête à 36 ms, montée à partir de 30 ms). Pour que le bang tombe
 * pile sur l'éclat à l'écran, l'appelant déclenche la lecture d'autant en
 * avance — divisé par la `vitesse` de lecture, qui étire ou comprime ce délai.
 */
export const PIC_EXPLOSION_S = 0.035;

/**
 * Rampe par défaut du bus gramophone (volume et lowpass). C'est la durée d'un
 * changement de PIÈCE : assez lente pour qu'on n'entende pas un saut, assez
 * courte pour être finie avant qu'on ait fini d'arriver.
 */
const DUREE_RAMPE_BUS_MS = 400;

/**
 * Nombre de `resume()` restés sans effet avant de rebâtir le contexte.
 *
 * WebKit connaît un état « interrupted » hors spec d'où `resume()` sort en
 * tenant sa promesse — sans rien réveiller. Sans escalade, on retenterait la
 * même chose à chaque tap jusqu'à la fin de la session. Trois, parce qu'un
 * `resume()` hors geste utilisateur échoue légitimement une fois ou deux
 * avant que le joueur touche l'écran.
 */
const REPRISES_AVANT_RECONSTRUCTION = 3;

/**
 * Délai minimal entre deux reconstructions.
 *
 * WebKit plafonne le nombre d'AudioContext vivants par page : une boucle de
 * reconstruction tuerait le son bien plus sûrement que la panne qu'elle
 * prétend réparer.
 */
const DELAI_MIN_RECONSTRUCTION_MS = 3_000;

/** Longueur du journal d'états. Assez pour une session, assez court pour être lu. */
const TAILLE_JOURNAL_AUDIO = 24;

/** Une transition d'état du contexte audio, horodatée. */
export interface LigneJournalAudio {
  /** Epoch ms — c'est l'ÉCART entre deux lignes qui renseigne, pas l'heure. */
  ms: number;
  /** État du contexte, ou nom de l'incident ("reprise refusée", "reconstruction"). */
  etat: string;
}

/**
 * Ce qui devrait sonner en ce moment.
 *
 * Le graphe audio ne se répare pas : il se rebâtit. Reconstruire un contexte
 * vivant mais MUET ne vaudrait pas mieux que la panne — il faut donc savoir
 * ce qu'on doit relancer derrière. D'où ce relevé, tenu par les start/stop
 * eux-mêmes.
 */
interface EtatSonore {
  foule: boolean;
  ronron: boolean;
  /** Volume de zone de l'ambiance de rue, ou `undefined` si elle ne tourne pas. */
  ambiance?: number;
  cheminee?: number;
  aiguille: boolean;
  vinyle?: { url: string; onEnded?: () => void };
  arcade?: string;
}

const ETAT_SONORE_VIDE: EtatSonore = { foule: false, ronron: false, aiguille: false };

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
  /**
   * Jeton de démarrage de l'ambiance. Le garde d'idempotence classique
   * (`if (this.ambienceSource) return`) est posé AVANT le `await` du
   * décodage : deux appels rapprochés le franchissent tous les deux et la
   * boucle part en double, deux fois trop fort. Le cas n'est pas théorique —
   * c'est le montage/démontage/remontage de React en développement, et deux
   * navigations enchaînées ailleurs.
   *
   * `ambienceStarting` ferme la porte pendant le vol ; `ambienceGen`, qu'un
   * stop incrémente, permet au démarrage qui atterrit de constater qu'on a
   * quitté l'écran entre-temps et de renoncer.
   */
  private ambienceStarting = false;
  private ambienceGen = 0;
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
  // ── Borne d'arcade ────────────────────────────────────────────────
  // Un <audio> en streaming, comme le vinyle, et SURTOUT pas un AudioBuffer
  // décodé : la plus longue piste fait 2 min 45, soit ~58 Mo de PCM en
  // mémoire une fois décodée à la fréquence du contexte. En WKWebView, onze
  // jeux à ce régime tuent l'onglet.
  private arcadeAudio?: HTMLAudioElement;
  private arcadeSource?: MediaElementAudioSourceNode;
  private arcadeGain?: GainNode;
  private arcadeTimers: number[] = [];
  /** Jeton de démarrage — même rôle que `ambienceGen` (cf. son commentaire). */
  private arcadeGen = 0;
  /**
   * Le volume d'ambiance se calcule `base × facteur`, et les deux se règlent
   * séparément : la zone du panorama pose la BASE, la borne d'arcade pose le
   * FACTEUR. C'est ce qui permet à la borne d'atténuer la rue sans rien savoir
   * de l'endroit où le joueur se tenait, et à un changement de zone de rester
   * atténué tant que la borne joue.
   */
  private ambienceBase = VOLUME_AMBIANCE_QG;
  private ambienceDuck = 1;
  private buffers: Map<string, AudioBuffer> = new Map();
  // ── Survie du contexte ─────────────────────────────────────────────
  /** Ce qui doit sonner : relevé de reprise après reconstruction. */
  private enCours: EtatSonore = { ...ETAT_SONORE_VIDE };
  /** Le joueur a mis le disque en pause : une panne ne doit pas le rallumer. */
  private vinylePause = false;
  private journal: LigneJournalAudio[] = [];
  private repriseEnCours = false;
  private echecsReprise = 0;
  private derniereReconstruction = 0;
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
      // iOS (Safari / WKWebView) : le contexte peut rester/repasser
      // "suspended", ou "interrupted" (état WebKit non standard, hors du type
      // TS) après une interruption — pub récompensée, notification, appel,
      // reset du service média. Tout état ≠ "running" mérite un rattrapage.
      const etat = this.ctx.state as string;
      if (etat === "running") return;
      // "closed" est TERMINAL : `resume()` y échoue toujours. Se contenter
      // d'un resume ici, c'est le silence garanti jusqu'au redémarrage de
      // l'app — le défaut qui coupait tout le son en pleine session.
      if (etat === "closed") this.reconstruireContexte();
      else this.tenterReprise();
      return;
    }
    const Ctx =
      window.AudioContext ?? (window as WindowAudio).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    // Écouter le contexte plutôt que d'attendre le prochain son : dans un
    // dialogue ou une cinématique, le prochain appel peut être loin.
    // La comparaison d'identité fait taire les événements d'un contexte
    // remplacé — dont le "closed" que déclenche notre propre fermeture.
    ctx.onstatechange = () => {
      if (this.ctx === ctx) this.surChangementEtat();
    };
    this.master = ctx.createGain();
    this.master.gain.value = this.prefs.volume / 100;
    this.master.connect(ctx.destination);
    // iOS : un AudioContext démarre "suspended" ; on tente un resume immédiat
    // (efficace si on est dans un geste) + des écouteurs de déblocage globaux.
    if (ctx.state === "suspended") void ctx.resume();
    this.installUnlockHandlers();
  }

  /* ---------------------------------------------------------------- */
  /* Survie du contexte audio                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Journal des états subis par le contexte.
   *
   * La panne ne se reproduit ni au simulateur ni au débogueur : elle demande
   * une longue session sur l'appareil. Si le rattrapage ci-dessous échoue
   * malgré tout, ce relevé est la seule pièce à conviction disponible.
   */
  journalAudio(): LigneJournalAudio[] {
    return [...this.journal];
  }

  private noterEtat(etat: string): void {
    this.journal.push({ ms: Date.now(), etat });
    if (this.journal.length > TAILLE_JOURNAL_AUDIO) this.journal.shift();
  }

  /** Le contexte a changé d'état tout seul : iOS vient de nous interrompre. */
  private surChangementEtat(): void {
    const etat = this.ctx?.state as string | undefined;
    if (!etat) return;
    this.noterEtat(etat);
    if (etat === "running") {
      this.echecsReprise = 0;
      this.reprendreLesElements();
      return;
    }
    if (etat === "closed") this.reconstruireContexte();
    else this.tenterReprise();
  }

  /**
   * Tente de réveiller le contexte, et escalade vers la reconstruction quand
   * le réveil ne prend pas.
   *
   * Le `void ctx.resume()` d'origine avalait l'échec : le rejet partait en
   * promesse non capturée et personne n'était prévenu. Ici, les deux formes
   * d'échec sont traitées — le rejet (contexte mort, on rebâtit tout de
   * suite) et la réussite sans effet (WebKit "interrupted", on compte).
   */
  private tenterReprise(): void {
    const ctx = this.ctx;
    if (!ctx || this.repriseEnCours) return;
    this.repriseEnCours = true;
    void Promise.resolve(ctx.resume()).then(
      () => {
        this.repriseEnCours = false;
        // Le graphe a pu être rebâti pendant le vol : ce verdict est périmé.
        if (this.ctx !== ctx) return;
        if ((ctx.state as string) === "running") {
          this.echecsReprise = 0;
          this.reprendreLesElements();
          return;
        }
        this.noterEtat(`reprise sans effet (${ctx.state})`);
        if (++this.echecsReprise >= REPRISES_AVANT_RECONSTRUCTION) {
          this.reconstruireContexte();
        }
      },
      () => {
        this.repriseEnCours = false;
        if (this.ctx !== ctx) return;
        this.noterEtat("reprise refusée");
        this.reconstruireContexte();
      },
    );
  }

  /**
   * Relance les éléments `<audio>` qu'iOS a mis en pause en nous interrompant.
   *
   * Un contexte qui se réveille ne suffit pas : les boucles d'ambiance sont
   * des `AudioBufferSource` et repartent d'elles-mêmes, mais le disque et la
   * borne sont des éléments média, qu'iOS met en pause pour son compte et ne
   * relance jamais. Sans ce geste, tout revient SAUF la musique.
   */
  private reprendreLesElements(): void {
    if (!this.prefs.musique) return;
    if (this.vinylAudio?.paused && !this.vinylePause) {
      void this.vinylAudio.play().catch(() => {
        /* refusée hors geste : le prochain tap repassera par ici */
      });
    }
    if (this.arcadeAudio?.paused) {
      void this.arcadeAudio.play().catch(() => {
        /* idem */
      });
    }
  }

  /**
   * Jette le graphe audio mort et en rebâtit un, puis relance ce qui sonnait.
   *
   * C'est le geste de dernier recours : un contexte qu'iOS a fermé ou laissé
   * interrompu ne revient par aucun autre moyen.
   */
  private reconstruireContexte(): void {
    if (typeof window === "undefined") return;
    const maintenant = Date.now();
    if (maintenant - this.derniereReconstruction < DELAI_MIN_RECONSTRUCTION_MS) {
      return;
    }
    this.derniereReconstruction = maintenant;
    this.noterEtat("reconstruction");
    // Le relevé est pris AVANT le démontage, qui l'efface au passage.
    const repere = { ...this.enCours };
    const positionDisque = this.vinylAudio?.currentTime ?? 0;
    const disquePause = this.vinylePause;
    this.demonterGraphe();
    this.echecsReprise = 0;
    this.ensureCtx();
    if (!this.ctx) return;
    this.relancer(repere, positionDisque, disquePause);
  }

  /** Relâche tout ce qui pendait au contexte mort, contexte compris. */
  private demonterGraphe(): void {
    const ancien = this.ctx;
    // Les timers d'abord : un fondu programmé rallumerait un gain du graphe
    // mort, ou effacerait celui qu'on est en train de rebâtir.
    this.gramoTimers.forEach((t) => window.clearTimeout(t));
    this.gramoTimers = [];
    this.arcadeTimers.forEach((t) => window.clearTimeout(t));
    this.arcadeTimers = [];
    if (this.fadeOutTimer !== undefined) window.clearTimeout(this.fadeOutTimer);
    this.fadeOutTimer = undefined;
    // Jetons de démarrage : un décodage encore en vol ne doit pas atterrir
    // sur le graphe neuf en croyant être chez lui.
    this.ambienceGen++;
    this.ambienceStarting = false;
    this.arcadeGen++;

    if (this.vinylAudio && this.vinylEndedHandler) {
      this.vinylAudio.removeEventListener("ended", this.vinylEndedHandler);
    }
    for (const audio of [this.vinylAudio, this.arcadeAudio]) {
      if (!audio) continue;
      try {
        audio.pause();
        audio.src = "";
      } catch {
        /* élément déjà relâché */
      }
    }
    this.crowdSource = undefined;
    this.crowdGain = undefined;
    this.catPurrSource = undefined;
    this.catPurrGain = undefined;
    this.ambienceSource = undefined;
    this.ambienceGain = undefined;
    this.fireplaceSource = undefined;
    this.fireplaceGain = undefined;
    this.needleSource = undefined;
    this.needleGain = undefined;
    this.vinylAudio = undefined;
    this.vinylSource = undefined;
    this.vinylGain = undefined;
    this.vinylEndedHandler = undefined;
    this.vinylAmbianceGain = undefined;
    this.vinylAmbianceLowpass = undefined;
    this.arcadeAudio = undefined;
    this.arcadeSource = undefined;
    this.arcadeGain = undefined;
    this.enCours = { ...ETAT_SONORE_VIDE };
    // Les tampons décodés appartenaient au contexte mort. Les vider rend au
    // passage les dizaines de Mo de PCM que le cache retenait à vie (audit H3).
    this.buffers.clear();
    this.master = undefined;
    this.ctx = undefined;
    if (ancien) {
      ancien.onstatechange = null;
      if ((ancien.state as string) !== "closed") {
        try {
          void Promise.resolve(ancien.close()).catch(() => {
            /* déjà parti */
          });
        } catch {
          /* implémentation sans close() */
        }
      }
    }
  }

  /** Remet en route, sur le graphe neuf, ce que le relevé dit devoir sonner. */
  private relancer(
    repere: EtatSonore,
    positionDisque: number,
    disquePause: boolean,
  ): void {
    if (repere.foule) void this.startCrowd();
    if (repere.ronron) void this.startCatPurr();
    if (repere.ambiance !== undefined) void this.startAmbience(repere.ambiance);
    if (repere.cheminee !== undefined) void this.startFireplace(repere.cheminee);
    if (repere.aiguille) void this.startNeedle();
    // Une panne technique n'est pas une raison de rallumer une musique que le
    // joueur avait coupée.
    if (repere.vinyle && !disquePause) {
      void this.playVinyl(
        repere.vinyle.url,
        repere.vinyle.onEnded,
        positionDisque,
      );
    }
    if (repere.arcade) void this.playArcadeTrack(repere.arcade);
  }

  private unlockInstalled = false;

  /** Débloque l'AudioContext au premier geste utilisateur (requis sur iOS). */
  private installUnlockHandlers(): void {
    if (this.unlockInstalled || typeof window === "undefined") return;
    if (typeof window.addEventListener !== "function") return;
    this.unlockInstalled = true;
    const unlock = () => {
      if (!this.ctx) return;
      // ≠ "running" : couvre "suspended" ET "interrupted" (WebKit, après
      // passage en arrière-plan — sinon plus aucun son jusqu'au redémarrage).
      // `ensureCtx` porte tout le rattrapage, reconstruction comprise : un
      // simple `resume()` ici laissait un contexte mort mort pour de bon.
      if ((this.ctx.state as string) !== "running") this.ensureCtx();
      else this.reprendreLesElements();
    };
    for (const ev of ["pointerdown", "touchend", "keydown"] as const) {
      window.addEventListener(ev, unlock, { passive: true });
    }
    // Retour au premier plan : iOS ne re-passe pas toujours le contexte à
    // "running" tout seul après une interruption — on retente sans attendre
    // le prochain geste utilisateur.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") unlock();
    });
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
      this.stopArcade();
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
   * Carillon d'une notification reçue pendant qu'on joue.
   *
   * Il REMPLACE le son système de la notification, que le plugin vendoré ne
   * joue plus au premier plan : ce son-là prenait la session audio iOS et
   * interrompait tout l'audio du jeu (cf. NotificationHandler.swift). Le ping
   * passe désormais par le bus du jeu, donc par son volume et sa préférence
   * « effets » — ce que le son système ignorait.
   *
   * Deux notes de cloche en quarte montante, brèves et basses : c'est un
   * signal posé par-dessus une musique qui continue, pas une fanfare.
   */
  playNotif(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    for (const [hz, depart] of [
      [784, 0],
      [1046.5, 0.12],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(hz, now + depart);
      gain.gain.setValueAtTime(0, now + depart);
      gain.gain.linearRampToValueAtTime(0.22, now + depart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + depart + 0.5);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + depart);
      osc.stop(now + depart + 0.55);
    }
  }

  /**
   * Le « pop » d'une bulle qui éclate : une sinusoïde qui monte vite en
   * fréquence et s'éteint aussitôt. C'est la MONTÉE qui fait le pop — à
   * fréquence fixe, on n'entend qu'un clic de plus.
   */
  playPop(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.055);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.13);
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

  /**
   * Découverte (objet jamais croisé) : cloche douce qui s'ouvre en quinte,
   * puis trois éclats cristallins qui montent — pensé pour respirer sur toute
   * la durée des rayons (~2,6 s) sans écraser l'arpège de rareté, avec lequel
   * il se superpose sur un rare inédit : registre plus grave au départ,
   * attaque plus lente, et les éclats tombent APRÈS la fin de l'arpège.
   */
  playDecouverte(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;

    // Corps de cloche : fondamentale G4 + quinte D5 qui s'ouvre dessus.
    const cloche = [
      { freq: 392.0, retard: 0, gain: 0.2, dur: 1.5 },
      { freq: 587.33, retard: 0.12, gain: 0.16, dur: 1.4 },
    ];
    for (const { freq, retard, gain: g, dur } of cloche) {
      const t0 = now + retard;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      // Attaque volontairement molle (60 ms) : une cloche qui s'ouvre, pas un clic.
      gain.gain.linearRampToValueAtTime(g, t0 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }

    // Éclats : D6 F#6 A6, égrenés pendant que les rayons enflent.
    const eclats = [1174.66, 1479.98, 1760.0];
    const stepMs = 190;
    eclats.forEach((freq, i) => {
      const t0 = now + 0.42 + (i * stepMs) / 1000;
      const dur = 0.5;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    });
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

  /**
   * Détonation d'un bouquet de feu d'artifice (level-up) :
   * /sounds/explosion.mp3 (0,8 s).
   *
   * `force` (0-1) fait décroître les bouquets secondaires, `vitesse` décale
   * légèrement la hauteur — quatre bouquets rejouant l'échantillon à
   * l'identique s'entendraient comme un bug.
   *
   * Précharger avant de jouer : le `await` sur le tampon décalerait la
   * première détonation et casserait la synchro avec l'éclat à l'écran.
   */
  async playExplosion(force = 1, vitesse = 1): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer(SON_EXPLOSION);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = vitesse;
    const gain = this.ctx.createGain();
    gain.gain.value = force;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  /** Fanfare de level-up : /sounds/level-up.mp3 (~1,7 s). */
  async playLevelUp(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/level-up.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /**
   * Montée d'état d'un objet restauré (cérémonie de l'Atelier). Distinct du
   * level-up du brocanteur : c'est l'OBJET qui gagne son étoile, pas le
   * joueur son niveau.
   */
  async playUpgrade(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/upgrade.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
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

  /**
   * Le tintement d'une pièce qui tombe dans la caisse — les Bazarcoins d'une
   * quête, au bout de leur vol depuis le carnet (2026-08-26).
   *
   * Un fichier et non une synthèse : le son est choisi par l'auteur, et sa
   * couleur 8 bits ne se retrouverait pas à l'oscillateur. Il passe par le
   * cache de tampons comme `cash.mp3` — une quête peut en verser plusieurs à
   * la suite, et retélécharger 33 ko à chaque pièce serait absurde.
   */
  async playJetonBazar(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/jeton-bazar.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  /** Apparition d'une célébrité : arpège cristallin ascendant façon carillon,
   *  puis traîne scintillante (deux aigus détunés qui s'éteignent lentement). */
  playCelebrite(): void {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    // C6 → E6 → G6 → C7 : montée « clinquante » rapide.
    const notes = [1046.5, 1318.5, 1568.0, 2093.0];
    const stepMs = 90;
    notes.forEach((freq, i) => {
      const t0 = now + (i * stepMs) / 1000;
      const dur = 0.55;
      // Fondamentale claire + partiel brillant à l'octave : timbre de clochette.
      for (const [mult, vol, type] of [
        [1, 0.09, "sine"],
        [2, 0.035, "triangle"],
      ] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq * mult, t0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      }
    });
    // Traîne : shimmer aigu légèrement détuné qui s'évanouit.
    const tFin = now + (notes.length * stepMs) / 1000;
    for (const freq of [2093.0, 2103.0]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, tFin);
      gain.gain.setValueAtTime(0, tFin);
      gain.gain.linearRampToValueAtTime(0.03, tFin + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, tFin + 1.3);
      osc.connect(gain);
      gain.connect(master);
      osc.start(tFin);
      osc.stop(tFin + 1.4);
    }
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

  /** Coup de tonnerre de l'achat « Énergie infinie » — one-shot unique par vie
   *  d'app : le tampon est évincé sitôt la lecture lancée (motif depart-voiture,
   *  audit H3) ; la source en cours de lecture garde sa propre référence. */
  async playEclair(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/eclair.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
    this.buffers.delete("/sounds/eclair.mp3");
  }

  /** Recharge d'énergie (machine du savant fou) : plasma électrique. */
  async playRecharge(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/recharge.m4a");
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

  /**
   * Carillon de la porte du Bazar. Il sonne à l'ARRIVÉE sur l'écran, pas au
   * tap qui a lancé la navigation : `playDoorClose` est la porte du bureau
   * qu'on referme derrière soi, celle-ci est celle de la boutique qu'on
   * pousse. Les deux s'enchaînent, séparées par la fermeture d'iris.
   */
  async playCarillon(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/carillon-bazar.mp3");
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
   * Coffre qui s'ouvre : le son de fermeture joué à l'envers. Le geste étant
   * l'exact inverse, l'inversion du tampon suffit — pas d'asset supplémentaire.
   * Le tampon retourné est mis en cache après la première inversion.
   *
   * Ralenti : une fermeture est un geste sec, une ouverture est plus posée.
   * Le `playbackRate` abaisse aussi la hauteur, ce qui pèse le battant.
   */
  async playCoffreOuvre(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBufferInverse("/sounds/coffre-ferme.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = COFFRE_OUVRE_VITESSE;
    src.connect(this.master);
    src.start();
  }

  /**
   * Démarrage et départ de la voiture. Lu jusqu'à `durationMs`, avec un
   * fondu de sortie sur la dernière seconde pour simuler l'éloignement final.
   *
   * `inverse` lit le tampon à l'envers et échange les fondus : le son décrit
   * alors une voiture qui approche puis se range, et non qui s'éloigne.
   */
  async playDepartVoiture(durationMs: number, inverse = false): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = inverse
      ? await this.loadBufferInverse("/sounds/depart-voiture.mp3")
      : await this.loadBuffer("/sounds/depart-voiture.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    const end = now + durationMs / 1000;
    if (inverse) {
      // Arrivée : la voiture surgit du fond, le son monte au lieu de mourir.
      const fadeEnd = Math.min(end, now + 1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, fadeEnd);
    } else {
      const fadeStart = Math.max(now, end - 1);
      gain.gain.setValueAtTime(1, now);
      gain.gain.setValueAtTime(1, fadeStart);
      gain.gain.linearRampToValueAtTime(0, end);
    }
    src.start();
    src.stop(end);
    // Éviction immédiate : ~23 Mo de PCM décodé (59 s), le double avec la
    // copie inversée du garage, pour un one-shot rare — le laisser en cache
    // à vie exposait la WKWebView au jetsam iOS (audit 2026-08-03). La
    // source en cours de lecture garde sa propre référence au tampon.
    this.buffers.delete("/sounds/depart-voiture.mp3");
    this.buffers.delete("/sounds/depart-voiture.mp3#inverse");
  }

  /**
   * Charge un son et en renvoie une copie lue à l'envers, amorce silencieuse
   * rognée. Mise en cache sous une clé dérivée, pour ne pas payer l'inversion
   * à chaque lecture.
   *
   * Le rognage est la pièce importante : un son de fermeture, de moteur ou de
   * porte finit presque toujours par une queue de silence ou de réverbération.
   * Retournée, cette queue devient une amorce muette, et le son paraît
   * démarrer en retard alors qu'il a bien été déclenché à l'heure — d'autant
   * plus s'il est ralenti par la suite.
   */
  private async loadBufferInverse(url: string): Promise<AudioBuffer | null> {
    const cle = `${url}#inverse`;
    const dejaLa = this.buffers.get(cle);
    if (dejaLa) return dejaLa;

    const source = await this.loadBuffer(url);
    if (!source || !this.ctx) return null;

    const source_canaux: Float32Array[] = [];
    for (let canal = 0; canal < source.numberOfChannels; canal++) {
      source_canaux.push(source.getChannelData(canal));
    }

    const { canaux } = inverserEtRogner(source_canaux);
    const copie = this.ctx.createBuffer(
      source.numberOfChannels,
      canaux[0].length,
      source.sampleRate,
    );
    for (let canal = 0; canal < canaux.length; canal++) {
      copie.copyToChannel(canaux[canal], canal);
    }
    this.buffers.set(cle, copie);
    return copie;
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
    this.enCours.foule = true;
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
    this.enCours.foule = false;
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
    this.enCours.ronron = true;
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
    this.enCours.ronron = false;
  }

  /**
   * Ambiance de rue calme, en boucle. Le volume d'entrée existe pour le
   * Bazar : sans lui, la boucle monterait au niveau du bureau avant de
   * retomber à sa vraie valeur, et ce coup de rue s'entend à l'ouverture de
   * l'écran. Ensuite, `setAmbienceVolume` la pilote.
   */
  async startAmbience(initialVolume: number = VOLUME_AMBIANCE_QG): Promise<void> {
    if (!this.prefs.ambiance) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.ambienceSource || this.ambienceStarting) return;
    this.ambienceStarting = true;
    const gen = ++this.ambienceGen;
    const buf = await this.loadBuffer("/sounds/ambience-qg.mp3");
    this.ambienceStarting = false;
    // `gen` périmé = un stopAmbience est passé pendant le décodage : l'écran
    // est déjà quitté, la boucle n'a plus lieu d'être.
    if (!buf || gen !== this.ambienceGen) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.master);
    const now = this.ctx.currentTime;
    this.ambienceBase = Math.max(0, Math.min(1, initialVolume));
    gain.gain.linearRampToValueAtTime(
      this.ambienceBase * this.ambienceDuck,
      now + 0.6,
    );
    src.start();
    this.ambienceSource = src;
    this.ambienceGain = gain;
    this.enCours.ambiance = this.ambienceBase;
  }

  /**
   * Ajuste le volume de zone de l'ambiance en douceur (0..1).
   *
   * Pose la BASE, pas le gain final : une atténuation en cours (borne
   * d'arcade ouverte) survit à l'appel. Sans ça, le panorama qui ré-émet son
   * index rétablirait la rue à plein volume par-dessus la musique du jeu.
   */
  setAmbienceVolume(volume: number): void {
    this.ambienceBase = Math.max(0, Math.min(1, volume));
    if (this.enCours.ambiance !== undefined) {
      this.enCours.ambiance = this.ambienceBase;
    }
    this.appliquerAmbience(0.12);
  }

  /**
   * Atténue l'ambiance d'un FACTEUR (0..1) sans toucher au volume de zone.
   *
   * Un facteur et pas un volume : l'appelant (la borne d'arcade) n'a alors
   * rien à savoir de la position du joueur dans le panorama, ni à retenir le
   * volume qu'il remplace pour le rendre ensuite. Il pose 0,3 en arrivant,
   * 1 en repartant, et la courbe de zone reprend la main d'elle-même.
   *
   * La rampe est plus lente que celle du volume de zone (0,4 s contre 0,12) :
   * un snap de panorama est un déplacement, une borne qui s'allume est une
   * bascule d'attention — elle mérite qu'on l'entende arriver.
   */
  setAmbienceDuck(facteur: number): void {
    this.ambienceDuck = Math.max(0, Math.min(1, facteur));
    this.appliquerAmbience(0.4);
  }

  /** Pose `base × facteur` sur le gain d'ambiance, en `dureeS` secondes. */
  private appliquerAmbience(dureeS: number): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    this.ambienceGain.gain.cancelScheduledValues(now);
    this.ambienceGain.gain.setValueAtTime(this.ambienceGain.gain.value, now);
    this.ambienceGain.gain.linearRampToValueAtTime(
      this.ambienceBase * this.ambienceDuck,
      now + dureeS,
    );
  }

  stopAmbience(): void {
    // Le facteur d'atténuation ne survit PAS à la boucle qu'il atténuait.
    // Oublié derrière soi, il rendrait l'ambiance du bureau trois fois trop
    // basse à l'écran suivant, sans que rien ne relie la panne à la borne du
    // Bazar qu'on vient de quitter.
    this.ambienceDuck = 1;
    // Avant tout autre garde : annule aussi un démarrage encore en vol, dont
    // le buffer se décode et qui n'a donc encore posé aucune source.
    this.ambienceGen++;
    this.ambienceStarting = false;
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
    this.enCours.ambiance = undefined;
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
    this.enCours.cheminee = Math.max(0, Math.min(1, initialVolume));
  }

  /** Ajuste le volume de la cheminée en douceur (0..1). */
  setFireplaceVolume(volume: number): void {
    if (!this.ctx || !this.fireplaceGain) return;
    const v = Math.max(0, Math.min(1, volume));
    this.enCours.cheminee = v;
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
    this.enCours.cheminee = undefined;
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

  /**
   * Volume global du bus gramophone (musique + crépitement). 0..1.
   *
   * `dureeMs` sert aux réglages de pièce (défaut : une transition douce dont
   * personne ne doit remarquer la longueur) mais se règle au cas par cas
   * quand le fondu doit tenir la mesure d'autre chose — le passage vers le
   * Bazar l'aligne sur la fermeture de l'iris.
   *
   * Le disque n'est PAS arrêté, même à zéro : c'est un volume, pas une fin de
   * lecture. `fadeOutVinylBus` est l'autre geste, celui qui coupe pour de bon.
   */
  setVinylAmbianceVolume(v: number, dureeMs = DUREE_RAMPE_BUS_MS): void {
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
      now + Math.max(0, dureeMs) / 1000,
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
      now + DUREE_RAMPE_BUS_MS / 1000,
    );
  }

  /**
   * Démarre la lecture d'un vinyle. L'URL est résolue par le caller
   * (typiquement via `vinylAudioUrl(templateId)` qui regarde la table
   * `VINYLE_AUDIO_URLS` puis fallback `/sounds/vinyles/{templateId}.m4a`).
   * Si absent, lecture silencieuse mais `onEnded` jamais appelé.
   *
   * `depuisSeconde` sert à la reprise après reconstruction du contexte :
   * remettre un disque de trois minutes à son début parce qu'iOS a hoqueté
   * s'entend autant que le silence qu'on répare.
   */
  async playVinyl(
    url: string,
    onEnded?: () => void,
    depuisSeconde = 0,
  ): Promise<void> {
    if (!this.prefs.musique) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    this.ensureVinylAmbiance();
    this.stopVinyl();
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    if (depuisSeconde > 0) {
      // Avant les métadonnées, la spec en fait la position de départ par
      // défaut — c'est exactement ce qu'on veut, et ça ne lève pas.
      try {
        audio.currentTime = depuisSeconde;
      } catch {
        /* la lecture repartira du début, ce n'est pas une panne */
      }
    }
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
    this.enCours.vinyle = { url, onEnded };
    this.vinylePause = false;
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
    this.vinylePause = true;
  }

  resumeVinyl(): void {
    if (!this.prefs.musique) return;
    if (!this.vinylAudio) return;
    this.vinylePause = false;
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
    this.enCours.vinyle = undefined;
    this.vinylePause = false;
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
    this.enCours.aiguille = true;
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
    this.enCours.aiguille = false;
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

  /* ---------------------------------------------------------------- */
  /* Borne d'arcade                                                     */
  /* ---------------------------------------------------------------- */

  /**
   * Lance la bande-son du jeu affiché sur la borne, en boucle.
   *
   * PARTAGE DES RÔLES AVEC LE SCRIPT DE BUILD — la coloration « haut-parleur
   * de borne » (caisse, petit ampli, crush gradué par génération) est CUITE
   * dans le `.m4a` par `scripts/build-arcade-audio.mjs` : elle ne dépend ni du
   * moment ni du joueur, la refaire ici coûterait quatre nœuds et une
   * deuxième implémentation à tenir. Ce qui reste ici est tout ce qui doit
   * varier : l'allumage, le changement de cartouche, et le glitch.
   *
   * ALLUMAGE OU CHANGEMENT DE CARTOUCHE : le manager tranche seul, selon
   * qu'une piste tourne déjà ou non. Rien à passer, donc rien à se rappeler
   * côté appelant — et c'est ce qui rend l'effet juste dans tous les cas :
   * ouvrir la borne allume le meuble, swiper d'un jeu à l'autre change la
   * cartouche, et repasser par un écran neigeux (qui éteint) rallume. Un
   * drapeau tenu par l'appelant se serait trompé sur au moins l'un des trois.
   */
  async playArcadeTrack(url: string): Promise<void> {
    if (!this.prefs.musique) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;

    const remplace = this.arcadeAudio !== undefined;
    // Coupure SÈCHE quand on remplace : c'est le bruit de la cartouche qu'on
    // arrache, et il est voulu. `stopArcade` (fermeture de la borne) garde
    // son fondu de 60 ms, lui — éteindre un meuble ne claque pas.
    this.couperArcade(remplace ? 0 : 0.06);
    const gen = this.arcadeGen;
    if (remplace) {
      await new Promise<void>((resolve) => {
        this.arcadeTimer(resolve, ARCADE_BLANC_CARTOUCHE_MS);
      });
      // Le joueur a pu refermer la borne, ou reswiper, pendant le blanc.
      if (gen !== this.arcadeGen) return;
    }

    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    // L'attract mode d'une vraie borne ne s'arrête pas : la plus courte des
    // onze pistes fait 30 s, et un silence au bout d'une demi-minute passerait
    // pour une panne.
    audio.loop = true;
    let source: MediaElementAudioSourceNode;
    try {
      source = this.ctx.createMediaElementSource(audio);
    } catch {
      return;
    }
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    // Directement au master : le bus gramophone porte un lowpass de pièce qui
    // n'a rien à voir avec la borne, dont la coloration est déjà dans le
    // fichier.
    gain.connect(this.master);
    this.arcadeAudio = audio;
    this.arcadeSource = source;
    this.arcadeGain = gain;
    this.enCours.arcade = url;

    // Le meuble qui prend le courant monte de plus loin, et plus longtemps,
    // qu'une cartouche qu'on enfonce.
    const monteeMs = remplace ? 120 : 350;
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(VOLUME_BORNE_ARCADE, now + monteeMs / 1000);
    this.glisserVitesse(remplace ? 0.94 : 0.82, 1, monteeMs);

    try {
      await audio.play();
    } catch {
      // Refusée (autoplay hors geste) : l'élément reste en place, le prochain
      // tap du joueur passe par les débloqueurs d'`installUnlockHandlers`.
    }
    this.programmerGlitch();
  }

  /** Éteint la borne : fondu court, timers annulés, élément relâché. */
  stopArcade(): void {
    this.couperArcade(0.06);
  }

  /**
   * Coupe la piste en cours sur `fonduS` secondes et relâche tout.
   *
   * Les références sont capturées AVANT d'être effacées, et la libération
   * passe par un timer LOCAL, hors de `arcadeTimers` : sans ça, la piste
   * suivante — qui vide la liste en démarrant — annulerait la libération de la
   * précédente et laisserait un `<audio>` orphelin en lecture.
   */
  private couperArcade(fonduS: number): void {
    this.arcadeGen++;
    this.arcadeTimers.forEach((t) => window.clearTimeout(t));
    this.arcadeTimers = [];
    const audio = this.arcadeAudio;
    const source = this.arcadeSource;
    const gain = this.arcadeGain;
    this.arcadeAudio = undefined;
    this.arcadeSource = undefined;
    this.arcadeGain = undefined;
    this.enCours.arcade = undefined;
    if (!audio) return;
    if (this.ctx && gain) {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fonduS);
    }
    window.setTimeout(
      () => {
        audio.pause();
        audio.src = "";
        try {
          source?.disconnect();
        } catch {
          /* ignore */
        }
        try {
          gain?.disconnect();
        } catch {
          /* ignore */
        }
      },
      Math.round(fonduS * 1000) + 20,
    );
  }

  /** Pousse un timer de borne dans la liste annulable. */
  private arcadeTimer(fn: () => void, ms: number): void {
    this.arcadeTimers.push(window.setTimeout(fn, ms));
  }

  /**
   * Fait glisser la vitesse de lecture de `depuis` vers `vers`.
   *
   * ÉCHELONNÉ À LA MAIN parce que `playbackRate` d'un `<audio>` est un simple
   * nombre et non un `AudioParam` : il n'a pas de rampe, on ne peut que le
   * reposer souvent. Dix pas suffisent à ce que l'oreille entende un glissando
   * et pas un escalier.
   */
  private glisserVitesse(depuis: number, vers: number, dureeMs: number): void {
    const audio = this.arcadeAudio;
    if (!audio) return;
    audio.playbackRate = depuis;
    const pas = 10;
    for (let i = 1; i <= pas; i++) {
      this.arcadeTimer(
        () => {
          // La piste a pu changer entre-temps : on ne règle jamais la vitesse
          // d'un élément qui n'est plus celui à l'écran.
          if (this.arcadeAudio !== audio) return;
          audio.playbackRate = depuis + (vers - depuis) * (i / pas);
        },
        (dureeMs * i) / pas,
      );
    }
  }

  /**
   * Programme le prochain accroc, à un moment tiré au hasard.
   *
   * LE HASARD EST LA RAISON D'ÊTRE DE CE CODE. Un glitch cuit dans le fichier
   * tomberait au même endroit à chaque tour de boucle et deviendrait une
   * signature reconnaissable en trois minutes — donc un défaut, plus un
   * accident. Tiré entre 12 et 30 s, il ne se répète jamais au même endroit
   * de la musique.
   */
  private programmerGlitch(): void {
    const delai =
      ARCADE_GLITCH_MIN_MS +
      Math.random() * (ARCADE_GLITCH_MAX_MS - ARCADE_GLITCH_MIN_MS);
    this.arcadeTimer(() => this.glitch(), delai);
  }

  /** Une grappe de micro-coupures, plus un dérapage de vitesse. */
  private glitch(): void {
    const audio = this.arcadeAudio;
    const gain = this.arcadeGain;
    if (!this.ctx || !audio || !gain) return;
    let t = this.ctx.currentTime;
    const coupures = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < coupures; i++) {
      // 20 à 60 ms : assez pour s'entendre, trop court pour qu'on croie à une
      // panne de lecture.
      const duree = 0.02 + Math.random() * 0.04;
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(VOLUME_BORNE_ARCADE, t + duree);
      t += duree + 0.04 + Math.random() * 0.08;
    }
    // Le son ACCROCHE, il ne fait pas que se taire : un blanc seul sonne comme
    // un fichier qui saute, une nappe de connecteur fatiguée traîne un peu.
    audio.playbackRate = 0.985;
    this.arcadeTimer(() => {
      if (this.arcadeAudio === audio) audio.playbackRate = 1;
    }, 120);
    this.programmerGlitch();
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
