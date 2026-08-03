"use client";

import { useEffect } from "react";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { getIapProvider } from "@/lib/iap/iapProvider";
import { tauriIosDisponible } from "@/lib/plateforme";

/**
 * Au boot (Tauri iOS uniquement) : revalide l'achat « Énergie infinie »
 * auprès de StoreKit (source de vérité) et réécrit le cache localStorage —
 * couvre aussi le remboursement (le drapeau retombe). Rend rien ; toute
 * erreur est avalée (une panne d'IAP ne doit jamais casser le jeu, et le
 * cache local reste alors en l'état).
 */
export function IapBootstrap() {
  useEffect(() => {
    if (!tauriIosDisponible()) return;
    getIapProvider()
      .verifierEntitlement()
      .then((actif) => definirEnergieInfinie(actif))
      .catch(() => {});
  }, []);
  return null;
}
