import type {
  CategorieObjet,
  CollectionSlot,
  EtatObjet,
  GameState,
  Objet,
} from "@/types/game";
import {
  peutRestaurerBonVersTresBon,
  peutRestaurerMauvaisVersBon,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { getCapaciteAtelier } from "@/data/atelier";
import { recalculerPrixReference } from "@/lib/etat";
import { tr, type DictionnaireUI } from "@/lib/i18n/ui";
import { libelleCategorie } from "@/lib/i18n/libelles";

/** Renvoie l'état cible naturel pour la prochaine restauration, ou null si déjà Pristin. */
export function prochaineEtatCible(etat: EtatObjet): EtatObjet | null {
  if (etat === "Mauvais") return "Bon";
  if (etat === "Bon") return "Très bon";
  if (etat === "Très bon") return "Pristin état";
  return null;
}

/** Vrai si le joueur a la compétence pour cette transition d'état précise. */
export function peutRestaurerTransition(
  state: GameState,
  cat: CategorieObjet,
  etatActuel: EtatObjet,
): boolean {
  if (etatActuel === "Mauvais") return peutRestaurerMauvaisVersBon(state, cat);
  if (etatActuel === "Bon") return peutRestaurerBonVersTresBon(state, cat);
  if (etatActuel === "Très bon")
    return peutRestaurerTresBonVersPristin(state, cat);
  return false;
}

/** Cherche le slot collection pour un templateId donné. Retourne null si introuvable. */
export function trouverSlotCollection(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): CollectionSlot | null {
  for (const cat of Object.keys(collection) as CategorieObjet[]) {
    const slots = collection[cat] ?? [];
    const slot = slots.find((s) => s.templateId === templateId);
    if (slot) return slot;
  }
  return null;
}

/** Nombre d'objets actuellement en restauration. */
export function nbRestaurationsEnCours(state: GameState): number {
  return state.inventaireJoueur.filter((o) => o.enRestauration).length;
}

/** Vrai si on peut accueillir une restauration supplémentaire. */
export function atelierAuneSlotLibre(state: GameState): boolean {
  return nbRestaurationsEnCours(state) < getCapaciteAtelier(state.niveauAtelier);
}

export interface AtelierStatus {
  disponible: boolean;
  raison?: string;
}

/**
 * Calcule si un objet précis peut être envoyé à l'atelier. La `raison` d'échec
 * est localisée (SP4 i18n) via le dictionnaire injecté ; les valeurs de logique
 * ne changent pas.
 */
export function atelierStatusPourObjet(
  state: GameState,
  o: Objet,
  d: DictionnaireUI,
): AtelierStatus {
  const R = d.raisons;
  if (o.enRestauration) return { disponible: false, raison: R.dejaEnCours };
  if (o.etat === "Pristin état")
    return { disponible: false, raison: R.dejaParfaitEtat };
  if (!atelierAuneSlotLibre(state))
    return { disponible: false, raison: R.atelierPleinSimple };
  const cible = prochaineEtatCible(o.etat);
  if (!cible) return { disponible: false, raison: R.nonRestaurable };
  if (!peutRestaurerTransition(state, o.categorie, o.etat))
    return { disponible: false, raison: R.competenceReparerManquanteSimple };
  const cout = coutAmelioration(o, cible);
  const dispo = state.piecesAmelioration[o.categorie] ?? 0;
  if (dispo < cout)
    return {
      disponible: false,
      raison: tr(cout - dispo > 1 ? R.manquePiecesN : R.manquePiecesUn, {
        n: cout - dispo,
        categorie: libelleCategorie(o.categorie, d),
      }),
    };
  return { disponible: true };
}

export interface CollectionStatus {
  disponible: boolean;
  necessiteConfirmation: boolean;
  /** Un exemplaire du même template, dans le MÊME état, est déjà donné. */
  dejaIdentique?: boolean;
  ancienneDonation?: { etat: EtatObjet; valeur: number };
}

/** Calcule si un objet précis peut être donné à la collection. */
export function collectionStatusPourObjet(
  state: GameState,
  o: Objet,
): CollectionStatus {
  if (o.enRestauration)
    return { disponible: false, necessiteConfirmation: false };
  const slot = trouverSlotCollection(state.collection, o.templateId);
  if (!slot) return { disponible: true, necessiteConfirmation: false };
  if (slot.donation === null)
    return { disponible: true, necessiteConfirmation: false };
  if (slot.donation.etat === o.etat) {
    return {
      disponible: false,
      necessiteConfirmation: false,
      dejaIdentique: true,
    };
  }
  return {
    disponible: true,
    necessiteConfirmation: true,
    ancienneDonation: slot.donation,
  };
}

/**
 * Coût en pièces de la catégorie pour faire passer `o` de son état actuel
 * à `cible`. Min 1 pièce. Formule : ceil(gain_prixRef / 10) — une pièce
 * "vaut" ~5 € au démantèlement, la restauration laisse donc ~la moitié
 * du gain en marge nette.
 */
export function coutAmelioration(o: Objet, cible: EtatObjet): number {
  const prixApres = recalculerPrixReference(o.prixReferenceReel, o.etat, cible);
  const gain = Math.max(0, prixApres - o.prixReferenceReel);
  return Math.max(1, Math.ceil(gain / 10));
}

/**
 * Pièces rendues par le démantèlement d'un objet, basées sur son prix de
 * référence courant (donc état-dépendant). Min 1 pièce. Formule : floor(prix / 5).
 */
export function rendementDemantelement(o: Objet): number {
  return Math.max(1, Math.floor(o.prixReferenceReel / 5));
}

/**
 * Applique la fin de restauration d'un objet : mute son état vers `etatCible`,
 * recalcule son prix de référence, et efface `enRestauration`. Trace la
 * restauration accomplie dans `state.restaurations` (bornée aux 100 dernières),
 * consommé par `progressionObjectif` pour l'objectif "restauration". Retourne
 * null si l'objet n'existe pas, n'est pas en restauration, ou si la restauration
 * n'est pas encore terminée (`now < finMs`). `now` = temps de confiance (epoch ms).
 *
 * Helper pur — appelé par GameContext.
 */
export function appliquerRecuperation(
  state: GameState,
  objetId: string,
  now: number,
  // Timestamp de la trace `state.restaurations`. Par défaut `now`, mais la fin
  // immédiate via pub force `now = finMs` (potentiellement 30 min dans le
  // futur) : elle passe ici le temps réel pour ne pas horodater dans le futur
  // (sinon un objectif de chapitre accepté APRÈS la restauration la compterait).
  traceTimestamp: number = now,
): GameState | null {
  const objet = state.inventaireJoueur.find((o) => o.id === objetId);
  if (!objet || !objet.enRestauration) return null;
  if (now < objet.enRestauration.finMs) return null;
  const cible = objet.enRestauration.etatCible;
  const inv = state.inventaireJoueur.map((o) =>
    o.id === objetId
      ? {
          ...o,
          etat: cible,
          prixReferenceReel: recalculerPrixReference(
            o.prixReferenceReel,
            o.etat,
            cible,
          ),
          enRestauration: undefined,
        }
      : o,
  );
  const restaurations = [
    ...(state.restaurations ?? []),
    { timestamp: traceTimestamp, etatFinal: cible },
  ].slice(-100);
  return { ...state, inventaireJoueur: inv, restaurations };
}

/** Calcule si un objet peut être démantelé (en stock, hors restauration, hors vitrine). */
export function peutDemanteler(
  state: GameState,
  o: Objet,
  d: DictionnaireUI,
): AtelierStatus {
  if (o.enRestauration)
    return { disponible: false, raison: d.raisons.objetEnRestauration };
  // Un objet en vitrine n'est PAS dans inventaireJoueur (cf. mettreEnVitrine
  // qui le déplace), donc tester sa présence dans l'inventaire suffit.
  const enStock = state.inventaireJoueur.some((x) => x.id === o.id);
  if (!enStock)
    return { disponible: false, raison: d.raisons.objetIntrouvableStock };
  return { disponible: true };
}
