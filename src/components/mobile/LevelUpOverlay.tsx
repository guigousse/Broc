"use client";

import { useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { audioManager } from "@/lib/audio/audioManager";
import {
  COUT_TOTAL_COMPETENCES,
  pointsDepensesCompetences,
} from "@/data/competences";
import {
  deblocagesPourNiveau,
  prochainDeblocage,
  type FamilleDeblocage,
} from "@/data/deblocagesNiveau";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleFamille } from "@/lib/i18n/libelles";
import { titreDeblocage } from "@/lib/i18n/contenu";

/** Couleur par famille de déblocage (style UI, réutilisé par ParcoursSheet). */
export const COULEUR_FAMILLE: Record<FamilleDeblocage, string> = {
  jalon: "var(--brass-700)",
  contenu: "var(--forest-600)",
  economie: "var(--patina-500)",
  confort: "var(--velvet-700)",
  active: "var(--vermillion-600)",
};

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(20,20,16,0.72)",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const carte: CSSProperties = {
  background: "var(--paper-100)",
  border: "3px solid var(--brass-500)",
  padding: 20,
  maxWidth: 320,
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
};

const colonne: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 18,
};

const blocTitre: CSSProperties = {
  textAlign: "center",
};

const eyebrowSombre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
  color: "var(--brass-500)",
  marginBottom: 8,
};

const titreGeant: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(40px, 14vw, 60px)",
  lineHeight: 1.05,
  color: "var(--brass-300)",
  textShadow: "0 0 28px rgba(224, 178, 92, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
};

const ornement: CSSProperties = {
  fontSize: "0.4em",
  color: "var(--brass-500)",
  textShadow: "none",
};

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-500)",
  marginBottom: 14,
};

const ligneDeblocage: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
  textAlign: "left",
  marginBottom: 6,
  display: "flex",
  alignItems: "baseline",
  gap: 6,
};

/** Style de puce famille, réutilisé par ParcoursSheet. */
export function chipFamille(famille: FamilleDeblocage): CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 9.5,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: COULEUR_FAMILLE[famille],
    border: `1px solid ${COULEUR_FAMILLE[famille]}`,
    padding: "1px 5px",
    flexShrink: 0,
  };
}

const lignProchain: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-300)",
  marginTop: 10,
  marginBottom: 14,
};

const btnContinuer: CSSProperties = {
  width: "100%",
  padding: "10px 6px",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
};

export function LevelUpOverlay() {
  const { state, marquerNiveauVu } = useGame();
  const pathname = usePathname();
  const { d, tr, locale } = useLangue();
  const enSession = ROUTES_SESSION_PREFIXES.some((p) => pathname?.startsWith(p));
  const niveauACelebrer =
    state && state.brocanteur.niveau > state.niveauVu ? state.niveauVu + 1 : null;

  useEffect(() => {
    if (niveauACelebrer !== null && !enSession) void audioManager.playLevelUp();
  }, [niveauACelebrer, enSession]);

  if (!state || niveauACelebrer === null || enSession) return null;

  const deblocages = deblocagesPourNiveau(niveauACelebrer);
  const prochain = prochainDeblocage(niveauACelebrer);
  // Plafond « à vie » atteint (points dispo + déjà dépensés) : le niveau qui
  // franchit le plafond n'accorde plus réellement de point. Note : ceci masque
  // aussi la ligne pour le niveau qui octroie le tout dernier point (le calcul
  // ne distingue pas « ce niveau precis a été plafonné » — compromis accepté).
  const plafondCompetencesAtteint =
    state.brocanteur.pointsDisponibles +
      pointsDepensesCompetences(state.competencesDebloquees) >=
    COUT_TOTAL_COMPETENCES;

  return (
    <div
      style={scrim}
      role="dialog"
      aria-modal="true"
      aria-label={tr(d.sheets.niveauAtteintAriaLabel, { n: niveauACelebrer })}
    >
      <div style={colonne}>
        <div className="broc-levelup-titre" style={blocTitre}>
          <div style={eyebrowSombre}>{d.sheets.eyebrowNiveauBrocanteur}</div>
          <div style={titreGeant}>
            <span style={ornement} aria-hidden="true">
              ✦
            </span>
            <span>{tr(d.sheets.niveauNCelebration, { n: niveauACelebrer })}</span>
            <span style={ornement} aria-hidden="true">
              ✦
            </span>
          </div>
        </div>
        <div className="broc-levelup-carte" style={carte}>
          {!plafondCompetencesAtteint && (
            <div style={sousTitre}>{d.sheets.plusUnPointCompetence}</div>
          )}
          {deblocages.map((dep) => (
            <div key={dep.titre} style={ligneDeblocage}>
              <span style={chipFamille(dep.famille)}>
                {libelleFamille(dep.famille, d)}
              </span>
              <span>{titreDeblocage(dep, locale)}</span>
            </div>
          ))}
          {prochain && (
            <div style={lignProchain}>
              {tr(d.sheets.prochainNiv, { n: prochain.niveau })}{" "}
              {titreDeblocage(prochain, locale)}
            </div>
          )}
          <button type="button" style={btnContinuer} onClick={marquerNiveauVu}>
            {d.menu.continuer}
          </button>
        </div>
      </div>
    </div>
  );
}
