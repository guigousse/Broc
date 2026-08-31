"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import {
  destinationNotif,
  installerTapNotif,
} from "@/lib/notifications/tapNotif";

/**
 * Emmène le joueur au bon endroit quand il tape une notification (restauration
 * → Atelier, quêtes → Quêtes, énergie / rappels → Bureau).
 *
 * Monté une fois dans le layout racine : le tap peut LANCER l'app (on est
 * alors au menu, sauvegarde pas encore lue) comme la ramener au premier plan.
 * La destination est gardée jusqu'à l'hydratation : naviguer avant ferait
 * rebondir sur le menu (le layout du QG renvoie à « / » sans état). Sans
 * partie chargée, on reste au menu. Rend `null`.
 */
export function NotifTapBootstrap() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    let arreter: (() => void) | undefined;
    let demonte = false;
    void installerTapNotif((id) => {
      const route = destinationNotif(id);
      if (route) setDestination(route);
    }).then((fin) => {
      if (demonte) fin();
      else arreter = fin;
    });
    return () => {
      demonte = true;
      arreter?.();
    };
  }, []);

  useEffect(() => {
    if (!destination || !isHydrated) return;
    setDestination(null);
    if (state) router.replace(destination);
  }, [destination, isHydrated, state, router]);

  return null;
}
