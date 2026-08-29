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
const GAIN_CELEBRATION = 0.9;
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
    this._alea = Math.random;
  }

  /** Télécharge et décode l'échantillon ; un échec laisse le tic synthétisé en service. */
  _chargerTic() {
    if (!this._chargementTic) {
      const charger = (url, nom) => fetch(url)
        .then((rep) => { if (!rep.ok) throw new Error(`${nom} introuvable : ${rep.status}`); return rep.arrayBuffer(); })
        .then((donnees) => this.audioCtx.decodeAudioData(donnees));
      this._chargementTic = Promise.all([
        charger(URL_TIC, "tic").then((b) => { this._tic = b; }).catch((e) => { console.warn("tic échantillonné indisponible, tic synthétisé", e); }),
        charger(URL_CELEBRATION, "célébration").then((b) => { this._celebration = b; }).catch((e) => { console.warn("son de célébration indisponible", e); }),
      ]);
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

  /** Un picot de roulette : l'échantillon s'il est décodé, sinon le tic synthétisé. */
  _planifierTic(t) {
    if (this._tic) { this._planifierTicEchantillon(t); return; }
    this._planifierTicSynthese(t);
  }

  _planifierTicEchantillon(t) {
    const fin = SonRoulette._ticEchantillonSur(this.audioCtx, this._sortie(), this._tic, t, this._alea);
    this._retenirVoix(fin.src, fin.fin);
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
    for (const tic of r.instantsTics) {
      if (this._tic) SonRoulette._ticEchantillonSur(ctx, sortie, this._tic, tic.t, this._alea);
      else SonRoulette._ticSyntheseSur(ctx, sortie, tic.t);
    }
    if (r.instantCelebration !== null && r.instantCelebration !== undefined) {
      SonRoulette._celebrationSur(ctx, sortie, this._celebration, r.instantCelebration);
    }
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

  /** Oscillateur carré filtré, claquement sec — le secours. */
  _planifierTicSynthese(t) {
    const { osc, fin } = SonRoulette._ticSyntheseSur(this.audioCtx, this._sortie(), t);
    this._retenirVoix(osc, fin);
  }

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
    for (const tic of r.instantsTics) this._planifierTic(tDebutCtx + tic.t);
    if (r.instantCelebration !== null && r.instantCelebration !== undefined) {
      const v = SonRoulette._celebrationSur(this.audioCtx, this._sortie(), this._celebration, tDebutCtx + r.instantCelebration);
      if (v) this._retenirVoix(v.src, v.fin);
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

/** La promesse, ou un rejet si `ms` s'écoulent d'abord. */
function avecLimite(promesse, ms) {
  return Promise.race([promesse, new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("délai")), ms))]);
}
