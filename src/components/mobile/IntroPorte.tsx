"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { IrisFermeture } from "@/components/mobile/IrisTransition";
import {
  DUREE_FADE_REDUIT_MS,
  PORTE_CX_PCT,
  PORTE_CY_PCT,
  pointPorteEcran,
  poserFlagIris,
  prefersReducedMotion,
} from "@/lib/transitionIris";

/**
 * Intro « iris sur la porte » — jouée au lancement d'une nouvelle partie.
 * Cadré large sur la façade (contemplation) → fermeture d'iris centrée sur
 * la porte → onFini(). La réouverture se joue côté bureau (IrisArrivee),
 * déclenchée par le flag sessionStorage posé ici — même transition que
 * « Continuer » et que le lancement d'un slot. Spec :
 * docs/superpowers/specs/2026-07-17-transition-iris-design.md.
 */
const DUREE_CONTEMPLATION_MS = 600;

type Phase = "contemplation" | "iris" | "fade-reduit";

interface IntroPorteProps {
  onFini: () => void;
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

const imgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  // Même cadrage que l'écran titre : la porte (51 % / 66 % de l'image) est
  // ainsi à 51 % / 66 % de la boîte rendue — ce que lit pointPorteEcran.
  objectPosition: `${PORTE_CX_PCT}% ${PORTE_CY_PCT}%`,
  display: "block",
  userSelect: "none",
};

function scrimStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: "var(--forest-900)",
    opacity: visible ? 1 : 0,
    transition: `opacity ${DUREE_FADE_REDUIT_MS}ms ease`,
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
  const [phase, setPhase] = useState<Phase>(
    reduit ? "fade-reduit" : "contemplation",
  );
  const [pointIris, setPointIris] = useState<{ x: number; y: number } | null>(
    null,
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const finiRef = useRef(false);
  const onFiniRef = useRef(onFini);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    onFiniRef.current = onFini;
  }, [onFini]);

  // Pose le flag de réouverture AVANT de rendre la main : l'arrivée au
  // bureau (router.push de nouvellePartie) jouera l'iris d'ouverture,
  // exactement comme « Continuer ». Vaut aussi pour le skip et le mode
  // reduced-motion (fondu à la place du cercle, géré par IrisArrivee).
  const declencherFin = () => {
    if (finiRef.current) return;
    finiRef.current = true;
    poserFlagIris();
    onFiniRef.current();
  };

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    if (reduit) {
      schedule(declencherFin, DUREE_FADE_REDUIT_MS);
    } else {
      // La fermeture est déléguée à IrisFermeture (rendue en phase "iris"),
      // qui rappelle declencherFin via onNoir — pas de timer de fin ici.
      // Le point porte est mesuré au moment du basculement de phase.
      schedule(() => {
        setPointIris(pointPorteEcran(imgRef.current));
        setPhase("iris");
      }, DUREE_CONTEMPLATION_MS);
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
          ref={imgRef}
          src="/qg/facade-accueil.webp"
          alt=""
          style={imgStyle}
          draggable={false}
        />
      </div>
      {reduit && <div aria-hidden style={scrimStyle(phase === "fade-reduit")} />}
      {phase === "iris" && pointIris && (
        <IrisFermeture
          cx={pointIris.x}
          cy={pointIris.y}
          onNoir={declencherFin}
          bloqueInteractions={false}
        />
      )}
      <button
        type="button"
        style={tapLayerStyle}
        aria-label={d.qg.passerIntroAria}
        onPointerDown={onSkip}
      />
    </div>
  );
}
