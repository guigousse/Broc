import type { MotCleActif } from "@/data/duel/types";

export const VITRINE_INITIALE = 20;
export const PLAFOND_MAX = 5;
export const MAIN_MAX = 7;
export const ETAL_MAX = 4;
export const MAIN_INITIALE = 4;
/** Garde-fou de boucle : au-delà, la partie est « épuisée ». */
export const MANCHES_MAX = 60;

export interface ObjetEnJeu {
  uid: number;
  id: string;
  attaque: number;
  pv: number;
  motsCles: MotCleActif[];
  poseAuTour: number;
  aAttaque: boolean;
}

export interface Joueur {
  vitrine: number;
  plafond: number;
  energie: number;
  /** Énergie ajoutée au prochain rechargement, puis remise à zéro (compensation du §3.1). */
  bonusEnergie: number;
  main: string[];
  deck: string[];
  etal: ObjetEnJeu[];
  casse: string[];
  echecsPioche: number;
}

export type Fin = { vainqueur: 0 | 1 | null };

export interface EtatPartie {
  joueurs: [Joueur, Joueur];
  actif: 0 | 1;
  /** Tour de joueur, 1 = premier tour du premier joueur. */
  tour: number;
  prochainUid: number;
  fini: Fin | null;
  journal: string[];
}

export type Cible = { type: "vitrine" } | { type: "objet"; uid: number };
export type Resultat = { ok: true; etat: EtatPartie } | { ok: false; raison: string; etat: EtatPartie };

export function cloner(e: EtatPartie): EtatPartie {
  const j = (x: Joueur): Joueur => ({
    ...x, main: [...x.main], deck: [...x.deck], casse: [...x.casse],
    etal: x.etal.map((o) => ({ ...o, motsCles: [...o.motsCles] })),
  });
  return { ...e, joueurs: [j(e.joueurs[0]), j(e.joueurs[1])], fini: e.fini ? { ...e.fini } : null, journal: [...e.journal] };
}

export function adverse(j: 0 | 1): 0 | 1 {
  return j === 0 ? 1 : 0;
}

export function joueurActif(e: EtatPartie): Joueur {
  return e.joueurs[e.actif];
}

export function manche(e: EtatPartie): number {
  return Math.ceil(e.tour / 2);
}

export function trouverObjet(e: EtatPartie, uid: number): { joueur: 0 | 1; objet: ObjetEnJeu } | null {
  for (const j of [0, 1] as const) {
    const o = e.joueurs[j].etal.find((x) => x.uid === uid);
    if (o) return { joueur: j, objet: o };
  }
  return null;
}

/** Sous Ruse : pendant son tour de pose et le tour adverse qui suit. */
export function sousRuse(e: EtatPartie, o: ObjetEnJeu): boolean {
  return o.motsCles.includes("ruse") && e.tour - o.poseAuTour <= 1;
}
