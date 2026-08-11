"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { plateformeNative } from "@/lib/plateforme";
import { estRoutePartie } from "@/lib/routesPartie";
import { fermerLePlusHaut } from "@/lib/retourAndroid";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useToastSafe } from "@/components/ui/Toast";

/** Délai pendant lequel un second appui sur retour confirme la sortie. */
const CONFIRMATION_MS = 2000;

/**
 * Bouton retour matériel d'Android. Non traité, il ferme l'application depuis
 * n'importe quel écran, y compris au milieu d'une session de chine.
 *
 * Ordre de priorité : fermer l'overlay le plus haut, sinon remonter d'un
 * niveau de navigation, sinon (écran racine) demander confirmation.
 *
 * La sortie est explicite : dès qu'un écouteur `back-button` est enregistré,
 * `AppPlugin.kt` (tauri 2.11.2) ne fait plus ni `goBack()` ni `onBackPressed()`
 * — sans `exit(0)`, l'écran racine deviendrait un cul-de-sac.
 *
 * Ne rend rien. Inerte hors Android — l'import de l'API Tauri est dynamique
 * pour que rien de natif ne soit évalué ailleurs (même motif que
 * src/lib/notifications).
 */
export function BoutonRetourAndroid() {
  const router = useRouter();
  const pathname = usePathname();
  const { d } = useLangue();
  const { toast } = useToastSafe();

  // Le pathname change sans que l'écouteur natif soit réenregistré : on le lit
  // par ref pour que le gestionnaire voie toujours la route courante.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const dernierAppui = useRef(0);

  useEffect(() => {
    if (plateformeNative() !== "android") return;

    let annule = false;
    let detacher: (() => void) | undefined;

    void (async () => {
      const { onBackButtonPress } = await import("@tauri-apps/api/app");
      const listener = await onBackButtonPress(() => {
        if (fermerLePlusHaut()) return;

        const route = pathnameRef.current;
        if (estRoutePartie(route) && route !== "/bureau") {
          router.back();
          return;
        }

        const maintenant = Date.now();
        if (maintenant - dernierAppui.current < CONFIRMATION_MS) {
          void (async () => {
            const { exit } = await import("@tauri-apps/plugin-process");
            await exit(0);
          })();
          return;
        }
        dernierAppui.current = maintenant;
        toast(d.chrome.appuyezPourQuitter);
      });

      if (annule) listener.unregister();
      else detacher = () => listener.unregister();
    })();

    return () => {
      annule = true;
      detacher?.();
    };
  }, [router, toast, d]);

  return null;
}
