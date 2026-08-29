/**
 * Logique pure du type « Devine le prix » : une série d'objets, chacun
 * apparaît, un compte à rebours laisse deviner son prix, puis le prix est
 * révélé. Même contrat de sortie que les roulettes (`duree`, `instantsTics`,
 * `arretDepuis`, …) pour que l'aperçu, le son et l'encodeur n'aient rien à
 * savoir de plus. Temps en secondes, aucune dépendance au DOM.
 */

/** Le titre « Devine le prix ! » avant le premier objet : grossit, tient, s'efface. */
export const INTRO = 1.8;
/** Part de l'intro passée à grossir, puis à s'effacer (le reste : tenue). */
export const INTRO_MONTEE = 0.6, INTRO_FONDU = 0.5;
/** Durée de l'apparition d'un objet (zoom + fondu). */
export const APPARITION = 0.5;
/** Temps, après la dernière révélation, où l'étiquette a fini de rebondir : l'image « fin ». */
export const REBOND = 0.8;

/** Le dernier objet reste toujours mystère : c'est l'appel à commenter, pas une option. */
export function calculerDevine({ nbObjets, dureeCompte, dureeRevele }) {
  const dernierMystere = true;
  const dureeObjet = APPARITION + dureeCompte + dureeRevele;
  const etapes = [];
  const instantsTics = [];
  const instantsCelebration = [];
  for (let i = 0; i < nbObjets; i++) {
    const debut = INTRO + i * dureeObjet;
    const compte = debut + APPARITION;
    const revelation = compte + dureeCompte;
    const mystere = dernierMystere && i === nbObjets - 1;
    etapes.push({ index: i, debut, compte, revelation, fin: debut + dureeObjet, mystere });
    // Un tic par chiffre : 3, 2, 1… (ceil(dureeCompte) chiffres, le dernier avant la révélation).
    for (let k = 0; k < dureeCompte; k++) instantsTics.push({ t: compte + k, index: i, estCible: false });
    if (!mystere) instantsCelebration.push(revelation);
  }
  const duree = INTRO + nbObjets * dureeObjet;
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
 * Opacité et échelle du titre d'intro à l'instant t : montée en zoom
 * (ease-out) puis tenue puis fondu de sortie. Rien hors [0, INTRO).
 */
export function intro(t) {
  if (!(t >= 0) || t >= INTRO) return { opacite: 0, echelle: 1 };
  const m = Math.min(1, t / INTRO_MONTEE);
  const e = 1 - (1 - m) ** 3;
  const sortie = Math.max(0, (t - (INTRO - INTRO_FONDU)) / INTRO_FONDU);
  return { opacite: e * (1 - sortie), echelle: 0.4 + 0.6 * e };
}

/**
 * Où en est la série à l'instant t : { index, phase, u, reste }.
 * `u` ∈ [0, 1] = avancement dans la phase ; `reste` = chiffre affiché pendant
 * le compte (3, 2, 1). Après la fin : dernière révélation, u = 1.
 */
export function etapeA(t, r) {
  const etapes = r.etapes;
  if (t < INTRO) return { index: 0, phase: "intro", u: t / INTRO, reste: 0, mystere: etapes[0]?.mystere ?? false };
  let e = etapes.find((x) => t < x.fin) ?? etapes[etapes.length - 1];
  if (t >= e.fin) return { index: e.index, phase: "revelation", u: 1, reste: 0, mystere: e.mystere };
  if (t < e.compte) return { index: e.index, phase: "apparition", u: (t - e.debut) / APPARITION, reste: 0, mystere: e.mystere };
  if (t < e.revelation) return { index: e.index, phase: "compte", u: (t - e.compte) / r.dureeCompte, reste: Math.ceil(e.revelation - t - 1e-9), mystere: e.mystere };
  return { index: e.index, phase: "revelation", u: Math.min(1, (t - e.revelation) / r.dureeRevele), reste: 0, mystere: e.mystere };
}
