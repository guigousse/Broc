"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { sonsRevelation } from "@/lib/chine/revelationSons";
import { audioManager } from "@/lib/audio/audioManager";
import type { ObjetEnVente } from "@/types/game";

const SWIPE_SEUIL_PX = 40;

export function ItemSwipeDeck({
  slides,
  budget,
  plein,
  boiteReclamee,
  onAcheter,
  onNegocier,
  onOuvrirBoite,
}: {
  slides: ChineSlide[];
  budget: number;
  plein: boolean;
  boiteReclamee: boolean;
  onAcheter: (item: ObjetEnVente) => void;
  onNegocier: (item: ObjetEnVente) => void;
  onOuvrirBoite: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"left" | "right">("left");
  const seenRef = useRef<Set<number>>(new Set());
  const startXRef = useRef<number | null>(null);

  // Sons à la PREMIÈRE apparition d'une carte (index jamais vu).
  useEffect(() => {
    if (slides.length === 0) return;
    if (index < 0 || index >= slides.length) return;
    if (seenRef.current.has(index)) return;
    seenRef.current.add(index);
    for (const son of sonsRevelation(slides[index])) {
      if (son === "apparition") audioManager.playApparition();
      else if (son === "rarete") audioManager.playRarete();
      else audioManager.playMystere();
    }
  }, [index, slides]);

  const go = (delta: number) => {
    const next = Math.min(slides.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    setDir(delta > 0 ? "left" : "right");
    setIndex(next);
  };

  const onPointerDown = (e: PointerEvent) => {
    startXRef.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(dx) > SWIPE_SEUIL_PX) go(dx < 0 ? 1 : -1);
  };

  if (slides.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--ink-500)" }}>
        — rien à chiner ici —
      </div>
    );
  }

  const clamped = Math.min(index, slides.length - 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{ flex: 1, minHeight: 0, position: "relative", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { startXRef.current = null; }}
      >
        <div
          key={clamped}
          className="chine-slide"
          style={{
            height: "100%",
            animationName:
              dir === "left" ? "chine-slide-in-left" : "chine-slide-in-right",
            animationDuration: "200ms",
            animationTimingFunction: "ease-out",
          }}
        >
          <ChineSlideVue
            slide={slides[clamped]}
            budget={budget}
            plein={plein}
            boiteReclamee={boiteReclamee}
            onAcheter={onAcheter}
            onNegocier={onNegocier}
            onOuvrirBoite={onOuvrirBoite}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px calc(8px + var(--safe-bottom))",
        }}
      >
        <button
          type="button"
          aria-label="Précédent"
          onClick={() => go(-1)}
          disabled={clamped === 0}
          style={{ background: "transparent", border: "none", cursor: clamped === 0 ? "default" : "pointer", color: "var(--ink-700)", opacity: clamped === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={28} />
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-500)" }}>
          {clamped + 1} / {slides.length}
        </span>
        <button
          type="button"
          aria-label="Suivant"
          onClick={() => go(1)}
          disabled={clamped === slides.length - 1}
          style={{ background: "transparent", border: "none", cursor: clamped === slides.length - 1 ? "default" : "pointer", color: "var(--ink-700)", opacity: clamped === slides.length - 1 ? 0.3 : 1 }}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
