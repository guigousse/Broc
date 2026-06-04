"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import {
  AtelierPanorama,
  panoramaZoneAnchorSelector,
} from "./AtelierPanorama";
import { AtelierScene } from "./AtelierScene";
import { ATELIER_LAYOUT, zoneToTab } from "./layout";
import { useGame } from "@/context/GameContext";

interface AtelierPanoramaViewProps {
  /** Onglet courant déduit du pathname par le layout (panorama). */
  activeTab: "stockage" | "atelier";
}

// Hotspot diégétique : zone cliquable transparente positionnée sur un
// objet du décor (étagère, établi…). Pas de FAB flottant — on clique
// directement sur le meuble. Évite de dépendre de la nav /atelier ↔
// /stockage pour décider quel bouton afficher.
function hotspotStyle(
  obj: (typeof ATELIER_LAYOUT.objets)[keyof typeof ATELIER_LAYOUT.objets],
  heightPct: number,
): CSSProperties {
  return {
    position: "absolute",
    left: `${obj.left}vw`,
    bottom: `${obj.bottom}%`,
    width: `${obj.width}vw`,
    height: `${heightPct}%`,
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    pointerEvents: "auto",
    // Pas de tap highlight bleu (couvert globalement, mais on est défensif).
    WebkitTapHighlightColor: "transparent",
  };
}

/**
 * Vue plein écran du panorama Atelier+Stockage.
 *
 * Hébergé par le layout (panorama) pour persister entre /atelier et /stockage
 * (route group). Quand le scroll franchit une frontière de zone, on
 * `router.replace` vers la route correspondante : la TabBar (qui se cale sur
 * pathname) se met à jour sans push d'historique, et la couche panorama n'est
 * pas démontée — pas de saccade.
 */
export function AtelierPanoramaView({ activeTab }: AtelierPanoramaViewProps) {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  // Sync URL ← scroll, robuste contre les artefacts de mount/init.
  //
  // Deux garde-fous :
  // 1) `mountTimeRef` : pendant 1200 ms après le mount, on suspend toute
  //    mise à jour d'URL. Évite que les events de scroll "fantômes"
  //    déclenchés par l'init (scrollIntoView, set scrollLeft, etc.) ne
  //    fassent router.replace("/stockage") avant que le panorama ait fini
  //    de se positionner sur la zone cible.
  // 2) `urlDebounceRef` : 350 ms de débounce. Le user qui swipe traverse
  //    plusieurs valeurs de pos avant de relâcher — on ne touche à l'URL
  //    qu'une fois le scroll stabilisé. Plus aucun mid-swipe replace.
  const mountTimeRef = useRef(performance.now());
  const latestPosRef = useRef(activeTab === "stockage" ? 0 : 1);
  const urlDebounceRef = useRef<number | null>(null);

  const handleScrollPos = useCallback(
    (pos: number) => {
      latestPosRef.current = pos;
      // Sus­pend toute sync pendant 1200 ms après le mount.
      if (performance.now() - mountTimeRef.current < 1200) return;
      if (urlDebounceRef.current !== null) {
        window.clearTimeout(urlDebounceRef.current);
      }
      urlDebounceRef.current = window.setTimeout(() => {
        urlDebounceRef.current = null;
        const tab = zoneToTab(latestPosRef.current);
        if (tab === activeTab) return;
        router.replace(tab === "stockage" ? "/stockage" : "/atelier", {
          scroll: false,
        });
      }, 350);
    },
    [router, activeTab],
  );

  // Quand activeTab change (clic TabBar), on anime le scroll vers la zone
  // correspondante via `anchor.scrollIntoView({behavior:"smooth",
  // inline:"center"})` — API snap-aware compatible iOS Safari. Note :
  // SwipePager remount le sous-arbre à chaque changement de pathname,
  // donc en pratique activeTab arrive déjà à sa valeur cible au mount
  // et cet effet ne tire qu'en cas de changement post-mount.
  useEffect(() => {
    const el = document.querySelector(
      '[data-atelier-panorama="1"]',
    ) as HTMLDivElement | null;
    if (!el) return;
    const zone = activeTab === "stockage" ? "stockage" : "etabli";
    const anchor = el.querySelector(
      panoramaZoneAnchorSelector(zone),
    ) as HTMLElement | null;
    if (!anchor) return;
    anchor.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (urlDebounceRef.current !== null) {
        window.clearTimeout(urlDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture de l'atelier…
      </main>
    );
  }

  // initialZone est appliquée UNIQUEMENT au premier montage du panorama
  // (cf. AtelierPanorama). On utilise donc `activeTab` au mount uniquement.
  const initialZone = activeTab === "stockage" ? "stockage" : "etabli";

  return (
    <MobileLayout
      header={<MobileHeader budget={state.budget} />}
      fillContent
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height:
            "calc(100dvh - var(--safe-top) - var(--mobile-header-h) - var(--mobile-tabbar-h) - var(--safe-bottom))",
          background: "var(--forest-800)",
          overflow: "hidden",
        }}
      >
        <AtelierPanorama
          initialZone={initialZone}
          onScrollPos={handleScrollPos}
        >
          <AtelierScene>
            {/* Hotspots cliquables sur les meubles du décor : remplacent
                le FAB "Gérer le stock / l'établi". Indépendants de la
                nav atelier ↔ stockage : où qu'on soit, taper l'étagère
                ouvre le stock, taper l'établi ouvre la gestion atelier. */}
            <button
              type="button"
              onClick={() => router.push("/stockage/gerer")}
              aria-label="Ouvrir le stockage"
              style={hotspotStyle(ATELIER_LAYOUT.objets.etagere, 55)}
            />
            <button
              type="button"
              onClick={() => router.push("/atelier/gerer")}
              aria-label="Ouvrir l'établi"
              style={hotspotStyle(ATELIER_LAYOUT.objets.etabli, 45)}
            />
          </AtelierScene>
        </AtelierPanorama>
      </div>
    </MobileLayout>
  );
}
