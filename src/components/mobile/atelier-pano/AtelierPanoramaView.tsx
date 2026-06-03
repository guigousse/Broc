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

  // Dernier onglet poussé par notre handler de scroll. Permet de distinguer
  // "le pathname a changé parce qu'on a scrollé" (rien à faire) vs "le
  // pathname a changé parce que l'utilisateur a cliqué la TabBar" (il faut
  // alors snapper le scroll sur la zone correspondante).
  const lastInternalTabRef = useRef<"stockage" | "atelier">(activeTab);
  // Vrai pendant un scroll programmatique (smooth scroll lancé par nous-mêmes
  // après un changement externe d'activeTab). Pendant cette fenêtre, on
  // ignore les évènements de scroll : sinon, l'état "transitoire" du scroll
  // (encore au milieu de la zone de départ) déclencherait un router.replace
  // qui annulerait la navigation que l'utilisateur vient de faire.
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<number | null>(null);

  const handleScrollPos = useCallback(
    (pos: number) => {
      if (programmaticScrollRef.current) return;
      const tab = zoneToTab(pos);
      // Source de vérité : l'URL (`activeTab`). Si le scroll dit qu'on est
      // déjà sur le tab actif, on resynchronise simplement la ref et on
      // sort — pas de router.replace inutile. Ce garde-fou évite que le
      // premier event de scroll qui suit un mount/init ne renvoie sur
      // /stockage si scrollLeft n'a pas encore atteint la cible.
      if (tab === activeTab) {
        lastInternalTabRef.current = tab;
        return;
      }
      if (tab !== lastInternalTabRef.current) {
        lastInternalTabRef.current = tab;
        router.replace(tab === "stockage" ? "/stockage" : "/atelier", {
          scroll: false,
        });
      }
    },
    [router, activeTab],
  );

  // Quand activeTab change (clic TabBar), on anime le scroll vers la zone
  // correspondante via `anchor.scrollIntoView({behavior:"smooth",
  // inline:"center"})`. C'est l'API "snap-aware" du navigateur : elle
  // coopère avec `scroll-snap-type: x mandatory` (à la différence de
  // `scrollTo()` ou `el.scrollLeft = X` qui sont silencieusement
  // ignorés/annulés sur iOS Safari quand le snap est mandatory).
  useEffect(() => {
    if (activeTab === lastInternalTabRef.current) return;
    lastInternalTabRef.current = activeTab;
    const el = document.querySelector(
      '[data-atelier-panorama="1"]',
    ) as HTMLDivElement | null;
    if (!el) return;
    const zone = activeTab === "stockage" ? "stockage" : "etabli";
    const anchor = el.querySelector(
      panoramaZoneAnchorSelector(zone),
    ) as HTMLElement | null;
    if (!anchor) return;
    programmaticScrollRef.current = true;
    anchor.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    if (programmaticTimerRef.current !== null) {
      window.clearTimeout(programmaticTimerRef.current);
    }
    // Durée généreuse pour absorber tous les events de scroll de
    // l'animation, indépendamment du navigateur.
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticTimerRef.current = null;
    }, 900);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current !== null) {
        window.clearTimeout(programmaticTimerRef.current);
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
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
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
