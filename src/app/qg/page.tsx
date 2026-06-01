"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { WeekTimeline } from "@/components/WeekTimeline";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { QgPanorama } from "@/components/mobile/qg/QgPanorama";
import { QgScene } from "@/components/mobile/qg/QgScene";
import { QgPorte } from "@/components/mobile/qg/QgPorte";
import { QgFauteuil } from "@/components/mobile/qg/QgFauteuil";
import { QgJournal } from "@/components/mobile/qg/QgJournal";
import { QgCarnet } from "@/components/mobile/qg/QgCarnet";
import { QgGramophone } from "@/components/mobile/qg/QgGramophone";
import { QgCourrier } from "@/components/mobile/qg/QgCourrier";
import { PorteSheet } from "@/components/mobile/qg/sheets/PorteSheet";
import { PasserConfirmSheet } from "@/components/mobile/qg/sheets/PasserConfirmSheet";
import { CarnetSheet } from "@/components/mobile/qg/sheets/CarnetSheet";
import { CourrierSheet } from "@/components/mobile/qg/sheets/CourrierSheet";
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

export default function QgPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    acheterGazette,
    rerollMeteo,
    rerollCelebrite,
    marquerCourrierLu,
    avancerJour,
  } = useGame();
  const { playClick } = useSettings();

  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  const [carnetOuvert, setCarnetOuvert] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState(false);

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
    <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <WeekTimeline
              jourActuel={state.jourActuel}
              meteoSemaine={aGenBulletinMeteo(state) ? state.meteoSemaine : undefined}
            />
          </StickyTop>
        }
      >
        <div
          style={{
            position: "relative",
            width: "auto",
            height:
              "calc(100dvh - var(--mobile-header-h) - 60px - var(--mobile-tabbar-h) - var(--safe-bottom))",
            margin: "-12px -12px 0",
            overflow: "hidden",
          }}
        >
          {/* 60px = hauteur approximative de StickyTop (WeekTimeline). Ajuster si besoin. */}
          <QgPanorama initialZone="porte">
            <QgScene>
              <QgJournal onTap={() => { playClick(); setGazetteOuverte(true); }} />
              <QgCarnet onTap={() => { playClick(); setCarnetOuvert(true); }} />
              <QgPorte onTap={() => { playClick(); setPorteOuverte(true); }} />
              <QgCourrier
                nbNonLus={nbCourriersNonLus}
                onTap={() => { playClick(); setCourrierOuvert(true); }}
              />
              <QgFauteuil onTap={() => { playClick(); setConfirmPasser(true); }} />
              <QgGramophone />
            </QgScene>
          </QgPanorama>
        </div>
      </MobileLayout>

      <PorteSheet
        open={porteOuverte}
        onClose={() => setPorteOuverte(false)}
        vitrineActive={!!state.vitrine}
        onChiner={() => {
          setPorteOuverte(false);
          router.push("/chiner");
        }}
        onVitrine={() => {
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
          avancerJour(1);
        }}
      />

      <CarnetSheet open={carnetOuvert} onClose={() => setCarnetOuvert(false)} state={state} />

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
    </>
  );
}
