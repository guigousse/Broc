"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, DoorOpen } from "lucide-react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { ChineMystereDrawer } from "./ChineMystereDrawer";
import { sonsRevelation } from "@/lib/chine/revelationSons";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { BarreBasSession } from "@/components/mobile/BarreBasSession";
import type { ObjetEnVente } from "@/types/game";

const SWIPE_SEUIL_PX = 40;

export function ItemSwipeDeck({
  slides,
  plein,
  boiteReclamee,
  onOuvrirBoite,
  onQuitter,
  renderNegoDrawer,
  onNavigate,
  renderDock,
  pulseSortir,
  negoOuverte = false,
  indexImpose = null,
}: {
  slides: ChineSlide[];
  plein: boolean;
  boiteReclamee: boolean;
  onOuvrirBoite: () => void;
  onQuitter: () => void;
  /** Tiroir de négociation rendu sous la carte pour l'objet courant. */
  renderNegoDrawer?: (item: ObjetEnVente) => ReactNode;
  /** Appelé à chaque changement de carte (replie la négo en cours). */
  onNavigate?: () => void;
  /** Dock de compétences rendu à droite du bouton Sortir (reçoit la carte courante). */
  renderDock?: (currentItem: ObjetEnVente | null) => ReactNode;
  /** Tutoriel : fait pulser le bouton Sortir pour guider le joueur vers la sortie. */
  pulseSortir?: boolean;
  /** Négo dépliée : masque la barre ◀ n/N ▶ pour laisser plus de place à l'objet. */
  negoOuverte?: boolean;
  /** Tutoriel scripté : verrouille le deck sur cette carte (swipe et nav inertes). */
  indexImpose?: number | null;
}) {
  const { d } = useLangue();
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Ancien vendeur maintenu en calque le temps du cross-fade. */
  const [ghost, setGhost] = useState<{ item: ObjetEnVente; key: number } | null>(
    null,
  );
  const seenRef = useRef<Set<string>>(new Set());
  const lastSonCleRef = useRef<string | null>(null);
  const startXRef = useRef<number | null>(null);
  const prevItemRef = useRef<ObjetEnVente | null>(null);
  const ghostKeyRef = useRef(0);

  const clampedIdx =
    indexImpose ?? (slides.length ? Math.min(index, slides.length - 1) : 0);
  const currentSlide = slides.length ? slides[clampedIdx] : null;
  const currentItem =
    currentSlide?.kind === "item" ? currentSlide.item : null;

  // Sons de swipe : l'apparition (« whoup ») rejoue à CHAQUE changement de
  // carte ; rareté, mystère et découverte ne se déclenchent qu'à la PREMIÈRE
  // apparition d'une carte. Les gardes portent sur l'IDENTITÉ de la carte et
  // non sur son index : les updates de négo (qui changent la ref `slides`)
  // ne rejouent donc rien, tandis qu'un remplacement par la Fouille — autre
  // objet au même index — se révèle bien comme la carte neuve qu'il est.
  useEffect(() => {
    if (slides.length === 0) return;
    const i = Math.min(index, slides.length - 1);
    const slide = slides[i];
    const cle = slide.kind === "mystere" ? "mystere" : slide.item.id;
    if (cle === lastSonCleRef.current) return;
    lastSonCleRef.current = cle;
    const premiereFois = !seenRef.current.has(cle);
    seenRef.current.add(cle);
    for (const son of sonsRevelation(slide)) {
      if (son === "apparition") audioManager.playApparition();
      else if (premiereFois && son === "rarete") audioManager.playRarete();
      else if (premiereFois && son === "mystere") audioManager.playMystere();
      else if (premiereFois && son === "decouverte")
        audioManager.playDecouverte();
    }
  }, [index, slides]);

  // Cross-fade du vendeur : quand l'objet courant change, l'ancien tiroir
  // devient un « fantôme » qui s'estompe pendant que le nouveau apparaît.
  useEffect(() => {
    const prev = prevItemRef.current;
    prevItemRef.current = currentItem;
    if (prev && currentItem && prev.id !== currentItem.id) {
      ghostKeyRef.current += 1;
      const gk = ghostKeyRef.current;
      setGhost({ item: prev, key: gk });
      const t = setTimeout(
        () => setGhost((g) => (g && g.key === gk ? null : g)),
        520,
      );
      return () => clearTimeout(t);
    }
  }, [currentItem]);

  // Le tutoriel scripté verrouille le deck via `indexImpose` sans jamais
  // passer par `go()` (qui early-return pendant le verrouillage) : sans
  // cette resynchronisation, l'état interne `index` reste figé à sa valeur
  // d'avant le script (0) pendant toute la session scriptée. Deux effets de
  // bord sinon : l'effet des sons ci-dessus (basé sur `index`, pas
  // `clampedIdx`) ne rejoue plus rien après la 1ère carte imposée, et le
  // déverrouillage (indexImpose → null, à "chine-sortir") ferait retomber
  // brutalement le deck sur la carte 0 au lieu de la dernière imposée.
  useEffect(() => {
    if (indexImpose !== null) setIndex(indexImpose);
  }, [indexImpose]);

  const go = (delta: number) => {
    if (indexImpose !== null) return;
    const next = Math.min(slides.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    onNavigate?.();
    setIndex(next);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (indexImpose !== null) return;
    startXRef.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (startXRef.current === null) return;
    let dx = e.clientX - startXRef.current;
    // Résistance élastique aux bornes (pas de carte au-delà).
    if (
      (clampedIdx === 0 && dx > 0) ||
      (clampedIdx === slides.length - 1 && dx < 0)
    ) {
      dx *= 0.3;
    }
    setDragX(dx);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    setDragging(false);
    setDragX(0);
    if (Math.abs(dx) > SWIPE_SEUIL_PX) go(dx < 0 ? 1 : -1);
  };
  const onPointerCancel = () => {
    startXRef.current = null;
    setDragging(false);
    setDragX(0);
  };

  if (slides.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--ink-500)" }}>
        {d.chine.rienAChiner}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            transform: `translateX(calc(${-clampedIdx * 100}% + ${dragX}px))`,
            transition: dragging
              ? "none"
              : "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {/* Clé par identité d'objet, et non par index : la Fouille remplace
              un objet en place, et le remontage qui s'ensuit rend bien la
              carte de remplacement pour ce qu'elle est — une AUTRE carte. */}
          {slides.map((s) => (
            <div
              key={s.kind === "mystere" ? "mystere" : s.item.id}
              style={{ flex: "0 0 100%", minWidth: 0, height: "100%" }}
            >
              <ChineSlideVue slide={s} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation ◀ 1/6 ▶ sous l'image — masquée en négo dépliée pour rendre
          la place à l'objet (on négocie un objet à la fois). */}
      <div style={{ ...navRow, display: negoOuverte ? "none" : navRow.display }}>
        <button
          type="button"
          aria-label={d.chine.precedent}
          onClick={() => go(-1)}
          disabled={indexImpose !== null || clampedIdx === 0}
          style={navBtn(indexImpose !== null || clampedIdx === 0)}
        >
          <ChevronLeft size={26} />
        </button>
        <span style={navCompteur}>
          {clampedIdx + 1} / {slides.length}
        </span>
        <button
          type="button"
          aria-label={d.sheets.suivant}
          onClick={() => go(1)}
          disabled={indexImpose !== null || clampedIdx === slides.length - 1}
          style={navBtn(indexImpose !== null || clampedIdx === slides.length - 1)}
        >
          <ChevronRight size={26} />
        </button>
      </div>

      {currentSlide?.kind === "mystere" && (
        <div key="mystere-drawer" style={{ animation: "broc-fade-in 500ms ease" }}>
          <ChineMystereDrawer
            plein={plein}
            boiteReclamee={boiteReclamee}
            onOuvrirBoite={onOuvrirBoite}
          />
        </div>
      )}

      {currentItem && (
        <div style={{ position: "relative" }}>
          <div key={currentItem.id} style={{ animation: "broc-fade-in 500ms ease" }}>
            {renderNegoDrawer?.(currentItem)}
          </div>
          {ghost && (
            <div
              key={`ghost-${ghost.key}`}
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                animation: "broc-fade-out 500ms ease forwards",
              }}
            >
              {renderNegoDrawer?.(ghost.item)}
            </div>
          )}
        </div>
      )}

      <BarreBasSession
        gauche={
          <button
            type="button"
            aria-label={d.chine.quitterBrocanteAriaLabel}
            onClick={onQuitter}
            className={pulseSortir ? "tuto-pulse tuto-main tuto-main-droite" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--brass-300)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(10px, 2.6vw, 12px)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: 0,
            }}
          >
            <DoorOpen size={26} strokeWidth={2} />
            {d.chine.sortir}
          </button>
        }
        droite={renderDock?.(currentItem)}
      />
    </div>
  );
}

/** Barre ◀ 1/6 ▶ sous l'image (au-dessus du tiroir vendeur). */
const navRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: "2px 0 6px",
};

const navBtn = (disabled: boolean): CSSProperties => ({
  background: "transparent",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  color: "var(--brass-300)",
  opacity: disabled ? 0.3 : 1,
  padding: 0,
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const navCompteur: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--paper-100)",
  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
  minWidth: 48,
  textAlign: "center",
};
