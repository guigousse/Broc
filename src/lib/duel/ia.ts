import { statsDuel } from "@/data/duel/cartesDuel";
import { prixTexte } from "@/data/duel/budget";
import { actionAChoix, type Action } from "@/data/duel/types";
import { ETAL_MAX, adverse, type Cible, type EtatPartie, type ObjetEnJeu } from "@/lib/duel/etat";
import { cibleRequise, ciblesDeChoix } from "@/lib/duel/effets";
import { degatsDAttaque } from "@/lib/duel/operations";
import { attaquer, ciblesLegales, finirTour, peutAttaquer, poser } from "@/lib/duel/partie";

export type Profil = "agressif" | "prudent";

function valeur(o: ObjetEnJeu): number {
  return statsDuel(o.id).cout;
}

/** Cible d'une action à choix à la pose : l'objet adverse que l'action tue, sinon le plus cher. */
export function choisirCibleDeChoix(e: EtatPartie, id: string): Cible | undefined {
  if (!cibleRequise(id)) return undefined;
  const uids = ciblesDeChoix(e, e.actif);
  if (uids.length === 0) return undefined;
  const adv = e.joueurs[adverse(e.actif)].etal.filter((o) => uids.includes(o.uid));
  const t = statsDuel(id).texte;
  const action: Action | undefined = t?.type === "effet"
    ? t.actions.find(actionAChoix)
    : t?.type === "cri"
      ? { type: "degats", cible: "objetAdverse", valeur: 1 }
      : undefined;
  if (action && action.type === "degats") {
    const tuables = adv.filter((o) => o.pv - (o.motsCles.includes("solide") ? 1 : 0) <= action.valeur);
    const pool = tuables.length ? tuables : adv;
    return { type: "objet", uid: pool.sort((a, b) => valeur(b) - valeur(a))[0].uid };
  }
  if (action && action.type === "volMotCle") {
    const avec = adv.filter((o) => o.motsCles.length > 0);
    if (avec.length === 0) return { type: "objet", uid: adv[0].uid };
    return { type: "objet", uid: avec[0].uid };
  }
  return { type: "objet", uid: [...adv].sort((a, b) => valeur(b) - valeur(a))[0].uid };
}

/**
 * Le budget complet d'une carte (§5.1), prix du texte compris. Juger sur `attaque + pv` seul
 * revient à ignorer le texte, et laisse dormir en main toutes les cartes dont l'effet coûte
 * cher : à la campagne 2 du rapport d'équilibrage, elles plafonnaient à 33 % de pose quelles
 * que soient leurs stats.
 */
function budgetEnMain(id: string): number {
  const s = statsDuel(id);
  return s.attaque + s.pv + prixTexte(s.texte);
}

/**
 * Le meilleur lot posable ce tour : celui qui **dépense le plus d'énergie**, à égalité celui qui
 * vaut le plus cher — une place d'étal comptant pour 1 point, puisqu'il n'y en a que quatre.
 * Sans cette taxe, empiler quatre petites cartes bat toujours une grosse (le budget par point
 * d'énergie décroît avec le coût) et l'IA noie son étal. Recherche exhaustive : la main tient en
 * 7 cartes, donc 128 sous-ensembles. Rendu trié par coût décroissant.
 */
export function meilleurLot(main: readonly string[], energie: number, places: number): string[] {
  const couts = main.map((id) => statsDuel(id).cout);
  let meilleur: number[] = [], meilleureDepense = -1, meilleureValeur = -1;
  for (let masque = 0; masque < 1 << main.length; masque++) {
    const indices: number[] = [];
    let depense = 0;
    for (let i = 0; i < main.length; i++) if (masque & (1 << i)) { indices.push(i); depense += couts[i]; }
    if (indices.length > places || depense > energie) continue;
    const valeur = indices.reduce((s, i) => s + budgetEnMain(main[i]), 0) - indices.length;
    if (depense > meilleureDepense || (depense === meilleureDepense && valeur > meilleureValeur)) {
      meilleur = indices; meilleureDepense = depense; meilleureValeur = valeur;
    }
  }
  return meilleur.map((i) => main[i]).sort((a, b) => statsDuel(b).cout - statsDuel(a).cout);
}

function phasePose(e: EtatPartie): EtatPartie {
  for (;;) {
    const j = e.joueurs[e.actif];
    if (j.etal.length >= ETAL_MAX) return e;
    // Recalculé après chaque pose : un effet peut avoir rendu de l'énergie ou vidé une place.
    const lot = meilleurLot(j.main, j.energie, ETAL_MAX - j.etal.length);
    if (lot.length === 0) return e;
    const r = poser(e, lot[0], choisirCibleDeChoix(e, lot[0]));
    if (!r.ok) return e;
    e = r.etat;
  }
}

/**
 * `tue`/`echangeGagnant` jugent sur l'attaque imprimée, avant que le déclencheur `attaque` ne
 * l'ait éventuellement modifiée (ex. sac_a_main_talaria, +1 attaque à soi) : l'IA choisit sa
 * cible avant de savoir si l'effet se déclenchera. Heuristique acceptée, pas un bug — un calcul
 * exact demanderait de simuler le déclencheur pour chaque cible candidate.
 */

/** `o` tue `cible` en un coup ? */
function tue(o: ObjetEnJeu, cible: ObjetEnJeu): boolean {
  return degatsDAttaque(o, cible) - (cible.motsCles.includes("solide") ? 1 : 0) >= cible.pv;
}

/** L'objet `o` tue `cible` en survivant ? */
function echangeGagnant(o: ObjetEnJeu, cible: ObjetEnJeu): boolean {
  const dD = degatsDAttaque(cible, o) - (o.motsCles.includes("solide") ? 1 : 0);
  return tue(o, cible) && dD < o.pv;
}

function phaseAttaque(e: EtatPartie, profil: Profil): EtatPartie {
  for (;;) {
    if (e.fini) return e;
    const moi = e.joueurs[e.actif];
    const lui = e.joueurs[adverse(e.actif)];
    const prets = moi.etal.filter((o) => peutAttaquer(e, o)).sort((a, b) => b.attaque - a.attaque);
    if (prets.length === 0) return e;
    const o = prets[0];
    const cibles = ciblesLegales(e, o.uid);
    if (cibles.length === 0) { e = { ...e, joueurs: marquerAttaque(e, o.uid) }; continue; }
    const vitrineOk = cibles.some((c) => c.type === "vitrine");
    const objets = cibles.filter((c): c is { type: "objet"; uid: number } => c.type === "objet")
      .map((c) => lui.etal.find((x) => x.uid === c.uid)!);
    const attaqueTotale = prets.reduce((s, x) => s + x.attaque, 0);
    let cible: Cible | undefined;
    if (vitrineOk && attaqueTotale >= lui.vitrine) cible = { type: "vitrine" };
    else if (profil === "agressif") {
      const gagnant = objets.filter((c) => echangeGagnant(o, c)).sort((a, b) => valeur(b) - valeur(a))[0];
      cible = gagnant ? { type: "objet", uid: gagnant.uid } : vitrineOk ? { type: "vitrine" } : { type: "objet", uid: objets.sort((a, b) => a.pv - b.pv)[0].uid };
    } else {
      const deValeur = objets.filter((c) => tue(o, c) && valeur(c) >= valeur(o)).sort((a, b) => valeur(b) - valeur(a))[0];
      const gagnant = objets.filter((c) => echangeGagnant(o, c)).sort((a, b) => valeur(b) - valeur(a))[0];
      const dominant = moi.etal.reduce((s, x) => s + x.attaque, 0) > lui.etal.reduce((s, x) => s + x.attaque, 0);
      if (deValeur) cible = { type: "objet", uid: deValeur.uid };
      else if (gagnant) cible = { type: "objet", uid: gagnant.uid };
      else if (vitrineOk && dominant) cible = { type: "vitrine" };
      // Prudent (spec §6.2) : sans étal dominant, ne frappe pas la vitrine — l'objet tient.
      else if (vitrineOk) { e = { ...e, joueurs: marquerAttaque(e, o.uid) }; continue; }
      else cible = { type: "objet", uid: objets.sort((a, b) => a.pv - b.pv)[0].uid };
    }
    const r = attaquer(e, o.uid, cible);
    if (!r.ok) { e = { ...e, joueurs: marquerAttaque(e, o.uid) }; continue; }
    e = r.etat;
  }
}

/** Sortie de secours : un objet sans coup légal est marqué comme ayant attaqué (jamais de boucle). */
function marquerAttaque(e: EtatPartie, uid: number): EtatPartie["joueurs"] {
  const j = e.joueurs[e.actif];
  const etal = j.etal.map((o) => (o.uid === uid ? { ...o, aAttaque: true } : o));
  return e.actif === 0 ? [{ ...j, etal }, e.joueurs[1]] : [e.joueurs[0], { ...j, etal }];
}

export function jouerTour(etat: EtatPartie, profil: Profil): EtatPartie {
  if (etat.fini) return etat;
  let e = phasePose(etat);
  e = phaseAttaque(e, profil);
  if (e.fini) return e;
  const r = finirTour(e);
  return r.ok ? r.etat : e;
}
