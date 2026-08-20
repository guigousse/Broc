"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { BazarScene } from "@/components/bazar/BazarScene";
import { useGame } from "@/context/GameContext";
import { useToastSafe } from "@/components/ui/Toast";
import { bazarEstOuvert } from "@/lib/bazar/ouverture";
import type { AchatBazar } from "@/lib/bazar/achat";

export default function BazarPage() {
  const router = useRouter();
  const { state, isHydrated, acheterAuBazar, rafraichirPeriodiques } = useGame();
  const { toast } = useToastSafe();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
    // Le Bazar n'a pas encore ouvert : on ne laisse pas une URL tapée à la main
    // exposer un écran qui n'existe pas dans la fiction.
    if (isHydrated && state && !bazarEstOuvert(state)) router.replace("/bureau");
  }, [isHydrated, state, router]);

  // `state.bazar` est absent un cycle après l'ouverture, le temps que le tick
  // de settleBazar tourne (même mécanique que les lots de quêtes) : jusque-là
  // ce tick n'était déclenché que par l'intervalle 60 s / focus / visibility
  // du GameContext — un joueur qui ouvre le Bazar pour la première fois
  // pouvait donc fixer un SkeletonScreen muet jusqu'à 60 s. On déclenche donc
  // le settle explicitement à l'entrée sur l'écran (une seule fois, au
  // montage — `rafraichirPeriodiques` est stable). On ne comble surtout pas
  // ce trou en appelant genererEtal ici : ça produirait un étal non persisté
  // et différent à chaque frame.
  useEffect(() => {
    rafraichirPeriodiques();
  }, [rafraichirPeriodiques]);

  const handleAcheter = (achat: AchatBazar) => {
    const res = acheterAuBazar(achat);
    if (!res.ok) toast(res.raison ?? "", { type: "erreur" });
  };

  if (!state || !state.bazar) return <SkeletonScreen />;

  return (
    <MobileLayout
      header={<MobileHeader budget={state.budget} jetons={state.jetons} forcerAffichageJetons />}
    >
      <BazarScene
        etal={state.bazar}
        jetons={state.jetons}
        onAcheter={handleAcheter}
        onSortir={() => router.push("/bureau")}
      />
    </MobileLayout>
  );
}
