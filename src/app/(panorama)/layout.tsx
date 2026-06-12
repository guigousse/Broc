"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { audioManager } from "@/lib/audio/audioManager";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import {
  UnifiedPanorama,
  UNIFIED_ZONE_ORDER,
  ATELIER_X_SHIFT_VW,
  zoneIndexToTab,
  unifiedZoneAnchorSelector,
  type UnifiedZoneKey,
} from "@/components/mobile/panorama/UnifiedPanorama";
import { QgJournal } from "@/components/mobile/qg/QgJournal";
import { QgCarnet } from "@/components/mobile/qg/QgCarnet";
import { QgPorte } from "@/components/mobile/qg/QgPorte";
import { QgCourrier } from "@/components/mobile/qg/QgCourrier";
import { QgPortemanteau } from "@/components/mobile/qg/QgPortemanteau";
import { QgCalendrier } from "@/components/mobile/qg/QgCalendrier";
import { QgFauteuil } from "@/components/mobile/qg/QgFauteuil";
import { QgGramophone } from "@/components/mobile/qg/QgGramophone";
import { QgChatBaladeur } from "@/components/mobile/qg/QgChatBaladeur";
import { QgEditProvider } from "@/components/mobile/qg/dev/QgEditContext";
import { QgEditPanel } from "@/components/mobile/qg/dev/QgEditPanel";
import { QgStockageBoxes } from "@/components/mobile/qg/QgStockageBoxes";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { PorteSheet } from "@/components/mobile/qg/sheets/PorteSheet";
import { PasserConfirmSheet } from "@/components/mobile/qg/sheets/PasserConfirmSheet";
import { CarnetSheet } from "@/components/mobile/qg/sheets/CarnetSheet";
import { CourrierSheet } from "@/components/mobile/qg/sheets/CourrierSheet";
import { CalendrierSheet } from "@/components/mobile/qg/sheets/CalendrierSheet";
import { GramophoneSheet } from "@/components/mobile/qg/sheets/GramophoneSheet";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { panoramaActiveStore } from "@/lib/panoramaActiveStore";
import { CATEGORIES } from "@/data/categories";
import { ATELIER_LAYOUT } from "@/components/mobile/atelier-pano/layout";
import { indexJourSemaine } from "@/lib/meteo";
import { PRIX_GAZETTE } from "@/lib/tendances";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
} from "@/lib/competences";
import { vinylAudioUrl, vinylHasAudio } from "@/data/vinylesAudio";
import type { CategorieObjet, CollectionSlot } from "@/types/game";

const VINYLE_PREFIXES = ["mus.vinyle_", "mus.33tours_"];
const GRAMO_SESSION_KEY = "broc.gramo.session";

/** Volume vinyle selon la position du panorama.
 *  Bureau (0..2) : ramp 0.3 → 0.8 (pic au repos = gramophone).
 *  Atelier : décroissance douce, 0.4 / 0.3 / 0.2 aux sections 4/5/6. */
function volumeVinylForPos(pos: number): number {
  if (pos <= 0) return 0.3;
  if (pos <= 1) return 0.3 + 0.2 * pos; // 0.3 → 0.5
  if (pos <= 2) return 0.5 + 0.3 * (pos - 1); // 0.5 → 0.8
  if (pos <= 3) return 0.8 - 0.4 * (pos - 2); // 0.8 → 0.4 (stockage)
  if (pos <= 4) return 0.4 - 0.1 * (pos - 3); // 0.4 → 0.3 (établi)
  return Math.max(0.2, 0.3 - 0.1 * (pos - 4)); // 0.3 → 0.2 (coinL)
}

/** Volume cheminée selon la position (triangulaire, pic à repos idx 2). */
function fireplaceVolumeForPos(pos: number): number {
  if (pos <= 0) return 0;
  if (pos <= 2) return 0.3 * pos; // 0 → 0.6
  return Math.max(0, 0.6 - 0.2 * (pos - 2)); // 0.6 → 0
}

/** Mappe un tab → initialZone du panorama. */
function tabToInitialZone(
  tab: "bureau" | "stockage" | "atelier",
): UnifiedZoneKey {
  if (tab === "bureau") return "porte"; // vue par défaut du bureau
  if (tab === "stockage") return "stockage";
  return "etabli";
}

function pathnameToTab(pathname: string): "bureau" | "stockage" | "atelier" {
  if (pathname.startsWith("/stockage")) return "stockage";
  if (pathname.startsWith("/atelier")) return "atelier";
  return "bureau";
}

function PanoramaInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    playGramophoneSong,
    pauseVinyl,
    resumeVinyl,
    setVinylTargetVolume,
    setVinylAmbianceVolume,
    setVinylAmbianceLowpass,
    startNeedle,
  } = useSettings();

  const currentTab = pathnameToTab(pathname);
  // Zone initiale = calculée au PREMIER mount uniquement (cf. UnifiedPanorama).
  const mountInitialZoneRef = useRef<UnifiedZoneKey>(tabToInitialZone(currentTab));

  // Sheets QG.
  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  const [carnetOuvert, setCarnetOuvert] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState(false);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);
  const [gramophoneOuvert, setGramophoneOuvert] = useState(false);
  const [vinyleCourantIdx, setVinyleCourantIdx] = useState<number | null>(null);
  const [vinyleEnLecture, setVinyleEnLecture] = useState(false);

  // Index de zone fractionnaire courant (0..5).
  const zoneIdxRef = useRef(UNIFIED_ZONE_ORDER.indexOf(mountInitialZoneRef.current));
  const [zoneActive, setZoneActive] = useState(zoneIdxRef.current);

  // Sync URL ← scroll, robuste (mount guard + debounce).
  const mountTimeRef = useRef(performance.now());
  const urlDebounceRef = useRef<number | null>(null);

  // Redirection si pas d'état (cohérent avec les anciennes pages).
  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  // Audio QG : ambience + cheminée. Démarrent au mount du layout, s'arrêtent
  // au démontage (sortie du groupe panorama).
  useEffect(() => {
    void audioManager.startAmbience();
    void audioManager.startFireplace(0.3);
    return () => {
      audioManager.stopAmbience();
      audioManager.stopFireplace();
    };
  }, []);

  const gramophoneOuvertRef = useRef(false);
  useEffect(() => {
    gramophoneOuvertRef.current = gramophoneOuvert;
  }, [gramophoneOuvert]);
  const setVinylTargetVolumeRef = useRef(setVinylTargetVolume);
  useEffect(() => {
    setVinylTargetVolumeRef.current = setVinylTargetVolume;
  }, [setVinylTargetVolume]);

  const handleZoneIndex = useCallback(
    (idx: number) => {
      zoneIdxRef.current = idx;
      const snapIdx = Math.round(idx);
      setZoneActive((prev) => (prev === snapIdx ? prev : snapIdx));

      // Highlight TabBar EN TEMPS RÉEL via le store partagé. Pas d'attente
      // du débounce URL → la TabBar suit le scroll instantanément.
      panoramaActiveStore.set(zoneIndexToTab(snapIdx));

      // Audio : volume cheminée + vinyle pilotés par la position. Pic à
      // repos (idx 2) où sont cheminée et gramophone. Fade vers atelier.
      audioManager.setFireplaceVolume(fireplaceVolumeForPos(idx));
      if (!gramophoneOuvertRef.current) {
        setVinylTargetVolumeRef.current(volumeVinylForPos(idx));
      }

      // Sync URL : debounce 350 ms, mount guard 1200 ms. Le seul intérêt
      // est de garder l'URL alignée pour le partage / le retour back ;
      // la TabBar et les hotspots utilisent déjà le store ci-dessus.
      // En mode édition, on coupe net : la nav remount/reset les states.
      if (editEnabledRef.current) return;
      if (performance.now() - mountTimeRef.current < 1200) return;
      if (urlDebounceRef.current !== null) {
        window.clearTimeout(urlDebounceRef.current);
      }
      urlDebounceRef.current = window.setTimeout(() => {
        urlDebounceRef.current = null;
        const targetTab = zoneIndexToTab(Math.round(zoneIdxRef.current));
        if (targetTab !== currentTab) {
          const target =
            targetTab === "bureau"
              ? "/bureau"
              : targetTab === "stockage"
                ? "/stockage"
                : "/atelier";
          router.replace(target, { scroll: false });
        }
      }, 350);
    },
    [currentTab, router],
  );

  // Au démontage du layout (sortie de la zone panorama), on reset le store
  // pour que la TabBar revienne au tracking pathname.
  useEffect(() => {
    panoramaActiveStore.set(currentTab);
    return () => {
      panoramaActiveStore.set(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // À l'entrée dans le panorama (intérieur du bâtiment), on remet
  // l'ambiance gramophone à "pleine pièce" (volume 1, lowpass 20000).
  // Le contrôleur global GlobalVinylAmbiance reprendra la main dès qu'on
  // sortira sur /chiner, /vitrine, /atelier/gerer, etc.
  useEffect(() => {
    setVinylAmbianceVolume(1);
    setVinylAmbianceLowpass(20000);
  }, [setVinylAmbianceVolume, setVinylAmbianceLowpass]);

  // Verrouille le scroll vertical du document tant qu'on est dans le
  // panorama : sinon, le geste vertical (notamment l'overscroll iOS)
  // décale toute la page vers le haut et révèle du blanc sous la barre
  // de nav. Le panorama lui-même a touch-action:pan-x mais le body
  // peut quand même bouncer sur iOS Safari.
  // useLayoutEffect : le reset doit se faire AVANT le premier paint, sinon
  // iOS affiche un instant l'état overscrollé (panorama relevé, bande
  // blanche en bas) avant de se recaler — glitch visible.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    // Le scroll résiduel d'un onglet précédent (Collection/Stockage) serait
    // figé par le verrou et décalerait tout le panorama vers le haut.
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  // Cleanup débounce URL au démontage.
  useEffect(() => {
    return () => {
      if (urlDebounceRef.current !== null) {
        window.clearTimeout(urlDebounceRef.current);
      }
    };
  }, []);

  // Quand le pathname change (clic TabBar ou nav externe), on smooth-scroll
  // vers la zone cible — sauf si on est déjà autour (évite les anti-loops).
  useEffect(() => {
    const targetZone = tabToInitialZone(currentTab);
    const targetIdx = UNIFIED_ZONE_ORDER.indexOf(targetZone);
    const currentIdx = Math.round(zoneIdxRef.current);
    const currentZoneTab = zoneIndexToTab(currentIdx);
    if (currentZoneTab === currentTab) return; // déjà sur la bonne section
    const el = document.querySelector(
      '[data-unified-panorama="1"]',
    ) as HTMLDivElement | null;
    if (!el) return;
    const anchor = el.querySelector(
      unifiedZoneAnchorSelector(targetZone),
    ) as HTMLElement | null;
    if (!anchor) return;
    anchor.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    // Force le réindex (au cas où le scroll smooth foire silencieusement).
    void targetIdx;
  }, [currentTab]);

  // Gramophone — liste des vinyles. UNIQUEMENT ceux possédés (donnés à
  // la collection) : seuil métier explicite, on ne joue pas un vinyle
  // qu'on a juste croisé chez un vendeur.
  const vinyles = useMemo<CollectionSlot[]>(() => {
    if (!state) return [];
    return state.collection["Musique"].filter(
      (s) =>
        s.donation !== null &&
        VINYLE_PREFIXES.some((p) => s.templateId.startsWith(p)) &&
        vinylHasAudio(s.templateId),
    );
  }, [state]);

  const vinyleCourantIdxRef = useRef<number | null>(null);
  useEffect(() => {
    vinyleCourantIdxRef.current = vinyleCourantIdx;
  }, [vinyleCourantIdx]);

  useEffect(() => {
    if (gramophoneOuvert) setVinylTargetVolume(1);
    else setVinylTargetVolume(volumeVinylForPos(zoneIdxRef.current));
  }, [gramophoneOuvert, setVinylTargetVolume]);

  // Restauration session gramophone à l'entrée du panorama.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = safeLocalStorageGet<{ idx?: number; aiguille?: boolean }>(
      GRAMO_SESSION_KEY,
      {},
    );
    if (parsed.aiguille) startNeedle();
    if (typeof parsed.idx === "number") setVinyleCourantIdx(parsed.idx);
    return () => {
      // IMPORTANT : on NE STOPPE PAS le gramophone à la sortie du
      // panorama. La musique doit continuer à tourner quand le joueur
      // va chiner ou dans une sous-pièce — étouffée et plus basse,
      // mais audible (cf. GlobalVinylAmbiance). On persiste juste
      // l'état pour le retour.
      safeLocalStorageSet(GRAMO_SESSION_KEY, {
        idx: vinyleCourantIdxRef.current,
        aiguille: vinyleCourantIdxRef.current !== null,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = useCallback(() => {
    if (vinyles.length === 0) return;
    const next =
      vinyleCourantIdx === null ? 0 : (vinyleCourantIdx + 1) % vinyles.length;
    setVinyleCourantIdx(next);
    setVinyleEnLecture(true);
    // playGramophoneSong gère la séquence Vinyl 1 → +1s → Vinyl 2 +
    // musique. Le crépitement de fond (vinyl-noise-loop) est déjà
    // assuré par startNeedle() invoqué en interne.
    playGramophoneSong(vinylAudioUrl(vinyles[next].templateId), () =>
      handleNext(),
    );
  }, [vinyles, vinyleCourantIdx, playGramophoneSong]);

  const handlePlayPause = useCallback(() => {
    if (vinyles.length === 0) return;
    if (vinyleCourantIdx === null) {
      setVinyleCourantIdx(0);
      setVinyleEnLecture(true);
      playGramophoneSong(vinylAudioUrl(vinyles[0].templateId), () =>
        handleNext(),
      );
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
    playGramophoneSong,
    pauseVinyl,
    resumeVinyl,
    handleNext,
  ]);

  const handleSelectVinyle = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= vinyles.length) return;
      setVinyleCourantIdx(idx);
      setVinyleEnLecture(true);
      playGramophoneSong(vinylAudioUrl(vinyles[idx].templateId), () =>
        handleNext(),
      );
    },
    [vinyles, playGramophoneSong, handleNext],
  );

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
        — ouverture du local…
      </main>
    );
  }

  const nbCourriersNonLus = state.courriers.filter((c) => !c.lu).length;

  // Virtualisation : on ne monte les objets QG que si leur zone est à
  // distance 1 de la zone active (en index 0..5). bureau/porte/repos = 0/1/2.
  const showQgZone = (qgZoneIdx: 0 | 1 | 2) =>
    Math.abs(zoneActive - qgZoneIdx) <= 1;

  // Edit mode :
  //   - activé par défaut si `NEXT_PUBLIC_QG_EDIT=1` au build, OU
  //   - activable via `?qgedit=1` (persiste ensuite dans localStorage), OU
  //   - désactivable via `?qgedit=0` (efface la clé).
  const [editEnabled, setEditEnabled] = useState(
    () => process.env.NEXT_PUBLIC_QG_EDIT === "1",
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("qgedit");
    if (q === "1") {
      window.localStorage.setItem("broc.qg-edit.enabled", "1");
      setEditEnabled(true);
      return;
    }
    if (q === "0") {
      window.localStorage.removeItem("broc.qg-edit.enabled");
      setEditEnabled(process.env.NEXT_PUBLIC_QG_EDIT === "1");
      return;
    }
    if (window.localStorage.getItem("broc.qg-edit.enabled") === "1") {
      setEditEnabled(true);
    }
  }, []);
  const editEnabledRef = useRef(editEnabled);
  useEffect(() => {
    editEnabledRef.current = editEnabled;
  }, [editEnabled]);

  return (
    <QgEditProvider enabled={editEnabled}>
      <MobileLayout
        header={<MobileHeader budget={state.budget} />}
        fillContent
      >
        <div
          style={{
            // Fixed (hors flux) : le panorama est ancré entre header et
            // TabBar, insensible à tout scroll résiduel du document ramené
            // d'un autre onglet.
            position: "fixed",
            top: "calc(var(--safe-top) + var(--mobile-header-h))",
            left: 0,
            right: 0,
            bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
            background: "var(--forest-800)",
            overflow: "hidden",
          }}
        >
          <UnifiedPanorama
            initialZone={mountInitialZoneRef.current}
            onZoneIndex={handleZoneIndex}
          >
            {/* ─── Section bureau (sections 1/2/3) ─── */}
            {showQgZone(0) && (
              <>
                <QgJournal
                  onTap={() => {
                    playNewspaper();
                    setGazetteOuverte(true);
                  }}
                />
                <QgCarnet
                  onTap={() => {
                    playClick();
                    setCarnetOuvert(true);
                  }}
                />
              </>
            )}
            {showQgZone(1) && (
              <>
                <QgPorte
                  onTap={() => {
                    playDoorOpen();
                    setPorteOuverte(true);
                  }}
                />
                <QgCourrier
                  nbNonLus={nbCourriersNonLus}
                  onTap={() => {
                    playPaper();
                    setCourrierOuvert(true);
                  }}
                />
                <QgPortemanteau />
                <QgCalendrier
                  jourActuel={state.jourActuel}
                  onTap={() => setCalendrierOuvert(true)}
                />
              </>
            )}
            {showQgZone(2) && (
              <>
                <QgFauteuil
                  chat={state.chatSurFauteuil}
                  onTap={() => {
                    if (state.chatSurFauteuil) startCatPurr();
                    else playClick();
                    setConfirmPasser(true);
                  }}
                />
                <QgGramophone
                  onTap={() => {
                    playClick();
                    setGramophoneOuvert(true);
                  }}
                />
              </>
            )}

            {/* ─── Section atelier (sections 4/5/6) — décalée +300vw ─── */}
            <div
              style={{
                position: "absolute",
                left: `${ATELIER_X_SHIFT_VW}vw`,
                top: 0,
                width: "300vw",
                height: "100%",
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/atelier/gerer")}
                aria-label="Ouvrir l'établi"
                style={atelierHotspotStyle(
                  ATELIER_LAYOUT.objets.etabli,
                  45,
                )}
              />
            </div>

            {/* Cartons cliquables sur l'étagère de stockage (coords absolues
                dans le panorama 600vw — la zone atelier débute à 300vw).
                Les cartons de la colonne droite (boxJeux/boxMaison) utilisent
                des assets pré-croppés pour passer "derrière" le montant droit
                de l'étagère sans avoir besoin d'un masque DOM. */}
            <QgStockageBoxes />

            <QgChatBaladeur
              jourActuel={state.jourActuel}
              chatSurFauteuil={state.chatSurFauteuil}
            />
          </UnifiedPanorama>

          {/* Dots indicateur de section active. Le conteneur parent
              exclut déjà safe-bottom de sa hauteur — `bottom: 10px`
              place les dots juste au-dessus du bas du panorama (≈ au
              ras de la barre de navigation), comme demandé. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 10,
              display: "flex",
              justifyContent: "center",
              gap: 6,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            {UNIFIED_ZONE_ORDER.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === zoneActive ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === zoneActive
                      ? "var(--brass-300)"
                      : "rgba(241,227,191,0.45)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  transition: "all 220ms ease",
                }}
              />
            ))}
          </div>
        </div>
      </MobileLayout>

      {/* Page-level children (vide en pratique — toutes les pages sont des marqueurs). */}
      {children}

      {/* Sheets QG. */}
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

      <CarnetSheet
        open={carnetOuvert}
        onClose={() => setCarnetOuvert(false)}
        state={state}
      />

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

      {editEnabled && <QgEditPanel />}
    </QgEditProvider>
  );
}

/** Style d'un hotspot atelier — coords relatives au sous-conteneur +300vw. */
function atelierHotspotStyle(
  obj: (typeof ATELIER_LAYOUT.objets)[keyof typeof ATELIER_LAYOUT.objets],
  heightPct: number,
): CSSProperties {
  return {
    position: "absolute",
    left: `${obj.left}vw`,
    bottom: `${obj.bottom}%`,
    width: `${obj.width}vw`,
    height: `${heightPct}%`,
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    pointerEvents: "auto",
    WebkitTapHighlightColor: "transparent",
  };
}

export default function PanoramaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <PanoramaInner>{children}</PanoramaInner>
    </Suspense>
  );
}
