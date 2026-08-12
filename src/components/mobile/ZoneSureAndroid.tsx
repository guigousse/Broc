"use client";

import { useEffect } from "react";
import { zonesSuresNatives } from "@/lib/zoneSureAndroid";

const HAUT = "--safe-top-natif";
const BAS = "--safe-bottom-natif";

/**
 * Publie les zones sûres mesurées par Android dans `--safe-top-natif` et
 * `--safe-bottom-natif`, que `globals.css` combine à `env(safe-area-inset-*)`.
 *
 * Ne rend rien, et reste inerte partout ailleurs : sans le pont natif, aucune
 * variable n'est posée et le repli `env()` garde la main (cf. src/lib/zoneSureAndroid).
 *
 * On relit à chaque redimensionnement — le signal que donne Android quand la
 * barre de navigation change de mode (gestes ↔ trois boutons) — et à chaque
 * retour au premier plan, car c'est là que la WebView perd ses insets.
 */
export function ZoneSureAndroid() {
  useEffect(() => {
    const appliquer = () => {
      const zones = zonesSuresNatives();
      const style = document.documentElement.style;
      if (zones === null) {
        style.removeProperty(HAUT);
        style.removeProperty(BAS);
        return;
      }
      style.setProperty(HAUT, `${zones.haut}px`);
      style.setProperty(BAS, `${zones.bas}px`);
    };

    appliquer();
    window.addEventListener("resize", appliquer);
    document.addEventListener("visibilitychange", appliquer);
    return () => {
      window.removeEventListener("resize", appliquer);
      document.removeEventListener("visibilitychange", appliquer);
      document.documentElement.style.removeProperty(HAUT);
      document.documentElement.style.removeProperty(BAS);
    };
  }, []);

  return null;
}
