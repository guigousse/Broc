"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Brocante, BrocanteTier, GameState } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { BrocanteScene } from "./BrocanteScene";
import { BrocanteDetailPanel } from "./BrocanteDetailPanel";

interface BrocantePanoramaProps {
  brocantes: Brocante[];
  state: GameState;
  debloqueesIds: Set<string>;
  decrireConditions: (b: Brocante) => string;
  destination: "chiner" | "vitrine";
}

const TIERS: BrocanteTier[] = [1, 2, 3, 4];

const wrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
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

export function BrocantePanorama({
  brocantes,
  state,
  debloqueesIds,
  decrireConditions,
  destination,
}: BrocantePanoramaProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  // Scroll initial vers la scène du maxUnlockedTier (au mount uniquement).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const idx = TIERS.indexOf(maxUnlockedTier);
    if (idx > 0) {
      el.scrollLeft = idx * el.clientWidth;
    }
    didInitRef.current = true;
  }, [maxUnlockedTier]);

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Reset de la sélection si la brocante choisie n'est plus dans le tier visible.
  // (Écoute le scroll une seule fois — la sélection est lue via ref pour éviter
  //  de ré-attacher le listener à chaque clic.)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cw = el.clientWidth;
        if (cw <= 0) return;
        const tierIdx = Math.round(el.scrollLeft / cw);
        const currentTier = TIERS[Math.max(0, Math.min(TIERS.length - 1, tierIdx))];
        const currentSelectedId = selectedIdRef.current;
        if (currentSelectedId) {
          const sel = brocantesById.get(currentSelectedId);
          if (sel && sel.tier !== currentTier) setSelectedId(null);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [brocantesById]);

  const selected = selectedId ? brocantesById.get(selectedId) ?? null : null;
  const selectedDebloquee = selected ? debloqueesIds.has(selected.id) : false;
  const selectedPeutEntrer = selected ? state.budget >= fraisEntree(selected) : false;
  const selectedRaison = selected && !selectedDebloquee ? decrireConditions(selected) : null;

  const onEntrer = useCallback(() => {
    if (!selected || !selectedDebloquee || !selectedPeutEntrer) return;
    router.push(`/${destination}/${selected.id}`);
  }, [selected, selectedDebloquee, selectedPeutEntrer, router, destination]);

  return (
    <div style={wrapperStyle}>
      <div ref={scrollerRef} style={scrollerStyle} aria-label="Panorama des brocantes">
        {TIERS.map((tier) => (
          <BrocanteScene
            key={tier}
            tier={tier}
            brocantesById={brocantesById}
            selectedId={selectedId}
            debloqueesIds={debloqueesIds}
            onSelect={setSelectedId}
          />
        ))}
      </div>
      <BrocanteDetailPanel
        brocante={selected}
        debloquee={selectedDebloquee}
        peutEntrer={selectedPeutEntrer}
        raisonVerrouillage={selectedRaison}
        onEntrer={onEntrer}
      />
    </div>
  );
}
