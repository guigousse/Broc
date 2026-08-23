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
