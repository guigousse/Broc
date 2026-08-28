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
    this._alea = Math.random;
  }

  /** Télécharge et décode l'échantillon ; un échec laisse le tic synthétisé en service. */
  _chargerTic() {
    if (!this._chargementTic) {
      this._chargementTic = fetch(URL_TIC)
        .then((rep) => { if (!rep.ok) throw new Error(`tic introuvable : ${rep.status}`); return rep.arrayBuffer(); })
        .then((donnees) => this.audioCtx.decodeAudioData(donnees))
        .then((buffer) => { this._tic = buffer; })
        .catch((e) => { console.warn("tic échantillonné indisponible, tic synthétisé", e); });
    }
    return this._chargementTic;
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
    const ctx = this.audioCtx;
    const src = ctx.createBufferSource();
    src.buffer = this._tic;
    src.playbackRate.value = 1 + (this._alea() * 2 - 1) * VARIATION_HAUTEUR;
    const gain = ctx.createGain();
    gain.gain.value = GAIN_ECHANTILLON * (VOLUME_MINI + this._alea() * (1 - VOLUME_MINI));
    src.connect(gain);
    gain.connect(this._sortie());
    const fin = t + this._tic.duration / src.playbackRate.value;
    src.start(t);
    src.stop(fin);
    this._retenirVoix(src, fin);
  }

  /** Oscillateur carré filtré, claquement sec — le secours. */
  _planifierTicSynthese(t) {
    const ctx = this.audioCtx;
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
    gain.connect(this._sortie());
    osc.start(t);
    osc.stop(t + DUREE_TIC);
    this._retenirVoix(osc, t + DUREE_TIC);
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
