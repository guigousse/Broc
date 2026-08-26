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

// Repli en mémoire, pour quand l'écriture disque échoue (quota dépassé,
// stockage désactivé en navigation privée, WebView capricieuse).
// `safeLocalStorageSet` renvoie `false` dans ce cas précisément pour qu'on
// puisse réagir — l'ignorer laisserait `popupBorneVu()` répondre faux pour
// toujours, et le pop-up se rouvrirait à CHAQUE tap sur la borne : c'est le
// harcèlement que la spec §3 nomme explicitement (onze fois de suite) comme
// le comportement à ne pas produire. Ce drapeau ne survit pas un rechargement
// de page, mais garantit au moins « une fois par session » quand le disque
// ne répond pas — largement suffisant, la persistance réelle restant le
// chemin normal.
let popupBorneVuEnMemoire = false;
let notationNiveauFaiteEnMemoire = false;

export function popupBorneVu(): boolean {
  return (
    popupBorneVuEnMemoire ||
    safeLocalStorageGet<boolean>(CLE_POPUP_BORNE, false) === true
  );
}

export function marquerPopupBorneVu(): void {
  popupBorneVuEnMemoire = true;
  safeLocalStorageSet(CLE_POPUP_BORNE, true);
}

export function notationNiveauFaite(): boolean {
  return (
    notationNiveauFaiteEnMemoire ||
    safeLocalStorageGet<boolean>(CLE_NOTATION_NIVEAU, false) === true
  );
}

export function marquerNotationNiveauFaite(): void {
  notationNiveauFaiteEnMemoire = true;
  safeLocalStorageSet(CLE_NOTATION_NIVEAU, true);
}
