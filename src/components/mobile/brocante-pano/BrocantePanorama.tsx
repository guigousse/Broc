"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Brocante, BrocanteTier, GameState } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { energieCourante } from "@/lib/energie";
import { coffreCompatibleTheme } from "@/lib/vitrine";
import {
  calculerBrocantesDebloqueesParTier,
  listerConditionsAvecEtat,
} from "@/lib/deblocage";
import {
  getDernierTierVisite,
  setDernierTierVisite,
  vitrineEstEnPrep,
} from "@/lib/vitrinePrep";
import { useGameActions } from "@/context/GameContext";
import { tutorielActif } from "@/lib/tutoriel";
import { OUTILS_DEV } from "@/lib/outilsDev";
import { useLangue } from "@/lib/i18n/LangueContext";
import { ID_GRANDE_BRADERIE } from "@/lib/evenements";
import { BrocanteScene } from "./BrocanteScene";
import { BrocanteTransition, TRANSITION_WIDTH_PX } from "./BrocanteTransition";
import { BrocanteDetailFloating } from "./BrocanteDetailFloating";
import { BrocanteBottomBar } from "./BrocanteBottomBar";
import { BrocanteFramesEditProvider } from "./BrocanteFramesEditContext";
import { CadreEditToggle } from "./CadreEditToggle";
import { ScenePlaquesBar } from "./ScenePlaquesBar";
import { ScenesEditPanel } from "./ScenesEditPanel";
import { sceneDeBrocante, type SceneId } from "./brocantePanoramaLayout";

interface BrocantePanoramaProps {
  brocantes: Brocante[];
  state: GameState;
  debloqueesIds: Set<string>;
  destination: "chiner" | "vitrine";
  onBack: () => void;
  /** Positionne la barre de plaques (tiers) en bas plutôt qu'en haut. */
  plaquesEnBas?: boolean;
}

const wrapperStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  display: "flex",
};

const scrollerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflowX: "auto",
  overflowY: "hidden",
  scrollSnapType: "x mandatory",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "row",
};

const floatingLayer: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  // Bord supérieur juste sous le cadre le plus bas (atelier-bricoleur en
  // tier 2 finit à ~63.35 %) + 1.5 % de marge → 65 %. La fenêtre flotte
  // sous la rangée basse de cadres, indépendamment de la barre Retour/
  // Continuer (le scroller exclut déjà cette zone via MobileLayout).
  top: "65%",
  padding: "0 14px",
  pointerEvents: "none",
  zIndex: 20,
};

export function BrocantePanorama({
  brocantes,
  state,
  debloqueesIds,
  destination,
  onBack,
  plaquesEnBas = false,
}: BrocantePanoramaProps) {
  const router = useRouter();
  const { d } = useLangue();
  const { attribuerVitrineABrocante, ajusterBudget, consommerEnergie, tempsConfiance } =
    useGameActions();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneId>(1);

  const brocantesById = useMemo(() => {
    const m = new Map<string, Brocante>();
    for (const b of brocantes) m.set(b.id, b);
    return m;
  }, [brocantes]);

  // La scène événement n'existe que si la braderie fait partie de la liste
  // fournie (elle n'apparaît que ses jours — cf. brocantesVisiblesAuJour).
  const braderiePresente = brocantesById.has(ID_GRANDE_BRADERIE);
  const scenes: SceneId[] = useMemo(
    () => (braderiePresente ? ["evenement", 1, 2, 3, 4] : [1, 2, 3, 4]),
    [braderiePresente],
  );

  // Tier le plus haut où au moins une brocante est débloquée.
  const maxUnlockedTier: BrocanteTier = useMemo(() => {
    let max: BrocanteTier = 1;
    for (const b of brocantes) {
      if (debloqueesIds.has(b.id) && b.tier > max) max = b.tier;
    }
    return max;
  }, [brocantes, debloqueesIds]);

  // Décalage horizontal (en pixels) du début de chaque scène. Chaque scène
  // fait `clientWidth` px ; entre deux scènes consécutives s'intercale un
  // filler de TRANSITION_WIDTH_PX. → offset(i) = i * (clientWidth + filler).
  const tierOffsetPx = useCallback(
    (idx: number, clientWidth: number) =>
      idx * (clientWidth + TRANSITION_WIDTH_PX),
    [],
  );

  // Scroll initial vers la scène la plus pertinente (au mount uniquement) :
  // priorité au dernier tier visité (persistance localStorage UX), sinon
  // tier max débloqué.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dernier = getDernierTierVisite();
    const cible: BrocanteTier =
      dernier !== null && dernier <= maxUnlockedTier ? dernier : maxUnlockedTier;
    // La scène événement n'est jamais la cible du scroll initial : `cible`
    // reste un tier (1-4), donc toujours présent dans `scenes`.
    const idx = scenes.indexOf(cible);
    if (idx > 0) {
      el.scrollLeft = tierOffsetPx(idx, el.clientWidth);
    }
    setCurrentScene(cible);
    didInitRef.current = true;
  }, [maxUnlockedTier, scenes, tierOffsetPx]);

  // Smooth scroll programmatique vers une scène (tap sur un cartel).
  const goToScene = useCallback(
    (s: SceneId) => {
      const el = scrollerRef.current;
      if (!el) return;
      const idx = scenes.indexOf(s);
      el.scrollTo({
        left: tierOffsetPx(idx, el.clientWidth),
        behavior: "smooth",
      });
    },
    [scenes, tierOffsetPx],
  );

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Reset de la sélection si la brocante choisie n'est plus dans le tier visible.
  // On prend l'offset (en pixels) le plus proche du scrollLeft pour identifier
  // le tier courant.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cw = el.clientWidth;
        if (cw <= 0) return;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < scenes.length; i++) {
          const d = Math.abs(el.scrollLeft - tierOffsetPx(i, cw));
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        const sceneAtScroll = scenes[bestIdx];
        setCurrentScene((prev) => (prev === sceneAtScroll ? prev : sceneAtScroll));
        const currentSelectedId = selectedIdRef.current;
        if (currentSelectedId) {
          const sel = brocantesById.get(currentSelectedId);
          if (sel && sceneDeBrocante(sel) !== sceneAtScroll) setSelectedId(null);
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [brocantesById, scenes, tierOffsetPx]);

  // Recompute la cascade tier-par-tier — nécessaire pour afficher la
  // progression "X/Y brocantes ★★" dans les conditions.
  const parTier = useMemo(
    () => calculerBrocantesDebloqueesParTier(state),
    [state],
  );

  const tutoActif = tutorielActif(state);
  const selected = selectedId ? brocantesById.get(selectedId) ?? null : null;
  const selectedDebloquee = selected ? debloqueesIds.has(selected.id) : false;
  const selectedPeutEntrer = selected
    ? state.budget >= fraisEntree(selected) &&
      energieCourante(state, tempsConfiance() ?? Date.now()) >= 1
    : false;
  // Bourse à thème (vente) : le coffre ne doit contenir que des objets du
  // thème — sinon Continuer est bloqué et la carte explique la règle.
  const coffreHorsTheme =
    destination === "vitrine" && selected
      ? !coffreCompatibleTheme(state.vitrine?.objets ?? [], selected)
      : false;
  const selectedConditions =
    selected && !selectedDebloquee
      ? listerConditionsAvecEtat(selected, state, d, parTier)
      : [];
  const continuerActif = !!(
    selected &&
    selectedDebloquee &&
    selectedPeutEntrer &&
    !coffreHorsTheme
  );

  // Idempotence du départ : frais d'entrée et énergie sont débités AVANT la
  // navigation — un double-tap pendant les ~280 ms du push paierait deux fois.
  // Le composant se démonte à l'arrivée, le verrou n'a jamais à se rouvrir.
  const departEngageRef = useRef(false);

  const onContinuer = useCallback(() => {
    if (!selected || !continuerActif) return;
    if (departEngageRef.current) return;
    departEngageRef.current = true;
    // Mémorise le tier choisi pour les prochaines visites (chiner ou vitrine)
    // — même pour la braderie (tier 4) : la scène événement n'est jamais la
    // cible du scroll initial, donc sans conséquence sur la reprise.
    setDernierTierVisite(selected.tier);
    if (destination === "vitrine") {
      // Nouveau flow : packing + pricing déjà faits en prep. Ici on ré-attribue
      // le coffre, on paie le droit d'entrée et on entre directement dans la
      // journée. La page intermédiaire /vitrine/[id] est court-circuitée.
      if (vitrineEstEnPrep(state)) {
        attribuerVitrineABrocante(selected.id);
      }
      ajusterBudget(-fraisEntree(selected));
      consommerEnergie(1);
      router.push(`/vitrine/${selected.id}/journee`);
      return;
    }
    router.push(`/${destination}/${selected.id}`);
  }, [
    selected,
    continuerActif,
    router,
    destination,
    state,
    attribuerVitrineABrocante,
    ajusterBudget,
    consommerEnergie,
  ]);

  return (
    <BrocanteFramesEditProvider>
      <div style={wrapperStyle}>
        <div ref={scrollerRef} style={scrollerStyle} aria-label={d.chine.panoramaBrocantesAria}>
          {scenes.map((sceneId, idx) => (
            <Fragment key={sceneId}>
              <BrocanteScene
                sceneId={sceneId}
                brocantesById={brocantesById}
                selectedId={selectedId}
                debloqueesIds={debloqueesIds}
                onSelect={setSelectedId}
                tutoMainId={
                  // Tutoriel : une seule main à la fois — le cadre tant que
                  // rien n'est sélectionné, puis c'est Continuer qui la porte.
                  tutoActif && !selected ? brocantes[0]?.id ?? null : null
                }
              />
              {idx < scenes.length - 1 && <BrocanteTransition />}
            </Fragment>
          ))}
        </div>
        <ScenePlaquesBar
          currentScene={currentScene}
          onSceneClick={goToScene}
          evenementVisible={braderiePresente}
          position={plaquesEnBas ? "bottom" : "top"}
        />
        {selected && (
          <div style={floatingLayer}>
            <BrocanteDetailFloating
              brocante={selected}
              debloquee={selectedDebloquee}
              peutEntrer={selectedPeutEntrer}
              conditions={selectedConditions}
              destination={destination}
              coffreHorsTheme={coffreHorsTheme}
              collection={state.collection}
            />
          </div>
        )}
      </div>
      <BrocanteBottomBar
        onBack={onBack}
        onContinuer={onContinuer}
        continuerActif={continuerActif}
        tutoMainContinuer={tutoActif && continuerActif}
      />
      {OUTILS_DEV && <CadreEditToggle />}
      {OUTILS_DEV && <ScenesEditPanel currentScene={currentScene} />}
    </BrocanteFramesEditProvider>
  );
}
