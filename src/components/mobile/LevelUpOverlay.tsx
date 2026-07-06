"use client";

import { useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { audioManager } from "@/lib/audio/audioManager";
import {
  deblocagesPourNiveau,
  prochainDeblocage,
  type FamilleDeblocage,
} from "@/data/deblocagesNiveau";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";

const LIBELLE_FAMILLE: Record<FamilleDeblocage, string> = {
  jalon: "Jalon",
  contenu: "Contenu",
  economie: "Économie",
  confort: "Confort",
  active: "Active",
};

const COULEUR_FAMILLE: Record<FamilleDeblocage, string> = {
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

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
  color: "var(--brass-700)",
  marginBottom: 6,
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 28,
  color: "var(--ink-900)",
  marginBottom: 10,
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

function chipFamille(famille: FamilleDeblocage): CSSProperties {
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
  const enSession = ROUTES_SESSION_PREFIXES.some((p) => pathname?.startsWith(p));
  const niveauACelebrer =
    state && state.brocanteur.niveau > state.niveauVu ? state.niveauVu + 1 : null;

  useEffect(() => {
    if (niveauACelebrer !== null && !enSession) audioManager.playLevelUp();
  }, [niveauACelebrer, enSession]);

  if (niveauACelebrer === null || enSession) return null;

  const deblocages = deblocagesPourNiveau(niveauACelebrer);
  const prochain = prochainDeblocage(niveauACelebrer);

  return (
    <div style={scrim} role="dialog" aria-modal="true" aria-label={`Niveau ${niveauACelebrer} atteint`}>
      <div style={carte}>
        <div style={eyebrow}>— niveau de brocanteur —</div>
        <div style={titre}>Niveau {niveauACelebrer} !</div>
        <div style={sousTitre}>+1 point de compétence</div>
        {deblocages.map((d) => (
          <div key={d.titre} style={ligneDeblocage}>
            <span style={chipFamille(d.famille)}>{LIBELLE_FAMILLE[d.famille]}</span>
            <span>{d.titre}</span>
          </div>
        ))}
        {prochain && (
          <div style={lignProchain}>
            Prochain — Niv. {prochain.niveau} : {prochain.titre}
          </div>
        )}
        <button type="button" style={btnContinuer} onClick={marquerNiveauVu}>
          Continuer
        </button>
      </div>
    </div>
  );
}
