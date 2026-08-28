/** Logique pure de la roulette : aucune dépendance au DOM. Temps en secondes. */
export const LARGEUR = 1080, HAUTEUR = 1920, CENTRE_X = 540, CENTRE_Y = 960;
/** Hauteur de dessin des objets (et de la silhouette), en px du cadre. */
export const HAUTEUR_OBJET = 420;
export const FPS = 30;

export const TYPES_VIDEO = ["pause", "ralentie"];
/** Exposant de la décélération : s(u) = A·(1 − (1 − u)³) — départ 3× plus vite que la moyenne, arrêt en douceur. */
const EXPOSANT_RALENTI = 3;

/** Aiguillage sur `cfg.type` (défaut : « pause », la roulette régulière qui boucle). */
export function calculerPour(cfg) {
  return cfg.type === "ralentie" ? calculerRouletteRalentie(cfg) : calculerRoulette(cfg);
}

/**
 * Roulette « Mets pause » : défilement régulier, la cible passe `nbPassages`
 * fois au centre, la vidéo boucle. `avancement(t)` = px parcourus par la bande.
 */
export function calculerRoulette({ nbObjets, indexCible, vitesse, espacement, nbPassages, largeurFlash = 4 }) {
  const periodeTour = nbObjets / vitesse;
  const duree = nbPassages * periodeTour;
  const vitessePx = vitesse * espacement;
  const longueurBande = nbObjets * espacement;
  const avancement = (t) => vitessePx * t;
  const decalage = nbObjets / 2;
  const instantsCentrage = Array.from({ length: nbPassages }, (_, k) => (k + 0.5) * periodeTour);
  const instantsTics = [];
  for (let k = 0; k < nbPassages; k++) {
    for (let i = 0; i < nbObjets; i++) {
      const rang = ((i - indexCible + decalage) % nbObjets + nbObjets) % nbObjets;
      instantsTics.push({ t: rang / vitesse + k * periodeTour, index: i, estCible: i === indexCible });
    }
  }
  instantsTics.sort((a, b) => a.t - b.t);
  const demiFlash = largeurFlash / 2 / FPS;
  return {
    type: "pause", periodeTour, duree, vitessePx, longueurBande, avancement, instantsCentrage, instantsTics,
    demiFlash, fenetrePauseMs: (largeurFlash / FPS) * 1000, geleAuFlash: true, arretDepuis: null, instantCelebration: null,
  };
}

/**
 * Roulette « qui ralentit » : très vite au départ, décélération continue
 * jusqu'à l'arrêt exact de la cible au centre après `nbTours` tours complets,
 * puis `arretFinal` s d'image fixe (flash permanent). Ne boucle pas.
 *
 * Convention de position (voir positionsA) : la cible est au centre quand
 * avancement ≡ L/2 (mod L). L'avancement final vaut donc L/2 + nbTours·L, et
 * s(t) = A_fin · (1 − (1 − t/T)^3) sur [0, T], constant ensuite.
 * L'objet i franchit le centre quand s = d_i + m·L : t = T·(1 − (1 − s/A_fin)^(1/3)).
 */
export function calculerRouletteRalentie({ nbObjets, indexCible, espacement, nbTours, dureeDefilement, arretFinal, largeurFlash = 4 }) {
  const longueurBande = nbObjets * espacement;
  const T = dureeDefilement;
  const avancementFinal = longueurBande / 2 + nbTours * longueurBande;
  const avancement = (t) => {
    const u = Math.min(1, Math.max(0, t / T));
    return avancementFinal * (1 - (1 - u) ** EXPOSANT_RALENTI);
  };
  const instantPour = (s) => T * (1 - (1 - s / avancementFinal) ** (1 / EXPOSANT_RALENTI));
  const instantsTics = [];
  const instantsCentrage = [];
  for (let i = 0; i < nbObjets; i++) {
    const d_i = (i - indexCible + nbObjets / 2) * espacement;
    for (let m = 0; ; m++) {
      const s = d_i + m * longueurBande;
      if (s < 0) continue;
      if (s > avancementFinal + 1e-9) break;
      const t = Math.min(T, instantPour(Math.min(s, avancementFinal)));
      const estCible = i === indexCible;
      instantsTics.push({ t, index: i, estCible });
      if (estCible) instantsCentrage.push(t);
    }
  }
  instantsTics.sort((a, b) => a.t - b.t);
  const duree = T + arretFinal;
  const demiFlash = largeurFlash / 2 / FPS;
  return {
    type: "ralentie", periodeTour: T, duree, vitessePx: (EXPOSANT_RALENTI * avancementFinal) / T, longueurBande,
    avancement, instantsCentrage, instantsTics, demiFlash, fenetrePauseMs: arretFinal * 1000,
    geleAuFlash: false, arretDepuis: T, instantCelebration: T,
  };
}

export function positionsA(t, r, { nbObjets, indexCible, espacement }) {
  const L = r.longueurBande;
  const out = [];
  for (let i = 0; i < nbObjets; i++) {
    // Décalage de l'objet i par rapport à la cible, replié dans [−L/2, L/2).
    // vitessePx·t croît avec le temps (la bande avance vers la droite) ; on en
    // retranche la distance de départ de l'objet i pour que rel s'annule (mod L)
    // exactement à ses instants de centrage (voir la convention de calculerRoulette :
    // vitessePx·t ≡ espacement·rang (mod L) à ces instants, qui est aussi la valeur
    // de d_i mod L — donc rel ≡ 0 (mod L) pile à t = rang/vitesse + k·periodeTour).
    const d_i = (i - indexCible + nbObjets / 2) * espacement;
    let rel = r.avancement(t) - d_i;
    rel = (((rel + L / 2) % L) + L) % L - L / 2;
    out.push({ index: i, x: CENTRE_X + rel });
  }
  return out;
}

/**
 * Tous les exemplaires visibles de la bande à l'instant t : les positions de
 * `positionsA` (repliées dans [−L/2, L/2)) plus leurs copies à x ± longueurBande.
 * Quand la bande est courte (peu d'objets très espacés), le pli du repli tombe à
 * l'intérieur du cadre : sans les copies, un objet disparaîtrait d'un bord de
 * l'écran pour réapparaître à l'autre. Un même `index` peut donc sortir deux fois,
 * à deux x différents. Ne sont renvoyés que les x à `marge` du centre : l'appelant
 * n'a plus rien à filtrer.
 */
export function positionsVisibles(t, r, cfg, marge = LARGEUR / 2 + cfg.espacement) {
  const out = [];
  for (const { index, x } of positionsA(t, r, cfg)) {
    for (const dx of [0, -r.longueurBande, r.longueurBande]) {
      const xv = x + dx;
      if (Math.abs(xv - CENTRE_X) <= marge) out.push({ index, x: xv });
    }
  }
  return out;
}

export function estFlash(t, r) {
  const tb = tempsBoucle(t, r);
  if (r.arretDepuis !== null && r.arretDepuis !== undefined && tb >= r.arretDepuis) return true;   // image finale
  return r.instantsCentrage.some((c) => Math.abs(tb - c) <= r.demiFlash);
}

/**
 * L'instant à DESSINER pour l'instant t : pendant le flash, la roulette est
 * gelée sur le calage exact (la cible pile au centre, une vraie « pause ») ;
 * sinon t replié sur la boucle. Sans ce gel, la bande continue d'avancer
 * pendant les ~130 ms du flash et la cible dérive de plusieurs dizaines de px.
 */
export function instantDessine(t, r) {
  const tb = tempsBoucle(t, r);
  if (r.geleAuFlash === false) return tb;   // roulette qui ralentit : elle continue sous le flash, l'arrêt final est déjà immobile.
  const c = r.instantsCentrage.find((x) => Math.abs(tb - x) <= r.demiFlash);
  return c === undefined ? tb : c;
}

/** Apparition de l'aura (s) puis période de sa respiration (s) — mêmes valeurs que le jeu. */
export const AURA_APPARITION = 0.42, AURA_PERIODE = 1.6;

/**
 * L'aura pristine à `dt` secondes après l'arrêt de la cible : { opacite, echelle }.
 * Avant l'arrêt : rien. Puis montée en 420 ms (0 → 0,8, échelle 0,7 → 1,2),
 * puis respiration entre (0,8 ; ×1,2) et (1 ; ×1,34) sur 1,6 s — copie des
 * keyframes `boite-aura` / `boite-aura-pulse` du jeu.
 */
export function aura(dt) {
  if (!(dt >= 0)) return { opacite: 0, echelle: 0 };
  if (dt < AURA_APPARITION) {
    const u = dt / AURA_APPARITION;
    const e = 1 - (1 - u) ** 2;   // ease-out
    return { opacite: 0.8 * e, echelle: 0.7 + 0.5 * e };
  }
  const phase = ((dt - AURA_APPARITION) % AURA_PERIODE) / AURA_PERIODE;
  const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);   // 0 → 1 → 0, doux
  return { opacite: 0.8 + 0.2 * w, echelle: 1.2 + 0.14 * w };
}

/**
 * L'instant « fin » à montrer dans l'éditeur de texte : la cible posée sur la
 * silhouette avec l'overlay. Roulette qui boucle : le premier calage. Roulette
 * qui ralentit : pendant l'arrêt final, l'aura au plus fort.
 */
export function instantFin(r) {
  if (r.arretDepuis === null || r.arretDepuis === undefined) return r.instantsCentrage[0];
  return Math.min(r.duree - 1e-3, r.arretDepuis + AURA_APPARITION + AURA_PERIODE / 2);
}

export function tempsBoucle(t, r) {
  return ((t % r.duree) + r.duree) % r.duree;
}
