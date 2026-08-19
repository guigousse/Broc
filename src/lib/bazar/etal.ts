import { CATEGORIES } from "@/data/categories";
import { poolPourTier } from "@/data/objetTemplates";
import type { CategorieObjet, EtalBazar, LotPiecesBazar, VitrineBazar } from "@/types/game";

/** Ratio fixe de la monnaie du Bazar. 1 jeton = 25 €, à vie. */
export const PRIX_JETON_EUROS = 25;
/** Pièces de restauration livrées par lot. */
export const PIECES_PAR_LOT = 5;
/** Lots de pièces présentés simultanément, de catégories distinctes. */
export const NB_LOTS_PIECES = 3;
/** Fourchette de `prixRefBase` éligible à la vitrine — le bouton de réglage. */
export const VITRINE_VALEUR_MIN = 100;
export const VITRINE_VALEUR_MAX = 400;

/** Prix en jetons d'un objet, arrondi au supérieur, jamais nul. */
export function prixEnJetons(prixRefBase: number): number {
  return Math.max(1, Math.ceil(prixRefBase / PRIX_JETON_EUROS));
}

/** Tire `n` éléments distincts, sans remise. */
function tirerSansRemise<T>(source: readonly T[], n: number, rng: () => number): T[] {
  const restant = [...source];
  const out: T[] = [];
  for (let i = 0; i < n && restant.length > 0; i++) {
    out.push(restant.splice(Math.floor(rng() * restant.length), 1)[0]);
  }
  return out;
}

/**
 * Compose l'étal d'une semaine. Pur et déterministe à `rng` donné : c'est ce
 * qui rend l'étal testable sans horloge.
 */
export function genererEtal(cleSemaine: string, rng: () => number = Math.random): EtalBazar {
  const categories = tirerSansRemise<CategorieObjet>(CATEGORIES, NB_LOTS_PIECES, rng);
  const lotsPieces: LotPiecesBazar[] = categories.map((categorie) => ({
    categorie,
    quantite: PIECES_PAR_LOT,
    prix: 1,
  }));

  const eligibles = poolPourTier(3).filter(
    (t) => t.prixRefBase >= VITRINE_VALEUR_MIN && t.prixRefBase <= VITRINE_VALEUR_MAX,
  );
  const choisi = eligibles[Math.floor(rng() * eligibles.length)];
  const vitrine: VitrineBazar | null = choisi
    ? {
        templateId: choisi.templateId,
        valeurBase: choisi.prixRefBase,
        prix: prixEnJetons(choisi.prixRefBase),
      }
    : null;

  return { cleSemaine, lotsPieces, vitrine };
}
