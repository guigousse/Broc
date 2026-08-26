import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/**
 * Les deux « déjà vu » du soutien — le pop-up de la borne et la demande de
 * notation du niveau 10.
 *
 * POURQUOI `localStorage` ET PAS LE `GameState`. Le dépôt range ce genre de
 * drapeau dans l'état de partie (`miniTutoVinyle`, `miniTutoCarnet`,
 * `miniTutoAtelier`), et l'écart mérite d'être justifié ici : le `GameState`
 * est PAR EMPLACEMENT DE SAUVEGARDE. Un joueur qui mène trois parties verrait
 * le pop-up trois fois. Or la demande de soutien s'adresse à la personne qui
 * tient le téléphone, pas au brocanteur qu'elle incarne — elle ne fait pas
 * partie de la fiction, et n'a donc rien à faire dans une sauvegarde.
 *
 * Bénéfice secondaire : aucun champ ajouté à `GameState`, donc aucune
 * migration de sauvegarde à écrire.
 */

const CLE_POPUP_BORNE = "projet-broc:soutien:borne:v1";
const CLE_NOTATION_NIVEAU = "projet-broc:soutien:notation-niveau:v1";

export function popupBorneVu(): boolean {
  return safeLocalStorageGet<boolean>(CLE_POPUP_BORNE, false) === true;
}

export function marquerPopupBorneVu(): void {
  safeLocalStorageSet(CLE_POPUP_BORNE, true);
}

export function notationNiveauFaite(): boolean {
  return safeLocalStorageGet<boolean>(CLE_NOTATION_NIVEAU, false) === true;
}

export function marquerNotationNiveauFaite(): void {
  safeLocalStorageSet(CLE_NOTATION_NIVEAU, true);
}
