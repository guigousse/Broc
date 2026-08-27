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
    // Le signe « + vitessePx·t » fait avancer la bande vers la droite (gauche → droite),
    // conformément à la convention de centrage de calculerRoulette.
    let rel = (i - indexCible + nbObjets / 2) * espacement + r.vitessePx * t;
    rel = (((rel + L / 2) % L) + L) % L - L / 2;
    out.push({ index: i, x: CENTRE_X + rel });
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
