import type { GameState, Objet } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";
import { recalculerPrixReference } from "@/lib/etat";
import { stockageEstPlein } from "@/lib/stockage";
import { PRIX_JETON_EUROS } from "./etal";

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
  if (!v) return { ok: false, raison: "indisponible" };
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
    prixReferenceReel: recalculerPrixReference(v.valeurBase, "Très bon", "Pristin état"),
    etat: "Pristin état",
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
        articles: state.bazar!.articles.map((a, i) => (i === index ? null : a)),
      },
    },
  };
}
