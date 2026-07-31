/**
 * Reprise directe au lancement : au premier montage de l'écran-titre dans
 * un contexte JS FRAIS (lancement à froid de l'app), s'il existe une partie
 * dans le slot actif, on repart sur son bureau au lieu de montrer le menu.
 *
 * Le détecteur de « contexte frais » est volontairement en mémoire vive et
 * PAS en sessionStorage : sur Tauri iOS le sessionStorage persiste entre
 * lancements (cf. voile iris pré-boot), alors qu'un module JS est
 * réinitialisé exactement quand la webview redémarre — la sémantique voulue.
 *
 * ⚠ La reprise n'est due QUE si le contexte a démarré SUR le menu (« / »).
 * Un contexte né ailleurs — navigation dure de « Continuer » ou du lancement
 * de slot vers /bureau — n'a rien à reprendre : sans ce garde, l'écran-titre
 * s'y monterait plus tard avec un drapeau tout neuf et renverrait aussitôt
 * l'utilisateur au bureau, rendant le menu inatteignable (constaté en E2E).
 * D'où la capture du pathname À L'INITIALISATION du module, avant toute
 * navigation douce.
 */

const bootPathname =
  typeof window === "undefined" ? null : window.location.pathname;

let repriseTraitee =
  bootPathname !== null &&
  bootPathname !== "/" &&
  bootPathname !== "/index.html";

/** Vrai si la décision de reprise n'a pas encore été prise dans ce contexte JS. */
export function doitTraiterReprise(): boolean {
  return !repriseTraitee;
}

export function marquerRepriseTraitee(): void {
  repriseTraitee = true;
}

/** Test uniquement. */
export function _resetReprisePourTests(traitee = false): void {
  repriseTraitee = traitee;
}
