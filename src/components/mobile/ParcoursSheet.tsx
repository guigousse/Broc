"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { DEBLOCAGES_PAR_NIVEAU } from "@/data/deblocagesNiveau";
import { useLangue } from "@/lib/i18n/LangueContext";
import { titreDeblocage } from "@/lib/i18n/contenu";

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

/* ── Timeline verticale : rail laiton + pastilles de niveau à gauche,
      déblocages à droite. Rail plein sur le parcouru, pointillé au-delà. ── */

type EtatNiveau = "atteint" | "prochain" | "a-venir";

const groupeRow: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  padding: "0 10px 0 6px",
};

const railCol: CSSProperties = {
  width: 52,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

function segment(plein: boolean, visible: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 6,
    width: 0,
    borderLeft: visible
      ? `2px ${plein ? "solid" : "dashed"} ${plein ? "var(--brass-500)" : "var(--paper-500)"}`
      : "2px solid transparent",
  };
}

function pastille(etat: EtatNiveau): CSSProperties {
  const base: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 17,
    display: "grid",
    placeItems: "center",
    fontFamily: "var(--font-display)",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: "0 1px 3px rgba(40,25,5,0.25)",
  };
  if (etat === "atteint")
    return {
      ...base,
      background: "var(--forest-800)",
      border: "2px solid var(--brass-500)",
      color: "var(--brass-300)",
    };
  if (etat === "prochain")
    return {
      ...base,
      width: 40,
      height: 40,
      borderRadius: 20,
      fontSize: 13,
      background: "var(--paper-100)",
      border: "2px solid var(--vermillion-600)",
      color: "var(--vermillion-600)",
    };
  return {
    ...base,
    background: "var(--paper-300)",
    border: "1px solid var(--brass-500)",
    color: "var(--ink-500)",
  };
}

function contenuCol(etat: EtatNiveau): CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 3,
    padding: "10px 0",
    opacity: etat === "atteint" ? 0.55 : 1,
  };
}

function titreLigne(etat: EtatNiveau): CSSProperties {
  return {
    fontFamily: etat === "prochain" ? "var(--font-display)" : "var(--font-serif)",
    fontSize: etat === "prochain" ? 13 : 12.5,
    fontWeight: etat === "prochain" ? 700 : 400,
    color: etat === "a-venir" ? "var(--ink-500)" : "var(--forest-800)",
    lineHeight: 1.3,
  };
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function ParcoursSheet({ open, onClose, niveau }: ParcoursSheetProps) {
  const { d, tr, locale } = useLangue();
  const prochainRef = useRef<HTMLDivElement>(null);

  // À l'ouverture, centre la liste sur le prochain palier : le joueur voit
  // immédiatement où il en est.
  useEffect(() => {
    if (!open) return;
    // scrollIntoView optionnel : absent de jsdom (tests).
    prochainRef.current?.scrollIntoView?.({ block: "center" });
  }, [open]);

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

  // Regroupe les déblocages par niveau (le N10 en a deux) et trie — le rail
  // est une seule ligne de progression, une pastille par niveau.
  const parNiveau = new Map<number, typeof DEBLOCAGES_PAR_NIVEAU[number][]>();
  for (const dep of DEBLOCAGES_PAR_NIVEAU) {
    const arr = parNiveau.get(dep.niveau) ?? [];
    arr.push(dep);
    parNiveau.set(dep.niveau, arr);
  }
  const niveaux = [...parNiveau.keys()].sort((a, b) => a - b);
  const prochainNiveau = niveaux.find((n) => n > niveau);

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div
        style={stage}
        role="dialog"
        aria-modal="true"
        aria-label={d.sheets.parcoursAriaLabel}
      >
        <div style={carte}>
          <button
            type="button"
            style={closeIconBtn}
            onClick={onClose}
            aria-label={d.commun.fermer}
          >
            ✕
          </button>
          <div style={header}>
            <div style={eyebrow}>{d.sheets.eyebrowParcours}</div>
            <div style={titre}>{tr(d.sheets.niveauN, { n: niveau })}</div>
          </div>
          <div style={liste}>
            {niveaux.map((n, gi) => {
              const etat: EtatNiveau =
                n <= niveau ? "atteint" : n === prochainNiveau ? "prochain" : "a-venir";
              const deps = parNiveau.get(n)!;
              return (
                <div
                  key={n}
                  ref={etat === "prochain" ? prochainRef : undefined}
                  style={groupeRow}
                >
                  <div style={railCol}>
                    <div style={segment(etat !== "a-venir", gi > 0)} />
                    <div style={pastille(etat)} aria-hidden>
                      {tr(d.sheets.nivAbrege, { n })}
                    </div>
                    <div
                      style={segment(etat === "atteint", gi < niveaux.length - 1)}
                    />
                  </div>
                  <div style={contenuCol(etat)}>
                    {deps.map((dep) => (
                      <div
                        key={`${dep.niveau}-${dep.titre}`}
                        data-testid={`parcours-row-${dep.niveau}`}
                        data-etat={etat}
                        style={titreLigne(etat)}
                      >
                        {titreDeblocage(dep, locale)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={footnote}>{d.sheets.chaqueNiveauPoint}</div>
        </div>
      </div>
    </>
  );
}
