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
  /**
   * Nombre de joueurs (0, 1 ou 2) ayant pioché la carte au moins une fois (pioche initiale
   * comprise), au plus une fois par joueur et par partie.
   */
  pioches: Record<string, number>;
  /** Nombre de joueurs (0, 1 ou 2) ayant posé la carte au moins une fois, au plus une fois par joueur et par partie. */
  poses: Record<string, number>;
}

function compter(rec: Record<string, number>, id: string): void {
  rec[id] = (rec[id] ?? 0) + 1;
}

export function jouerPartie(p: ParametresPartie): ResultatPartie {
  let e: EtatPartie = nouvellePartie(p.deckA, p.deckB, creerRng(p.graine));
  const pioches: Record<string, number> = {};
  const poses: Record<string, number> = {};
  const vuesPioche = [new Set<string>(), new Set<string>()];
  const vuesPose = [new Set<string>(), new Set<string>()];
  const noterPioches = (etat: EtatPartie) => {
    for (const j of [0, 1] as const) for (const id of etat.joueurs[j].main) if (!vuesPioche[j].has(id)) { vuesPioche[j].add(id); compter(pioches, id); }
  };
  noterPioches(e);
  let epuisee = false;
  let journalLu = 0;
  while (!e.fini) {
    if (manche(e) > MANCHES_MAX) { epuisee = true; break; }
    e = jouerTour(e, e.actif === 0 ? p.profilA : p.profilB);
    // Les poses se comptent au journal (un objet posé puis cassé dans le même tour n'est plus
    // sur l'étal), au plus une fois par joueur et par partie (une carte reprise en main par
    // retourEnMain puis reposée ne recompte pas).
    for (const ligne of e.journal.slice(journalLu)) {
      const m = /^J(\d) pose (.+)$/.exec(ligne);
      if (!m) continue;
      const j = Number(m[1]) as 0 | 1;
      const id = m[2];
      if (!vuesPose[j].has(id)) { vuesPose[j].add(id); compter(poses, id); }
    }
    journalLu = e.journal.length;
    noterPioches(e);
  }
  return {
    vainqueur: epuisee ? null : e.fini!.vainqueur,
    manches: epuisee ? Math.min(manche(e), MANCHES_MAX) : manche(e),
    epuisee,
    pioches,
    poses,
  };
}
