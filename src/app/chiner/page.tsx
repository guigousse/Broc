"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { BrocantePanorama } from "@/components/mobile/brocante-pano/BrocantePanorama";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { useGame } from "@/context/GameContext";
import { BROCANTES } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  decrireConditions,
} from "@/lib/deblocage";

export default function ChinerListePage() {
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

  if (!isHydrated || !state) {
    return <SkeletonScreen label="— préparation des halles…" />;
  }

  return (
    <MobileLayout header={<MobileHeader budget={state.budget} />} fillContent>
      <BrocantePanorama
        brocantes={BROCANTES}
        state={state}
        debloqueesIds={debloqueesIds}
        decrireConditions={(b) => decrireConditions(b, state)}
        destination="chiner"
        onBack={() => router.push("/bureau")}
      />
    </MobileLayout>
  );
}
