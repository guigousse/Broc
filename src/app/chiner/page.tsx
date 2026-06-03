"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { BrocanteCarousel } from "@/components/mobile/BrocanteCarousel";
import { useGame } from "@/context/GameContext";
import { brocantesParTier } from "@/data/brocantes";
import { estDebloquee, decrireConditions } from "@/lib/deblocage";

type Tier = 1 | 2 | 3 | 4;

const pill = (active: boolean) => ({
  flex: 1,
  textAlign: "center" as const,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  padding: "6px 0",
  border: "1px solid var(--brass-500)",
  background: active ? "var(--forest-800)" : "var(--paper-100)",
  color: active ? "var(--brass-300)" : "var(--ink-500)",
  cursor: "pointer",
});

export default function ChinerListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [tier, setTier] = useState<Tier>(1);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const debloqueesParTier = useMemo(() => {
    const m = new Map<Tier, Set<string>>([
      [1, new Set()],
      [2, new Set()],
      [3, new Set()],
      [4, new Set()],
    ]);
    if (!state) return m;
    for (const t of [1, 2, 3, 4] as const) {
      for (const b of brocantesParTier(t)) {
        if (estDebloquee(b, state, m)) m.get(t)!.add(b.id);
      }
    }
    return m;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — préparation des halles…
      </main>
    );
  }

  const liste = brocantesParTier(tier);
  const dejaCount = Array.from(debloqueesParTier.values()).reduce(
    (s, set) => s + set.size,
    0,
  );

  return (
    <MobileLayout
      header={
        <ContextualHeader
          titre="Chiner"
          sousTitre={`${dejaCount} brocante${dejaCount > 1 ? "s" : ""} ouverte${dejaCount > 1 ? "s" : ""}`}
          budget={state.budget}
          onBack={() => router.push("/bureau")}
        />
      }
      stickyTop={
        <StickyTop>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={pill(tier === 1)} onClick={() => setTier(1)}>★</button>
            <button type="button" style={pill(tier === 2)} onClick={() => setTier(2)}>★★</button>
            <button type="button" style={pill(tier === 3)} onClick={() => setTier(3)}>★★★</button>
            <button type="button" style={pill(tier === 4)} onClick={() => setTier(4)}>Boss</button>
          </div>
        </StickyTop>
      }
    >
      <BrocanteCarousel
        brocantes={liste}
        state={state}
        debloqueesIds={debloqueesParTier.get(tier)!}
        decrireConditions={(b) => decrireConditions(b, state)}
        destination="chiner"
      />
    </MobileLayout>
  );
}
