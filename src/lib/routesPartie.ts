/**
 * Routes DE LA PARTIE — source unique de vérité pour le chrome global
 * (bannière de tutoriel, écran de level-up…).
 *
 * Le contexte de jeu garde la save du slot actif chargée même hors partie
 * (écran titre, mentions légales, confidentialité) : un composant global qui
 * ne se fie qu'à `state` s'affiche donc aussi par-dessus le menu principal.
 * D'où cette liste blanche, plutôt qu'une liste noire des écrans hors partie.
 * (Retours device : bannière tutoriel 2026-07-17, level-up 2026-07-25.)
 */
export const ROUTES_PARTIE = [
  "/bureau",
  "/stockage",
  "/atelier",
  "/collection",
  "/bibliotheque",
  "/chiner",
  "/vitrine",
] as const;

/** Vrai si `pathname` est un écran de la partie en cours. */
export function estRoutePartie(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ROUTES_PARTIE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
