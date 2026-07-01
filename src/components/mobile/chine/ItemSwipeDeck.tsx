"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, DoorOpen } from "lucide-react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { ChineMystereDrawer } from "./ChineMystereDrawer";
import { sonsRevelation } from "@/lib/chine/revelationSons";
import { audioManager } from "@/lib/audio/audioManager";
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
}) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Ancien vendeur maintenu en calque le temps du cross-fade. */
  const [ghost, setGhost] = useState<{ item: ObjetEnVente; key: number } | null>(
    null,
  );
  const seenRef = useRef<Set<number>>(new Set());
  const lastSonIndexRef = useRef<number>(-1);
  const startXRef = useRef<number | null>(null);
  const prevItemRef = useRef<ObjetEnVente | null>(null);
  const ghostKeyRef = useRef(0);

  const clampedIdx = slides.length ? Math.min(index, slides.length - 1) : 0;
  const currentSlide = slides.length ? slides[clampedIdx] : null;
  const currentItem =
    currentSlide?.kind === "item" ? currentSlide.item : null;

  // Sons de swipe : l'apparition (« whoup ») rejoue à CHAQUE changement de
  // carte ; la rareté et le mystère ne se déclenchent qu'à la PREMIÈRE
  // apparition d'un index. Le garde sur l'index évite que les updates de négo
  // (qui changent la ref `slides`) rejouent le son sans avoir bougé.
  useEffect(() => {
    if (slides.length === 0) return;
    const i = Math.min(index, slides.length - 1);
    if (i === lastSonIndexRef.current) return;
    lastSonIndexRef.current = i;
    const premiereFois = !seenRef.current.has(i);
    seenRef.current.add(i);
    for (const son of sonsRevelation(slides[i])) {
      if (son === "apparition") audioManager.playApparition();
      else if (premiereFois && son === "rarete") audioManager.playRarete();
      else if (premiereFois && son === "mystere") audioManager.playMystere();
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

  const go = (delta: number) => {
    const next = Math.min(slides.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    onNavigate?.();
    setIndex(next);
  };

  const onPointerDown = (e: PointerEvent) => {
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
        — rien à chiner ici —
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
          {slides.map((s, i) => (
            <div key={i} style={{ flex: "0 0 100%", minWidth: 0, height: "100%" }}>
              <ChineSlideVue slide={s} />
            </div>
          ))}
        </div>
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--forest-800)",
          borderTop: "3px solid var(--brass-500)",
          padding: "8px 16px calc(8px + var(--safe-bottom))",
        }}
      >
        <button
          type="button"
          aria-label="Quitter la brocante"
          onClick={onQuitter}
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
          Sortir
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label="Précédent"
            onClick={() => go(-1)}
            disabled={clampedIdx === 0}
            style={{ background: "transparent", border: "none", cursor: clampedIdx === 0 ? "default" : "pointer", color: "var(--brass-300)", opacity: clampedIdx === 0 ? 0.3 : 1, padding: 0 }}
          >
            <ChevronLeft size={28} />
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--brass-700)", minWidth: 48, textAlign: "center" }}>
            {clampedIdx + 1} / {slides.length}
          </span>
          <button
            type="button"
            aria-label="Suivant"
            onClick={() => go(1)}
            disabled={clampedIdx === slides.length - 1}
            style={{ background: "transparent", border: "none", cursor: clampedIdx === slides.length - 1 ? "default" : "pointer", color: "var(--brass-300)", opacity: clampedIdx === slides.length - 1 ? 0.3 : 1, padding: 0 }}
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
