"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { BazarScene } from "@/components/bazar/BazarScene";
import { useGame } from "@/context/GameContext";
import { bazarEstOuvert } from "@/lib/bazar/ouverture";
import { jeuxArcade } from "@/lib/bazar/arcade";
import { audioManager } from "@/lib/audio/audioManager";
import { volumeAmbianceBazarForPos } from "@/components/bazar/bazarAudioCurves";
import type { AchatBazar } from "@/lib/bazar/achat";

export default function BazarPage() {
  const router = useRouter();
  const { state, isHydrated, acheterAuBazar, rafraichirPeriodiques } = useGame();

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

  // Ambiance de rue : la MÊME boucle qu'au bureau, mais son volume suit la
  // distance à la porte (pleine à la sortie, au tiers dans le coin arcade).
  // Le volume vit dans une ref et pas dans un state : il change à chaque snap
  // du panorama et ne peint rien — un state re-rendrait toute la boutique pour
  // un gain audio.
  //
  // Valeur de départ = celle du comptoir, la zone que `UnifiedPanorama` centre
  // au montage. Ce n'est pas une précaution en l'air : le panorama émet son
  // index depuis un effet ENFANT, donc AVANT celui-ci, et la ref est déjà à
  // jour quand la boucle démarre.
  const volumeAmbianceRef = useRef(volumeAmbianceBazarForPos(1));

  const handleZoneIndex = useCallback((idx: number) => {
    volumeAmbianceRef.current = volumeAmbianceBazarForPos(idx);
    audioManager.setAmbienceVolume(volumeAmbianceRef.current);
  }, []);

  useEffect(() => {
    // `startAmbience` attend le décodage du fichier : la zone a pu changer
    // entre-temps, et `setAmbienceVolume` n'aurait alors trouvé aucun gain à
    // régler. On repose donc la valeur courante une fois la boucle en place.
    void audioManager
      .startAmbience(volumeAmbianceRef.current)
      .then(() => audioManager.setAmbienceVolume(volumeAmbianceRef.current));
    return () => {
      audioManager.stopAmbience();
    };
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
      header={<MobileHeader budget={state.budget} jetons={state.jetons} forcerAffichageJetons />}
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
          jeuxArcade={jeuxArcade(state.collection)}
          onAcheter={handleAcheter}
          onSortir={() => router.push("/bureau")}
          onZoneIndex={handleZoneIndex}
        />
      </div>
    </MobileLayout>
  );
}
