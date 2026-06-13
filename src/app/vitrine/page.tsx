"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { BrocantePanorama } from "@/components/mobile/brocante-pano/BrocantePanorama";
import { useGame } from "@/context/GameContext";
import { BROCANTES } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  decrireConditions,
} from "@/lib/deblocage";

export default function VitrineListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const debloqueesIds = useMemo(() => {
    if (!state) return new Set<string>();
    const parTier = calculerBrocantesDebloqueesParTier(state);
    const all = new Set<string>();
    for (const set of parTier.values()) for (const id of set) all.add(id);
    return all;
  }, [state]);

  if (!isHydrated || !state) return null;

  return (
    <MobileLayout
      header={
        <ContextualHeader
          titre="Exposer"
          sousTitre={`${debloqueesIds.size} brocante${debloqueesIds.size > 1 ? "s" : ""} ouverte${debloqueesIds.size > 1 ? "s" : ""}`}
          budget={state.budget}
          onBack={() => router.push("/bureau")}
        />
      }
      fillContent
    >
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={debloqueesIds}
        decrireConditions={(b) => decrireConditions(b, state)}
        destination="vitrine"
      />
    </MobileLayout>
  );
}
