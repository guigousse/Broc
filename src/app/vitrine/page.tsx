"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { BrocantePanorama } from "@/components/mobile/brocante-pano/BrocantePanorama";
import { useGame } from "@/context/GameContext";
import { BROCANTES } from "@/data/brocantes";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";

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
    <MobileLayout header={<MobileHeader budget={state.budget} />} fillContent>
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={debloqueesIds}
        destination="vitrine"
        onBack={() => router.push("/bureau")}
      />
    </MobileLayout>
  );
}
