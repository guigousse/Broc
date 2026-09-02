import { statsDuel } from "@/data/duel/cartesDuel";
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

function phasePose(e: EtatPartie): EtatPartie {
  for (;;) {
    const j = e.joueurs[e.actif];
    if (j.etal.length >= ETAL_MAX) return e;
    const jouables = j.main
      .filter((id) => statsDuel(id).cout <= j.energie)
      .sort((a, b) => {
        const sa = statsDuel(a), sb = statsDuel(b);
        return sb.cout - sa.cout || sb.attaque + sb.pv - (sa.attaque + sa.pv);
      });
    if (jouables.length === 0) return e;
    const r = poser(e, jouables[0], choisirCibleDeChoix(e, jouables[0]));
    if (!r.ok) return e;
    e = r.etat;
  }
}

/** L'objet `o` tue `cible` en survivant ? */
function echangeGagnant(o: ObjetEnJeu, cible: ObjetEnJeu): boolean {
  const dA = degatsDAttaque(o, cible) - (cible.motsCles.includes("solide") ? 1 : 0);
  const dD = degatsDAttaque(cible, o) - (o.motsCles.includes("solide") ? 1 : 0);
  return dA >= cible.pv && dD < o.pv;
}

function tue(o: ObjetEnJeu, cible: ObjetEnJeu): boolean {
  return degatsDAttaque(o, cible) - (cible.motsCles.includes("solide") ? 1 : 0) >= cible.pv;
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
      else if (vitrineOk) cible = { type: "vitrine" };
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
