/**
 * Contexte de jeu injecté dans CHAQUE événement.
 *
 * Pourquoi un paramètre d'événement et pas une propriété utilisateur : une
 * propriété utilisateur GA4 ne conserve que sa DERNIÈRE valeur. Un joueur
 * arrivé au jour 80 verrait ses événements du jour 3 étiquetés « jour 80 »,
 * ce qui rend toute analyse de décrochage fausse.
 *
 * Le lecteur est poussé par <FirebaseBootstrap/> plutôt qu'importé : cette lib
 * ne doit dépendre ni de React ni de GameContext.
 */
import { getAnalytics, type ParamsEvenement } from "./analytics";

/** `null` = pas de partie en cours (menu, crédits, pages légales). */
export type ContexteJeu = { jour: number; niveau: number } | null;

let lecteur: (() => ContexteJeu) | null = null;

export function definirLecteurContexte(f: (() => ContexteJeu) | null): void {
  lecteur = f;
}

/**
 * Tranches de jour de jeu. Déclarée en DIMENSION côté console (le `jour` brut,
 * lui, est une MÉTRIQUE numérique : pas de plafond de cardinalité, et on
 * obtient moyennes et médianes).
 */
export function trancheJour(jour: number): string {
  if (jour <= 7) return "1-7";
  if (jour <= 14) return "8-14";
  if (jour <= 30) return "15-30";
  if (jour <= 60) return "31-60";
  return "61+";
}

export function contexteCourant(): ParamsEvenement {
  if (!lecteur) return {};
  let ctx: ContexteJeu;
  try {
    ctx = lecteur();
  } catch {
    // Le lecteur touche l'état React : s'il n'est pas prêt, on mesure sans
    // contexte plutôt que de casser l'appelant.
    return {};
  }
  if (!ctx) return {};
  return { jour: ctx.jour, jour_tranche: trancheJour(ctx.jour), niveau: ctx.niveau };
}

/**
 * LE point d'entrée de mesure du jeu. Tout passe par ici — jamais par
 * `getAnalytics().logEvent` en direct, sinon le contexte manque.
 */
export function logEvenement(nom: string, params: ParamsEvenement = {}): void {
  try {
    getAnalytics().logEvent(nom, { ...contexteCourant(), ...params });
  } catch {
    // Une panne de mesure ne casse pas une partie.
  }
}
