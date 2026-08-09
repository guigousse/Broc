"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "@/lib/transitionIris";

/** Rect en pixels VIEWPORT (coin haut-gauche), même convention que
 *  `getBoundingClientRect` — calculé par l'appelant (`CoffreChargement`). */
export interface RectDemoDepart {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rect d'arrivée : même forme + rotation finale en degrés. */
export interface RectDemoCible extends RectDemoDepart {
  rotation: number;
}

interface Props {
  actif: boolean;
  /**
   * Appelé une seule fois, à la toute fin de la démo (ou après 600 ms en
   * `prefers-reduced-motion`). C'est LÀ que le dépôt réel de la manette est
   * commité côté appelant — jamais avant, jamais deux fois : si le
   * composant est démonté avant d'y arriver, ce callback n'est PAS appelé
   * (le remontage rejoue la démo depuis le début).
   */
  onTerminee: () => void;
  /** Silhouette de la trace visée, déjà convertie en pixels viewport. */
  cibleRect: RectDemoCible;
  /** Vignette du carrousel, déjà mesurée par l'appelant. */
  departRect: RectDemoDepart;
  /** Miniature de l'objet (`getItemThumbUrl`). */
  imageSrc: string;
}

type Phase = "arrivee" | "glisse" | "pose" | "rotation" | "sortie";

/* Timeline (non réduite), cf. brief — total ~3,7 s :
 *   0    – 400  ms : main A apparaît sur la vignette (fondu, keyframe CSS).
 *   400  – 1800 ms : clone + main A glissent vers la trace (transition CSS
 *                    left/top/width, 1,4 s).
 *   1800 – 2100 ms : main B apparaît en face (fondu 300 ms).
 *   2100 – 3300 ms : le groupe tourne 0 → cibleRect.rotation (1,2 s).
 *   3300 – 3700 ms : les deux mains s'estompent (400 ms) → onTerminee. */
const DUREE_MAIN_A_MS = 400;
const DUREE_GLISSE_MS = 1400;
const DUREE_MAIN_B_MS = 300;
const DUREE_ROTATION_MS = 1200;
const DUREE_SORTIE_MS = 400;
const DUREE_STATIQUE_MS = 600;

const MAIN_TAILLE = 28;

const voileStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  // z 60 : sous la bannière d'étape (90, reste lisible), au-dessus du coffre
  // et du carrousel (≤ 50, rendus inertes tant que la démo joue).
  zIndex: 60,
  background: "transparent",
  // Avale tous les taps pendant toute la démo — le joueur ne pose plus la
  // manette lui-même, ce voile l'empêche d'essayer pendant le spectacle.
  pointerEvents: "auto",
};

const mainStyleBase: CSSProperties = {
  position: "absolute",
  width: MAIN_TAILLE,
  height: MAIN_TAILLE,
  top: "50%",
  background: "url('/tutoriel/main-pointeuse.webp') no-repeat center / contain",
  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35))",
  pointerEvents: "none",
};

/**
 * Démo du grand-père (Task 8) : à `coffre-trace-un`, la manette n'est plus
 * posée par le joueur — un clone glisse de la vignette du carrousel jusqu'à
 * la trace, guidé par deux mains, puis pivote à l'angle visé. Portal plein
 * écran (cf. `voileStyle`) qui bloque l'input tant qu'elle joue.
 *
 * StrictMode : tous les timers vivent dans `timersRef`, nettoyés au
 * démontage — si démonté avant la fin (double-effet de dev, ou l'app est
 * réellement tuée), `onTerminee` n'est jamais appelé (son propre timeout est
 * annulé avec les autres) ; le remontage rejoue la démo depuis le début.
 */
export function DemoDepotManette({
  actif,
  onTerminee,
  cibleRect,
  departRect,
  imageSrc,
}: Props) {
  const [phase, setPhase] = useState<Phase>("arrivee");
  // Une seule évaluation, partagée par l'effet de timeline et le rendu —
  // même convention que `IrisFermeture`/`IrisArrivee` (transitionIris.ts) :
  // deux appels séparés à `prefersReducedMotion()` pourraient (en théorie)
  // discorder si la préférence système changeait entre les deux lectures.
  const [reduit] = useState(prefersReducedMotion);
  const timersRef = useRef<number[]>([]);

  // Toujours la dernière closure reçue : la timeline (ci-dessous) ne dépend
  // QUE de `actif` — si elle dépendait de `onTerminee` (identité de fonction
  // non stable côté appelant, un objet littéral neuf à chaque render), tout
  // rerender du parent relancerait la démo depuis « arrivee ». On lit donc
  // la version la plus fraîche via ref au moment où le timer final se
  // déclenche, sans jamais redémarrer la timeline pour autant.
  const onTermineeRef = useRef(onTerminee);
  useEffect(() => {
    onTermineeRef.current = onTerminee;
  }, [onTerminee]);

  useEffect(() => {
    if (!actif) return;
    timersRef.current = [];
    const armer = (fn: () => void, delaiMs: number) => {
      timersRef.current.push(window.setTimeout(fn, delaiMs));
    };

    if (reduit) {
      // Rendu statique (cf. JSX ci-dessous) : pas de phase à piloter, juste
      // la fin après le délai pédagogique.
      armer(() => onTermineeRef.current(), DUREE_STATIQUE_MS);
      return () => {
        for (const id of timersRef.current) window.clearTimeout(id);
        timersRef.current = [];
      };
    }

    setPhase("arrivee");
    armer(() => setPhase("glisse"), DUREE_MAIN_A_MS);
    armer(() => setPhase("pose"), DUREE_MAIN_A_MS + DUREE_GLISSE_MS);
    armer(
      () => setPhase("rotation"),
      DUREE_MAIN_A_MS + DUREE_GLISSE_MS + DUREE_MAIN_B_MS,
    );
    armer(
      () => setPhase("sortie"),
      DUREE_MAIN_A_MS + DUREE_GLISSE_MS + DUREE_MAIN_B_MS + DUREE_ROTATION_MS,
    );
    armer(
      () => onTermineeRef.current(),
      DUREE_MAIN_A_MS +
        DUREE_GLISSE_MS +
        DUREE_MAIN_B_MS +
        DUREE_ROTATION_MS +
        DUREE_SORTIE_MS,
    );

    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    };
  }, [actif, reduit]);

  if (!actif || typeof document === "undefined") return null;

  const cloneImg = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt=""
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );

  if (reduit) {
    // Image parlante figée : le clone est déjà posé sur la cible, à son
    // angle final, les deux mains déjà en place — aucun mouvement, mais le
    // même vocabulaire visuel que la version animée.
    return createPortal(
      <div style={voileStyle} aria-hidden>
        <div
          style={{
            position: "fixed",
            left: cibleRect.x,
            top: cibleRect.y,
            width: cibleRect.w,
            aspectRatio: "1 / 1",
            transform: `rotate(${cibleRect.rotation}deg)`,
          }}
        >
          {cloneImg}
          <div
            style={{
              ...mainStyleBase,
              left: -MAIN_TAILLE * 0.7,
              opacity: 1,
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              ...mainStyleBase,
              right: -MAIN_TAILLE * 0.7,
              opacity: 1,
              transform: "translateY(-50%) scaleX(-1)",
            }}
          />
        </div>
      </div>,
      document.body,
    );
  }

  const surCible = phase !== "arrivee";
  const tourne = phase === "rotation" || phase === "sortie";
  const rect = surCible ? cibleRect : departRect;

  const classeMainA = phase === "sortie" ? "broc-demo-main-out" : "broc-demo-main-in";
  const dureeMainA = phase === "sortie" ? DUREE_SORTIE_MS : DUREE_MAIN_A_MS;

  const classeMainB =
    phase === "pose" || phase === "rotation"
      ? "broc-demo-main-in"
      : phase === "sortie"
        ? "broc-demo-main-out"
        : null;
  const dureeMainB = phase === "sortie" ? DUREE_SORTIE_MS : DUREE_MAIN_B_MS;

  return createPortal(
    <div style={voileStyle} aria-hidden>
      <div
        style={{
          position: "fixed",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          aspectRatio: "1 / 1",
          transform: `rotate(${tourne ? cibleRect.rotation : 0}deg)`,
          transition:
            "left 1.4s ease-in-out, top 1.4s ease-in-out, width 1.4s ease-in-out, transform 1.2s ease-in-out",
        }}
      >
        {cloneImg}
        {/* Main A — présente dès l'arrivée, apparaît en fondu puis suit le
            clone jusqu'à la trace. */}
        <div
          className={classeMainA}
          style={{
            ...mainStyleBase,
            left: -MAIN_TAILLE * 0.7,
            opacity: 0,
            transform: "translateY(-50%)",
            animationDuration: `${dureeMainA}ms`,
          }}
        />
        {/* Main B — n'existe qu'à partir de « pose » (rejoint en fondu),
            asset miroir de l'autre côté du clone. */}
        {classeMainB && (
          <div
            className={classeMainB}
            style={{
              ...mainStyleBase,
              right: -MAIN_TAILLE * 0.7,
              opacity: 0,
              transform: "translateY(-50%) scaleX(-1)",
              animationDuration: `${dureeMainB}ms`,
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
