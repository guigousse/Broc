import { tauriAndroidDisponible, tauriIosDisponible } from "@/lib/plateforme";

/**
 * Toutes les adresses vers l'extérieur du jeu, en un seul endroit. Le jour où
 * un compte est renommé ou un store ouvert, c'est CE fichier qu'on édite, et
 * aucun autre — c'est toute sa raison d'être.
 */

export const INSTAGRAM_URL = "https://instagram.com/broc.le.jeu";
export const TIKTOK_URL = "https://tiktok.com/@broc.le.jeu";

/** Identifiant App Store de Broc. */
const APP_STORE_ID = "6784023113";

/** Identifiant de paquet Android — cf. `tauri.conf.json`. */
const ANDROID_PACKAGE = "com.guigousse.broc";

/**
 * Broc n'est pas encore publié sur Google Play. Tant que c'est faux, le bouton
 * de notation reste MASQUÉ sur Android : un bouton qui ouvre une fiche
 * inexistante est pire que pas de bouton. Le jour de la sortie Play, cette
 * seule ligne bascule à `true`.
 */
export const PLAY_STORE_ACTIF = false;

/**
 * `itms-apps://` ouvre l'App Store SANS passer par le navigateur, et
 * `action=write-review` amène directement sur le formulaire d'avis.
 *
 * ⚠ Le code pays est obligatoire dans l'URL https de repli : sans lui,
 * `apps.apple.com/app/id…` fait une 301 vers `/us/` au lieu de géo-rediriger
 * (constat consigné dans `marketing/instagram/PROFIL_INSTAGRAM.md`).
 */
const APP_STORE_NATIF = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const APP_STORE_WEB = `https://apps.apple.com/fr/app/broc-jeu-de-brocante/id${APP_STORE_ID}`;
const PLAY_STORE_NATIF = `market://details?id=${ANDROID_PACKAGE}`;
const PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * L'adresse où laisser un avis, ou `null` s'il n'y a pas de fiche à ouvrir sur
 * cette plateforme. `null` n'est pas une erreur : c'est le signal que le bouton
 * de notation ne doit pas être rendu du tout.
 */
export function lienNotation(): string | null {
  if (tauriIosDisponible()) return APP_STORE_NATIF;
  if (tauriAndroidDisponible()) return PLAY_STORE_ACTIF ? PLAY_STORE_NATIF : null;
  // Web (le jeu est aussi déployé sur Vercel) : les schémas natifs n'y veulent
  // rien dire. Mais la plateforme du TÉLÉPHONE, elle, ne change pas parce
  // qu'on est dans un navigateur — un joueur Android sur le site ne peut pas
  // installer l'app depuis l'App Store. Même règle qu'en Tauri : pas de
  // fiche Play tant qu'elle n'existe pas (`PLAY_STORE_ACTIF`), donc pas de
  // bouton, plutôt qu'un bouton qui pointe vers le mauvais store.
  if (typeof window !== "undefined" && /Android/.test(window.navigator.userAgent)) {
    return PLAY_STORE_ACTIF ? PLAY_STORE_WEB : null;
  }
  return APP_STORE_WEB;
}
