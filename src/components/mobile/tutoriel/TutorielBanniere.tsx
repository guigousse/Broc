"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { tutorielActif } from "@/lib/tutoriel";
import { estRoutePartie } from "@/lib/routesPartie";

/** Gouttière au-dessus de la bannière (cf. `top`) et en dessous d'elle. */
const GOUTTIERE_PX = 8;

const wrap: CSSProperties = {
  position: "fixed",
  // Sous le header du haut (retour device 2026-07-17) : safe-area + hauteur
  // du MobileHeader + marge, pour ne plus chevaucher BROC/énergie/caisse.
  top: `calc(var(--safe-top, 0px) + var(--mobile-header-h) + ${GOUTTIERE_PX}px)`,
  left: 12,
  right: 12,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(26, 51, 38, 0.92)",
  border: "1px solid var(--brass-500, #b89c5e)",
  color: "#f6ecd2",
  pointerEvents: "auto",
};

const texteStyle: CSSProperties = {
  flex: 1,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.3,
};

const passerStyle: CSSProperties = {
  flexShrink: 0,
  background: "transparent",
  border: "1px solid rgba(246, 236, 210, 0.5)",
  borderRadius: 8,
  color: "#f6ecd2",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  cursor: "pointer",
};

export function TutorielBanniere() {
  const pathname = usePathname();
  const { state } = useGameStateOnly();
  const { terminerTutoriel } = useGameActions();
  const { d } = useLangue();
  const [confirme, setConfirme] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const visible =
    estRoutePartie(pathname) && !!state && tutorielActif(state);
  const etapeCourante = state?.tutorielEtape;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

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
  }, [visible, etapeCourante, confirme, d]);

  if (!visible || !state) return null;
  const etape = state.tutorielEtape as Exclude<
    typeof state.tutorielEtape,
    "termine"
  >;

  const onPasser = () => {
    if (confirme) {
      terminerTutoriel();
      return;
    }
    setConfirme(true);
    timerRef.current = setTimeout(() => setConfirme(false), 3000);
  };

  return (
    <div ref={wrapRef} style={wrap} role="status">
      <span style={texteStyle}>{d.tutoriel.instructions[etape]}</span>
      <button type="button" style={passerStyle} onClick={onPasser}>
        {confirme ? d.tutoriel.confirmerPasser : d.tutoriel.passer}
      </button>
    </div>
  );
}
