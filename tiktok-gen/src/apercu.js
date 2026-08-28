/**
 * Aperçu animé : construit la scène à partir des réglages, tient la boucle
 * d'animation (rAF) et cale le son dessus. Module DOM/canvas, pas de tests
 * unitaires — la logique testable vit dans roulette.js et texte.js.
 */
import { calculerRoulette, estFlash, instantDessine, tempsBoucle, LARGEUR, HAUTEUR, CENTRE_X, CENTRE_Y } from "./roulette.js";
import { dessinerFrame } from "./rendu.js";
import { chargerImage } from "./images.js";
import { COULEURS } from "./theme.js";
import { FOND_PERSO, REGLAGES_DEFAUT } from "./reglages.js";

export const MESSAGE_INCOMPLET = "Choisis au moins 2 objets et une cible";

/** Avance de planification du son sur l'animation (s) : le temps de monter le graphe audio. */
const AVANCE_SON = 0.05;

/**
 * cfg dérivé des réglages, ou `null` si la sélection est incomplète (moins de
 * 2 objets connus du catalogue, ou pas de cible). Partagé avec l'interface,
 * qui s'en sert pour afficher durée et fenêtre de pause sans attendre les
 * images.
 */
export function construireCfg(reglages, catalogue) {
  const connus = Array.isArray(catalogue) ? new Set(catalogue.map((e) => e.id)) : null;
  const ids = (reglages.objets ?? []).filter((id) => !connus || connus.has(id));
  const cible = ids.includes(reglages.cible) ? reglages.cible : null;
  if (ids.length < 2 || cible === null) return null;
  return {
    ids,
    cible,
    cfg: {
      nbObjets: ids.length,
      indexCible: ids.indexOf(cible),
      vitesse: reglages.vitesse,
      espacement: reglages.espacement,
      nbPassages: reglages.nbPassages,
      largeurFlash: reglages.largeurFlash,
    },
  };
}

/** Roulette des réglages courants, ou `null` si la sélection est incomplète. */
export function roulettePour(reglages, catalogue) {
  const d = construireCfg(reglages, catalogue);
  return d ? calculerRoulette(d.cfg) : null;
}

export class Apercu {
  #canvas; #ctx; #cache; #son;
  #scene = null; #r = null; #cfg = null;
  #raf = null; #t0 = 0;
  #jeton = 0;            // n° du dernier chargement lancé : les plus vieux sont ignorés.
  #badges = null;        // promesse mémoïsée des deux badges de l'overlay.

  /** Passé à vrai par l'interface une fois `son.demarrer()` résolu (geste utilisateur). */
  sonDemarre = false;

  constructor(canvas, cache, son) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
    this.#cache = cache;
    this.#son = son;
  }

  get r() { return this.#r; }
  get cfg() { return this.#cfg; }
  get scene() { return this.#scene; }

  #chargerBadges() {
    if (!this.#badges) {
      this.#badges = Promise.all([
        chargerImage("assets/badges/app-store.svg"),
        chargerImage("assets/badges/google-play.png"),
      ]).then(([appStore, googlePlay]) => ({ appStore, googlePlay }));
    }
    return this.#badges;
  }

  /**
   * Reconstruit cfg/r/scene depuis les réglages. Pendant les chargements, la
   * scène précédente reste affichée (pas de clignotement). Si la sélection est
   * incomplète, affiche le message d'invite et renvoie { cfg: null, r: null }.
   * Lève si une image manque : l'appelant décide quoi en dire.
   */
  async charger(reglages, catalogue) {
    const jeton = ++this.#jeton;

    const donnees = construireCfg(reglages, catalogue);

    if (donnees === null) {
      this.#scene = null; this.#r = null; this.#cfg = null;
      this.#dessinerInvite();
      this.#son.arreter();   // sinon la roulette d'avant continue de tictaquer dans le vide.
      return { cfg: null, r: null };
    }

    const { ids, cible, cfg } = donnees;
    const r = calculerRoulette(cfg);

    const nomFond = reglages.fond === FOND_PERSO
      ? (reglages.fondPerso || REGLAGES_DEFAUT.fond)
      : reglages.fond;

    const [fond, objets, silhouette, badges] = await Promise.all([
      this.#cache.fondPrepare(nomFond, reglages.flou),
      Promise.all(ids.map((id) => this.#cache.objet(id))),
      this.#cache.silhouette(cible, reglages.liseret),
      this.#chargerBadges(),
    ]);

    if (jeton !== this.#jeton) return { cfg: this.#cfg, r: this.#r }; // un chargement plus récent a pris la main.

    this.#cfg = cfg;
    this.#r = r;
    const entreeCible = catalogue.find((e) => e.id === cible);
    this.#scene = {
      r, cfg, fond, objets, silhouette, badges,
      // Pour la légende du flash : la cible, et combien d'autres objets l'attendent dans le jeu.
      cible: { nom: entreeCible?.nom ?? cible, prix: entreeCible?.prix ?? 0 },
      nbAutres: Math.max(0, catalogue.length - 1),
      textes: { sousTitre: reglages.sousTitre, autres: reglages.texteAutres, dispo: reglages.texteDispo },
    };

    // Le son était planifié pour l'ancienne roulette : on repart de zéro, ensemble.
    if (this.#raf !== null) this.#relancer();
    return { cfg, r };
  }

  /** Une frame à l'instant t (secondes), repliée sur la durée de la boucle. */
  dessinerA(t) {
    if (!this.#scene) { this.#dessinerInvite(); return; }
    const tb = tempsBoucle(t, this.#r);
    dessinerFrame(this.#ctx, instantDessine(tb, this.#r), { ...this.#scene, flashActif: estFlash(tb, this.#r) });
  }

  #dessinerInvite() {
    const ctx = this.#ctx;
    ctx.save();
    ctx.fillStyle = COULEURS.nuit;
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    ctx.fillStyle = COULEURS.laitonClair;
    ctx.font = "56px Cinzel";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(MESSAGE_INCOMPLET, CENTRE_X, CENTRE_Y, LARGEUR - 120);
    ctx.restore();
  }

  /** (Re)cale l'origine des temps et replanifie le son sur la roulette courante. */
  #relancer() {
    this.#t0 = performance.now() + AVANCE_SON * 1000;
    if (!this.sonDemarre) return;
    if (this.#r) this.#son.planifierBoucleInfinie(this.#r, this.#son.tempsContexte + AVANCE_SON);
    else this.#son.arreter();   // plus de roulette : rien à jouer.
  }

  jouer() {
    if (this.#raf !== null) { this.#relancer(); return; }
    this.#relancer();
    const boucle = (maintenant) => {
      this.dessinerA((maintenant - this.#t0) / 1000);
      this.#raf = requestAnimationFrame(boucle);
    };
    this.#raf = requestAnimationFrame(boucle);
  }

  arreter() {
    if (this.#raf !== null) { cancelAnimationFrame(this.#raf); this.#raf = null; }
    this.#son.arreter();
  }
}
