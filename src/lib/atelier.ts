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

/** Calcule si un objet précis peut être envoyé à l'atelier. */
export function atelierStatusPourObjet(
  state: GameState,
  o: Objet,
): AtelierStatus {
  if (o.enRestauration) return { disponible: false, raison: "Déjà en cours." };
  if (o.etat === "Pristin état")
    return { disponible: false, raison: "Déjà en parfait état." };
  if (!atelierAuneSlotLibre(state))
    return { disponible: false, raison: "Atelier plein." };
  if (!prochaineEtatCible(o.etat))
    return { disponible: false, raison: "Non restaurable." };
  if (!peutRestaurerTransition(state, o.categorie, o.etat))
    return { disponible: false, raison: "Compétence Réparer manquante." };
  return { disponible: true };
}

export interface CollectionStatus {
  disponible: boolean;
  necessiteConfirmation: boolean;
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
    return { disponible: false, necessiteConfirmation: false };
  }
  return {
    disponible: true,
    necessiteConfirmation: true,
    ancienneDonation: slot.donation,
  };
}
