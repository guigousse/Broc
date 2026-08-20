/**
 * Noms d'écran stables et NON localisés pour `screen_view`.
 *
 * Pourquoi manuellement : le suivi d'écran automatique de Firebase s'appuie
 * sur le cycle de vie des UIViewController. Dans une WebView Tauri il n'y en a
 * qu'un — sans cette table, tous les écrans du jeu seraient confondus en un
 * seul.
 *
 * Aucun identifiant de brocante ne doit entrer dans un nom d'écran : la route
 * est réduite à sa forme, jamais à son contenu.
 */
const EXACTS: Record<string, string> = {
  "/": "menu",
  // La route `/bazar` n'existe pas encore sur cette branche (Bazar vit sur
  // feat/jetons-bazar, non fusionnée) : cette entrée est inerte pour le
  // moment, mais correcte dès la fusion — à garder, pas du code mort.
  "/bazar": "bazar",
  "/bureau": "bureau",
  "/stockage": "stockage",
  "/atelier": "atelier",
  "/collection": "collection",
  "/bibliotheque": "bibliotheque",
};

export function nomEcran(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  if (EXACTS[pathname]) return EXACTS[pathname];
  if (pathname === "/vitrine/prep") return "vitrine-prep";
  if (pathname.startsWith("/vitrine/") && pathname.endsWith("/journee")) return "vitrine-journee";
  if (pathname === "/vitrine" || pathname.startsWith("/vitrine/")) return "vitrine";
  if (pathname === "/chiner" || pathname.startsWith("/chiner/")) return "chiner";
  return null;
}
