import type { EtatObjet, GameState, Objet } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";
import { recalculerPrixReference } from "@/lib/etat";
import { stockageEstPlein } from "@/lib/stockage";
import { PRIX_JETON_EUROS } from "./etal";

/**
 * L'état dans lequel le Bazar vend ses objets : le tenancier ne propose que
 * des pièces impeccables, et c'est son argument de vente.
 *
 * Exportée parce que l'ÉTAGÈRE l'affiche désormais en étoiles au pied de
 * chaque case (2026-08-26) : la vitrine doit promettre ce que l'achat livre,
 * et deux constantes séparées auraient dérivé en silence.
 */
export const ETAT_ARTICLE_BAZAR: EtatObjet = "Pristin état";

/**
 * Ce que le joueur peut acheter à l'étal. Défini ICI — la vue l'importe.
 *
 * Une seule forme pour les deux étagères : un genre et un index de case. La
 * planche du bas vend des lots de pièces (stock illimité), celle du haut des
 * objets uniques, un par gamme de prix (cf. `GAMMES_BAZAR`).
 */
export type AchatBazar =
  | { type: "pieces"; index: number }
  | { type: "objet"; index: number };

export type RaisonRefus = "jetons" | "indisponible" | "stockagePlein";

export type ResultatAchat =
  | { ok: true; state: GameState }
  | { ok: false; raison: RaisonRefus };

/** Achète le lot de pièces à l'index donné. Stock illimité : l'étal ne bouge pas. */
export function acheterLotPieces(state: GameState, index: number): ResultatAchat {
  const lot = state.bazar?.lotsPieces[index];
  if (!lot) return { ok: false, raison: "indisponible" };
  if (state.jetons < lot.prix) return { ok: false, raison: "jetons" };
  return {
    ok: true,
    state: {
      ...state,
      jetons: state.jetons - lot.prix,
      piecesAmelioration: {
        ...state.piecesAmelioration,
        [lot.categorie]: (state.piecesAmelioration[lot.categorie] ?? 0) + lot.quantite,
      },
    },
  };
}

/**
 * Achète l'objet de la case `index` sur l'étagère du haut. Exemplaire unique :
 * SA case se vide jusqu'à la rotation, les deux autres ne bougent pas.
 *
 * Les trois gammes suivent la même règle — seul le prix les distingue.
 *
 * L'objet entre en stock avec un `prixAchat` en EUROS égal à ce que le joueur a
 * payé en jetons (prix × 25). Sans lui, sa revente compterait comme un bénéfice
 * intégral, ce qui validerait les quêtes de bénéfice — lesquelles paient des
 * jetons. La boucle serait fermée et rentable.
 */
export function acheterArticle(
  state: GameState,
  index: number,
  now: number,
): ResultatAchat {
  const v = state.bazar?.articles[index];
  // `vendu` autant que `null` : depuis le 2026-08-26 l'article acheté reste sur
  // l'étagère pour s'y montrer tamponné, il n'est plus effacé — sans ce garde,
  // il redeviendrait achetable en boucle.
  if (!v || v.vendu) return { ok: false, raison: "indisponible" };
  if (state.jetons < v.prix) return { ok: false, raison: "jetons" };
  const template = getTemplate(v.templateId);
  if (!template) return { ok: false, raison: "indisponible" };
  // Comme tous les autres chemins d'acquisition (ajouterObjet, acheterObjet,
  // boîte mystère, porte grise) : le Bazar respecte la capacité de stockage.
  // Les lots de pièces ne sont pas concernés — les pièces ne prennent pas de
  // place.
  if (stockageEstPlein(state)) return { ok: false, raison: "stockagePlein" };

  const objet: Objet = {
    id: `bazar_${v.templateId}_${now}`,
    templateId: template.templateId,
    nom: template.nom,
    categorie: template.categorie,
    prixReferenceReel: recalculerPrixReference(v.valeurBase, "Très bon", ETAT_ARTICLE_BAZAR),
    etat: ETAT_ARTICLE_BAZAR,
    rarete: template.rarete,
    prixAchat: v.prix * PRIX_JETON_EUROS,
  };

  return {
    ok: true,
    state: {
      ...state,
      jetons: state.jetons - v.prix,
      inventaireJoueur: [...state.inventaireJoueur, objet],
      bazar: {
        ...state.bazar!,
        // MARQUÉ, pas effacé : l'étagère garde l'objet pour le montrer vendu.
        articles: state.bazar!.articles.map((a, i) =>
          i === index && a ? { ...a, vendu: true } : a,
        ),
      },
    },
  };
}
