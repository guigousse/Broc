"use client";

/**
 * Layout du groupe (qg) : monte le panorama du bureau (zones porte/bureau/
 * repos, sheets QG, gramophone) une seule fois, partagé entre `/bureau`
 * (page marqueur, rend null) et `/stockage` (fenêtre flottante par-dessus
 * le panorama flouté, cf. FloatingRoomOverlay). Le verrou de scroll du
 * document et l'ambiance audio du bureau restent actifs quand la fenêtre
 * flottante Stockage est ouverte — c'est voulu : on reste « dans la
 * pièce », le panneau d'items a son propre scroll interne.
 */

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
import { useRouter } from "next/navigation";
import { useLangue } from "@/lib/i18n/LangueContext";
import { audioManager } from "@/lib/audio/audioManager";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { IrisArrivee } from "@/components/mobile/IrisTransition";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import {
  UnifiedPanorama,
  UNIFIED_ZONE_ORDER,
} from "@/components/mobile/panorama/UnifiedPanorama";
import { QgCarnet } from "@/components/mobile/qg/QgCarnet";
import { LivrablesBadges } from "@/components/mobile/qg/LivrablesBadges";
import { QgPorteRevues } from "@/components/mobile/qg/QgPorteRevues";
import { QgPorte } from "@/components/mobile/qg/QgPorte";
import { QgCourrier } from "@/components/mobile/qg/QgCourrier";
import { QgPortemanteau } from "@/components/mobile/qg/QgPortemanteau";
import { QgCalendrier } from "@/components/mobile/qg/QgCalendrier";
import { QgFauteuil } from "@/components/mobile/qg/QgFauteuil";
import { QgGramophone } from "@/components/mobile/qg/QgGramophone";
import { GrandPereBadge } from "@/components/mobile/qg/GrandPereBadge";
import { QgColis } from "@/components/mobile/qg/QgColis";
import { QgCadeau } from "@/components/mobile/qg/QgCadeau";
import { ColisOverlay } from "@/components/mobile/qg/overlays/ColisOverlay";
import { COLIS_TUTORIEL_TAILLE } from "@/data/starterInventory";
import { cadeauAnniversaireVisible, doigtSwipeVersGramophone } from "@/lib/anniversaire";
import { QgChatBaladeur } from "@/components/mobile/qg/QgChatBaladeur";
import { QgEditProvider } from "@/components/mobile/qg/dev/QgEditContext";
import { QgEditPanel } from "@/components/mobile/qg/dev/QgEditPanel";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { DialogueOverlay } from "@/components/mobile/dialogue/DialogueOverlay";
import { PorteSheet } from "@/components/mobile/qg/sheets/PorteSheet";
import { PasserConfirmSheet } from "@/components/mobile/qg/sheets/PasserConfirmSheet";
import { RegistreOverlay, type OngletRegistre } from "@/components/mobile/qg/overlays/RegistreOverlay";
import { CourrierSheet } from "@/components/mobile/qg/sheets/CourrierSheet";
import { CalendrierSheet } from "@/components/mobile/qg/sheets/CalendrierSheet";
import { GramophoneSheet } from "@/components/mobile/qg/sheets/GramophoneSheet";
import { useGame, useGameActions } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { CATEGORIES } from "@/data/categories";
import {
  GRAND_PERE_PORTRAITS,
  SEQUENCES_ANNIVERSAIRE,
  SEQUENCES_TUTORIEL,
  type DialogueSequence,
} from "@/data/dialogues";
import { VITRINE_PREP_ID } from "@/lib/vitrinePrep";
import { stockageEstPlein } from "@/lib/stockage";
import { energieCourante } from "@/lib/energie";
import { EnergieRecharge } from "@/components/mobile/EnergieRecharge";
import { indexJourSemaine } from "@/lib/meteo";
import { PRIX_GAZETTE } from "@/lib/tendances";
import { nomExpediteur } from "@/lib/i18n/contenu";
import { tutorielActif, doigtSwipeVersCarnet } from "@/lib/tutoriel";
import { OUTILS_DEV } from "@/lib/outilsDev";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
  aGenInfluence,
} from "@/lib/competences";
import { vinylAudioUrl, vinylHasAudio } from "@/data/vinylesAudio";
import { missionsLivrables } from "@/lib/quetes/objectifs";
import { chapitrePret } from "@/lib/quetes/principales";
import type { CategorieObjet, CollectionSlot, Objet } from "@/types/game";
import {
  volumeVinylForPos,
  fireplaceVolumeForPos,
} from "@/components/mobile/panorama/audioCurves";

const VINYLE_PREFIXES = ["mus.vinyle_", "mus.33tours_"];
const GRAMO_SESSION_KEY = "broc.gramo.session";

function QgLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { d, locale } = useLangue();
  const {
    state,
    isHydrated,
    acheterGazette,
    marquerCourrierLu,
    livrerMission,
    avancerJour,
    tempsConfiance,
    rerollMeteo,
    rerollCelebrite,
  } = useGame();
  const {
    avancerTutoriel,
    terminerTutoriel,
    accepterChapitrePrincipal,
    ouvrirObjetColis,
    ouvrirCadeauAnniversaire,
    terminerMiniTutoVinyle,
    terminerMiniTutoCarnet,
  } = useGameActions();
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

  // Sheets QG.
  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  /** Machine à énergie popée avec bandeau : Chiner/Étaler cliqué sans énergie. */
  const [alerteEnergie, setAlerteEnergie] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  /** Registre unifié (Commandes/Comptes) : null = fermé, sinon onglet actif. */
  const [registreOuvert, setRegistreOuvert] = useState<OngletRegistre | null>(null);
  /** Commande à déplier d'office dans le registre (badge livrable tapé). */
  const [missionCibleId, setMissionCibleId] = useState<string | null>(null);
  const [courrierOuvert, setCourrierOuvert] = useState(false);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);
  const [gramophoneOuvert, setGramophoneOuvert] = useState(false);
  const [vinyleCourantIdx, setVinyleCourantIdx] = useState<number | null>(null);
  const [vinyleEnLecture, setVinyleEnLecture] = useState(false);
  const [dialogueQg, setDialogueQg] = useState<DialogueSequence | null>(null);
  // Chapitre de la trame prêt à être délivré (pastille du grand-père,
  // Task 9) : `null` si aucun n'est dû. `dialogueChapitreId` mémorise le
  // chapitre en cours de délivrance le temps du dialogue, pour l'accepter
  // (créer la mission) à sa fin — cf. onFini du DialogueOverlay ci-dessous.
  const chPret = state ? chapitrePret(state) : null;
  const [dialogueChapitreId, setDialogueChapitreId] = useState<string | null>(null);
  // Cérémonie du colis du tutoriel (étape ouvrir-colis) : objet en cours de
  // révélation + son rang (1-based). null = overlay fermé.
  const [objetColis, setObjetColis] = useState<Objet | null>(null);
  const [numeroColis, setNumeroColis] = useState(0);
  // Cadeau d'anniversaire (11 juin) : objet en cours de révélation.
  const [objetCadeau, setObjetCadeau] = useState<Objet | null>(null);

  // Index de la zone la plus proche (0..2), émis à chaque rAF de scroll.
  const zoneIdxRef = useRef(UNIFIED_ZONE_ORDER.indexOf("porte"));
  const [zoneActive, setZoneActive] = useState(zoneIdxRef.current);

  // Redirection si pas d'état (cohérent avec les anciennes pages).
  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  // Audio QG : ambience + cheminée. Démarrent au mount de la page, s'arrêtent
  // au démontage (sortie du bureau).
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

  const handleZoneIndex = useCallback((idx: number) => {
    zoneIdxRef.current = idx;
    const snapIdx = Math.round(idx);
    setZoneActive((prev) => (prev === snapIdx ? prev : snapIdx));

    // Audio : volume cheminée + vinyle pilotés par la position. Pic au
    // repos (idx 2) où sont cheminée et gramophone.
    audioManager.setFireplaceVolume(fireplaceVolumeForPos(idx));
    if (!gramophoneOuvertRef.current) {
      setVinylTargetVolumeRef.current(volumeVinylForPos(idx));
    }
  }, []);

  // À l'entrée dans le panorama (intérieur du bâtiment), on remet
  // l'ambiance gramophone à "pleine pièce" (volume 1, lowpass 20000).
  // Le contrôleur global GlobalVinylAmbiance reprendra la main dès qu'on
  // sortira sur /chiner, /vitrine, /atelier, etc.
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

  /** Missions actives livrables → pastilles commanditaires en bas à gauche. */
  const livrables = useMemo(
    () => (state ? missionsLivrables(state) : []),
    [state],
  );

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
      // Mini-tuto vinyles : la musique démarre → clôture + rappel du grand-père.
      if (state?.miniTutoVinyle === "ecouter") {
        terminerMiniTutoVinyle();
        setDialogueQg(SEQUENCES_ANNIVERSAIRE.anniv_fin);
      }
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
    state?.miniTutoVinyle,
    terminerMiniTutoVinyle,
  ]);

  const handleSelectVinyle = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= vinyles.length) return;
      setVinyleCourantIdx(idx);
      setVinyleEnLecture(true);
      playGramophoneSong(vinylAudioUrl(vinyles[idx].templateId), () =>
        handleNext(),
      );
      if (state?.miniTutoVinyle === "ecouter") {
        terminerMiniTutoVinyle();
        setDialogueQg(SEQUENCES_ANNIVERSAIRE.anniv_fin);
      }
    },
    [vinyles, playGramophoneSong, handleNext, state?.miniTutoVinyle, terminerMiniTutoVinyle],
  );

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
  }, [state]);

  // Edit mode :
  //   - activé par défaut si `NEXT_PUBLIC_QG_EDIT=1` au build, OU
  //   - activable via `?qgedit=1` (persiste ensuite dans localStorage), OU
  //   - désactivable via `?qgedit=0` (efface la clé).
  // ⚠ Ces hooks vivaient APRÈS l'early return « ouverture du local… » :
  // en navigation dure, le premier rendu (non hydraté) déclarait N hooks,
  // le rendu hydraté N+4 → crash React #310 « Rendered more hooks ».
  // Tous les hooks du composant DOIVENT précéder ce return (rules-of-hooks,
  // désormais vérifié par `npm run lint:hooks`).
  const [editEnabled, setEditEnabled] = useState(
    () => OUTILS_DEV && process.env.NEXT_PUBLIC_QG_EDIT === "1",
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Prod : le mode édition du QG n'existe pas — ni ?qgedit=1 ni une clé
    // localStorage résiduelle ne doivent l'activer sur l'appareil d'un joueur.
    if (!OUTILS_DEV) return;
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

  const etape = state?.tutorielEtape;

  // Dialogues automatiques du tutoriel au bureau. Un seul déclenchement par
  // étape : l'étape n'avance qu'à la fin du dialogue (onFini), et l'effet ne
  // rouvre pas si un dialogue est déjà affiché.
  useEffect(() => {
    if (dialogueQg) return;
    if (etape === "accueil") setDialogueQg(SEQUENCES_TUTORIEL.tuto_accueil);
    else if (etape === "rentrer") setDialogueQg(SEQUENCES_TUTORIEL.tuto_retour);
    else if (etape === "conclusion") setDialogueQg(SEQUENCES_TUTORIEL.tuto_conclusion);
  }, [etape, dialogueQg]);

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
        {d.qg.ouvertureLocal}
      </main>
    );
  }

  const nbCourriersNonLus = state.courriers.filter((c) => !c.lu).length;

  // Tant que le tutoriel guidé est en cours, seuls les objets prescrits par
  // l'étape courante (porte, grand-père) réagissent au tap — tous les
  // autres objets du QG sont verrouillés pour ne pas distraire le joueur.
  const tutoActif = tutorielActif(state);
  // Widened au-delà de "aller-chiner"/"preparer-etal" : un joueur qui sort de
  // la brocante sans rien acheter (étape reste "premier-achat") ou termine
  // une journée d'étal sans vente (étape reste "premiere-vente") doit
  // pouvoir rouvrir la porte pour réessayer — sinon soft-lock au bureau.
  const portePermise =
    etape === "aller-chiner" ||
    etape === "premier-achat" ||
    etape === "preparer-etal" ||
    etape === "premiere-vente";

  // Virtualisation : monte un objet si sa zone est à distance ≤ 1 de la zone
  // active (index 0..2). bureau/porte/repos = 0/1/2.
  const showQgZone = (qgZoneIdx: 0 | 1 | 2) =>
    Math.abs(zoneActive - qgZoneIdx) <= 1;

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
          <UnifiedPanorama initialZone="porte" onZoneIndex={handleZoneIndex}>
            {/* ─── Sections du bureau (0/1/2) ─── */}
            {showQgZone(0) && (
              <>
                <QgCarnet
                  tutoMain={state.miniTutoCarnet === "ouvrir" && !dialogueQg}
                  onTap={() => {
                    if (tutoActif) return;
                    playClick();
                    terminerMiniTutoCarnet();
                    setRegistreOuvert("commandes");
                  }}
                />
              </>
            )}
            {showQgZone(1) && (
              <>
                <QgPorte
                  pulse={portePermise && !porteOuverte}
                  onTap={() => {
                    if (tutoActif && !portePermise) return;
                    playDoorOpen();
                    setPorteOuverte(true);
                  }}
                />
                {etape === "ouvrir-colis" && (
                  <QgColis
                    onTap={() => {
                      playClick();
                      const premier = ouvrirObjetColis();
                      if (premier) {
                        setNumeroColis((state?.colisTutorielLivres ?? 0) + 1);
                        setObjetColis(premier);
                      }
                    }}
                  />
                )}
                {state && cadeauAnniversaireVisible(state) && (
                  <QgCadeau
                    onTap={() => {
                      playClick();
                      const vinyle = ouvrirCadeauAnniversaire();
                      if (vinyle) setObjetCadeau(vinyle);
                    }}
                  />
                )}
                <QgCourrier
                  nbNonLus={nbCourriersNonLus}
                  onTap={() => {
                    if (tutoActif) return;
                    playPaper();
                    setCourrierOuvert(true);
                  }}
                />
                <QgPortemanteau />
                <QgCalendrier
                  jourActuel={state.jourActuel}
                  onTap={() => {
                    if (tutoActif) return;
                    setCalendrierOuvert(true);
                  }}
                />
                <QgPorteRevues
                  gazetteAchetee={state.gazetteAchetee}
                  onTap={() => {
                    if (tutoActif) return;
                    playNewspaper();
                    setGazetteOuverte(true);
                  }}
                />
              </>
            )}
            {showQgZone(2) && (
              <>
                <QgFauteuil
                  chat={state.chatSurFauteuil}
                  onTap={() => {
                    if (tutoActif) return;
                    if (state.chatSurFauteuil) startCatPurr();
                    else playClick();
                    setConfirmPasser(true);
                  }}
                />
                <QgGramophone
                  guide={state?.miniTutoVinyle === "ecouter"}
                  onTap={() => {
                    if (tutoActif) return;
                    playClick();
                    setGramophoneOuvert(true);
                  }}
                />
              </>
            )}

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

          {/* Mini-tuto vinyles : invite à swiper vers la droite (gramophone
              en zone repos) tant qu'on n'y est pas. zIndex 6 > dots (5). */}
          {state && doigtSwipeVersGramophone(state.miniTutoVinyle, zoneActive) && (
            <div className="tuto-main-swipe" aria-hidden />
          )}

          {/* Mini-tuto carnet : invite à rejoindre la zone gauche (livre de
              compte) après la conclusion du tutoriel. */}
          {state && !dialogueQg && doigtSwipeVersCarnet(state.miniTutoCarnet, zoneActive) && (
            <div className="tuto-main-swipe tuto-main-swipe-gauche" aria-hidden />
          )}
        </div>
      </MobileLayout>

      {/* Pages du groupe (qg) : /bureau rend null ; /stockage rend la
          fenêtre flottante (FloatingRoomOverlay) par-dessus le panorama.
          Les sheets QG ci-dessous gardent leurs z-index (40+) au-dessus. */}
      {children}

      {/* Sheets QG. */}
      <PorteSheet
        open={porteOuverte}
        onClose={() => {
          playDoorClose();
          setPorteOuverte(false);
        }}
        vitrineActive={!!state.vitrine}
        chinerDesactive={stockageEstPlein(state)}
        tutoChiner={etape === "aller-chiner" || etape === "premier-achat"}
        tutoEtaler={etape === "preparer-etal" || etape === "premiere-vente"}
        onChiner={() => {
          playDoorClose();
          setPorteOuverte(false);
          // Pas d'énergie → la machine pope avec le bandeau d'alerte.
          if (energieCourante(state, tempsConfiance() ?? Date.now()) < 1) {
            setAlerteEnergie(true);
            return;
          }
          router.push("/chiner");
        }}
        onVitrine={() => {
          playDoorClose();
          setPorteOuverte(false);
          // Flow étaler : packing + pricing en prep, puis sélection brocante,
          // puis journée. Reprise :
          //   - vitrine attachée à une vraie brocante → reprise de la journée.
          //   - vitrine en prep (ou pas de vitrine) → /vitrine/prep.
          const v = state.vitrine;
          if (v && v.brocanteId !== VITRINE_PREP_ID) {
            // Journée déjà commencée (énergie déjà consommée) : jamais bloquée.
            router.push(`/vitrine/${v.brocanteId}/journee`);
            return;
          }
          // Pas d'énergie → la machine pope avec le bandeau d'alerte.
          if (energieCourante(state, tempsConfiance() ?? Date.now()) < 1) {
            setAlerteEnergie(true);
            return;
          }
          router.push("/vitrine/prep");
        }}
      />

      {/* Machine à énergie popée en alerte (sortie refusée faute d'énergie). */}
      {alerteEnergie && (
        <EnergieRecharge
          onClose={() => setAlerteEnergie(false)}
          alerte={d.chrome.energieInsuffisante}
        />
      )}

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

      <RegistreOverlay
        open={registreOuvert !== null}
        onglet={registreOuvert ?? "commandes"}
        onOngletChange={setRegistreOuvert}
        onClose={() => {
          setRegistreOuvert(null);
          setMissionCibleId(null);
        }}
        state={state}
        onLivrerMission={(id) => livrerMission(id)}
        tempsConfiance={tempsConfiance}
        missionInitialeId={missionCibleId}
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
        guide={state?.miniTutoVinyle === "ecouter"}
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
        influenceDisponible={
          aGenInfluence(state) && !state.influenceUtilisee && state.gazetteAchetee
        }
        onRerollMeteo={() => rerollMeteo()}
        onRerollCelebrite={() => rerollCelebrite()}
      />

      {/* Pastille du grand-père : s'allume quand un chapitre de la trame est
          prêt à être délivré (chapitrePret), masquée pendant tout autre
          dialogue (tutoriel) pour ne pas se superposer. */}
      <ColisOverlay
        objet={objetCadeau}
        numero={1}
        total={1}
        titre={d.tutoriel.cadeauTitre}
        onRecuperer={() => {
          setObjetCadeau(null);
          setDialogueQg(SEQUENCES_ANNIVERSAIRE.anniv_cadeau);
        }}
      />
      <ColisOverlay
        objet={objetColis}
        numero={numeroColis}
        total={COLIS_TUTORIEL_TAILLE}
        onRecuperer={() => {
          const suivant = ouvrirObjetColis();
          if (suivant) {
            setNumeroColis((state?.colisTutorielLivres ?? 0) + 1);
            setObjetColis(suivant);
          } else {
            setObjetColis(null);
            avancerTutoriel("preparer-etal");
          }
        }}
      />
      <GrandPereBadge
        visible={!!chPret && !dialogueQg}
        onTap={() => {
          if (!chPret) return;
          playClick();
          setDialogueChapitreId(chPret.id);
          setDialogueQg({ id: `dlg_${chPret.id}`, lignes: chPret.dialogue });
        }}
      />
      {!tutoActif && !dialogueQg && (
        <LivrablesBadges
          livrables={livrables}
          sureleves={!!chPret}
          onTap={(courrierId) => {
            playClick();
            setMissionCibleId(courrierId);
            setRegistreOuvert("commandes");
          }}
        />
      )}
      <DialogueOverlay
        sequence={dialogueQg}
        nom={nomExpediteur("grand-pere", locale)}
        portraits={GRAND_PERE_PORTRAITS}
        onFini={() => {
          setDialogueQg(null);
          if (dialogueChapitreId) {
            accepterChapitrePrincipal(dialogueChapitreId);
            setDialogueChapitreId(null);
          } else if (etape === "accueil") avancerTutoriel("aller-chiner");
          else if (etape === "rentrer") avancerTutoriel("ouvrir-colis");
          else if (etape === "conclusion") terminerTutoriel();
        }}
      />

      {editEnabled && <QgEditPanel />}
    </QgEditProvider>
  );
}

export default function QgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <QgLayoutInner>{children}</QgLayoutInner>
      </Suspense>
      {/* Réouverture d'iris à l'arrivée (flag posé par Continuer, le
          lancement d'un slot ou l'intro de nouvelle partie) : montée HORS
          de QgLayoutInner pour couvrir aussi son early-return « ouverture
          du local… » pendant l'hydratation, et ne dépendre d'aucun état de
          jeu. Sans flag (refresh, lien direct), ne rend rien. */}
      <IrisArrivee imageSrc="/qg/fond-cabinet.webp" />
    </>
  );
}
