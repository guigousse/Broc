/**
 * Minutage de la cérémonie de bilan de fin de session (chinage, et vente
 * plus tard). Purement arithmétique : aucun DOM, aucun React — pour que
 * l'enchaînement se teste sans monter de composant.
 *
 * Le mouvement réduit ne passe PAS par ici : `BilanSession` court-circuite
 * en posant directement l'état final.
 */

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
/** Respiration entre la pastille composée et son envol. */
export const RESPIRATION_MS = 350;
/** Pause après la mise à jour de la barre, avant de quitter la session. */
export const PAUSE_FINALE_MS = 700;
/** Délai avant sortie quand le joueur passe la cérémonie d'un tap. */
export const SORTIE_APRES_PASSAGE_MS = 400;

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
 * Construit la frise de la cérémonie. `nbLignesXp` ne compte que les lignes
 * réellement affichées (montants non nuls) : à 0, il n'y a ni décompte ni
 * pastille, on dégèle et on sort.
 */
export function phasesCeremonie(nbItems: number, nbLignesXp: number): EtapeDatee[] {
  const etapes: EtapeDatee[] = [];

  for (let i = 0; i < nbItems; i++) {
    const depart = i * DECALAGE_ITEM_MS;
    etapes.push({ at: depart, etape: { type: "envolItem", index: i } });
    etapes.push({ at: depart + VOL_MS, etape: { type: "atterrissageItem", index: i } });
  }

  // Le décompte démarre quand le dernier sticker s'est posé.
  const finItems = nbItems > 0 ? (nbItems - 1) * DECALAGE_ITEM_MS + VOL_MS : 0;

  let degel: number;
  if (nbLignesXp > 0) {
    for (let j = 0; j < nbLignesXp; j++) {
      etapes.push({ at: finItems + j * CASCADE_XP_MS, etape: { type: "ligneXp", index: j } });
    }
    const pastille = finItems + nbLignesXp * CASCADE_XP_MS;
    etapes.push({ at: pastille, etape: { type: "pastille" } });
    const volPastille = pastille + POP_PASTILLE_MS + RESPIRATION_MS;
    etapes.push({ at: volPastille, etape: { type: "volPastille" } });
    degel = volPastille + VOL_MS;
  } else {
    degel = finItems;
  }

  etapes.push({ at: degel, etape: { type: "degel" } });
  etapes.push({ at: degel + PAUSE_FINALE_MS, etape: { type: "sortie" } });

  return etapes.sort((a, b) => a.at - b.at);
}
