"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { JeuArcade } from "@/lib/bazar/arcade";
import { BORNE_FACADE, dimensionnerBorne } from "./borneArcadeLayout";
import { EcranArcade } from "./EcranArcade";

/**
 * Le voile occupe LE CADRE DU BAZAR, pas l'écran.
 *
 * Ses quatre côtés reprennent mot pour mot ceux de `src/app/bazar/page.tsx` :
 * il se superpose au panorama au pixel près. Deux conséquences, et ce sont
 * exactement les deux qu'on cherche.
 *
 *  - Le bandeau et la barre d'onglets restent nets et lisibles au-dessus : ils
 *    sont peints par-dessus, et le voile ne va plus mordre dessous.
 *  - Le flou porte sur la boutique et sur rien d'autre. Le fond était à 0,88
 *    d'opacité — un aplat vert où le `backdrop-filter` n'avait plus rien à
 *    montrer. À 0,42 la borne se détache toujours (le caisson est sombre et
 *    contrasté) mais on voit qu'on est resté au Bazar, l'étagère hors du point
 *    derrière la machine.
 */
export const STYLE_VOILE_BORNE: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top) + var(--mobile-header-h))",
  bottom: "var(--mobile-tabbar-h)",
  left: 0,
  right: 0,
  // Au-dessus de la fiche d'article (105), qui ne peut pas être ouverte en
  // même temps mais dont le z-index sert de repère à tout cet écran.
  zIndex: 110,
  background: "rgba(15,31,24,0.42)",
  // Plus flou qu'avant, justement parce qu'on voit maintenant à travers :
  // 10 px laissaient les articles de l'étagère encore identifiables, et l'œil
  // partait les lire au lieu de regarder la borne. La désaturation les tasse
  // dans le fond sans les effacer.
  backdropFilter: "blur(16px) saturate(0.8)",
  WebkitBackdropFilter: "blur(16px) saturate(0.8)",
  overflow: "hidden",
};

/**
 * Le caisson, centré à la main et posé par terre.
 *
 * `left: 50%` + `translateX(-50%)` et NON `place-items: center`, et ce garde
 * reste posé même depuis que le caisson tient en largeur : le voile est en
 * `overflow: hidden`, donc un conteneur de défilement, et le moteur y recale
 * sur le bord de DÉPART tout objet plus large que lui — pour ne pas rendre son
 * début inatteignable. Le caisson l'était par construction tant qu'on calait
 * le trou et non le meuble ; mesuré sur iPhone 12 avant correction : 501 px de
 * caisson posés à `x = 0`, les 111 px de débord entièrement à droite, le
 * marquee « ARCADE » tranché. Le calage explicite échappe à cette correction,
 * et continuerait de tenir si un jour la façade redevenait plus large que le
 * cadre.
 *
 * `bottom: 0` : une borne pose ses pieds par terre. Sa base se confond avec
 * l'arête haute de la barre d'onglets, qui joue le plancher — centrée, elle
 * flottait au milieu du cadre avec un vide de 97 px sous elle.
 */
const caisson: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
};

const boutonFermer: CSSProperties = {
  position: "absolute",
  // 10 px du bord HAUT DU VOILE, qui commence sous le bandeau : celui-ci a
  // déjà absorbé l'encoche, la réserver une seconde fois décrocherait la croix.
  top: 10,
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
      style={STYLE_VOILE_BORNE}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" aria-label={d.bazar.borneFermer} onClick={onClose} style={boutonFermer}>
        <X size={20} />
      </button>

      <div
        data-testid="borne-facade"
        style={{ ...caisson, width: w, height: h }}
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
