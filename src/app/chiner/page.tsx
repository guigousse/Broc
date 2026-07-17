"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { BrocantePanorama } from "@/components/mobile/brocante-pano/BrocantePanorama";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { useGame } from "@/context/GameContext";
import { BROCANTES } from "@/data/brocantes";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { useLangue } from "@/lib/i18n/LangueContext";
import { tutorielActif } from "@/lib/tutoriel";

export default function ChinerListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const { d } = useLangue();

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
    return <SkeletonScreen label={d.chine.preparationHalles} />;
  }

  const tutoActif = tutorielActif(state);
  const brocantesVisibles = tutoActif
    ? BROCANTES.filter((b) => b.id === "vide-grenier-quartier")
    : BROCANTES;

  return (
    <MobileLayout header={<MobileHeader budget={state.budget} />} fillContent>
      <BrocantePanorama
        brocantes={brocantesVisibles}
        state={state}
        debloqueesIds={debloqueesIds}
        destination="chiner"
        onBack={() => router.push("/bureau")}
      />
    </MobileLayout>
  );
}
