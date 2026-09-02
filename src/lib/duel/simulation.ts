import { MANCHES_MAX, manche, type EtatPartie } from "@/lib/duel/etat";
import { jouerTour, type Profil } from "@/lib/duel/ia";
import { nouvellePartie } from "@/lib/duel/partie";
import { creerRng } from "@/lib/duel/rng";

export interface ParametresPartie {
  deckA: readonly string[];
  deckB: readonly string[];
  profilA: Profil;
  profilB: Profil;
  graine: number;
}

export interface ResultatPartie {
  vainqueur: 0 | 1 | null;
  manches: number;
  epuisee: boolean;
  /** Fois où chaque carte est entrée dans une main (pioche initiale comprise). */
  pioches: Record<string, number>;
  poses: Record<string, number>;
}

function compter(rec: Record<string, number>, id: string): void {
  rec[id] = (rec[id] ?? 0) + 1;
}

export function jouerPartie(p: ParametresPartie): ResultatPartie {
  let e: EtatPartie = nouvellePartie(p.deckA, p.deckB, creerRng(p.graine));
  const pioches: Record<string, number> = {};
  const poses: Record<string, number> = {};
  const vues = [new Set<string>(), new Set<string>()];
  const noter = (etat: EtatPartie) => {
    for (const j of [0, 1] as const) for (const id of etat.joueurs[j].main) if (!vues[j].has(id)) { vues[j].add(id); compter(pioches, id); }
  };
  noter(e);
  let epuisee = false;
  let journalLu = 0;
  while (!e.fini) {
    if (manche(e) > MANCHES_MAX) { epuisee = true; break; }
    e = jouerTour(e, e.actif === 0 ? p.profilA : p.profilB);
    // Les poses se comptent au journal : un objet posé puis cassé dans le même tour n'est plus sur l'étal.
    for (const ligne of e.journal.slice(journalLu)) { const m = /^J\d pose (.+)$/.exec(ligne); if (m) compter(poses, m[1]); }
    journalLu = e.journal.length;
    noter(e);
  }
  return { vainqueur: epuisee ? null : e.fini!.vainqueur, manches: Math.min(manche(e), MANCHES_MAX), epuisee, pioches, poses };
}
