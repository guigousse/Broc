import { CATEGORIES } from "@/data/categories";
import { poolPourTier } from "@/data/objetTemplates";
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { CategorieObjet, EtalBazar, LotPiecesBazar, ObjetBazar } from "@/types/game";

/** Ratio fixe de la monnaie du Bazar. 1 jeton = 25 €, à vie. */
export const PRIX_JETON_EUROS = 25;
/** Pièces de restauration livrées par lot. */
export const PIECES_PAR_LOT = 5;
/**
 * Lots de pièces présentés simultanément. Un seul depuis le classeur/album
 * de collection (2026-08-30) : les jetons ont désormais un autre débouché
 * (albums et paquets), la planche du bas n'a plus besoin de trois gammes
 * pour donner un horizon d'épargne.
 */
export const NB_LOTS_PIECES = 1;
/**
 * Les trois gammes de l'étagère du haut, dans l'ordre des cases 1-2-3 : une
 * trouvaille modeste, la vitrine de la semaine, une pièce de caractère.
 *
 * C'est le bouton de réglage de tout l'écran. Le prix monte le long de la
 * planche, et c'est ce qui donne au Bazar un horizon au-delà du premier mois :
 * à ~14 jetons de revenu hebdomadaire (7 quotidiennes à 1 + 2-3 hebdos à 3),
 * la case modeste est accessible tout de suite et la pièce de caractère
 * demande deux à trois semaines d'épargne.
 *
 * Bornes DISJOINTES : un même template ne peut pas se retrouver dans deux
 * cases à la fois. `etal.test.ts` le vérifie, ainsi que le fait qu'aucune
 * gamme ne soit à sec — le catalogue bouge, et une gamme vide poserait une
 * case morte en silence.
 */
export const GAMMES_BAZAR = [
  { cle: "modeste", min: 25, max: 99 },
  { cle: "vitrine", min: 100, max: 400 },
  { cle: "caractere", min: 401, max: 1000 },
] as const;

export type GammeBazar = (typeof GAMMES_BAZAR)[number];

/** Les templates éligibles à une gamme. */
export function poolDeGamme(gamme: GammeBazar): ObjetTemplate[] {
  return poolPourTier(3).filter(
    (t) => t.prixRefBase >= gamme.min && t.prixRefBase <= gamme.max,
  );
}

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

  // Un tirage par gamme, indépendants : les bornes étant disjointes, deux
  // cases ne peuvent pas tomber sur le même objet.
  const articles: (ObjetBazar | null)[] = GAMMES_BAZAR.map((gamme) => {
    const eligibles = poolDeGamme(gamme);
    const choisi = eligibles[Math.floor(rng() * eligibles.length)];
    return choisi
      ? {
          templateId: choisi.templateId,
          valeurBase: choisi.prixRefBase,
          prix: prixEnJetons(choisi.prixRefBase),
        }
      : null;
  });

  return { cleSemaine, lotsPieces, articles };
}
