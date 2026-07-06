"use client";

import { useEffect, type CSSProperties } from "react";
import { DEBLOCAGES_PAR_NIVEAU, LIBELLE_FAMILLE } from "@/data/deblocagesNiveau";
import { chipFamille } from "@/components/mobile/LevelUpOverlay";

interface ParcoursSheetProps {
  open: boolean;
  onClose: () => void;
  /** Niveau de Brocanteur courant. */
  niveau: number;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding:
    "max(24px, env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
};

const carte: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  background: "var(--paper-100)",
  border: "3px solid var(--brass-500)",
  boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  flex: 1,
};

const closeIconBtn: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  zIndex: 1,
};

const header: CSSProperties = {
  textAlign: "center",
  padding: "18px 16px 10px",
  borderBottom: "1px solid var(--brass-500)",
};

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
  color: "var(--brass-700)",
  marginBottom: 4,
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  color: "var(--ink-900)",
};

const liste: CSSProperties = {
  overflowY: "auto",
  flex: 1,
  padding: "6px 4px",
};

const footnote: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: "var(--ink-500)",
  textAlign: "center",
  padding: "10px 16px",
  borderTop: "1px solid var(--brass-500)",
};

function ligneStyle(etat: "atteint" | "prochain" | "a-venir"): CSSProperties {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    margin: "2px 6px",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--ink-700)",
  };
  if (etat === "atteint") return { ...base, opacity: 0.5 };
  if (etat === "prochain") {
    return {
      ...base,
      background: "var(--paper-300)",
      border: "1px solid var(--brass-500)",
    };
  }
  return base;
}

const niveauCol: CSSProperties = {
  flexShrink: 0,
  width: 44,
  fontWeight: 700,
};

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function ParcoursSheet({ open, onClose, niveau }: ParcoursSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  let prochainTrouve = false;

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true" aria-label="Parcours du brocanteur">
        <div style={carte}>
          <button
            type="button"
            style={closeIconBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
          <div style={header}>
            <div style={eyebrow}>— parcours du brocanteur —</div>
            <div style={titre}>Niveau {niveau}</div>
          </div>
          <div style={liste}>
            {DEBLOCAGES_PAR_NIVEAU.map((d) => {
              let etat: "atteint" | "prochain" | "a-venir";
              if (d.niveau <= niveau) {
                etat = "atteint";
              } else if (!prochainTrouve) {
                etat = "prochain";
                prochainTrouve = true;
              } else {
                etat = "a-venir";
              }
              return (
                <div
                  key={d.niveau}
                  data-testid={`parcours-row-${d.niveau}`}
                  data-etat={etat}
                  style={ligneStyle(etat)}
                >
                  <span style={niveauCol}>
                    {etat === "atteint" ? "✓ " : ""}
                    Niv. {d.niveau}
                  </span>
                  <span style={chipFamille(d.famille)}>
                    {LIBELLE_FAMILLE[d.famille]}
                  </span>
                  <span>{d.titre}</span>
                </div>
              );
            })}
          </div>
          <div style={footnote}>Chaque niveau : +1 point de compétence</div>
        </div>
      </div>
    </>
  );
}
