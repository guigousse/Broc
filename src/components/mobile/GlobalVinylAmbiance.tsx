"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { audioManager } from "@/lib/audio/audioManager";

/**
 * Contrôleur global d'ambiance gramophone basé sur la route.
 *
 * Dans le panorama (bureau), le layout (qg) pilote l'ambiance à
 * "pleine pièce" et la position de scroll module volume musique zone
 * par zone (cf. handleZoneIndex). `/stockage` et `/atelier` sont des
 * fenêtres flottantes DANS la pièce du bureau — l'ambiance zone-driven
 * du panorama continue derrière l'overlay, donc elles sont traitées
 * comme le panorama.
 *
 * Hors du groupe (qg) (chiner, vitrine, biblio…), on étouffe et on
 * baisse pour donner l'impression d'entendre la musique de loin —
 * sans interrompre la lecture. Détail :
 *  - chiner / vitrine     : franchement lointain (mur extérieur)
 *  - autres                : niveau "à distance" générique
 */

const PANORAMA_PATHS = new Set<string>(["/bureau", "/stockage", "/atelier"]);

interface Ambiance {
  volume: number;
  lowpassHz: number;
}

function ambianceForPathname(pathname: string): Ambiance | null {
  if (PANORAMA_PATHS.has(pathname)) return null; // panorama drives itself
  if (
    pathname.startsWith("/chiner") ||
    pathname.startsWith("/vitrine")
  ) {
    // Chiner / vendre : un peu plus présent (on est dehors mais la
    // musique du local "porte" encore correctement).
    return { volume: 0.32, lowpassHz: 700 };
  }
  // /, /bibliotheque, /collection, autres : à distance générique
  return { volume: 0.22, lowpassHz: 700 };
}

export function GlobalVinylAmbiance() {
  const pathname = usePathname();
  useEffect(() => {
    const a = ambianceForPathname(pathname);
    if (!a) return;
    // Hors panorama : on remet le gain musique à 1 (sinon la dernière
    // valeur zone-fade resterait, multipliée par l'ambiance = trop faible),
    // et c'est l'ambiance qui fait tout le boulot de mise à distance.
    audioManager.setVinylTargetVolume(1);
    audioManager.setVinylAmbianceVolume(a.volume);
    audioManager.setVinylAmbianceLowpass(a.lowpassHz);
  }, [pathname]);
  return null;
}
