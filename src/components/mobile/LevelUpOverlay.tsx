"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
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
import { CornerOrnament } from "@/components/mobile/CornerOrnament";

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

/** Le certificat : papier ancien, double filet doré, ornements de coins. */
const certificat: CSSProperties = {
  position: "relative",
  background:
    "radial-gradient(circle at 50% 18%, #fbf6ea 0%, var(--paper-100) 60%, #efe6d2 100%)",
  borderRadius: 6,
  border: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-500), 0 12px 30px rgba(20,12,0,0.55)",
  padding: "26px 22px 24px",
  maxWidth: 340,
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const eyebrowCertificat: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 10.5,
  color: "var(--brass-700)",
};

const titreGeant: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(34px, 11vw, 48px)",
  lineHeight: 1.05,
  color: "var(--brass-600)",
  textShadow: "0 1px 0 rgba(255,255,255,0.6), 0 0 18px rgba(224,178,92,0.35)",
  whiteSpace: "nowrap",
};

const ligneWrap: CSSProperties = { width: "100%" };

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
};

const ligneDeblocage: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
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
  color: "var(--ink-500)",
};

// Filet doré séparateur avec losange central — décline le goldRuleStyle
// de la carte flottante des brocantes.
const filetRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "78%",
  margin: "2px auto 10px",
};
const filetGauche: CSSProperties = {
  flex: 1,
  height: 1,
  background: "linear-gradient(90deg, transparent, var(--brass-500))",
};
const filetDroit: CSSProperties = {
  flex: 1,
  height: 1,
  background: "linear-gradient(90deg, var(--brass-500), transparent)",
};
const filetLosange: CSSProperties = {
  color: "var(--brass-500)",
  fontSize: 8,
  lineHeight: 1,
};

const cachetImg: CSSProperties = {
  position: "absolute",
  right: -14,
  bottom: -18,
  width: 88,
  height: 88,
  transform: "rotate(-12deg)",
  filter: "drop-shadow(0 4px 8px rgba(20,12,0,0.4))",
  pointerEvents: "none",
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

function FiletOr() {
  return (
    <div style={filetRow} aria-hidden="true">
      <span style={filetGauche} />
      <span style={filetLosange}>◆</span>
      <span style={filetDroit} />
    </div>
  );
}

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

  // Mentions du certificat, dans l'ordre d'apparition (cascade).
  const lignes: { key: string; contenu: ReactNode }[] = [];
  if (!plafondCompetencesAtteint) {
    lignes.push({
      key: "point",
      contenu: <div style={sousTitre}>{d.sheets.plusUnPointCompetence}</div>,
    });
  }
  for (const dep of deblocages) {
    const titreLocal = titreDeblocage(dep, locale);
    if (dep.famille === "active") {
      const { emoji, texte } = extraireEmoji(titreLocal);
      lignes.push({
        key: dep.titre,
        contenu: (
          <div data-testid="levelup-atout">
            {emoji && (
              <span style={atoutEmoji} aria-hidden="true">
                {emoji}
              </span>
            )}
            <div style={atoutTitre}>{texte}</div>
            <p style={atoutDescription}>{descriptionDeblocage(dep, locale)}</p>
          </div>
        ),
      });
    } else {
      lignes.push({
        key: dep.titre,
        contenu: <div style={ligneDeblocage}>{titreLocal}</div>,
      });
    }
  }
  if (prochain) {
    lignes.push({
      key: "prochain",
      contenu: (
        <div style={lignProchain}>
          {tr(d.sheets.prochainNiv, { n: prochain.niveau })}{" "}
          {titreDeblocage(prochain, locale)}
        </div>
      ),
    });
  }

  // Chronologie : certificat → cascade des mentions → slam du cachet
  // (+ shake du certificat à l'impact) → bouton Continuer.
  const delaiBase = 0.45;
  const delaiCachet = delaiBase + lignes.length * 0.12 + 0.15;
  const delaiBouton = delaiCachet + 0.45;

  return (
    <div
      style={scrim}
      role="dialog"
      aria-modal="true"
      aria-label={tr(d.sheets.niveauAtteintAriaLabel, { n: niveauACelebrer })}
    >
      <div
        className="broc-levelup-certificat"
        style={{
          ...certificat,
          ["--shake-delay" as string]: `${delaiCachet + 0.22}s`,
        }}
      >
        <CornerOrnament position="tl" />
        <CornerOrnament position="tr" />
        <CornerOrnament position="bl" />
        <CornerOrnament position="br" />
        <div style={eyebrowCertificat}>{d.sheets.eyebrowCertificat}</div>
        <div style={titreGeant}>
          {tr(d.sheets.niveauNCelebration, { n: niveauACelebrer })}
        </div>
        {lignes.map((l, i) => (
          <div
            key={l.key}
            className="broc-levelup-ligne"
            style={{ ...ligneWrap, animationDelay: `${delaiBase + i * 0.12}s` }}
          >
            <FiletOr />
            {l.contenu}
          </div>
        ))}
        <button
          type="button"
          className="broc-levelup-ligne"
          style={{ ...btnContinuer, animationDelay: `${delaiBouton}s` }}
          onClick={marquerNiveauVu}
        >
          {d.menu.continuer}
        </button>
        <img
          src="/ui/cachet-cire.webp"
          alt=""
          data-testid="levelup-cachet"
          className="broc-levelup-cachet"
          style={{ ...cachetImg, animationDelay: `${delaiCachet}s` }}
        />
      </div>
    </div>
  );
}
