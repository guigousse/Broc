/** Logique pure de la roulette : aucune dépendance au DOM. Temps en secondes. */
export const LARGEUR = 1080, HAUTEUR = 1920, CENTRE_X = 540, CENTRE_Y = 960;
export const FPS = 30;

export function calculerRoulette({ nbObjets, indexCible, vitesse, espacement, nbPassages, largeurFlash = 4 }) {
  const periodeTour = nbObjets / vitesse;
  const duree = nbPassages * periodeTour;
  const vitessePx = vitesse * espacement;
  const longueurBande = nbObjets * espacement;
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
    periodeTour, duree, vitessePx, longueurBande, instantsCentrage, instantsTics,
    demiFlash, fenetrePauseMs: (largeurFlash / FPS) * 1000,
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
    let rel = r.vitessePx * t - d_i;
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
  return r.instantsCentrage.some((c) => Math.abs(tb - c) <= r.demiFlash);
}

export function tempsBoucle(t, r) {
  return ((t % r.duree) + r.duree) % r.duree;
}
