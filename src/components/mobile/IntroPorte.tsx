"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Intro « zoom sur la porte » — jouée au lancement d'une nouvelle partie.
 * Séquence CSS pure (transitions sur transform/opacity), pas de vidéo :
 * cadré large sur la façade → zoom sur la porte → fondu au noir → onFini().
 *
 * Centre mesuré de la porte (cf. docs/art/facade-maison.webp, mesure par
 * échantillonnage sharp .extract + .stats() : rectangle brun chaud sombre
 * ~190×470px, luminance ≈108 contre ≈136-143 pour les piliers en pierre de
 * taille de part et d'autre) : cx ≈ 51 %, cy ≈ 66 % de l'image.
 */
const DOOR_CX_PCT = 51;
const DOOR_CY_PCT = 66;
const ZOOM_SCALE = 4;

const DUREE_CONTEMPLATION_MS = 600;
const DUREE_ZOOM_MS = 2200;
const DUREE_FONDU_MS = 500;
const DUREE_FADE_REDUIT_MS = 400;

type Phase = "contemplation" | "zoom" | "fondu" | "fade-reduit";

interface IntroPorteProps {
  onFini: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const conteneurStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  overflow: "hidden",
  backgroundColor: "var(--forest-900)",
  touchAction: "none",
};

const imgWrapperStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

function imgStyle(phase: Phase, reduit: boolean): CSSProperties {
  const zoome = phase === "zoom" || phase === "fondu";
  return {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${DOOR_CX_PCT}% ${DOOR_CY_PCT}%`,
    transformOrigin: `${DOOR_CX_PCT}% ${DOOR_CY_PCT}%`,
    transform: zoome && !reduit ? `scale(${ZOOM_SCALE})` : "scale(1)",
    transition: reduit ? "none" : `transform ${DUREE_ZOOM_MS}ms ease-in-out`,
    display: "block",
    userSelect: "none",
  };
}

function scrimStyle(phase: Phase, reduit: boolean): CSSProperties {
  const visible = phase === "fondu" || phase === "fade-reduit";
  const duree = reduit ? DUREE_FADE_REDUIT_MS : DUREE_FONDU_MS;
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: "var(--forest-900)",
    opacity: visible ? 1 : 0,
    transition: `opacity ${duree}ms ease`,
    pointerEvents: "none",
  };
}

const tapLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  cursor: "pointer",
};

export function IntroPorte({ onFini }: IntroPorteProps): JSX.Element {
  const { d } = useLangue();
  const [reduit] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(reduit ? "fade-reduit" : "contemplation");
  const finiRef = useRef(false);
  const onFiniRef = useRef(onFini);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    onFiniRef.current = onFini;
  }, [onFini]);

  const declencherFin = () => {
    if (finiRef.current) return;
    finiRef.current = true;
    onFiniRef.current();
  };

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    if (reduit) {
      schedule(declencherFin, DUREE_FADE_REDUIT_MS);
    } else {
      schedule(() => setPhase("zoom"), DUREE_CONTEMPLATION_MS);
      schedule(() => setPhase("fondu"), DUREE_CONTEMPLATION_MS + DUREE_ZOOM_MS);
      schedule(
        declencherFin,
        DUREE_CONTEMPLATION_MS + DUREE_ZOOM_MS + DUREE_FONDU_MS,
      );
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduit]);

  const onSkip = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    declencherFin();
  };

  return (
    <div style={conteneurStyle} role="presentation">
      <div style={imgWrapperStyle}>
        <img
          src="/qg/facade-accueil.webp"
          alt=""
          style={imgStyle(phase, reduit)}
          draggable={false}
        />
      </div>
      <div aria-hidden style={scrimStyle(phase, reduit)} />
      <button
        type="button"
        style={tapLayerStyle}
        aria-label={d.qg.passerIntroAria}
        onPointerDown={onSkip}
      />
    </div>
  );
}
