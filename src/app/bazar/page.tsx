"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { BazarScene } from "@/components/bazar/BazarScene";
import { useGame } from "@/context/GameContext";
import { audioManager } from "@/lib/audio/audioManager";
import { usePassageIris } from "@/components/mobile/usePassageIris";
import { bazarEstOuvert } from "@/lib/bazar/ouverture";
import type { AchatBazar } from "@/lib/bazar/achat";

export default function BazarPage() {
  const router = useRouter();
  const { state, isHydrated, acheterAuBazar, rafraichirPeriodiques } = useGame();
  // On ne quitte pas le Bazar comme on change d'onglet : c'est un lieu, et on
  // en sort par la porte, iris compris (cf. `usePassageIris`).
  const { overlay: irisSortie, partirVers } = usePassageIris();

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

  // Le carillon de la boutique, à l'arrivée. Pas au tap qui a lancé la
  // navigation : le QG y joue déjà `playDoorClose` — la porte du bureau qu'on
  // referme derrière soi — et les deux sons s'enchaînent de part et d'autre de
  // la fermeture d'iris. Le ref garde du double montage de StrictMode en
  // développement, où un effet nu ferait sonner la cloche deux fois. Posé
  // AVANT le retour anticipé du Skeleton : le joueur qui arrive une seconde
  // avant le settle entend quand même la porte.
  const carillonJoue = useRef(false);
  useEffect(() => {
    if (carillonJoue.current) return;
    carillonJoue.current = true;
    void audioManager.playCarillon();
  }, []);

  // Le refus est rendu TEL QUEL à la scène, qui le porte jusqu'à la fiche de
  // l'article. Il passait auparavant par un toast : transitoire, posé au-dessus
  // de la fiche (z-index 200 contre 105), et il partait tout seul au bout de
  // quelques secondes — exactement le « ça cache la réponse » qu'on cherche à
  // éviter. Un seul canal, donc, et c'est le durable : la fiche reste ouverte
  // et affiche la raison jusqu'à ce que le joueur la referme.
  const handleAcheter = (achat: AchatBazar) => acheterAuBazar(achat);

  if (!state || !state.bazar) return <SkeletonScreen />;

  return (
    <MobileLayout
      header={<MobileHeader budget={state.budget} jetons={state.jetons} />}
      fillContent
    >
      <div
        data-bazar-cadre="1"
        style={{
          // Même mécanique que `(qg)/layout.tsx`. `fillContent` supprime les
          // 12 px de papier que MobileLayout pose sinon autour du contenu :
          // l'illustration doit être plein cadre, sans marge.
          // Fixed (hors flux) : la scène est ancrée entre header et TabBar,
          // insensible à tout scroll résiduel du document ramené d'un autre
          // onglet.
          position: "fixed",
          top: "calc(var(--safe-top) + var(--mobile-header-h))",
          left: 0,
          right: 0,
          // Le panorama s'étend jusqu'au HAUT de la barre d'onglets ; sa base
          // dépasse sous ce point, et la TabBar opaque recouvre le
          // chevauchement — aucun espace résiduel entre l'image et la barre.
          bottom: "var(--mobile-tabbar-h)",
          background: "var(--forest-800)",
          overflow: "hidden",
        }}
      >
        <BazarScene
          etal={state.bazar}
          jetons={state.jetons}
          onAcheter={handleAcheter}
          onSortir={() => partirVers("/bureau")}
        />
      </div>
      {irisSortie}
    </MobileLayout>
  );
}
