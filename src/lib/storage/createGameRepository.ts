import type { GameRepository } from "./gameRepository";
import { fichierGameRepository } from "./fichierGameRepository";
import { localGameRepository } from "./localGameRepository";
import { tauriDisponible } from "@/lib/plateforme";

/**
 * Point unique de décision. Sous Tauri (iOS, Android), la sauvegarde vit dans
 * un fichier écrit atomiquement dont l'échec est observable ; le localStorage
 * reste en miroir de secours. Dans un navigateur (`next dev`), il n'y a pas de
 * commande native : on garde le chemin historique.
 */
export function createGameRepository(): GameRepository {
  return tauriDisponible() ? fichierGameRepository : localGameRepository;
}

let repositoryMemoise: GameRepository | null = null;

/**
 * Ruling R12 — `createGameRepository()` reste pur (utile pour les tests
 * ci-dessus), mais un appelant qui l'invoque UNE FOIS à l'évaluation d'un
 * module (comme `GameContext.tsx`, en haut de fichier) fige la décision au
 * moment où ce module se charge. Avant le cutover c'était sans conséquence,
 * la réponse étant constante ; elle dépend désormais de
 * `__TAURI_INTERNALS__`, injecté par le runtime Tauri — rien ne garantit
 * qu'il soit déjà présent à l'évaluation du bundle plutôt qu'un instant
 * après.
 *
 * Cet accesseur retarde donc l'appel jusqu'au premier usage réel (à
 * l'intérieur d'un effet ou d'un handler, forcément après le montage) ET
 * mémoïse le résultat, pour qu'un `__TAURI_INTERNALS__` qui apparaîtrait
 * ENTRE deux appels ne fasse pas basculer l'implémentation en cours de
 * session — un tel changement à mi-partie romprait justement l'invariant
 * du composite (Ruling R6/R11 : un seul magasin fait foi par session).
 */
export function obtenirGameRepository(): GameRepository {
  if (!repositoryMemoise) repositoryMemoise = createGameRepository();
  return repositoryMemoise;
}
