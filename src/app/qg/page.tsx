"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GramophoneSheet } from "@/components/mobile/qg/sheets/GramophoneSheet";
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
import type { CategorieObjet, CollectionSlot } from "@/types/game";
import { vinylAudioUrl } from "@/data/vinylesAudio";

const VINYLE_PREFIXES = ["mus.vinyle_", "mus.33tours_"];
const GRAMO_SESSION_KEY = "broc.gramo.session";

/** Volume vinyle selon la position du panorama (interpolation linéaire). */
function volumeVinylForPos(pos: number): number {
  const clamped = Math.max(0, Math.min(2, pos));
  if (clamped <= 1) return 0.3 + 0.2 * clamped; // bureau → entrée : 0.30 → 0.50
  return 0.5 + 0.3 * (clamped - 1); // entrée → cheminée : 0.50 → 0.80
}

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
    playVinyl,
    pauseVinyl,
    resumeVinyl,
    stopVinyl,
    setVinylTargetVolume,
    startNeedle,
    stopNeedle,
  } = useSettings();

  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  const [carnetOuvert, setCarnetOuvert] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState(false);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);
  const [gramophoneOuvert, setGramophoneOuvert] = useState(false);
  const [vinyleCourantIdx, setVinyleCourantIdx] = useState<number | null>(null);
  const [vinyleEnLecture, setVinyleEnLecture] = useState(false);
  const panoramaPosRef = useRef(1);

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
  // Le volume vinyle est aussi piloté par la position du panorama, sauf
  // si le sheet gramophone est ouvert (volume forcé à 100 % via l'effet
  // dédié plus bas).
  //
  // IMPORTANT : l'identité de `handleScrollPos` doit rester stable, sinon
  // QgPanorama (qui a `[onScrollPos]` dans son useEffect d'init) replace
  // le scroll sur initialZone="porte" à chaque ouverture du sheet.
  // → on lit l'état frais via une ref plutôt que de le mettre en dep.
  const gramophoneOuvertRef = useRef(false);
  useEffect(() => {
    gramophoneOuvertRef.current = gramophoneOuvert;
  }, [gramophoneOuvert]);
  const setVinylTargetVolumeRef = useRef(setVinylTargetVolume);
  useEffect(() => {
    setVinylTargetVolumeRef.current = setVinylTargetVolume;
  }, [setVinylTargetVolume]);

  const handleScrollPos = useCallback((pos: number) => {
    panoramaPosRef.current = pos;
    audioManager.setFireplaceVolume(0.3 * pos);
    if (!gramophoneOuvertRef.current) {
      setVinylTargetVolumeRef.current(volumeVinylForPos(pos));
    }
  }, []);

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
  }, [state]);

  /* ------------------------------------------------------------------ */
  /* Gramophone — liste des vinyles, handlers, volume zonal, persistance */
  /* ------------------------------------------------------------------ */

  const vinyles = useMemo<CollectionSlot[]>(() => {
    if (!state) return [];
    return state.collection["Musique"].filter(
      (s) =>
        s.vu &&
        VINYLE_PREFIXES.some((p) => s.templateId.startsWith(p)),
    );
  }, [state]);

  // Ref pour accéder à l'index courant depuis les cleanups d'effets.
  const vinyleCourantIdxRef = useRef<number | null>(null);
  useEffect(() => {
    vinyleCourantIdxRef.current = vinyleCourantIdx;
  }, [vinyleCourantIdx]);

  // Quand le sheet s'ouvre/ferme : ajuste le volume vinyle (100 % en sheet,
  // sinon volume de la zone courante).
  useEffect(() => {
    if (gramophoneOuvert) {
      setVinylTargetVolume(1);
    } else {
      setVinylTargetVolume(volumeVinylForPos(panoramaPosRef.current));
    }
  }, [gramophoneOuvert, setVinylTargetVolume]);

  // Restauration à l'arrivée sur la page : si une session gramophone
  // existe, on relance le son d'aiguille (musique non auto-relancée).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(GRAMO_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { idx?: number; aiguille?: boolean };
      if (parsed.aiguille) {
        startNeedle();
      }
      if (typeof parsed.idx === "number") {
        setVinyleCourantIdx(parsed.idx);
      }
    } catch {
      /* ignore */
    }
    return () => {
      // Sortie page QG : stoppe la musique, conserve l'aiguille si un
      // vinyle était sur la platine.
      stopVinyl();
      // On garde startNeedle() actif si idx≠null. Le démontage du composant
      // ne touche pas l'aiguille — elle s'arrête uniquement quand l'utilisateur
      // ferme tout (page leave côté navigateur) ou via stopNeedle explicite.
      // Persiste la session pour la prochaine entrée sur la page.
      try {
        window.localStorage.setItem(
          GRAMO_SESSION_KEY,
          JSON.stringify({
            idx: vinyleCourantIdxRef.current,
            aiguille: vinyleCourantIdxRef.current !== null,
          }),
        );
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = useCallback(() => {
    if (vinyles.length === 0) return;
    const next =
      vinyleCourantIdx === null ? 0 : (vinyleCourantIdx + 1) % vinyles.length;
    setVinyleCourantIdx(next);
    setVinyleEnLecture(true);
    playVinyl(vinylAudioUrl(vinyles[next].templateId), () => {
      // auto-next à la fin du morceau
      handleNext();
    });
  }, [vinyles, vinyleCourantIdx, playVinyl]);

  const handlePlayPause = useCallback(() => {
    if (vinyles.length === 0) return;
    if (vinyleCourantIdx === null) {
      // Premier clic ▶ : démarre au premier vinyle.
      setVinyleCourantIdx(0);
      setVinyleEnLecture(true);
      void startNeedle();
      playVinyl(vinylAudioUrl(vinyles[0].templateId), () => handleNext());
      return;
    }
    if (vinyleEnLecture) {
      pauseVinyl();
      setVinyleEnLecture(false);
    } else {
      resumeVinyl();
      setVinyleEnLecture(true);
    }
  }, [
    vinyles,
    vinyleCourantIdx,
    vinyleEnLecture,
    playVinyl,
    pauseVinyl,
    resumeVinyl,
    startNeedle,
    handleNext,
  ]);

  const handleSelectVinyle = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= vinyles.length) return;
      setVinyleCourantIdx(idx);
      setVinyleEnLecture(true);
      void startNeedle();
      playVinyl(vinylAudioUrl(vinyles[idx].templateId), () => handleNext());
    },
    [vinyles, playVinyl, startNeedle, handleNext],
  );

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
              <QgGramophone onTap={() => { playClick(); setGramophoneOuvert(true); }} />
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

      <GramophoneSheet
        open={gramophoneOuvert}
        onClose={() => setGramophoneOuvert(false)}
        vinyles={vinyles}
        vinyleCourantIdx={vinyleCourantIdx}
        enLecture={vinyleEnLecture}
        onSelect={handleSelectVinyle}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
      />

      <GazetteSheet
        open={gazetteOuverte}
        onClose={() => setGazetteOuverte(false)}
        jourActuel={state.jourActuel}
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
