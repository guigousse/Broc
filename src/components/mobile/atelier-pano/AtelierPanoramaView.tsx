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
  /** Onglet sur lequel cette page est arrivée — pilote `initialZone`. */
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
 * Le scroll horizontal du panorama est synchronisé avec l'URL : si l'on
 * scrolle vers la gauche jusqu'à la zone "stockage", on remplace l'URL par
 * `/stockage` ; sinon on remplace par `/atelier`. La TabBar (qui dépend du
 * pathname) se met donc à jour automatiquement sans push d'historique.
 */
export function AtelierPanoramaView({ activeTab }: AtelierPanoramaViewProps) {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  // Garde la dernière route remplacée pour éviter les replace inutiles.
  const lastPathRef = useRef<"stockage" | "atelier">(activeTab);

  const handleScrollPos = useCallback(
    (pos: number) => {
      const tab = zoneToTab(pos);
      if (tab !== lastPathRef.current) {
        lastPathRef.current = tab;
        router.replace(tab === "stockage" ? "/stockage" : "/atelier", {
          scroll: false,
        });
      }
    },
    [router],
  );

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

  // Zone d'entrée : si on arrive sur /atelier on centre sur l'établi ; sur
  // /stockage on cale sur la zone stockage (gauche).
  const initialZone = activeTab === "stockage" ? "stockage" : "etabli";

  // Cible de gestion : tap sur le FAB → ouvre la liste correspondante.
  const gestionPath =
    activeTab === "stockage" ? "/stockage/gerer" : "/atelier/gerer";
  const gestionLabel = activeTab === "stockage" ? "Gérer le stock" : "Gérer l'établi";

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
