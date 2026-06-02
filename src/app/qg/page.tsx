"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { audioManager } from "@/lib/audio/audioManager";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { QgPanorama } from "@/components/mobile/qg/QgPanorama";
import { QgScene } from "@/components/mobile/qg/QgScene";
import { QgPorte } from "@/components/mobile/qg/QgPorte";
import { QgFauteuil } from "@/components/mobile/qg/QgFauteuil";
import { QgJournal } from "@/components/mobile/qg/QgJournal";
import { QgCarnet } from "@/components/mobile/qg/QgCarnet";
import { QgGramophone } from "@/components/mobile/qg/QgGramophone";
import { QgPortemanteau } from "@/components/mobile/qg/QgPortemanteau";
import { QgCalendrier } from "@/components/mobile/qg/QgCalendrier";
import { QgCourrier } from "@/components/mobile/qg/QgCourrier";
import { QgEditProvider } from "@/components/mobile/qg/dev/QgEditContext";
import { QgEditPanel } from "@/components/mobile/qg/dev/QgEditPanel";
import { QgEditToggle } from "@/components/mobile/qg/dev/QgEditToggle";
import { PorteSheet } from "@/components/mobile/qg/sheets/PorteSheet";
import { PasserConfirmSheet } from "@/components/mobile/qg/sheets/PasserConfirmSheet";
import { CarnetSheet } from "@/components/mobile/qg/sheets/CarnetSheet";
import { CourrierSheet } from "@/components/mobile/qg/sheets/CourrierSheet";
import { CalendrierSheet } from "@/components/mobile/qg/sheets/CalendrierSheet";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { CATEGORIES } from "@/data/categories";
import { indexJourSemaine } from "@/lib/meteo";
import { PRIX_GAZETTE } from "@/lib/tendances";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
} from "@/lib/competences";
import type { CategorieObjet } from "@/types/game";

function QgPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editEnabled = searchParams.get("edit") === "1";
  const {
    state,
    isHydrated,
    acheterGazette,
    marquerCourrierLu,
    avancerJour,
  } = useGame();
  const {
    playClick,
    playPaper,
    playNewspaper,
    playDoorOpen,
    playDoorClose,
    startCatPurr,
    stopCatPurr,
  } = useSettings();

  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  const [carnetOuvert, setCarnetOuvert] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState(false);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  // Sons d'ambiance du QG (ambiance de rue en boucle + cheminée à volume
  // variable selon la zone affichée). Démarrent au montage, s'arrêtent
  // proprement au démontage (changement de page).
  useEffect(() => {
    void audioManager.startAmbience();
    void audioManager.startFireplace(0.3); // valeur de départ corrigée par onScrollPos
    return () => {
      audioManager.stopAmbience();
      audioManager.stopFireplace();
    };
  }, []);

  // Volume cheminée selon la position du panorama :
  //   bureau (pos=0) → 0.00 (éteint)
  //   porte  (pos=1) → 0.30
  //   repos  (pos=2) → 0.60
  const handleScrollPos = useCallback((pos: number) => {
    const volume = 0.3 * pos;
    audioManager.setFireplaceVolume(volume);
  }, []);

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
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
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture du QG…
      </main>
    );
  }

  const nbCourriersNonLus = state.courriers.filter((c) => !c.lu).length;

  return (
    <QgEditProvider enabled={editEnabled}>
      <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        fillContent
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            // Le panorama remplit exactement la zone visible entre header et
            // tab bar pour que les bandeaux touchent les bords haut/bas de
            // l'image (liserés brass-500 alignés sur les bords).
            height:
              "calc(100dvh - var(--safe-top) - var(--mobile-header-h) - var(--mobile-tabbar-h) - var(--safe-bottom))",
            background: "var(--forest-800)",
            overflow: "hidden",
          }}
        >
          <QgPanorama initialZone="porte" onScrollPos={handleScrollPos}>
            <QgScene>
              <QgJournal onTap={() => { playNewspaper(); setGazetteOuverte(true); }} />
              <QgCarnet onTap={() => { playClick(); setCarnetOuvert(true); }} />
              <QgPorte onTap={() => { playDoorOpen(); setPorteOuverte(true); }} />
              <QgCourrier
                nbNonLus={nbCourriersNonLus}
                onTap={() => { playPaper(); setCourrierOuvert(true); }}
              />
              <QgFauteuil
                chat={state.chatSurFauteuil}
                onTap={() => {
                  if (state.chatSurFauteuil) {
                    startCatPurr();
                  } else {
                    playClick();
                  }
                  setConfirmPasser(true);
                }}
              />
              <QgGramophone />
              <QgPortemanteau />
              <QgCalendrier
                jourActuel={state.jourActuel}
                onTap={() => setCalendrierOuvert(true)}
              />
            </QgScene>
          </QgPanorama>
        </div>
      </MobileLayout>

      <PorteSheet
        open={porteOuverte}
        onClose={() => {
          playDoorClose();
          setPorteOuverte(false);
        }}
        vitrineActive={!!state.vitrine}
        onChiner={() => {
          playDoorClose();
          setPorteOuverte(false);
          router.push("/chiner");
        }}
        onVitrine={() => {
          playDoorClose();
          setPorteOuverte(false);
          router.push(
            state.vitrine ? `/vitrine/${state.vitrine.brocanteId}` : "/vitrine",
          );
        }}
      />

      <PasserConfirmSheet
        open={confirmPasser}
        onClose={() => {
          stopCatPurr();
          setConfirmPasser(false);
        }}
        onConfirm={() => {
          stopCatPurr();
          setConfirmPasser(false);
          avancerJour(1, true);
        }}
        bloque={state.chatSurFauteuil}
      />

      <CarnetSheet open={carnetOuvert} onClose={() => setCarnetOuvert(false)} state={state} />

      <CalendrierSheet
        open={calendrierOuvert}
        onClose={() => setCalendrierOuvert(false)}
        jourActuel={state.jourActuel}
        jourDebutSemaine={state.jourActuel - indexJourSemaine(state.jourActuel)}
        meteoSemaine={
          state.gazetteAchetee && aGenBulletinMeteo(state)
            ? state.meteoSemaine
            : null
        }
        jourCelebrite={
          state.gazetteAchetee && aGenCarnetMondain(state) && state.celebriteActuelle
            ? state.jourActuel -
              indexJourSemaine(state.jourActuel) +
              state.celebriteActuelle.jourSemaine
            : null
        }
      />

      <CourrierSheet
        open={courrierOuvert}
        onClose={() => setCourrierOuvert(false)}
        courriers={state.courriers}
        onMarquerLu={(id) => marquerCourrierLu(id)}
      />

      <GazetteSheet
        open={gazetteOuverte}
        onClose={() => setGazetteOuverte(false)}
        jourActuel={state.jourActuel}
        prochainRafraichissement={state.prochainRafraichissementTendances}
        tendances={state.tendances}
        categoriesConnues={categoriesConnuesTendance}
        meteoSemaine={
          state.gazetteAchetee && aGenBulletinMeteo(state)
            ? state.meteoSemaine
            : null
        }
        jourDebutSemaine={state.jourActuel - indexJourSemaine(state.jourActuel)}
        revelerMeteo={aGenBulletinMeteo(state)}
        celebrite={state.celebriteActuelle}
        revelerCelebrite={aGenCarnetMondain(state)}
        achetee={state.gazetteAchetee}
        onAcheter={() => acheterGazette()}
        budget={state.budget}
        prixGazette={PRIX_GAZETTE}
      />

      <QgEditToggle />
      {editEnabled && <QgEditPanel />}
    </>
    </QgEditProvider>
  );
}

export default function QgPage() {
  return (
    <Suspense>
      <QgPageInner />
    </Suspense>
  );
}
