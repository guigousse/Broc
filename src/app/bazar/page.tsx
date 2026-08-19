"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { EtalBazarVue } from "@/components/bazar/EtalBazar";
import { useGame } from "@/context/GameContext";
import { bazarEstOuvert } from "@/lib/bazar/ouverture";

export default function BazarPage() {
  const router = useRouter();
  const { state, isHydrated, acheterAuBazar } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
    // Le Bazar n'a pas encore ouvert : on ne laisse pas une URL tapée à la main
    // exposer un écran qui n'existe pas dans la fiction.
    if (isHydrated && state && !bazarEstOuvert(state)) router.replace("/bureau");
  }, [isHydrated, state, router]);

  // `state.bazar` est absent un cycle après l'ouverture, le temps que le tick
  // de settleBazar tourne (même mécanique que les lots de quêtes) : on ne
  // comble surtout pas ce trou en appelant genererEtal ici, ça produirait un
  // étal non persisté et différent à chaque frame.
  if (!state || !state.bazar) return <SkeletonScreen />;

  return (
    <MobileLayout header={<MobileHeader budget={state.budget} jetons={state.jetons} />}>
      <EtalBazarVue
        etal={state.bazar}
        jetons={state.jetons}
        onAcheter={(achat) => acheterAuBazar(achat)}
      />
    </MobileLayout>
  );
}
