import { useSyncExternalStore } from "react";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/**
 * Drapeau « Énergie infinie » — clé DEVICE, volontairement HORS des slots de
 * save : l'achat (lié à l'Apple ID) vaut pour toutes les parties, existantes
 * et futures. Cache d'affichage seulement : StoreKit reste la source de
 * vérité, IapBootstrap réécrit la valeur à chaque lancement (couvre le
 * remboursement).
 */
const CLE = "broc.energieInfinie";
export const EVENEMENT_ENERGIE_INFINIE = "broc:energie-infinie";

export function energieInfinieActive(): boolean {
  return safeLocalStorageGet<boolean>(CLE, false) === true;
}

/** Pose/retire le drapeau et notifie l'UI (header, machine, GameContext). */
export function definirEnergieInfinie(active: boolean): void {
  safeLocalStorageSet(CLE, active);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENEMENT_ENERGIE_INFINIE));
  }
}

function souscrire(cb: () => void): () => void {
  window.addEventListener(EVENEMENT_ENERGIE_INFINIE, cb);
  // `storage` : synchronise d'éventuels autres onglets (web dev).
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENEMENT_ENERGIE_INFINIE, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Version réactive pour l'UI (SSR : false). */
export function useEnergieInfinie(): boolean {
  return useSyncExternalStore(souscrire, energieInfinieActive, () => false);
}
