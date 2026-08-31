import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/**
 * Le « déjà vu » du soutien : la demande de notation du niveau 10.
 *
 * (La borne d'arcade en avait un elle aussi, tant que son pop-up ne s'ouvrait
 * qu'une fois par appareil. Elle répond désormais à chaque tap — voir
 * `EcranArcade` — et le drapeau est parti avec.)
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

const CLE_NOTATION_NIVEAU = "projet-broc:soutien:notation-niveau:v1";

// Repli en mémoire, pour quand l'écriture disque échoue (quota dépassé,
// stockage désactivé en navigation privée, WebView capricieuse).
// `safeLocalStorageSet` renvoie `false` dans ce cas précisément pour qu'on
// puisse réagir : sans ce drapeau, `notationNiveauFaite()` répondrait faux
// pour toujours et la feuille de notation reviendrait à chaque niveau 10.
// Il ne survit pas un rechargement de page, mais garantit au moins « une
// fois par session » quand le disque ne répond pas.
let notationNiveauFaiteEnMemoire = false;

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
