/**
 * Logique pure du type « Devine le prix » : une série d'objets, chacun
 * apparaît, un compte à rebours laisse deviner son prix, puis le prix est
 * révélé. Même contrat de sortie que les roulettes (`duree`, `instantsTics`,
 * `arretDepuis`, …) pour que l'aperçu, le son et l'encodeur n'aient rien à
 * savoir de plus. Temps en secondes, aucune dépendance au DOM.
 */

/** Durée de l'apparition d'un objet (zoom + fondu). */
export const APPARITION = 0.5;
/** Temps, après la dernière révélation, où l'étiquette a fini de rebondir : l'image « fin ». */
export const REBOND = 0.8;

export function calculerDevine({ nbObjets, dureeCompte, dureeRevele, dernierMystere = false }) {
  const dureeObjet = APPARITION + dureeCompte + dureeRevele;
  const etapes = [];
  const instantsTics = [];
  const instantsCelebration = [];
  for (let i = 0; i < nbObjets; i++) {
    const debut = i * dureeObjet;
    const compte = debut + APPARITION;
    const revelation = compte + dureeCompte;
    const mystere = dernierMystere && i === nbObjets - 1;
    etapes.push({ index: i, debut, compte, revelation, fin: debut + dureeObjet, mystere });
    // Un tic par chiffre : 3, 2, 1… (ceil(dureeCompte) chiffres, le dernier avant la révélation).
    for (let k = 0; k < dureeCompte; k++) instantsTics.push({ t: compte + k, index: i, estCible: false });
    if (!mystere) instantsCelebration.push(revelation);
  }
  const duree = nbObjets * dureeObjet;
  const derniere = etapes[etapes.length - 1];
  return {
    type: "devine", duree, etapes, dureeCompte, dureeRevele,
    instantsTics, instantsCelebration, instantCelebration: null,
    instantsCentrage: [], demiFlash: 0, fenetrePauseMs: dureeRevele * 1000,
    geleAuFlash: false, arretDepuis: derniere ? derniere.revelation : null,
    // Sans bande : ces champs existent pour les lecteurs génériques (infos, tests).
    periodeTour: dureeObjet, vitessePx: 0, longueurBande: 0, avancement: () => 0,
  };
}

/**
 * Où en est la série à l'instant t : { index, phase, u, reste }.
 * `u` ∈ [0, 1] = avancement dans la phase ; `reste` = chiffre affiché pendant
 * le compte (3, 2, 1). Après la fin : dernière révélation, u = 1.
 */
export function etapeA(t, r) {
  const etapes = r.etapes;
  let e = etapes.find((x) => t < x.fin) ?? etapes[etapes.length - 1];
  if (t >= e.fin) return { index: e.index, phase: "revelation", u: 1, reste: 0, mystere: e.mystere };
  if (t < e.compte) return { index: e.index, phase: "apparition", u: (t - e.debut) / APPARITION, reste: 0, mystere: e.mystere };
  if (t < e.revelation) return { index: e.index, phase: "compte", u: (t - e.compte) / r.dureeCompte, reste: Math.ceil(e.revelation - t - 1e-9), mystere: e.mystere };
  return { index: e.index, phase: "revelation", u: Math.min(1, (t - e.revelation) / r.dureeRevele), reste: 0, mystere: e.mystere };
}
