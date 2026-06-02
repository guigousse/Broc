"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import { meteoDuJour } from "@/lib/meteo";
import { PRIX_GAZETTE } from "@/lib/tendances";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
  aGenInfluence,
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
    rerollMeteo,
    rerollCelebrite,
    marquerCourrierLu,
    avancerJour,
  } = useGame();
  const { playClick, playPaper, playDoorOpen, playDoorClose } = useSettings();

  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  const [carnetOuvert, setCarnetOuvert] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState(false);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

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

  const meteo = meteoDuJour(state);
  const nbCourriersNonLus = state.courriers.filter((c) => !c.lu).length;

  return (
    <QgEditProvider enabled={editEnabled}>
      <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      >
        <div
          style={{
            position: "relative",
            width: "auto",
            // Le panorama interne fait 300vw de large pour une image
            // 2752×1536 (ratio réel du PNG, voir QG_LAYOUT.panoramaAspect).
            // Hauteur naturelle = 300vw × 1536/2752 ≈ 167.4vw.
            // On borne par la zone disponible pour éviter tout overflow sur petit écran.
            height:
              "min(calc(300vw * 1536 / 2752), calc(100dvh - var(--mobile-header-h) - 60px - var(--mobile-tabbar-h) - var(--safe-bottom)))",
            margin: "-12px -12px 0",
            overflow: "hidden",
          }}
        >
          <QgPanorama initialZone="porte">
            <QgScene>
              <QgJournal onTap={() => { playClick(); setGazetteOuverte(true); }} />
              <QgCarnet onTap={() => { playClick(); setCarnetOuvert(true); }} />
              <QgPorte onTap={() => { playDoorOpen(); setPorteOuverte(true); }} />
              <QgCourrier
                nbNonLus={nbCourriersNonLus}
                onTap={() => { playPaper(); setCourrierOuvert(true); }}
              />
              <QgFauteuil
                chat={state.chatSurFauteuil}
                onTap={() => { playClick(); setConfirmPasser(true); }}
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
        onClose={() => setConfirmPasser(false)}
        onConfirm={() => {
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
        meteo={meteo}
        revelerMeteo={aGenBulletinMeteo(state)}
        celebrite={state.celebriteActuelle}
        revelerCelebrite={aGenCarnetMondain(state)}
        peutInfluencer={aGenInfluence(state)}
        influenceUtilisee={state.influenceUtilisee}
        onRerollMeteo={() => rerollMeteo()}
        onRerollCelebrite={() => rerollCelebrite()}
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
