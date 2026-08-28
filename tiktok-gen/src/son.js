/**
 * Son de la roulette : tics à chaque objet qui franchit le centre, ding sur
 * la cible. AudioContext créé au premier appel qui en a besoin (typiquement
 * `demarrer()`, appelé depuis un geste utilisateur — obligatoire sur iOS).
 * Sortie vers les haut-parleurs (ctx.destination) ET vers un flux
 * MediaStream (pour l'enregistreur de la Task 8), via un même GainNode
 * maître.
 */

const FREQ_TIC = 1800;
const DUREE_TIC = 0.035;
const PIC_TIC = 0.002;
const GAIN_TIC = 0.35;
const FREQ_FILTRE_TIC = 2200;
const Q_FILTRE_TIC = 6;

const FREQS_DING = [1320, 1980];
const DUREE_DING = 0.45;
// Chaque partiel pèse la moitié : les deux ensemble culminent à 0.25.
const GAIN_DING = 0.125;

const DUREE_FONDU_ACTIF = 0.01;

export class SonRoulette {
  constructor() {
    this.audioCtx = null;
    this.gainMaitre = null;
    this.destinationFlux = null;
    this._minuterie = null;
    this._active = true;
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
    await this.audioCtx.resume();
  }

  /** Un picot de roulette : oscillateur carré filtré, claquement sec. */
  _planifierTic(t) {
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
    gain.connect(this.gainMaitre);
    osc.start(t);
    osc.stop(t + DUREE_TIC);
  }

  /** Le ding de la cible : deux sinus qui décroissent ensemble. */
  _planifierDing(t) {
    const ctx = this.audioCtx;
    for (const freq of FREQS_DING) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(GAIN_DING, t);
      gain.gain.linearRampToValueAtTime(0, t + DUREE_DING);

      osc.connect(gain);
      gain.connect(this.gainMaitre);
      osc.start(t);
      osc.stop(t + DUREE_DING);
    }
  }

  /** Restaure le gain maître à l'état actif courant (utile après un arreter()). */
  _appliquerActif() {
    const t = this.audioCtx.currentTime;
    this.gainMaitre.gain.cancelScheduledValues(t);
    this.gainMaitre.gain.setValueAtTime(this._active ? 1 : 0, t);
  }

  /** Planifie tous les tics de r.instantsTics à tDebutCtx + t (un ding en plus sur la cible). */
  planifierTour(r, tDebutCtx) {
    this._assurerContexte();
    this._appliquerActif();
    for (const tic of r.instantsTics) {
      const t = tDebutCtx + tic.t;
      this._planifierTic(t);
      if (tic.estCible) this._planifierDing(t);
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

  /** Annule les timers et coupe le gain immédiatement. */
  arreter() {
    this._arreterMinuterie();
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
