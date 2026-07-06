import type {
  CategorieObjet,
  CompetenceDef,
  CompetenceId,
  EtatObjet,
  GameState,
} from "@/types/game";
import { TREE_GENERAL, catTreeId, getCompetence, getTreeDef } from "@/data/competences";

export function aCompetence(
  id: CompetenceId,
  debloquees: readonly CompetenceId[],
): boolean {
  return debloquees.includes(id);
}

export type EtatCompetence = "debloquee" | "disponible" | "verrouillee";

export interface ContexteCompetences {
  /** Points de compétence disponibles — state.brocanteur.pointsDisponibles. */
  pointsDisponibles: number;
  /** Niveau de Brocanteur global — state.brocanteur.niveau. */
  niveauBrocanteur: number;
  /** Affinités par catégorie — state.affinites. */
  affinites: Record<CategorieObjet, number>;
}

export function contexteDepuisState(
  state: Pick<GameState, "brocanteur" | "affinites">,
): ContexteCompetences {
  return {
    pointsDisponibles: state.brocanteur.pointsDisponibles,
    niveauBrocanteur: state.brocanteur.niveau,
    affinites: state.affinites,
  };
}

/** Catégorie d'affinité d'une compétence (null pour l'arbre général). */
export function affiniteRequisePourComp(
  comp: CompetenceDef,
): { categorie: CategorieObjet | null; requise: number } {
  const cat = getTreeDef(comp.treeId)?.categorie ?? null;
  return { categorie: cat, requise: cat ? comp.affiniteRequise : 0 };
}

export function etatCompetence(
  comp: CompetenceDef,
  debloquees: readonly CompetenceId[],
  ctx: ContexteCompetences,
): EtatCompetence {
  if (debloquees.includes(comp.id)) return "debloquee";
  if (!comp.prerequis.every((p) => debloquees.includes(p))) return "verrouillee";
  if (ctx.niveauBrocanteur < comp.niveauBrocanteurRequis) return "verrouillee";
  const { categorie, requise } = affiniteRequisePourComp(comp);
  if (categorie && (ctx.affinites[categorie] ?? 0) < requise) return "verrouillee";
  if (ctx.pointsDisponibles < comp.coutPoints) return "verrouillee";
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


/**
 * Bonus d'appétit catégoriel cumulatif (Passion 1/2/3).
 * 0.10 / 0.20 / 0.30 selon le palier max débloqué (palier plus haut écrase).
 * Retourne 0 si aucun palier de Passion débloqué pour cette catégorie.
 */
export function bonusPassionCategorie(
  state: GameState,
  cat: CategorieObjet,
): number {
  const t = catTreeId(cat);
  if (aCompetence(`${t}.passion.3`, state.competencesDebloquees)) return 0.30;
  if (aCompetence(`${t}.passion.2`, state.competencesDebloquees)) return 0.20;
  if (aCompetence(`${t}.passion.1`, state.competencesDebloquees)) return 0.10;
  return 0;
}

/** Conservé pour compat — équivaut à un bonus Passion ≥ palier 2. */
export function aSpecialisteCategorie(
  state: GameState,
  cat: CategorieObjet,
): boolean {
  return bonusPassionCategorie(state, cat) >= 0.20;
}

export const BONUS_TOLERANCE_VERBE_HAUT = 0.20;
export const BONUS_TOLERANCE_VERBE_DOR = 0.40;
export const BONUS_TOLERANCE_CATEGORIE = [0.10, 0.20, 0.30] as const;

/** Bonus général de tolérance de négociation (Verbe d'or écrase Verbe haut). */
export function bonusToleranceNegoGeneral(state: GameState): number {
  if (aGenVerbeDOr(state)) return BONUS_TOLERANCE_VERBE_DOR;
  if (aGenVerbeHaut(state)) return BONUS_TOLERANCE_VERBE_HAUT;
  return 0;
}

/** Bonus catégoriel de tolérance (Œil aiguisé 1/2/3 — le plus haut écrase). */
export function bonusToleranceCategorie(
  state: GameState,
  cat: CategorieObjet,
): number {
  const t = catTreeId(cat);
  if (aCompetence(`${t}.oeil_aiguise.3`, state.competencesDebloquees)) return BONUS_TOLERANCE_CATEGORIE[2];
  if (aCompetence(`${t}.oeil_aiguise.2`, state.competencesDebloquees)) return BONUS_TOLERANCE_CATEGORIE[1];
  if (aCompetence(`${t}.oeil_aiguise.1`, state.competencesDebloquees)) return BONUS_TOLERANCE_CATEGORIE[0];
  return 0;
}

/** Général · Négociation palier 1 : Verbe haut — booste la tolérance de négociation. */
export function aGenVerbeHaut(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.negociation.1`, state.competencesDebloquees);
}

/** Général · Négociation palier 2 : Verbe d'or — booste davantage la tolérance de négociation. */
export function aGenVerbeDOr(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.negociation.2`, state.competencesDebloquees);
}

/** Général · Charisme palier 2 : +10 % d'appétit moyen sur tous les clients. */
export function aGenBonneReputation(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.charisme.2`, state.competencesDebloquees);
}

/** Général · Vision palier 1 : Bulletin météo — météo du jour révélée. */
export function aGenBulletinMeteo(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.vision.1`, state.competencesDebloquees);
}

/** Général · Vision palier 2 : Carnet mondain — célébrité de l'édition révélée. */
export function aGenCarnetMondain(state: GameState): boolean {
  return aCompetence(`${TREE_GENERAL}.vision.2`, state.competencesDebloquees);
}

/** Général · Vision palier 3 : Influence — 1 reroll météo ou célébrité par édition. */
export function aGenInfluence(state: GameState): boolean {
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
