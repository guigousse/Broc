"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useGameStateOnly } from "@/context/GameContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { banniereVisible, tutorielActif } from "@/lib/tutoriel";
import { estRoutePartie } from "@/lib/routesPartie";
import { getCoachOuvert, subscribeCoachOuvert } from "@/lib/coachActif";

/** Gouttière au-dessus de la bannière (cf. `top`) et en dessous d'elle. */
const GOUTTIERE_PX = 6;

const wrap: CSSProperties = {
  position: "fixed",
  // Sous le header du haut (retour device 2026-07-17) : safe-area + hauteur
  // du MobileHeader + marge, pour ne plus chevaucher BROC/énergie/caisse.
  top: `calc(var(--safe-top, 0px) + var(--mobile-header-h) + ${GOUTTIERE_PX}px)`,
  left: 12,
  right: 12,
  zIndex: 90,
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(26, 51, 38, 0.92)",
  border: "1px solid var(--brass-500, #b89c5e)",
  color: "#f6ecd2",
  pointerEvents: "none",
};

const texteStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.25,
};

/** Mot-clé de la consigne : ce sur quoi l'œil doit tomber en premier. */
const motCleStyle: CSSProperties = {
  color: "var(--brass-300, #e6cf95)",
  fontWeight: 700,
};

/**
 * Rend une consigne où les mots-clés sont encadrés d'astérisques
 * (`Passe la *porte*`). Convention volontairement minuscule : les consignes
 * vivent dans les quatre fichiers de langue, elles doivent rester lisibles et
 * traduisibles telles quelles, sans balises.
 */
export function consigneEnRichesse(texte: string): ReactNode[] {
  return texte.split("*").map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={motCleStyle}>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TutorielBanniere() {
  const pathname = usePathname();
  const { state } = useGameStateOnly();
  const { d } = useLangue();
  const wrapRef = useRef<HTMLDivElement>(null);
  // Le coach (visite guidée) a sa propre découpe lumineuse par-dessus (z 100)
  // qui laissait transparaître la bannière (z 90) — jusqu'à faire croire que
  // la bannière était la cible (recette 2026-08-09).
  const coachOuvert = useSyncExternalStore(
    subscribeCoachOuvert,
    getCoachOuvert,
    () => false,
  );

  const visible =
    estRoutePartie(pathname) &&
    !!state &&
    tutorielActif(state) &&
    !coachOuvert &&
    banniereVisible(state.tutorielEtape, pathname);
  const etapeCourante = state?.tutorielEtape;

  // La bannière est un calque flottant : sans réserve, elle recouvrirait le
  // premier élément de chaque écran (retour device 2026-07-26, titre du bilan
  // de chinage masqué). Elle publie donc sa hauteur réelle — gouttières
  // comprises — que les zones de contenu ajoutent à leur marge haute. Mesurée
  // plutôt que codée en dur : le texte enveloppe sur deux lignes en grec.
  useEffect(() => {
    const racine = document.documentElement;
    const el = wrapRef.current;
    if (!el) {
      racine.style.removeProperty("--tuto-banniere-h");
      return;
    }
    const publier = () =>
      racine.style.setProperty(
        "--tuto-banniere-h",
        `${el.offsetHeight + 2 * GOUTTIERE_PX}px`,
      );
    publier();
    const observateur = new ResizeObserver(publier);
    observateur.observe(el);
    return () => {
      observateur.disconnect();
      racine.style.removeProperty("--tuto-banniere-h");
    };
  }, [visible, etapeCourante, d]);

  if (!visible || !state) return null;
  const etape = state.tutorielEtape as Exclude<
    typeof state.tutorielEtape,
    "termine"
  >;

  return (
    <div ref={wrapRef} style={wrap} role="status">
      <span style={texteStyle}>
        {consigneEnRichesse(d.tutoriel.instructions[etape])}
      </span>
    </div>
  );
}
