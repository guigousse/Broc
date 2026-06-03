"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { AtelierPanorama } from "./AtelierPanorama";
import { AtelierScene } from "./AtelierScene";
import { zoneToTab } from "./layout";
import { useGame } from "@/context/GameContext";

interface AtelierPanoramaViewProps {
  /** Onglet courant déduit du pathname par le layout (panorama). */
  activeTab: "stockage" | "atelier";
}

const fabRow: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 12px)",
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 25,
};

const fabBtn: CSSProperties = {
  pointerEvents: "auto",
  padding: "10px 18px",
  border: "1.5px solid var(--brass-500)",
  background: "var(--forest-800)",
  color: "var(--brass-100)",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
};

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

  // Si l'utilisateur clique un onglet de la TabBar pendant qu'il est dans le
  // panorama, l'`activeTab` change sans que le scroll ait bougé. On snappe
  // alors la zone correspondante. Pendant l'animation de scroll, on bloque
  // le handler de scroll pour qu'il ne re-route pas en arrière.
  //
  // ATTENTION iOS Safari : `scroll-snap-type: x mandatory` bloque/perturbe
  // `scrollTo({behavior: "smooth"})`. On désactive le snap le temps de
  // l'animation, on force `scrollLeft = target` en filet de sécurité, puis
  // on restaure le snap. Sinon scrollLeft reste à la zone de départ, le
  // prochain event de scroll voit zone=stockage et fait
  // `router.replace("/stockage")` → la navigation s'annule.
  useEffect(() => {
    if (activeTab === lastInternalTabRef.current) return;
    lastInternalTabRef.current = activeTab;
    const el = document.querySelector(
      '[data-atelier-panorama="1"]',
    ) as HTMLDivElement | null;
    if (!el) return;
    const vw = el.clientWidth;
    if (vw <= 0) return;
    // Cible : Stockage → snap 18vw ; Atelier → snap 108vw (établi).
    const targetVw = activeTab === "stockage" ? 18 : 108;
    const targetPx = (targetVw / 100) * vw;
    programmaticScrollRef.current = true;
    el.style.scrollSnapType = "none";
    el.scrollTo({ left: targetPx, behavior: "smooth" });
    if (programmaticTimerRef.current !== null) {
      window.clearTimeout(programmaticTimerRef.current);
    }
    programmaticTimerRef.current = window.setTimeout(() => {
      // Filet de sécurité : si le smooth scroll a échoué (iOS Safari +
      // snap mandatory), on garantit l'arrivée par un set direct. On
      // force scrollBehavior=auto le temps du set : sinon, l'élément a
      // scrollBehavior:smooth (cf. AtelierPanorama init) qui retransforme
      // l'assignation en smooth scroll susceptible d'échouer à nouveau.
      const savedBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = targetPx;
      el.style.scrollBehavior = savedBehavior;
      el.style.scrollSnapType = "x mandatory";
      // Deux rAF de battement pour laisser passer les events de scroll
      // générés par les resets ci-dessus AVANT de libérer le flag.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          programmaticScrollRef.current = false;
          programmaticTimerRef.current = null;
        });
      });
    }, 800);
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

  const gestionPath =
    activeTab === "stockage" ? "/stockage/gerer" : "/atelier/gerer";
  const gestionLabel =
    activeTab === "stockage" ? "Gérer le stock" : "Gérer l'établi";

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
          <AtelierScene />
        </AtelierPanorama>
      </div>

      <div style={fabRow}>
        <button
          type="button"
          onClick={() => router.push(gestionPath)}
          style={fabBtn}
        >
          {gestionLabel}
        </button>
      </div>
    </MobileLayout>
  );
}
