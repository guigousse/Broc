/**
 * Minutage de la cérémonie de bilan de fin de session (chinage, et vente
 * plus tard). Purement arithmétique : aucun DOM, aucun React — pour que
 * l'enchaînement se teste sans monter de composant.
 *
 * Le mouvement réduit ne passe PAS par ici : `BilanSession` court-circuite
 * en posant directement l'état final.
 */

import { auPlafondNiveau } from "@/lib/xp";

/** Écart entre deux envols d'items consécutifs. */
export const DECALAGE_ITEM_MS = 220;
/** Durée d'un vol (item ou pastille) — doit rester alignée sur le défaut de `flyToTab`. */
export const VOL_MS = 620;
/** Effacement d'une ligne d'item derrière son sticker (fondu + effondrement). */
export const EFFACEMENT_LIGNE_MS = 260;
/** Écart entre deux lignes du décompte XP. */
export const CASCADE_XP_MS = 180;
/** Apparition de la pastille de total XP. */
export const POP_PASTILLE_MS = 300;
/** Pause après la mise à jour de la barre, avant de quitter la session. */
export const PAUSE_FINALE_MS = 1000;
/** Délai avant sortie quand le joueur passe la cérémonie d'un tap. */
export const SORTIE_APRES_PASSAGE_MS = 400;

/**
 * Décompte d'XP réellement montrable au bilan de cette session.
 *
 * Au niveau maximum, l'XP continue d'être créditée dans la save mais ne
 * produit plus rien : la mettre en scène (cascade des lignes, pastille qui
 * s'envole vers une barre déjà pleine) promet une progression qui n'existe
 * pas. On rend donc un décompte vide, et la cérémonie se réduit d'elle-même
 * aux envols d'objets (`phasesEnvoiItems` ne compte que les lignes affichées).
 *
 * Le verdict se prend sur l'instantané d'ENTRÉE de session, pas sur l'état
 * courant : la session qui fait justement passer au niveau 100 doit encore
 * montrer l'XP qui l'a portée là. `null` (aucun instantané) laisse tout
 * passer — le silence doit être prouvé, jamais supposé.
 */
export function lignesXpDuBilan<T extends { montant: number }>(
  lignes: readonly T[],
  brocanteurEntree: { niveau: number } | null | undefined,
): readonly T[] {
  if (!brocanteurEntree || !auPlafondNiveau(brocanteurEntree)) return lignes;
  return [];
}

export type EtapeCeremonie =
  /** Le sticker de l'item `index` part vers le stockage, sa ligne s'efface. */
  | { type: "envolItem"; index: number }
  /** Le sticker de l'item `index` atterrit : compteur de stockage +1. */
  | { type: "atterrissageItem"; index: number }
  /** La ligne `index` du décompte XP apparaît. */
  | { type: "ligneXp"; index: number }
  /** La pastille de total XP apparaît. */
  | { type: "pastille" }
  /** La pastille part vers la barre de niveau du header. */
  | { type: "volPastille" }
  /** La pastille a atterri : la barre de niveau reprend sa vraie valeur. */
  | { type: "degel" }
  /** Fin de cérémonie : enregistrement de la session et retour au QG. */
  | { type: "sortie" };

export interface EtapeDatee {
  /** Date de l'étape en ms, depuis le lancement de la cérémonie. */
  at: number;
  etape: EtapeCeremonie;
}

/**
 * Acte 1 — « Continuer » : les objets s'envolent vers le stockage, puis le
 * décompte d'expérience se compose et sa pastille apparaît. La frise s'arrête
 * là : c'est au joueur de déclencher l'acte 2.
 *
 * `nbLignesXp` ne compte que les lignes réellement affichées (montants non
 * nuls) : à 0, la frise se réduit aux envols.
 */
export function phasesEnvoiItems(nbItems: number, nbLignesXp: number): EtapeDatee[] {
  const etapes: EtapeDatee[] = [];

  for (let i = 0; i < nbItems; i++) {
    const depart = i * DECALAGE_ITEM_MS;
    etapes.push({ at: depart, etape: { type: "envolItem", index: i } });
    etapes.push({ at: depart + VOL_MS, etape: { type: "atterrissageItem", index: i } });
  }

  // Le décompte démarre quand le dernier sticker s'est posé.
  const finItems = nbItems > 0 ? (nbItems - 1) * DECALAGE_ITEM_MS + VOL_MS : 0;

  if (nbLignesXp > 0) {
    for (let j = 0; j < nbLignesXp; j++) {
      etapes.push({ at: finItems + j * CASCADE_XP_MS, etape: { type: "ligneXp", index: j } });
    }
    etapes.push({
      at: finItems + nbLignesXp * CASCADE_XP_MS,
      etape: { type: "pastille" },
    });
  }

  return etapes.sort((a, b) => a.at - b.at);
}

/**
 * Acte 2 — « Rentrer à la boutique » : la pastille part vers la barre de
 * niveau, qui reprend sa vraie valeur à l'atterrissage, puis on quitte la
 * session après une pause pour laisser voir la progression.
 *
 * Sans pastille (aucune XP gagnée), il n'y a rien à envoyer : on dégèle — sans
 * effet visible — et on sort, pour que le bouton tienne sa promesse quoi qu'il
 * arrive.
 */
export function phasesEnvoiXp(avecPastille: boolean): EtapeDatee[] {
  const degel = avecPastille ? VOL_MS : 0;
  const etapes: EtapeDatee[] = [];
  if (avecPastille) etapes.push({ at: 0, etape: { type: "volPastille" } });
  etapes.push({ at: degel, etape: { type: "degel" } });
  etapes.push({ at: degel + PAUSE_FINALE_MS, etape: { type: "sortie" } });
  return etapes;
}
