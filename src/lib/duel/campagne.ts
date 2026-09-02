import { CARTES } from "@/data/cartes";
import { statsDuel } from "@/data/duel/cartesDuel";
import { ROUE } from "@/data/duel/roue";
import { creerRng } from "@/lib/duel/rng";
import { deckAleatoire, deckBicolore, deckCourbe } from "@/lib/duel/generateursDecks";
import { jouerPartie } from "@/lib/duel/simulation";
import type { Profil } from "@/lib/duel/ia";
import type { CategorieObjet } from "@/types/game";

export interface MesureCarte { parties: number; victoires: number; pioches: number; poses: number }
export interface Mesures {
  parties: number;
  cartes: Record<string, MesureCarte>;
  /** Moyenne des taux de victoire des cartes de la catégorie. */
  categories: Record<CategorieObjet, number>;
  premierJoueur: number;
  manchesMoyenne: number;
  manchesMax: number;
  nuls: number;
  epuisees: number;
  /** Taux de victoire du deck agressif contre le deck contrôle. */
  agressifVsControle: number;
}

export const CIBLES = {
  carteMin: 0.45, carteMax: 0.55, poseMin: 0.6, categorieMin: 0.45, categorieMax: 0.55,
  premierJoueurMax: 0.55, manchesMin: 8, manchesMax: 14, mancheDure: 25, nulsMax: 0.02, courbeMin: 0.45, courbeMax: 0.55,
} as const;

const PROFILS: Profil[] = ["agressif", "prudent"];

const CARTES_COUT: Record<string, number> = Object.fromEntries(CARTES.map((c) => [c.id, statsDuel(c.id).cout]));

export function deckAEstAggro(deck: readonly string[]): boolean {
  return deck.every((id) => CARTES_COUT[id] <= 3);
}

/**
 * Crédite le camp agressif quel que soit le siège qu'il occupait : `vainqueur` est un siège
 * (0 = deckA), `deckA` dit lequel des deux sièges portait le deck agressif.
 */
export function estVictoireAggro(vainqueur: 0 | 1, deckA: readonly string[]): boolean {
  return (vainqueur === 0) === deckAEstAggro(deckA);
}

/**
 * Deux crans distincts de la roue, tirés à la graine : le second est le premier décalé de 1 à 6,
 * donc jamais égal au premier (`deckBicolore` exige `a !== b`). Consomme deux tirages.
 */
export function paireBicolore(rng: () => number): [CategorieObjet, CategorieObjet] {
  const a = Math.floor(rng() * 7);
  const b = (a + 1 + Math.floor(rng() * 6)) % 7;
  return [ROUE[a], ROUE[b]];
}

/** Compteurs bruts d'une campagne, avant mise en taux. */
export interface Cumul {
  cartes: Record<string, MesureCarte>;
  /** Parties décidées (ni nulles, ni épuisées) : le seul dénominateur du premier joueur. */
  decidees: number;
  premier: number;
  manches: number;
  manchesMax: number;
  nuls: number;
  epuisees: number;
  aggroV: number;
  aggroN: number;
}

/** Passe des compteurs bruts aux taux. Pure : c'est ici que vivent tous les dénominateurs. */
export function mesuresDepuis(c: Cumul, nParties: number): Mesures {
  const taux = (id: string) => (c.cartes[id].parties ? c.cartes[id].victoires / c.cartes[id].parties : 0.5);
  const categories = Object.fromEntries(ROUE.map((cat) => {
    const ids = CARTES.filter((x) => x.serie === cat).map((x) => x.id);
    return [cat, ids.reduce((s, id) => s + taux(id), 0) / ids.length];
  })) as Record<CategorieObjet, number>;
  return {
    parties: nParties, cartes: c.cartes, categories,
    premierJoueur: c.decidees ? c.premier / c.decidees : 0.5,
    manchesMoyenne: nParties ? c.manches / nParties : 0,
    manchesMax: c.manchesMax,
    nuls: nParties ? c.nuls / nParties : 0,
    epuisees: nParties ? c.epuisees / nParties : 0,
    agressifVsControle: c.aggroN ? c.aggroV / c.aggroN : 0.5,
  };
}

/** Répartition : 50 % aléatoires, 25 % bicolores, 25 % par courbe. */
export function campagne({ graine, nParties }: { graine: number; nParties: number }): Mesures {
  const rng = creerRng(graine);
  const cartes: Record<string, MesureCarte> = Object.fromEntries(CARTES.map((c) => [c.id, { parties: 0, victoires: 0, pioches: 0, poses: 0 }]));
  let premier = 0, decidees = 0, manches = 0, manchesMax = 0, nuls = 0, epuisees = 0, aggroV = 0, aggroN = 0;
  for (let i = 0; i < nParties; i++) {
    const famille = i % 4 < 2 ? "aleatoire" : i % 4 === 2 ? "bicolore" : "courbe";
    let deckA: string[], deckB: string[];
    if (famille === "aleatoire") { deckA = deckAleatoire(rng); deckB = deckAleatoire(rng); }
    else if (famille === "bicolore") {
      const [a, b] = paireBicolore(rng);
      deckA = deckBicolore(rng, a, b);
      const [c, d] = paireBicolore(rng);
      deckB = deckBicolore(rng, c, d);
    } else {
      const aggroEnA = rng() < 0.5;
      deckA = deckCourbe(rng, aggroEnA ? "agressif" : "controle");
      deckB = deckCourbe(rng, aggroEnA ? "controle" : "agressif");
    }
    const profilA = PROFILS[Math.floor(rng() * 2)], profilB = PROFILS[Math.floor(rng() * 2)];
    const r = jouerPartie({ deckA, deckB, profilA, profilB, graine: graine * 100003 + i });
    manches += r.manches; manchesMax = Math.max(manchesMax, r.manches);
    if (r.epuisee) epuisees++;
    else if (r.vainqueur === null) nuls++;
    else { decidees++; if (r.vainqueur === 0) premier++; }
    for (const [j, deck] of [deckA, deckB].entries()) {
      for (const id of deck) {
        const m = cartes[id];
        if (r.vainqueur !== null) { m.parties++; if (r.vainqueur === j) m.victoires++; }
      }
    }
    for (const [id, n] of Object.entries(r.pioches)) cartes[id].pioches += n;
    for (const [id, n] of Object.entries(r.poses)) cartes[id].poses += n;
    if (famille === "courbe" && r.vainqueur !== null) {
      aggroN++;
      if (estVictoireAggro(r.vainqueur, deckA)) aggroV++;
    }
  }
  return mesuresDepuis({ cartes, decidees, premier, manches, manchesMax, nuls, epuisees, aggroV, aggroN }, nParties);
}

export function horsCible(m: Mesures): string[] {
  const l: string[] = [];
  for (const c of CARTES) {
    const x = m.cartes[c.id];
    const t = x.parties ? x.victoires / x.parties : 0.5;
    const pose = x.pioches ? x.poses / x.pioches : 0;
    const nom = c.id.replace("carte.", "");
    if (t < CIBLES.carteMin || t > CIBLES.carteMax) l.push(`carte ${nom} : victoire ${(t * 100).toFixed(1)} %`);
    if (pose < CIBLES.poseMin) l.push(`carte ${nom} : pose ${(pose * 100).toFixed(0)} %`);
  }
  for (const [cat, t] of Object.entries(m.categories)) if (t < CIBLES.categorieMin || t > CIBLES.categorieMax) l.push(`catégorie ${cat} : ${(t * 100).toFixed(1)} %`);
  if (m.premierJoueur >= CIBLES.premierJoueurMax || m.premierJoueur <= 1 - CIBLES.premierJoueurMax) l.push(`premier joueur : ${(m.premierJoueur * 100).toFixed(1)} %`);
  if (m.manchesMoyenne < CIBLES.manchesMin || m.manchesMoyenne > CIBLES.manchesMax) l.push(`manches moyennes : ${m.manchesMoyenne.toFixed(1)}`);
  if (m.manchesMax > CIBLES.mancheDure) l.push(`partie la plus longue : ${m.manchesMax} manches`);
  if (m.nuls + m.epuisees > CIBLES.nulsMax) l.push(`nuls + épuisées : ${((m.nuls + m.epuisees) * 100).toFixed(1)} %`);
  if (m.agressifVsControle < CIBLES.courbeMin || m.agressifVsControle > CIBLES.courbeMax) l.push(`agressif contre contrôle : ${(m.agressifVsControle * 100).toFixed(1)} %`);
  return l;
}

export function formaterRapport(m: Mesures, graine: number): string {
  const pc = (x: number) => `${(x * 100).toFixed(1)} %`;
  const lignes = [
    `Graine ${graine} · ${m.parties} parties`, "",
    "| Mesure | Valeur |", "|---|---|",
    `| Premier joueur | ${pc(m.premierJoueur)} |`,
    `| Manches (moyenne / max) | ${m.manchesMoyenne.toFixed(1)} / ${m.manchesMax} |`,
    `| Nuls / épuisées | ${pc(m.nuls)} / ${pc(m.epuisees)} |`,
    `| Agressif contre contrôle | ${pc(m.agressifVsControle)} |`, "",
    "| Catégorie | Victoires |", "|---|---|",
    ...Object.entries(m.categories).map(([c, t]) => `| ${c} | ${pc(t)} |`), "",
    "| Carte | Coût | Victoires | Pose |", "|---|---|---|---|",
    ...CARTES.map((c) => {
      const x = m.cartes[c.id];
      return `| ${c.id.replace("carte.", "")} | ${CARTES_COUT[c.id]} | ${pc(x.parties ? x.victoires / x.parties : 0.5)} | ${pc(x.pioches ? x.poses / x.pioches : 0)} |`;
    }), "",
    "Hors cible :", ...(horsCible(m).length ? horsCible(m).map((l) => `- ${l}`) : ["- aucune"]),
  ];
  return lignes.join("\n");
}
