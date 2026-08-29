/**
 * Logique pure du type « Devine le prix » : une série d'objets, chacun
 * apparaît, un compte à rebours laisse deviner son prix, puis le prix est
 * révélé. Même contrat de sortie que les roulettes (`duree`, `instantsTics`,
 * `arretDepuis`, …) pour que l'aperçu, le son et l'encodeur n'aient rien à
 * savoir de plus. Temps en secondes, aucune dépendance au DOM.
 */

/** Le titre « Devine le prix ! » avant le premier objet : claque, tient, s'efface. Court : le hook doit arriver vite. */
export const INTRO = 1.4;
/** Part de l'intro passée à claquer (zoom avec dépassement), puis à s'effacer (le reste : tenue). */
export const INTRO_MONTEE = 0.35, INTRO_FONDU = 0.4;
/** Fondu d'entrée de l'overlay final (s), depuis la dernière révélation. */
export const OVERLAY_FONDU = 0.7;
/** Durée de l'apparition d'un objet (zoom + fondu). */
export const APPARITION = 0.5;
/** Temps, après la dernière révélation, où l'étiquette a fini de rebondir : l'image « fin ». */
export const REBOND = 0.8;

/** Le dernier objet reste toujours mystère : c'est l'appel à commenter, pas une option. */
export function calculerDevine({ nbObjets, dureeCompte, dureeRevele, raretes = [], musique = true }) {
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
  const evenementsSon = evenementsDevine({ etapes, instantsTics, raretes, musique, duree, dureeCompte });
  return {
    type: "devine", duree, etapes, dureeCompte, dureeRevele,
    instantsTics, instantsCelebration, instantCelebration: null, evenementsSon,
    instantsCentrage: [], demiFlash: 0, fenetrePauseMs: dureeRevele * 1000,
    geleAuFlash: false, arretDepuis: derniere ? derniere.revelation : null,
    // Sans bande : ces champs existent pour les lecteurs génériques (infos, tests).
    periodeTour: dureeObjet, vitessePx: 0, longueurBande: 0, avancement: () => 0,
  };
}

/** Délai de l'éclat de rareté après le ka-ching, et du carillon après la fin du fondu de l'overlay. */
const DELAI_ECLAT = 0.15, DELAI_CARILLON = 0.1;

/**
 * La partition sonore de la série, en événements { t, type, … } que `son.js`
 * sait jouer : whoosh puis impact sur le titre, pop à chaque objet, tics et
 * riser sur le compte, ka-ching (+ éclat si rare/légendaire) à la révélation,
 * sting sur le mystère, carillon sur l'overlay, lit jazz du début à la fin.
 */
export function evenementsDevine({ etapes, instantsTics, raretes, musique, duree, dureeCompte }) {
  const out = [];
  if (musique) out.push({ t: 0, type: "musique", duree });
  out.push({ t: 0, type: "whoosh", duree: INTRO_MONTEE });
  out.push({ t: INTRO_MONTEE, type: "impact" });
  for (const e of etapes) {
    out.push({ t: e.debut, type: "pop" });
    out.push({ t: e.compte, type: "riser", duree: dureeCompte });
    if (e.mystere) {
      out.push({ t: e.revelation, type: "sting" });
    } else {
      out.push({ t: e.revelation, type: "cash" });
      if (["rare", "legendaire"].includes(raretes[e.index])) out.push({ t: e.revelation + DELAI_ECLAT, type: "eclat" });
    }
  }
  for (const tic of instantsTics) out.push({ t: tic.t, type: "tic" });
  const derniere = etapes[etapes.length - 1];
  if (derniere) out.push({ t: derniere.revelation + OVERLAY_FONDU + DELAI_CARILLON, type: "carillon" });
  out.sort((a, b) => a.t - b.t);
  return out;
}

/**
 * Opacité et échelle du titre d'intro à l'instant t : montée en zoom
 * (ease-out) puis tenue puis fondu de sortie. Rien hors [0, INTRO).
 */
export function intro(t) {
  if (!(t >= 0) || t >= INTRO) return { opacite: 0, echelle: 1, angle: 0 };
  const m = Math.min(1, t / INTRO_MONTEE);
  // « back out » : dépasse 1 (≈ 1,1 à mi-course) puis se pose — le titre claque au lieu de glisser.
  const c1 = 1.70158, c3 = c1 + 1;
  const e = 1 + c3 * (m - 1) ** 3 + c1 * (m - 1) ** 2;
  const sortie = Math.max(0, (t - (INTRO - INTRO_FONDU)) / INTRO_FONDU);
  // Pendant la tenue, un léger battement pour ne jamais être figé ; à la sortie, le titre file vers le haut.
  const tenue = m >= 1 ? 1 + 0.03 * Math.sin((t - INTRO_MONTEE) * 2 * Math.PI * 2) : 1;
  return {
    opacite: Math.min(1, m * 3) * (1 - sortie),
    echelle: (0.2 + 0.8 * e) * tenue * (1 + 0.25 * sortie),
    angle: (-8 * (1 - Math.min(1, m))) * (Math.PI / 180),
  };
}

/** Opacité de l'overlay final à l'instant t : fondu depuis la dernière révélation. */
export function opaciteOverlay(t, r) {
  if (r.arretDepuis === null || r.arretDepuis === undefined) return 0;
  return Math.min(1, Math.max(0, (t - r.arretDepuis) / OVERLAY_FONDU));
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
