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
} from "@/data/deblocagesNiveau";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";
import { useLangue } from "@/lib/i18n/LangueContext";
import { titreDeblocage, descriptionDeblocage } from "@/lib/i18n/contenu";

/** Sépare le premier emoji d'un titre d'atout localisé (« Atout 🔍 Le Flair »). */
function extraireEmoji(titre: string): { emoji: string | null; texte: string } {
  const m = titre.match(/\p{Extended_Pictographic}/u);
  if (!m) return { emoji: null, texte: titre };
  return {
    emoji: m[0],
    texte: titre.replace(m[0], "").replace(/\s{2,}/g, " ").trim(),
  };
}

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
};

const blocAtout: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-300)",
  padding: "12px 10px",
  marginBottom: 10,
  textAlign: "center",
};

const atoutEmoji: CSSProperties = {
  fontSize: 40,
  lineHeight: 1.1,
  display: "block",
  marginBottom: 6,
};

const atoutTitre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 17,
  color: "var(--ink-900)",
  marginBottom: 6,
  lineHeight: 1.25,
};

const atoutDescription: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  lineHeight: 1.45,
  color: "var(--forest-800)",
  margin: 0,
};

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
          {deblocages.map((dep) => {
            const titreLocal = titreDeblocage(dep, locale);
            if (dep.famille === "active") {
              const { emoji, texte } = extraireEmoji(titreLocal);
              return (
                <div key={dep.titre} style={blocAtout} data-testid="levelup-atout">
                  {emoji && (
                    <span style={atoutEmoji} aria-hidden="true">
                      {emoji}
                    </span>
                  )}
                  <div style={atoutTitre}>{texte}</div>
                  <p style={atoutDescription}>{descriptionDeblocage(dep, locale)}</p>
                </div>
              );
            }
            return (
              <div key={dep.titre} style={ligneDeblocage}>
                {titreLocal}
              </div>
            );
          })}
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
