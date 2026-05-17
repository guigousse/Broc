import type {
  CategorieObjet,
  CompetenceDef,
  CompetenceId,
  CompetenceTreeState,
  GameState,
} from "@/types/game";
import { TREE_GENERAL, catTreeId, getCompetence } from "@/data/competences";

export function aCompetence(
  id: CompetenceId,
  debloquees: readonly CompetenceId[],
): boolean {
  return debloquees.includes(id);
}

export type EtatCompetence = "debloquee" | "disponible" | "verrouillee";

export function etatCompetence(
  comp: CompetenceDef,
  debloquees: readonly CompetenceId[],
  tree: CompetenceTreeState | undefined,
): EtatCompetence {
  if (debloquees.includes(comp.id)) return "debloquee";
  const prereqOk = comp.prerequis.every((p) => debloquees.includes(p));
  if (!prereqOk) return "verrouillee";
  if (!tree) return "verrouillee";
  if (tree.niveau < comp.niveauRequis) return "verrouillee";
  if (tree.pointsDisponibles < comp.coutPoints) return "verrouillee";
  return "disponible";
}

// =====================================================================
// LOOKUPS NOMMÉS D'EFFETS — utilisés par les pages au lieu d'IDs bruts
// =====================================================================

/** Branche Réparer · catégorie · palier 1 : Mauvais → Bon possible. */
export function peutRestaurerMauvaisVersBon(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.reparer.1`, state.competencesDebloquees);
}

/** Branche Réparer · catégorie · palier 2 : Bon → Très bon possible. */
export function peutRestaurerBonVersTresBon(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.reparer.2`, state.competencesDebloquees);
}

/** Branche Réparer · catégorie · palier 3 : Très bon → Pristin état possible. */
export function peutRestaurerTresBonVersPristin(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.reparer.3`, state.competencesDebloquees);
}

/** Vrai si le joueur a au moins l'apprenti — utilisé pour ouvrir l'atelier sur cette catégorie. */
export function peutRestaurerCategorie(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return peutRestaurerMauvaisVersBon(state, cat);
}

/** Connaisseur palier 1 : tendance de cette catégorie visible dans la Gazette. */
export function aConnaisseurTendance(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.connaisseur.1`, state.competencesDebloquees);
}

/** Connaisseur palier 2 : valeur de référence visible sur l'étal (vente + QG). */
export function aConnaisseurVitrine(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.connaisseur.2`, state.competencesDebloquees);
}

/** Connaisseur palier 3 : valeur de référence visible en chinant. */
export function aConnaisseurChinage(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.connaisseur.3`, state.competencesDebloquees);
}

/** Réparer palier 3 (Maître) : durée de restauration réduite à 3 jours. */
export function aMaitreReparer(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return aCompetence(`${catTreeId(cat)}.reparer.3`, state.competencesDebloquees);
}

/** Renvoie la durée (en jours) d'une restauration pour cette catégorie. */
export function dureeRestauration(
  state: GameState,
  cat: CategorieObjet,
): number {
  return aMaitreReparer(state, cat) ? 3 : 7;
}

/**
 * Bonus d'appétit catégoriel cumulatif (Passion 1/2/3).
 * 0.10 / 0.25 / 0.40 selon le palier max débloqué (palier plus haut écrase).
 * Retourne 0 si aucun palier de Passion débloqué pour cette catégorie.
 */
export function bonusPassionCategorie(
  state: GameState,
  cat: CategorieObjet,
): number {
  const t = catTreeId(cat);
  if (aCompetence(`${t}.passion.3`, state.competencesDebloquees)) return 0.40;
  if (aCompetence(`${t}.passion.2`, state.competencesDebloquees)) return 0.25;
  if (aCompetence(`${t}.passion.1`, state.competencesDebloquees)) return 0.10;
  return 0;
}

/** Conservé pour compat — équivaut à un bonus Passion ≥ 0.25. */
export function aSpecialisteCategorie(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return bonusPassionCategorie(state, cat) >= 0.25;
}

/**
 * Bonus catégoriel au seuil de colère (Œil aiguisé 1/2/3).
 * 0.05 / 0.15 / 0.30 selon le palier max débloqué (palier plus haut écrase).
 */
export function bonusSeuilColereCategorie(
  state: GameState,
  cat: CategorieObjet,
): number {
  const t = catTreeId(cat);
  if (aCompetence(`${t}.oeil_aiguise.3`, state.competencesDebloquees)) return 0.30;
  if (aCompetence(`${t}.oeil_aiguise.2`, state.competencesDebloquees)) return 0.15;
  if (aCompetence(`${t}.oeil_aiguise.1`, state.competencesDebloquees)) return 0.05;
  return 0;
}

/** Général · Négociation palier 1 : seuil de colère 1.4× au lieu de 1.2×. */
export function aGenVerbeHaut(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.negociation.1`, state.competencesDebloquees);
}

/** Général · Négociation palier 2 : seuil de colère 1.6×. */
export function aGenVerbeDOr(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.negociation.2`, state.competencesDebloquees);
}

/** Général · Charisme palier 2 : +10 % d'appétit moyen sur tous les clients. */
export function aGenBonneReputation(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.charisme.2`, state.competencesDebloquees);
}

/** Général · Vision palier 1 : voir 1 catégorie de la prochaine édition. */
export function aGenVeilleDiscrete(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.vision.1`, state.competencesDebloquees);
}

/** Général · Vision palier 2 : voir toutes les catégories de la prochaine édition. */
export function aGenVeilleActive(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.vision.2`, state.competencesDebloquees);
}

/** Général · Vision palier 3 : la prochaine édition garantit ≥1 cat à +15 %. */
export function aGenDevin(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.vision.3`, state.competencesDebloquees);
}

/** Général · Charisme palier 1 : intervalle entre clients × 0.75. */
export function aGenPresentationSoignee(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.charisme.1`, state.competencesDebloquees);
}

/** Général · Présentation palier 1 : nom + ambiance du client visibles. */
export function aGenLecteurAmes(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.presentation.1`, state.competencesDebloquees);
}

/** Général · Présentation palier 2 : classe de bourse du client visible. */
export function aGenEstimateurBourse(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.presentation.2`, state.competencesDebloquees);
}

/** Général · Présentation palier 3 : prix max exact du client visible. */
export function aGenOeilAiguise(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.presentation.3`, state.competencesDebloquees);
}

/** Général · Négociation palier 3 : Diplomate — révèle prix max et donne une dernière chance. */
export function aGenDiplomate(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.negociation.3`, state.competencesDebloquees);
}

/** Général · Charisme palier 3 : Stand renommé — 1 client à grosse bourse garanti. */
export function aGenStandRenomme(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.charisme.3`, state.competencesDebloquees);
}

export { getCompetence };
