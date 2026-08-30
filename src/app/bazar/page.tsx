"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { BazarScene } from "@/components/bazar/BazarScene";
import { useGame, useGameActions } from "@/context/GameContext";
import { audioManager } from "@/lib/audio/audioManager";
import { usePassageIris } from "@/components/mobile/usePassageIris";
import { bazarEstOuvert } from "@/lib/bazar/ouverture";
import { jeuxArcade } from "@/lib/bazar/arcade";
import { albumsDe } from "@/lib/albums";
import { PorteBazarSheet } from "@/components/bazar/PorteBazarSheet";
import { EnergieRecharge } from "@/components/mobile/EnergieRecharge";
import { volumeAmbianceBazarForPos } from "@/components/bazar/bazarAudioCurves";
import { destinationChiner, destinationEtaler } from "@/lib/porte";
import { stockageEstPlein } from "@/lib/stockage";
import { useLangue } from "@/lib/i18n/LangueContext";
import { OuverturePaquetOverlay } from "@/components/albums/OuverturePaquetOverlay";
import { ClasseurOverlay } from "@/components/albums/ClasseurOverlay";
import { AlbumTimbresOverlay } from "@/components/albums/AlbumTimbresOverlay";
import type { AlbumId } from "@/data/pieces";
import type { AchatBazar } from "@/lib/bazar/achat";

export default function BazarPage() {
  const router = useRouter();
  const { state, isHydrated, acheterAuBazar, rafraichirPeriodiques } = useGame();
  const { tempsConfiance } = useGameActions();
  const { d } = useLangue();
  // La porte ne ramène plus droit au bureau : elle ouvre les mêmes sorties que
  // celle du bureau — chiner, étaler, rentrer.
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [alerteEnergie, setAlerteEnergie] = useState(false);
  // La cérémonie d'ouverture d'un paquet acheté (Tâche 12), et l'album qu'un
  // « Voir » depuis cette cérémonie peut ouvrir juste après.
  const [paquetOuvert, setPaquetOuvert] = useState<{
    albumId: AlbumId;
    pieces: string[];
    quantitesAvant: Record<string, number>;
  } | null>(null);
  const [albumOuvert, setAlbumOuvert] = useState<AlbumId | null>(null);
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

  // Ambiance de rue : la MÊME boucle qu'au bureau, mais son volume suit la
  // distance à la porte (pleine à la sortie, au tiers dans le coin arcade).
  // Le volume vit dans une ref et pas dans un state : il change à chaque snap
  // du panorama et ne peint rien — un state re-rendrait toute la boutique pour
  // un gain audio.
  //
  // Valeur de départ = celle des ANTIQUITÉS, c'est-à-dire la porte : c'est la
  // zone que `BazarScene` demande à `UnifiedPanorama` de centrer au montage
  // (`initialZone="antiquites"` — on entre par la porte de la boutique). Ce
  // n'est pas une précaution en l'air : le panorama émet son index depuis un
  // effet ENFANT, donc AVANT celui-ci, et la ref est déjà à jour quand la
  // boucle démarre. ⚠ Ces deux valeurs sont solidaires — changer la zone
  // d'arrivée sans changer celle-ci fait démarrer la rue au mauvais niveau
  // puis sauter, et ça s'entend à l'ouverture de l'écran.
  const volumeAmbianceRef = useRef(volumeAmbianceBazarForPos(2));

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
  //
  // Un achat de paquet a EN PLUS une cérémonie : `quantitesAvant` est un
  // instantané des quantités possédées AVANT l'achat, pris ICI — avant
  // l'appel — parce que `acheterAuBazar` a déjà rangé les 3 pièces dans la
  // save au moment où il répond. Sans ce cliché, le compteur « Nouveau ! » /
  // « ×N » de la cérémonie ne pourrait plus distinguer une pièce déjà
  // possédée d'une pièce qui vient d'arriver.
  const handleAcheter = (achat: AchatBazar) => {
    const quantitesAvant =
      achat.type === "paquet" && state ? { ...albumsDe(state)[achat.album].pieces } : {};
    const res = acheterAuBazar(achat);
    if (res.ok && achat.type === "paquet" && res.pieces) {
      setPaquetOuvert({ albumId: achat.album, pieces: res.pieces, quantitesAvant });
    }
    return res;
  };

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
          horloge={() => tempsConfiance() ?? Date.now()}
          etal={state.bazar}
          jetons={state.jetons}
          albums={albumsDe(state)}
          jeuxArcade={jeuxArcade(state.collection)}
          onAcheter={handleAcheter}
          onSortir={() => {
            // Les mêmes bruits qu'à la porte du bureau : le battant grince en
            // s'ouvrant sur les choix, il se referme quand on en fait un. Le
            // carillon, lui, ne sonne qu'à l'arrivée — c'est la cloche du
            // commerçant, pas la porte.
            void audioManager.playDoorOpen();
            setPorteOuverte(true);
          }}
          onZoneIndex={handleZoneIndex}
        />
      </div>

      <PorteBazarSheet
        open={porteOuverte}
        onClose={() => {
          // Renoncer, c'est aussi refermer la porte : sans ce son, un tap à
          // côté pour annuler ne dirait rien qu'un tap dans le vide.
          void audioManager.playDoorClose();
          setPorteOuverte(false);
        }}
        chinerDesactive={stockageEstPlein(state)}
        onChiner={() => {
          void audioManager.playDoorClose();
          setPorteOuverte(false);
          const ou = destinationChiner(state, tempsConfiance() ?? Date.now());
          if (ou.type === "energieInsuffisante") {
            setAlerteEnergie(true);
            return;
          }
          // PAS d'iris : il est le passage entre le bureau et la boutique, et
          // n'a pas d'ouverture de l'autre côté sur l'écran de chinage —
          // l'appeler ici laisserait le joueur au noir.
          router.push(ou.href);
        }}
        onEtaler={() => {
          void audioManager.playDoorClose();
          setPorteOuverte(false);
          const ou = destinationEtaler(state, tempsConfiance() ?? Date.now());
          if (ou.type === "energieInsuffisante") {
            setAlerteEnergie(true);
            return;
          }
          router.push(ou.href);
        }}
        onBureau={() => {
          void audioManager.playDoorClose();
          setPorteOuverte(false);
          // Seule sortie qui repasse par l'iris : c'est le chemin dont il est
          // le passage, et le bureau sait le rouvrir à l'arrivée.
          partirVers("/bureau");
        }}
      />

      {/* Machine à énergie popée en alerte, comme à la porte du bureau : un
          bouton qui ne fait rien vaut moins qu'un refus qui dit pourquoi. */}
      {alerteEnergie && (
        <EnergieRecharge
          onClose={() => setAlerteEnergie(false)}
          alerte={d.chrome.energieInsuffisante}
        />
      )}
      {irisSortie}

      {/* La cérémonie d'ouverture, au-dessus de la fiche (zIndex 107 contre
          105) : « Voir » la referme et ouvre directement l'album concerné,
          « Ranger » la referme sans rien ouvrir de plus. */}
      {paquetOuvert && (
        <OuverturePaquetOverlay
          albumId={paquetOuvert.albumId}
          pieces={paquetOuvert.pieces}
          quantitesAvant={paquetOuvert.quantitesAvant}
          onVoirAlbum={() => {
            setAlbumOuvert(paquetOuvert.albumId);
            setPaquetOuvert(null);
          }}
          onClose={() => setPaquetOuvert(null)}
        />
      )}
      <ClasseurOverlay open={albumOuvert === "classeur"} onClose={() => setAlbumOuvert(null)} />
      <AlbumTimbresOverlay open={albumOuvert === "timbres"} onClose={() => setAlbumOuvert(null)} />
    </MobileLayout>
  );
}
