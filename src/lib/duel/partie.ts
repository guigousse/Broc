import { melanger } from "@/lib/duel/rng";
import { statsDuel } from "@/data/duel/cartesDuel";
import type { MotCleActif } from "@/data/duel/types";
import {
  ETAL_MAX, MAIN_INITIALE, PLAFOND_MAX, VITRINE_INITIALE, adverse, cloner, sousRuse, trouverObjet,
  type Cible, type EtatPartie, type Joueur, type ObjetEnJeu, type Resultat,
} from "@/lib/duel/etat";
import { degatsDAttaque, infligerDegats, piocher, retirerCasses, verifierFin } from "@/lib/duel/operations";

function joueurInitial(deck: string[]): Joueur {
  return { vitrine: VITRINE_INITIALE, plafond: 0, energie: 0, main: [], deck, etal: [], casse: [], echecsPioche: 0 };
}

/** Mute `e` : énergie, pioche, remise à zéro des attaques (effets debutTour en Task 5). */
function commencerTour(e: EtatPartie): void {
  e.tour += 1;
  const j = e.joueurs[e.actif];
  j.plafond = Math.min(PLAFOND_MAX, j.plafond + 1);
  j.energie = j.plafond;
  for (const o of j.etal) o.aAttaque = false;
  piocher(e, e.actif, 1);
  verifierFin(e);
}

export function nouvellePartie(deckA: readonly string[], deckB: readonly string[], rng: () => number): EtatPartie {
  const e: EtatPartie = {
    joueurs: [joueurInitial(melanger(deckA, rng)), joueurInitial(melanger(deckB, rng))],
    actif: 0, tour: 0, prochainUid: 1, fini: null, journal: [],
  };
  piocher(e, 0, MAIN_INITIALE);
  piocher(e, 1, MAIN_INITIALE + 1); // compensation du second joueur (spec §3.1)
  commencerTour(e);
  return e;
}

export function finirTour(etat: EtatPartie): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const e = cloner(etat);
  for (const o of e.joueurs[e.actif].etal) if (o.motsCles.includes("fragile")) o.pv -= 1;
  retirerCasses(e);
  verifierFin(e);
  if (!e.fini) {
    e.actif = adverse(e.actif);
    commencerTour(e);
  }
  return { ok: true, etat: e };
}

export function peutAttaquer(e: EtatPartie, o: ObjetEnJeu): boolean {
  if (o.aAttaque || o.attaque <= 0) return false;
  if (o.poseAuTour === e.tour && !o.motsCles.includes("prompt")) return false;
  return true;
}

/** Les cibles qu'un objet du joueur actif peut viser (Barrage et Ruse compris). */
export function ciblesLegales(e: EtatPartie, uid: number): Cible[] {
  const t = trouverObjet(e, uid);
  if (!t || t.joueur !== e.actif || !peutAttaquer(e, t.objet)) return [];
  const etalAdverse = e.joueurs[adverse(e.actif)].etal.filter((o) => !sousRuse(e, o));
  const barrages = etalAdverse.filter((o) => o.motsCles.includes("barrage"));
  if (barrages.length > 0) return barrages.map((o) => ({ type: "objet", uid: o.uid }));
  return [{ type: "vitrine" }, ...etalAdverse.map((o) => ({ type: "objet" as const, uid: o.uid }))];
}

export function attaquer(etat: EtatPartie, uid: number, cible: Cible): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const legale = ciblesLegales(etat, uid).some((c) => c.type === cible.type && (c.type === "vitrine" || c.uid === (cible as { uid: number }).uid));
  if (!legale) return { ok: false, raison: "cibleIllegale", etat };
  const e = cloner(etat);
  const attaquant = trouverObjet(e, uid)!.objet;
  attaquant.aAttaque = true;
  // Déclencheur « attaque » : Task 5.
  if (cible.type === "vitrine") {
    e.joueurs[adverse(e.actif)].vitrine -= attaquant.attaque;
    e.journal.push(`J${e.actif} ${attaquant.id} → vitrine ${attaquant.attaque}`);
  } else {
    const defenseur = trouverObjet(e, cible.uid)!.objet;
    const dA = degatsDAttaque(attaquant, defenseur);
    const dD = degatsDAttaque(defenseur, attaquant);
    infligerDegats(e, defenseur.uid, dA);
    infligerDegats(e, attaquant.uid, dD);
    e.journal.push(`J${e.actif} ${attaquant.id} ⇄ ${defenseur.id} (${dA}/${dD})`);
    retirerCasses(e);
  }
  verifierFin(e);
  return { ok: true, etat: e };
}

export function poser(etat: EtatPartie, id: string, cible?: Cible): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const j = etat.joueurs[etat.actif];
  const i = j.main.indexOf(id);
  if (i < 0) return { ok: false, raison: "pasEnMain", etat };
  const s = statsDuel(id);
  if (s.cout > j.energie) return { ok: false, raison: "energie", etat };
  if (j.etal.length >= ETAL_MAX) return { ok: false, raison: "etalPlein", etat };
  const e = cloner(etat);
  const joueur = e.joueurs[e.actif];
  joueur.main.splice(i, 1);
  joueur.energie -= s.cout;
  const motsCles: MotCleActif[] = s.texte && s.texte.type !== "cri" && s.texte.type !== "effet" ? [s.texte.type] : [];
  const objet: ObjetEnJeu = { uid: e.prochainUid++, id, attaque: s.attaque, pv: s.pv, motsCles, poseAuTour: e.tour, aAttaque: false };
  joueur.etal.push(objet);
  e.journal.push(`J${e.actif} pose ${id}`);
  void cible; // Cri et effets « pose » : Task 5.
  verifierFin(e);
  return { ok: true, etat: e };
}
