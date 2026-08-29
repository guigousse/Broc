/**
 * Son de la roulette : un tic à chaque objet qui franchit le centre — la cible
 * comprise, sans ding : le calage se voit, il ne s'entend pas.
 *
 * Le tic est un ÉCHANTILLON (`assets/sons/tic.wav`, une languette de roue de
 * la fortune sur un picot), chargé dans `demarrer()`. Tant qu'il n'est pas
 * décodé, un tic synthétisé prend le relais — jamais de silence.
 *
 * AudioContext créé au premier appel qui en a besoin (typiquement
 * `demarrer()`, appelé depuis un geste utilisateur — obligatoire sur iOS).
 * Sortie vers les haut-parleurs (ctx.destination) ET vers un flux
 * MediaStream (pour l'enregistreur), via un même GainNode maître.
 */

export const URL_TIC = "assets/sons/tic.wav";
/** Son de célébration à l'arrêt de la cible : la « magie » du pristin, reprise du jeu. */
export const URL_CELEBRATION = "assets/sons/celebration.mp3";
/** Les échantillons de « Devine le prix », repris du jeu (cash, carillon du Bazar, papier, jazz 33 tours). */
export const ECHANTILLONS = Object.freeze({
  tic: URL_TIC, celebration: URL_CELEBRATION,
  cash: "assets/sons/cash.mp3", carillon: "assets/sons/carillon.mp3", pop: "assets/sons/pop.mp3", jazz: "assets/sons/jazz.m4a",
});
/** Gain de chaque échantillon joué tel quel (le tic a le sien, variable). */
const GAINS = Object.freeze({ celebration: 0.9, eclat: 0.7, cash: 0.9, carillon: 0.7, pop: 0.45, musique: 0.13 });
const GAIN_CELEBRATION = GAINS.celebration;
const GAIN_ECHANTILLON = 0.8;
/** Chaque tic diffère un peu du voisin (hauteur ±4 %, volume 85–100 %) : sans ça, mitrailleuse. */
const VARIATION_HAUTEUR = 0.04;
const VOLUME_MINI = 0.85;

// Tic de secours, synthétisé, tant que l'échantillon n'est pas décodé.
const FREQ_TIC = 1800;
const DUREE_TIC = 0.035;
const PIC_TIC = 0.002;
const GAIN_TIC = 0.35;
const FREQ_FILTRE_TIC = 2200;
const Q_FILTRE_TIC = 6;

const DUREE_FONDU_ACTIF = 0.01;

export class SonRoulette {
  constructor() {
    this.audioCtx = null;
    this.gainMaitre = null;
    this.destinationFlux = null;
    this._minuterie = null;
    this._active = true;
    // Voix du plan courant : { osc, fin }. Sans elles, `arreter()` ne ferait
    // que couper la minuterie — les oscillateurs déjà programmés joueraient.
    this._voix = [];
    // Gain propre au plan courant : le débrancher rend le silence immédiat.
    this._sortiePlan = null;
    // AudioBuffer du tic, une fois décodé ; et la promesse de son chargement (une seule fois).
    this._tic = null;
    this._chargementTic = null;
    this._celebration = null;
    // Tous les échantillons décodés, par nom (tic et célébration y sont aussi).
    this._echantillons = {};
    this._alea = Math.random;
  }

  /** Télécharge et décode l'échantillon ; un échec laisse le tic synthétisé en service. */
  _chargerTic() {
    if (!this._chargementTic) {
      const charger = (url, nom) => fetch(url)
        .then((rep) => { if (!rep.ok) throw new Error(`${nom} introuvable : ${rep.status}`); return rep.arrayBuffer(); })
        .then((donnees) => this.audioCtx.decodeAudioData(donnees));
      this._chargementTic = Promise.all(Object.entries(ECHANTILLONS).map(([nom, url]) =>
        charger(url, nom).then((b) => {
          this._echantillons[nom] = b;
          if (nom === "tic") this._tic = b;
          if (nom === "celebration") this._celebration = b;
        }).catch((e) => { console.warn(`échantillon « ${nom} » indisponible`, e); })));
    }
    return this._chargementTic;
  }

  /** L'échantillon de célébration, sur n'importe quel contexte. → { src, fin } ou null s'il n'est pas chargé. */
  static _celebrationSur(ctx, sortie, buffer, t) {
    if (!buffer) return null;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = GAIN_CELEBRATION;
    src.connect(gain); gain.connect(sortie);
    src.start(t);
    return { src, fin: t + buffer.duration };
  }

  /** Crée le contexte et le graphe audio s'ils n'existent pas déjà. */
  _assurerContexte() {
    if (this.audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new Ctx();
    this.gainMaitre = this.audioCtx.createGain();
    this.gainMaitre.gain.value = 1;
    this.destinationFlux = this.audioCtx.createMediaStreamDestination();
    this.gainMaitre.connect(this.audioCtx.destination);
    this.gainMaitre.connect(this.destinationFlux);
  }

  /** MediaStreamAudioDestinationNode, pour que l'enregistreur capture le son. */
  get destination() {
    this._assurerContexte();
    return this.destinationFlux;
  }

  /** ctx.currentTime, ou 0 si le contexte n'est pas encore créé. */
  get tempsContexte() {
    return this.audioCtx ? this.audioCtx.currentTime : 0;
  }

  async demarrer() {
    this._assurerContexte();
    await Promise.all([this.audioCtx.resume(), this._chargerTic()]);
  }

  /** Gain du plan courant, créé à la demande : toutes les voix s'y branchent. */
  _sortie() {
    if (!this._sortiePlan) {
      this._sortiePlan = this.audioCtx.createGain();
      this._sortiePlan.gain.value = 1;
      this._sortiePlan.connect(this.gainMaitre);
    }
    return this._sortiePlan;
  }

  /** Retient une voix pour pouvoir la faire taire, et oublie celles qui ont fini. */
  _retenirVoix(osc, fin) {
    const t = this.audioCtx.currentTime;
    if (this._voix.length > 256) this._voix = this._voix.filter((v) => v.fin > t);
    this._voix.push({ osc, fin });
  }

  /**
   * Coupe le plan courant : arrête les oscillateurs déjà programmés et
   * débranche leur gain. Sans ça, replanifier (chaque `input` d'un curseur)
   * empilerait des tours qui se marchent dessus.
   */
  _purgerPlan() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    for (const { osc } of this._voix) {
      try { osc.stop(t); } catch { /* déjà arrêté */ }
      try { osc.disconnect(); } catch { /* déjà débranché */ }
    }
    this._voix = [];
    if (this._sortiePlan) {
      this._sortiePlan.gain.cancelScheduledValues(t);
      this._sortiePlan.gain.setValueAtTime(0, t);
      this._sortiePlan.disconnect();
      this._sortiePlan = null;
    }
  }

  /** L'échantillon sur n'importe quel contexte (temps réel ou hors ligne). → { src, fin } */
  static _ticEchantillonSur(ctx, sortie, buffer, t, alea) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 1 + (alea() * 2 - 1) * VARIATION_HAUTEUR;
    const gain = ctx.createGain();
    gain.gain.value = GAIN_ECHANTILLON * (VOLUME_MINI + alea() * (1 - VOLUME_MINI));
    src.connect(gain);
    gain.connect(sortie);
    const fin = t + buffer.duration / src.playbackRate.value;
    src.start(t);
    src.stop(fin);
    return { src, fin };
  }

  /**
   * Le son d'un tour complet, rendu hors ligne : un AudioBuffer mono de
   * `r.duree` s, prêt à être encodé. Ne joue rien, n'exige aucun geste
   * utilisateur ; l'échantillon est chargé si besoin (via le contexte temps
   * réel, seul à savoir décoder — il peut rester suspendu pour ça).
   */
  async rendreHorsLigne(r, frequence = 48000) {
    this._assurerContexte();
    await this._chargerTic();
    const nb = Math.max(1, Math.round(r.duree * frequence));
    const ctx = new OfflineAudioContext(1, nb, frequence);
    const sortie = ctx.createGain();
    sortie.connect(ctx.destination);
    for (const ev of evenementsSon(r)) this._jouerSur(ctx, sortie, ev, ev.t);
    // La promesse ET l'événement `complete` : sur iOS, l'un des deux a déjà été vu muet.
    return new Promise((resoudre, rejeter) => {
      ctx.oncomplete = (e) => resoudre(e.renderedBuffer);
      ctx.startRendering().then(resoudre, rejeter);
    });
  }

  /** L'état du contexte temps réel (« interrupted » sur iOS après une autre app audio), ou null. */
  get etat() { return this.audioCtx ? this.audioCtx.state : null; }

  /** Tente de sortir d'une interruption iOS ; ne lève jamais. */
  async reprendre() {
    if (!this.audioCtx || this.audioCtx.state === "running") return;
    try { await avecLimite(this.audioCtx.resume(), 2000); } catch { /* on rend quand même */ }
  }

  /**
   * Joue un événement sonore à `t` sur n'importe quel contexte (temps réel ou
   * hors ligne). → { src|osc, fin } ou null. Échantillon manquant : synthèse
   * pour le tic, silence pour les autres (jamais d'erreur).
   */
  _jouerSur(ctx, sortie, ev, t) {
    const ech = this._echantillons;
    switch (ev.type) {
      case "tic":
        return this._tic ? SonRoulette._ticEchantillonSur(ctx, sortie, this._tic, t, this._alea) : SonRoulette._ticSyntheseSur(ctx, sortie, t);
      case "celebration": return SonRoulette._celebrationSur(ctx, sortie, this._celebration, t);
      case "eclat": return SonRoulette._echantillonSur(ctx, sortie, ech.celebration, t, GAINS.eclat);
      case "cash": return SonRoulette._echantillonSur(ctx, sortie, ech.cash, t, GAINS.cash);
      case "carillon": return SonRoulette._echantillonSur(ctx, sortie, ech.carillon, t, GAINS.carillon);
      case "pop": return SonRoulette._echantillonSur(ctx, sortie, ech.pop, t, GAINS.pop);
      case "musique": return SonRoulette._musiqueSur(ctx, sortie, ech.jazz, t, ev.duree);
      case "whoosh": return SonRoulette._whooshSur(ctx, sortie, t, ev.duree ?? 0.35);
      case "impact": return SonRoulette._impactSur(ctx, sortie, t);
      case "riser": return SonRoulette._riserSur(ctx, sortie, t, ev.duree ?? 3);
      case "sting": return SonRoulette._stingSur(ctx, sortie, t);
      default: return null;
    }
  }

  /** Un échantillon tel quel, au gain donné. */
  static _echantillonSur(ctx, sortie, buffer, t, gainV) {
    if (!buffer) return null;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const gain = ctx.createGain(); gain.gain.value = gainV;
    src.connect(gain); gain.connect(sortie);
    src.start(t);
    return { src, fin: t + buffer.duration };
  }

  /** Le lit musical : l'échantillon (bouclé si trop court) de t à t + duree, fondu de sortie sur la dernière seconde. */
  static _musiqueSur(ctx, sortie, buffer, t, duree) {
    if (!buffer || !(duree > 0)) return null;
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(GAINS.musique, t);
    gain.gain.setValueAtTime(GAINS.musique, t + Math.max(0, duree - 1));
    gain.gain.linearRampToValueAtTime(0, t + duree);
    src.connect(gain); gain.connect(sortie);
    src.start(t); src.stop(t + duree);
    return { src, fin: t + duree };
  }

  /** Bruit blanc de `duree` s, une source par appel. */
  static _bruitSur(ctx, duree) {
    const n = Math.max(1, Math.round(duree * ctx.sampleRate));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let x = 0x9E3779B9;   // bruit déterministe : même rendu à chaque export
    for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; d[i] = ((x >>> 0) / 4294967296) * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    return src;
  }

  /** Souffle qui monte : bruit passe-bande balayé 300 → 3000 Hz, gonfle puis meurt sur l'impact. */
  static _whooshSur(ctx, sortie, t, duree) {
    const src = SonRoulette._bruitSur(ctx, duree + 0.05);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + duree);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + duree * 0.85); g.gain.linearRampToValueAtTime(0, t + duree);
    src.connect(f); f.connect(g); g.connect(sortie);
    src.start(t); src.stop(t + duree + 0.05);
    return { src, fin: t + duree + 0.05 };
  }

  /** Coup sourd : sinus 90 → 35 Hz en 0,35 s, plus un claquement de bruit de 40 ms. */
  static _impactSur(ctx, sortie, t) {
    const osc = ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(90, t); osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.95, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g); g.connect(sortie);
    osc.start(t); osc.stop(t + 0.42);
    const clac = SonRoulette._bruitSur(ctx, 0.05);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.6, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    clac.connect(f); f.connect(g2); g2.connect(sortie);
    clac.start(t); clac.stop(t + 0.06);
    return { osc, fin: t + 0.42 };
  }

  /** Tension qui monte pendant le compte : bruit passe-bande 400 → 4000 Hz, gain 0 → 0,3, coupé net à la fin. */
  static _riserSur(ctx, sortie, t, duree) {
    const src = SonRoulette._bruitSur(ctx, duree + 0.02);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.5;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(4000, t + duree);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + duree); g.gain.setValueAtTime(0, t + duree + 0.001);
    src.connect(f); f.connect(g); g.connect(sortie);
    src.start(t); src.stop(t + duree + 0.02);
    return { src, fin: t + duree + 0.02 };
  }

  /** Deux notes qui montent (sol → do), en triangle, chacune 180 ms : la question posée. */
  static _stingSur(ctx, sortie, t) {
    const notes = [[392, 0], [523.25, 0.18]];
    let osc0 = null;
    for (const [freq, dt] of notes) {
      const osc = ctx.createOscillator(); osc.type = "triangle"; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.35, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.45);
      osc.connect(g); g.connect(sortie);
      osc.start(t + dt); osc.stop(t + dt + 0.5);
      osc0 ??= osc;
    }
    return { osc: osc0, fin: t + 0.7 };
  }

  /** Oscillateur carré filtré, claquement sec — le secours. */
  static _ticSyntheseSur(ctx, sortie, t) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = FREQ_TIC;

    const filtre = ctx.createBiquadFilter();
    filtre.type = "bandpass";
    filtre.frequency.value = FREQ_FILTRE_TIC;
    filtre.Q.value = Q_FILTRE_TIC;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(GAIN_TIC, t + PIC_TIC);
    gain.gain.linearRampToValueAtTime(0, t + DUREE_TIC);

    osc.connect(filtre);
    filtre.connect(gain);
    gain.connect(sortie);
    osc.start(t);
    osc.stop(t + DUREE_TIC);
    return { osc, fin: t + DUREE_TIC };
  }

  /** Restaure le gain maître à l'état actif courant (utile après un arreter()). */
  _appliquerActif() {
    const t = this.audioCtx.currentTime;
    this.gainMaitre.gain.cancelScheduledValues(t);
    this.gainMaitre.gain.setValueAtTime(this._active ? 1 : 0, t);
  }

  /** Planifie tous les tics de r.instantsTics à tDebutCtx + t (la cible tique comme les autres). */
  planifierTour(r, tDebutCtx) {
    this._assurerContexte();
    this._appliquerActif();
    for (const ev of evenementsSon(r)) {
      const v = this._jouerSur(this.audioCtx, this._sortie(), ev, tDebutCtx + ev.t);
      if (v) this._retenirVoix(v.src ?? v.osc, v.fin);
    }
  }

  /**
   * Planifie le tour courant (un tour = un passage complet de
   * r.instantsTics, de durée r.duree) tout de suite, puis un seul
   * setInterval(r.duree × 1000) qui, à chaque déclenchement, planifie le
   * tour suivant — la planification garde ainsi toujours un tour d'avance
   * sur la lecture, sans jamais tout planifier d'un coup ni recourir à un
   * setTimeout par tic. Si l'intervalle se déclenche en retard (onglet mis
   * en pause), le début du tour suivant est ramené au présent plutôt que
   * planifié dans le passé.
   */
  planifierBoucleInfinie(r, tDebutCtx) {
    this._assurerContexte();
    this._arreterMinuterie();
    this._purgerPlan();          // le plan précédent se tait avant que le nouveau parle.
    this.planifierTour(r, tDebutCtx);
    let tour = 0;
    this._minuterie = setInterval(() => {
      tour++;
      const tDebut = tDebutCtx + tour * r.duree;
      this.planifierTour(r, Math.max(tDebut, this.audioCtx.currentTime));
    }, r.duree * 1000);
  }

  _arreterMinuterie() {
    if (this._minuterie !== null) {
      clearInterval(this._minuterie);
      this._minuterie = null;
    }
  }

  /** Annule les timers, fait taire les voix déjà programmées et coupe le gain. */
  arreter() {
    this._arreterMinuterie();
    this._purgerPlan();
    if (this.gainMaitre && this.audioCtx) {
      const t = this.audioCtx.currentTime;
      this.gainMaitre.gain.cancelScheduledValues(t);
      this.gainMaitre.gain.setValueAtTime(0, t);
    }
  }

  /** Coupe ou rétablit le son sans toucher à la planification. */
  set active(actif) {
    this._active = actif;
    if (!this.gainMaitre || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    this.gainMaitre.gain.cancelScheduledValues(t);
    this.gainMaitre.gain.setValueAtTime(this.gainMaitre.gain.value, t);
    this.gainMaitre.gain.linearRampToValueAtTime(actif ? 1 : 0, t + DUREE_FONDU_ACTIF);
  }
}

/** Les instants de célébration d'un tour : `instantsCelebration` (série) ou l'unique `instantCelebration`. */
export function instantsCelebration(r) {
  if (Array.isArray(r.instantsCelebration)) return r.instantsCelebration;
  return r.instantCelebration === null || r.instantCelebration === undefined ? [] : [r.instantCelebration];
}

/**
 * La partition d'un tour : `r.evenementsSon` si le type l'a composée (Devine le
 * prix), sinon les tics et célébrations des roulettes, triés. Pure.
 */
export function evenementsSon(r) {
  if (Array.isArray(r.evenementsSon)) return r.evenementsSon;
  const out = r.instantsTics.map((x) => ({ t: x.t, type: "tic" }));
  for (const t of instantsCelebration(r)) out.push({ t, type: "celebration" });
  return out.sort((a, b) => a.t - b.t);
}

/** La promesse, ou un rejet si `ms` s'écoulent d'abord. */
function avecLimite(promesse, ms) {
  return Promise.race([promesse, new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("délai")), ms))]);
}
