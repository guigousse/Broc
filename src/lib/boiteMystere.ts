import type { Brocante, EtatObjet, GameState, Objet, Rarete } from "@/types/game";
import { poolPourTier, type ObjetTemplate } from "@/data/objetTemplates";
import { FACTEUR_ETAT } from "@/lib/etat";

/** Chemin de l'illustration du PNJ vendeur mystère (public/). */
export const VENDEUR_MYSTERE_ILLUSTRATION = "/personas/vendeur-mystere.webp";

/** Image de la boîte mystère fermée (sticker, public/). */
export const BOITE_MYSTERE_IMAGE = "/items/boite-mystere.webp";

/** Image de la boîte mystère ouverte (révélation, public/). */
export const BOITE_MYSTERE_OUVERTE_IMAGE = "/items/boite-mystere-ouverte.webp";

/** Probabilité d'apparition de la 1ʳᵉ boîte du jour (par entrée en brocante). */
export const CHANCE_APPARITION_BASE = 0.2;

/** Poids de tirage par rareté dans la boîte (boostés vs chinage normal). */
export const POIDS_RARETE_BOITE: Record<Rarete, number> = {
  commun: 70,
  rare: 26,
  legendaire: 4,
};

/** Distribution d'état dans la boîte (somme = 100). Inclut Pristin (atelier-only en chinage). */
export const DISTRIB_ETAT_BOITE: ReadonlyArray<{ etat: EtatObjet; poids: number }> = [
  { etat: "Mauvais", poids: 10 },
  { etat: "Bon", poids: 30 },
  { etat: "Très bon", poids: 45 },
  { etat: "Pristin état", poids: 15 },
];

/** Boîtes déjà réclamées le jour de jeu courant (0 si autre jour / jamais). */
export function nbBoitesReclamees(
  state: Pick<GameState, "boiteMystere">,
  jourActuel: number,
): number {
  const b = state.boiteMystere;
  return b && b.jour === jourActuel ? b.reclamees : 0;
}

/** Chance d'apparition décroissante : base / 2^n. */
export function chanceApparition(n: number): number {
  return CHANCE_APPARITION_BASE / 2 ** n;
}

/** Tire l'apparition du vendeur pour une entrée, sachant n boîtes déjà réclamées. */
export function tenterApparition(n: number, rng: () => number = Math.random): boolean {
  return rng() < chanceApparition(n);
}

function tirerEtatBoite(rng: () => number): EtatObjet {
  const total = DISTRIB_ETAT_BOITE.reduce((s, e) => s + e.poids, 0);
  let r = rng() * total;
  for (const e of DISTRIB_ETAT_BOITE) {
    r -= e.poids;
    if (r <= 0) return e.etat;
  }
  return DISTRIB_ETAT_BOITE[DISTRIB_ETAT_BOITE.length - 1].etat;
}

function tirerTemplateBoite(
  pool: readonly ObjetTemplate[],
  rng: () => number,
): ObjetTemplate {
  const total = pool.reduce((s, t) => s + POIDS_RARETE_BOITE[t.rarete], 0);
  let r = rng() * total;
  for (const t of pool) {
    r -= POIDS_RARETE_BOITE[t.rarete];
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

/**
 * Tire le contenu d'une boîte : un `Objet` prêt à ajouter à l'inventaire.
 * Puise dans le pool tier-gated de la brocante hôte (gating économie) ;
 * applique les tables de rareté + état boostées. Pas de négociation/prix vendeur.
 */
export function tirerContenuBoite(
  brocante: Pick<Brocante, "tier">,
  rng: () => number = Math.random,
): Objet {
  const pool = poolPourTier(brocante.tier);
  const template = tirerTemplateBoite(pool, rng);
  const etat = tirerEtatBoite(rng);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  return {
    id: crypto.randomUUID(),
    templateId: template.templateId,
    nom: template.nom,
    categorie: template.categorie,
    etat,
    prixReferenceReel,
    rarete: template.rarete,
  };
}

/**
 * Applique une réclamation à l'état : ajoute l'objet et incrémente le compteur
 * du jour (reset si le dernier jour diffère). Fonction pure. La vérification de
 * capacité de stockage reste à la charge de l'appelant (action contexte).
 */
export function appliquerReclamation<
  S extends Pick<GameState, "boiteMystere" | "jourActuel" | "inventaireJoueur">,
>(state: S, objet: Objet): S {
  const reclamees =
    state.boiteMystere && state.boiteMystere.jour === state.jourActuel
      ? state.boiteMystere.reclamees + 1
      : 1;
  return {
    ...state,
    inventaireJoueur: [...state.inventaireJoueur, objet],
    boiteMystere: { jour: state.jourActuel, reclamees },
  };
}
