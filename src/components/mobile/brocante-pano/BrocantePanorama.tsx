"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Brocante, BrocanteTier, GameState } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { decrireConditionsCourtes } from "@/lib/deblocage";
import { BrocanteScene } from "./BrocanteScene";
import { BrocanteTransition, TRANSITION_WIDTH_PX } from "./BrocanteTransition";
import { BrocanteDetailFloating } from "./BrocanteDetailFloating";
import { BrocanteBottomBar } from "./BrocanteBottomBar";
import { BrocanteFramesEditProvider } from "./BrocanteFramesEditContext";
import { CadreEditToggle } from "./CadreEditToggle";
import { ScenePlaquesBar } from "./ScenePlaquesBar";
import { ScenesEditPanel } from "./ScenesEditPanel";

interface BrocantePanoramaProps {
  brocantes: Brocante[];
  state: GameState;
  debloqueesIds: Set<string>;
  destination: "chiner" | "vitrine";
  onBack: () => void;
}

const TIERS: BrocanteTier[] = [1, 2, 3, 4];

const wrapperStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  display: "flex",
};

const scrollerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflowX: "auto",
  overflowY: "hidden",
  scrollSnapType: "x mandatory",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
};

const floatingLayer: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  // Bord supérieur juste sous le cadre le plus bas (atelier-bricoleur en
  // tier 2 finit à ~63.35 %) + 1.5 % de marge → 65 %. La fenêtre flotte
  // sous la rangée basse de cadres, indépendamment de la barre Retour/
  // Continuer (le scroller exclut déjà cette zone via MobileLayout).
  top: "65%",
  padding: "0 14px",
  pointerEvents: "none",
  zIndex: 20,
};

export function BrocantePanorama({
  brocantes,
  state,
  debloqueesIds,
  destination,
  onBack,
}: BrocantePanoramaProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<BrocanteTier>(1);

  const brocantesById = useMemo(() => {
    const m = new Map<string, Brocante>();
    for (const b of brocantes) m.set(b.id, b);
    return m;
  }, [brocantes]);

  // Tier le plus haut où au moins une brocante est débloquée.
  const maxUnlockedTier: BrocanteTier = useMemo(() => {
    let max: BrocanteTier = 1;
    for (const b of brocantes) {
      if (debloqueesIds.has(b.id) && b.tier > max) max = b.tier;
    }
    return max;
  }, [brocantes, debloqueesIds]);

  // Décalage horizontal (en pixels) du début de chaque scène. Chaque scène
  // fait `clientWidth` px ; entre deux scènes consécutives s'intercale un
  // filler de TRANSITION_WIDTH_PX. → offset(i) = i * (clientWidth + filler).
  const tierOffsetPx = useCallback(
    (idx: number, clientWidth: number) =>
      idx * (clientWidth + TRANSITION_WIDTH_PX),
    [],
  );

  // Scroll initial vers la scène du maxUnlockedTier (au mount uniquement).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const idx = TIERS.indexOf(maxUnlockedTier);
    if (idx > 0) {
      el.scrollLeft = tierOffsetPx(idx, el.clientWidth);
    }
    setCurrentTier(maxUnlockedTier);
    didInitRef.current = true;
  }, [maxUnlockedTier, tierOffsetPx]);

  // Smooth scroll programmatique vers une scène (tap sur un cartel).
  const goToTier = useCallback(
    (t: BrocanteTier) => {
      const el = scrollerRef.current;
      if (!el) return;
      const idx = TIERS.indexOf(t);
      el.scrollTo({
        left: tierOffsetPx(idx, el.clientWidth),
        behavior: "smooth",
      });
    },
    [tierOffsetPx],
  );

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Reset de la sélection si la brocante choisie n'est plus dans le tier visible.
  // On prend l'offset (en pixels) le plus proche du scrollLeft pour identifier
  // le tier courant.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cw = el.clientWidth;
        if (cw <= 0) return;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < TIERS.length; i++) {
          const d = Math.abs(el.scrollLeft - tierOffsetPx(i, cw));
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        const tierAtScroll = TIERS[bestIdx];
        setCurrentTier((prev) => (prev === tierAtScroll ? prev : tierAtScroll));
        const currentSelectedId = selectedIdRef.current;
        if (currentSelectedId) {
          const sel = brocantesById.get(currentSelectedId);
          if (sel && sel.tier !== tierAtScroll) setSelectedId(null);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [brocantesById, tierOffsetPx]);

  const selected = selectedId ? brocantesById.get(selectedId) ?? null : null;
  const selectedDebloquee = selected ? debloqueesIds.has(selected.id) : false;
  const selectedPeutEntrer = selected ? state.budget >= fraisEntree(selected) : false;
  const selectedConditions =
    selected && !selectedDebloquee ? decrireConditionsCourtes(selected) : [];
  const continuerActif = !!(selected && selectedDebloquee && selectedPeutEntrer);

  const onContinuer = useCallback(() => {
    if (!selected || !continuerActif) return;
    router.push(`/${destination}/${selected.id}`);
  }, [selected, continuerActif, router, destination]);

  return (
    <BrocanteFramesEditProvider>
      <div style={wrapperStyle}>
        <div ref={scrollerRef} style={scrollerStyle} aria-label="Panorama des brocantes">
          {TIERS.map((tier, idx) => (
            <Fragment key={tier}>
              <BrocanteScene
                tier={tier}
                brocantesById={brocantesById}
                selectedId={selectedId}
                debloqueesIds={debloqueesIds}
                onSelect={setSelectedId}
              />
              {idx < TIERS.length - 1 && <BrocanteTransition />}
            </Fragment>
          ))}
        </div>
        <ScenePlaquesBar currentTier={currentTier} onTierClick={goToTier} />
        {selected && (
          <div style={floatingLayer}>
            <BrocanteDetailFloating
              brocante={selected}
              debloquee={selectedDebloquee}
              peutEntrer={selectedPeutEntrer}
              conditions={selectedConditions}
            />
          </div>
        )}
      </div>
      <BrocanteBottomBar
        onBack={onBack}
        onContinuer={onContinuer}
        continuerActif={continuerActif}
      />
      <CadreEditToggle />
      <ScenesEditPanel currentTier={currentTier} />
    </BrocanteFramesEditProvider>
  );
}
