"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLangue } from "@/lib/i18n/LangueContext";
import { setCoachOuvert } from "@/lib/coachActif";

/**
 * Une étape de la visite guidée « coach ». `cible` référence l'attribut
 * `data-tuto-coach="…"` de l'élément à éclairer ; `null` affiche une carte
 * centrée sans découpe (ex. message d'intro/conclusion sans élément précis).
 */
export interface CoachEtape {
  cible: string | null;
  texte: string;
}

/** Cadence de la traque de la cible, et sa borne dure. La borne couvre très
 *  largement l'animation d'entrée la plus longue des écrans du tutoriel
 *  (320 ms) sans jamais laisser tourner de boucle si la cible n'arrive pas. */
const PAS_TRAQUE_MS = 60;
const DUREE_TRAQUE_MS = 900;

interface TutorielCoachProps {
  etapes: CoachEtape[];
  onFini: () => void;
}

const conteneur: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  border: "none",
  margin: 0,
  padding: 0,
  width: "100%",
  height: "100%",
  background: "transparent",
  cursor: "pointer",
};

/* Pas de cutout à afficher (cible null ou élément introuvable — fail-open) :
   un voile plein écran, sans halo. */
const voilePlein: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 30, 22, 0.72)",
};

function decoupeStyle(rect: DOMRect): CSSProperties {
  return {
    position: "fixed",
    top: rect.top - 6,
    left: rect.left - 6,
    width: rect.width + 12,
    height: rect.height + 12,
    borderRadius: 10,
    // Le voile EST ce box-shadow (halo géant) : la zone du rect reste
    // éclairée, tout le reste de l'écran est sombre.
    boxShadow: "0 0 0 200vmax rgba(15, 30, 22, 0.72)",
    border: "2px solid var(--brass-300)",
    // La découpe ne doit jamais voler le tap : c'est le conteneur qui capte.
    pointerEvents: "none",
  };
}

const bulleBase: CSSProperties = {
  position: "fixed",
  width: "min(320px, calc(100vw - 32px))",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 12,
  padding: "14px 16px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
  fontFamily: "var(--font-serif)",
};

const texteStyle: CSSProperties = {
  fontSize: 18,
  lineHeight: 1.35,
  color: "#3a2f1e",
};

const continuerStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  textAlign: "right",
  marginTop: 8,
  color: "#7a6337",
};

export function TutorielCoach({ etapes, onFini }: TutorielCoachProps) {
  const { d } = useLangue();
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const etape: CoachEtape | undefined = etapes[idx];
  const cible = etape?.cible ?? null;

  // La bannière du tutoriel s'abonne à cet état pour se masquer tant que le
  // coach est ouvert (cf. src/lib/coachActif.ts).
  useEffect(() => {
    setCoachOuvert(true);
    return () => setCoachOuvert(false);
  }, []);

  /* Mesure du rect de la cible. La difficulté n'est pas de mesurer, c'est de
     mesurer AU BON MOMENT : les écrans du tutoriel montent le coach en même
     temps que leur propre animation d'entrée (FloatingRoomOverlay glisse sa
     bande depuis translateY(-110%) pendant 320 ms). Une mesure au montage
     plus une frame plus tard tombait en plein milieu de ce glissement et
     figeait la découpe sur un rect fantôme, au-dessus de l'écran — d'où la
     bulle collée sous la barre d'état (recette device 2026-08-19).

     On traque donc la cible à cadence fixe pendant DUREE_TRAQUE_MS, puis on
     s'arrête net. Pas d'arrêt anticipé sur « deux mesures identiques » : une
     animation qui démarre après un délai, ou un rect qui passe deux fois par
     la même valeur, couperait la traque en plein vol. Une quinzaine de
     `getBoundingClientRect` sur un élément ne coûte rien ; se tromper de
     cible coûte la leçon. Les écoutes resize/scroll prennent ensuite le
     relais pour toute la durée de l'étape. */
  useEffect(() => {
    if (cible === null) {
      setRect(null);
      return;
    }
    let annule = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let restant = Math.ceil(DUREE_TRAQUE_MS / PAS_TRAQUE_MS);

    const lire = (): DOMRect | null => {
      const el = document.querySelector(`[data-tuto-coach="${cible}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      // Un élément sans boîte propre (`display: contents`) renvoie un rect
      // 0×0 à l'origine : ce n'est pas une cible, c'est une absence de
      // cible. Fail-open, comme un élément introuvable.
      return r.width > 0 && r.height > 0 ? r : null;
    };

    const traquer = () => {
      if (annule) return;
      setRect(lire());
      restant -= 1;
      if (restant <= 0) return;
      timer = setTimeout(traquer, PAS_TRAQUE_MS);
    };
    traquer();

    const remesurer = () => {
      if (!annule) setRect(lire());
    };
    window.addEventListener("resize", remesurer);
    window.addEventListener("scroll", remesurer, true);
    return () => {
      annule = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", remesurer);
      window.removeEventListener("scroll", remesurer, true);
    };
    // `idx` (et pas seulement `cible`) est dans les deps : deux étapes
    // consécutives peuvent viser la MÊME cible (plusieurs bulles sur le même
    // élément) — sans `idx`, la transition entre elles ne re-mesurerait
    // rien, réutilisant le rect de l'étape précédente jusqu'à un
    // resize/scroll fortuit.
  }, [idx, cible]);

  if (!etape || typeof document === "undefined") return null;

  const avancer = () => {
    if (idx >= etapes.length - 1) onFini();
    else setIdx((i) => i + 1);
  };

  let bulleStyle: CSSProperties;
  if (rect) {
    const sousRect = rect.top < window.innerHeight / 2;
    bulleStyle = sousRect
      ? {
          ...bulleBase,
          top: rect.bottom + 16,
          left: "50%",
          transform: "translateX(-50%)",
        }
      : {
          ...bulleBase,
          top: rect.top - 16,
          left: "50%",
          transform: "translate(-50%, -100%)",
        };
  } else {
    bulleStyle = {
      ...bulleBase,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return createPortal(
    <div role="dialog" aria-live="polite" style={conteneur} onClick={avancer}>
      {rect ? (
        <div className="coach-decoupe" style={decoupeStyle(rect)} />
      ) : (
        <div style={voilePlein} />
      )}
      <div style={bulleStyle}>
        <div style={texteStyle}>{etape.texte}</div>
        <div style={continuerStyle}>{d.tutoriel.coachContinuer}</div>
      </div>
    </div>,
    document.body,
  );
}
