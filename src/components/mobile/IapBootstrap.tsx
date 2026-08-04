"use client";

import { useEffect } from "react";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { getIapProvider } from "@/lib/iap/iapProvider";
import { tauriIosDisponible } from "@/lib/plateforme";

/**
 * Au boot ET au retour au premier plan (Tauri iOS uniquement) : revalide
 * l'achat « Énergie infinie » auprès de StoreKit (source de vérité) et
 * réécrit le cache localStorage — couvre aussi le remboursement (le drapeau
 * retombe) et l'Ask-to-Buy approuvé pendant que l'app était en arrière-plan
 * (la webview reste vivante sur iOS, donc le mount seul ne suffit pas).
 * Rend rien ; toute erreur est avalée (une panne d'IAP ne doit jamais casser
 * le jeu, et le cache local reste alors en l'état).
 */
export function IapBootstrap() {
  useEffect(() => {
    if (!tauriIosDisponible()) return;

    const revalider = () => {
      getIapProvider()
        .verifierEntitlement()
        .then((actif) => definirEnergieInfinie(actif))
        .catch(() => {});
    };

    revalider();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") revalider();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  return null;
}
