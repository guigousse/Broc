"use client";

/**
 * Iris « cinéma muet » : un trou circulaire à bord net dans un voile noir —
 * spec docs/superpowers/specs/2026-07-17-transition-iris-design.md.
 *
 * Technique : le trou est un div rond transparent dont le box-shadow étalé
 * (0 0 0 300vmax, sans flou = simple remplissage) peint le noir tout autour.
 * On anime width/height et PAS transform:scale : le box-shadow est rendu
 * APRÈS transform, donc à scale(0) l'ombre disparaîtrait avec l'élément et
 * l'écran ne serait jamais noir — alors qu'à width/height 0, l'ombre non
 * transformée couvre tout depuis un point.
 *
 * `prefers-reduced-motion` : simple fondu au noir / depuis le noir.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import {
  DUREE_FADE_REDUIT_MS,
  DUREE_FERMETURE_MS,
  DUREE_OUVERTURE_MS,
  NOIR_MIN_MS,
  effacerFlagIris,
  lireFlagIris,
  prechargerImage,
  prefersReducedMotion,
} from "@/lib/transitionIris";

/** Marge après la fin théorique de la transition CSS avant le callback. */
const MARGE_FIN_MS = 80;

const conteneurStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9000,
  overflow: "hidden",
  pointerEvents: "auto",
  touchAction: "none",
};

/** Diamètre couvrant tout l'écran depuis (cx, cy), coins compris. */
function diametreCouvrant(cx: number, cy: number): number {
  const dx = Math.max(cx, window.innerWidth - cx);
  const dy = Math.max(cy, window.innerHeight - cy);
  return 2 * Math.hypot(dx, dy);
}

function trouStyle(
  cx: number,
  cy: number,
  diametre: number,
  dureeMs: number,
  ease: string,
): CSSProperties {
  return {
    position: "absolute",
    left: cx,
    top: cy,
    transform: "translate(-50%, -50%)",
    width: diametre,
    height: diametre,
    borderRadius: "50%",
    boxShadow: "0 0 0 300vmax var(--forest-900)",
    transition: `width ${dureeMs}ms ${ease}, height ${dureeMs}ms ${ease}`,
  };
}

function voileStyle(opaque: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    background: "var(--forest-900)",
    opacity: opaque ? 1 : 0,
    transition: `opacity ${DUREE_FADE_REDUIT_MS}ms ease`,
  };
}

interface IrisFermetureProps {
  /** Centre du trou en px viewport — le point de la porte à l'écran. */
  cx: number;
  cy: number;
  /** Appelé une fois l'écran entièrement noir. */
  onNoir: () => void;
  /**
   * Par défaut l'overlay bloque toute interaction pendant la fermeture
   * (voulu sur l'écran titre). IntroPorte le désactive pour garder son
   * tap-pour-passer vivant pendant l'iris (« skip conservé »).
   */
  bloqueInteractions?: boolean;
}

export function IrisFermeture({
  cx,
  cy,
  onNoir,
  bloqueInteractions = true,
}: IrisFermetureProps): JSX.Element {
  const [reduit] = useState(prefersReducedMotion);
  const [diametreOuvert] = useState(() => diametreCouvrant(cx, cy));
  const [ferme, setFerme] = useState(false);
  const onNoirRef = useRef(onNoir);
  useEffect(() => {
    onNoirRef.current = onNoir;
  }, [onNoir]);

  useEffect(() => {
    // L'état de départ (trou grand ouvert / voile transparent) doit être
    // peint avant de basculer, sinon la transition CSS ne se joue pas :
    // double rAF pour garantir un paint entre les deux états.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFerme(true));
    });
    const duree = reduit ? DUREE_FADE_REDUIT_MS : DUREE_FERMETURE_MS;
    const timer = setTimeout(() => onNoirRef.current(), duree + MARGE_FIN_MS);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [reduit]);

  return (
    <div
      style={{
        ...conteneurStyle,
        pointerEvents: bloqueInteractions ? "auto" : "none",
      }}
      aria-hidden
    >
      {reduit ? (
        <div style={voileStyle(ferme)} />
      ) : (
        <div
          style={trouStyle(
            cx,
            cy,
            ferme ? 0 : diametreOuvert,
            DUREE_FERMETURE_MS,
            "cubic-bezier(0.55, 0, 1, 0.45)",
          )}
        />
      )}
    </div>
  );
}

interface IrisArriveeProps {
  /** Image à précharger/décoder sous le noir avant d'ouvrir (fond du bureau). */
  imageSrc: string;
}

/**
 * Réouverture d'iris à l'arrivée au bureau. Ne rend rien si le flag
 * sessionStorage n'est pas posé (refresh, lien direct : comportement
 * actuel inchangé). Sinon : noir plein écran dès avant le premier paint,
 * préchargement de l'image de fond sous le noir, réouverture depuis le
 * centre de l'écran, puis démontage automatique.
 */
export function IrisArrivee({ imageSrc }: IrisArriveeProps): JSX.Element | null {
  const [actif, setActif] = useState(false);
  const [reduit] = useState(prefersReducedMotion);
  const [ouvert, setOuvert] = useState(false);
  const [fini, setFini] = useState(false);

  // Avant le premier paint : consomme le flag et couvre l'écran. Pas dans un
  // initializer de useState (le StrictMode de dev l'invoque deux fois, la
  // seconde lecture raterait le flag déjà consommé) ni dans un useEffect
  // (une frame de retard = flash de l'écran de chargement).
  useLayoutEffect(() => {
    if (!lireFlagIris()) return;
    effacerFlagIris();
    setActif(true);
  }, []);

  // Notre overlay React est en place (même commit, avant paint) : le voile
  // statique posé par le script preboot du layout racine peut partir.
  useLayoutEffect(() => {
    if (actif) document.getElementById("broc-iris-preboot")?.remove();
  }, [actif]);

  useEffect(() => {
    if (!actif) return;
    let annule = false;
    let timerFin: ReturnType<typeof setTimeout> | undefined;
    const noirMin = new Promise<void>((r) => setTimeout(r, NOIR_MIN_MS));
    void Promise.all([prechargerImage(imageSrc), noirMin]).then(() => {
      if (annule) return;
      setOuvert(true);
      timerFin = setTimeout(
        () => setFini(true),
        (reduit ? DUREE_FADE_REDUIT_MS : DUREE_OUVERTURE_MS) + MARGE_FIN_MS,
      );
    });
    return () => {
      annule = true;
      if (timerFin !== undefined) clearTimeout(timerFin);
    };
  }, [actif, imageSrc, reduit]);

  if (!actif || fini) return null;

  if (reduit) {
    return (
      <div style={conteneurStyle} aria-hidden>
        <div style={voileStyle(!ouvert)} />
      </div>
    );
  }

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  return (
    <div style={conteneurStyle} aria-hidden>
      <div
        style={trouStyle(
          cx,
          cy,
          ouvert ? diametreCouvrant(cx, cy) : 0,
          DUREE_OUVERTURE_MS,
          "cubic-bezier(0.16, 1, 0.3, 1)",
        )}
      />
    </div>
  );
}
