"use client";

import { useEffect } from "react";
import { audioManager } from "@/lib/audio/audioManager";
import { installerSonNotif } from "@/lib/notifications/sonNotif";

/**
 * Branche le carillon interne sur les notifications reçues pendant qu'on joue.
 *
 * Monté une fois dans le layout racine, et non dans une route de partie : une
 * notif peut tomber au menu comme au bureau, et ce composant ne lit aucun état
 * de sauvegarde. Rend `null`.
 */
export function NotifSonBootstrap() {
  useEffect(() => {
    let arreter: (() => void) | undefined;
    let demonte = false;
    // L'abonnement est asynchrone : le composant peut être démonté avant qu'il
    // n'atterrisse, auquel cas on le coupe aussitôt plutôt que de le perdre.
    void installerSonNotif(() => audioManager.playNotif()).then((fin) => {
      if (demonte) fin();
      else arreter = fin;
    });
    return () => {
      demonte = true;
      arreter?.();
    };
  }, []);

  return null;
}
