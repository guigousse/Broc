"use client";

import { useEffect } from "react";
import { getAdProvider } from "@/lib/ads/adProvider";
import { AdMobAdProvider, adMobDisponible } from "@/lib/ads/adMobProvider";

/**
 * Déclenche au boot (Tauri iOS uniquement) le parcours de consentement
 * UMP/ATT puis le préchargement d'une rewarded ad, pour que la première
 * demande de pub du joueur soit instantanée. Rend rien ; toute erreur est
 * avalée (une panne de pub ne doit jamais casser le jeu).
 */
export function AdMobBootstrap() {
  useEffect(() => {
    if (!adMobDisponible()) return;
    const provider = getAdProvider();
    if (provider instanceof AdMobAdProvider) {
      provider.initialiser().catch(() => {});
    }
  }, []);
  return null;
}
