"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { JeuArcade } from "@/lib/bazar/arcade";
import { BORNE_FACADE, dimensionnerBorne } from "./borneArcadeLayout";
import { EcranArcade } from "./EcranArcade";

const voile: CSSProperties = {
  position: "fixed",
  inset: 0,
  // Au-dessus de la fiche d'article (105), qui ne peut pas être ouverte en
  // même temps mais dont le z-index sert de repère à tout cet écran.
  zIndex: 110,
  background: "rgba(15,31,24,0.88)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const boutonFermer: CSSProperties = {
  position: "absolute",
  top: "calc(var(--safe-top) + 10px)",
  right: 12,
  zIndex: 2,
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  border: "1px solid var(--brass-500)",
  background: "rgba(15,31,24,0.75)",
  color: "var(--parchment-100, #e8d5a3)",
  cursor: "pointer",
  padding: 0,
};

interface BorneArcadeEcranProps {
  open: boolean;
  jeux: JeuArcade[];
  onClose: () => void;
}

/**
 * Le plein écran de la borne d'arcade.
 *
 * Trois choses, et rien d'autre : il mesure la place, il pose la façade à
 * l'échelle, et il glisse `EcranArcade` dans le trou du CRT.
 *
 * ORDRE D'EMPILEMENT — c'est la pièce porteuse. L'écran est rendu AVANT
 * l'image, donc dessous. Tout ce que l'illustration peint devant la vitre —
 * les boules des joysticks aujourd'hui, un reflet ou une fêlure demain —
 * masque l'interface sans qu'aucun masque n'ait à être dessiné. Le trou EST
 * le masque. L'image porte `pointer-events: none`, sans quoi elle avalerait
 * les taps destinés aux flèches qui sont dessous.
 */
export function BorneArcadeEcran({ open, jeux, onClose }: BorneArcadeEcranProps) {
  const { d } = useLangue();
  const voileRef = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Fermeture au clavier — même idiome que la fiche d'article et les sheets
  // du QG : le voile se tape au doigt, mais rien ne l'atteint au clavier.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // On mesure le CONTENEUR et jamais `window` : en WebView iOS le body est
  // verrouillé et les dimensions de la fenêtre mentent sur la place réelle.
  useLayoutEffect(() => {
    if (!open) return;
    const el = voileRef.current;
    if (!el) return;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      setPlace({ w: r.width, h: r.height });
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  if (!open) return null;

  const { w, h } = dimensionnerBorne(place);

  return (
    <div
      ref={voileRef}
      role="dialog"
      aria-modal="true"
      aria-label={d.bazar.borneTitre}
      style={voile}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" aria-label={d.bazar.borneFermer} onClick={onClose} style={boutonFermer}>
        <X size={20} />
      </button>

      <div
        data-testid="borne-facade"
        style={{ position: "relative", width: w, height: h, flex: "none" }}
      >
        {/* DESSOUS — voir le commentaire d'en-tête. */}
        <div
          data-testid="borne-fenetre"
          style={{
            position: "absolute",
            left: `${BORNE_FACADE.trou.left}%`,
            right: `${BORNE_FACADE.trou.right}%`,
            top: `${BORNE_FACADE.trou.top}%`,
            bottom: `${BORNE_FACADE.trou.bottom}%`,
          }}
        >
          <EcranArcade jeux={jeux} />
        </div>

        {/* DESSUS, et transparent aux doigts. */}
        <img
          src="/bazar/borne-facade.webp"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
