"use client";

import { useEffect, type CSSProperties } from "react";
import {
  JOURS_COURT,
  MOIS_LONG,
  dateForJour,
  infosMois,
  jourForDate,
} from "@/lib/calendrier";

interface CalendrierSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
}

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
  justifyContent: "center",
  padding: "max(24px, env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
};

const paperWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 380,
  // Aspect approximatif du parchemin (image portrait).
  aspectRatio: "245 / 310",
  filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.45))",
};

const paperImg: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "fill",
};

const content: CSSProperties = {
  position: "absolute",
  // Marges intérieures pour ne pas chevaucher le cadre / les studs du parchemin.
  inset: "9% 11% 11% 11%",
  display: "flex",
  flexDirection: "column",
  color: "var(--ink-900)",
};

const moisLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(20px, 7cqw, 32px)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  textAlign: "center",
  color: "var(--ink-900)",
  margin: 0,
  containerType: "inline-size",
};

const separator: CSSProperties = {
  height: 1,
  background: "var(--ink-900)",
  margin: "6px 0 8px",
  opacity: 0.65,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  flex: 1,
  rowGap: 6,
  columnGap: 2,
  containerType: "inline-size",
};

const cellHeader: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "9cqw",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-700)",
  opacity: 0.7,
  textAlign: "center",
  paddingBottom: 4,
  borderBottom: "1px dotted rgba(0,0,0,0.35)",
};

// Cellule jour : une colonne pour empiler n° + petite zone d'infos future.
const cellJour: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 2,
  paddingTop: 4,
  paddingBottom: 4,
  fontFamily: "var(--font-display)",
  fontSize: "11cqw",
  color: "var(--ink-900)",
  // Réserve d'espace minimale pour permettre d'ajouter plus tard une icône
  // météo, un point d'évènement, etc.
  minHeight: 0,
};

const cellEmpty: CSSProperties = {
  ...cellJour,
  color: "transparent",
};

const numCercle = (variant: "passe" | "futur" | "today"): CSSProperties => ({
  display: "grid",
  placeItems: "center",
  width: "85%",
  aspectRatio: "1 / 1",
  borderRadius: "50%",
  fontWeight: variant === "today" ? 700 : 500,
  background:
    variant === "today" ? "var(--forest-800)" : "transparent",
  color:
    variant === "today"
      ? "var(--brass-300)"
      : variant === "passe"
        ? "rgba(0,0,0,0.55)"
        : "var(--ink-900)",
  border:
    variant === "today" ? "1px solid var(--brass-500)" : "none",
});

// Zone "infos" sous le numéro (météo, événement à venir, etc.) — vide pour
// l'instant, prête à recevoir des éléments plus tard.
const infosSlot: CSSProperties = {
  height: "18%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const checkVert: CSSProperties = {
  position: "absolute",
  top: -2,
  right: "8%",
  fontSize: "8cqw",
  lineHeight: 1,
  color: "#1e8a3a",
  fontWeight: 800,
  textShadow: "0 0 2px rgba(255,255,255,0.7)",
};

const closeIconBtn: CSSProperties = {
  position: "absolute",
  top: "max(12px, env(safe-area-inset-top))",
  right: 12,
  width: 36,
  height: 36,
  borderRadius: 18,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  zIndex: 52,
};

export function CalendrierSheet({
  open,
  onClose,
  jourActuel,
}: CalendrierSheetProps) {
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

  const { mois, annee, nbJours, decalageDebut } = infosMois(jourActuel);

  type Cell =
    | { key: string; empty: true }
    | { key: string; empty: false; num: number; variant: "passe" | "futur" | "today" };

  const cells: Cell[] = [];
  for (let i = 0; i < decalageDebut; i++) {
    cells.push({ key: `e${i}`, empty: true });
  }
  for (let n = 1; n <= nbJours; n++) {
    const dCell = new Date(Date.UTC(annee, mois, n));
    const jourCell = jourForDate(dCell);
    let variant: "passe" | "futur" | "today" = "futur";
    if (jourCell === jourActuel) variant = "today";
    else if (jourCell < jourActuel) variant = "passe";
    cells.push({ key: `d${n}`, empty: false, num: n, variant });
  }

  // Complète avec des cellules vides pour avoir un dernier rang plein
  // (cohérence visuelle).
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t${cells.length}`, empty: true });
  }

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <button
        type="button"
        style={closeIconBtn}
        onClick={onClose}
        aria-label="Fermer"
      >
        ✕
      </button>
      <div style={stage} role="dialog" aria-modal="true">
        <div style={paperWrap}>
          <img src="/qg/calendrier.png" alt="" style={paperImg} draggable={false} />
          <div style={content}>
            <h2 style={moisLabel}>{MOIS_LONG[mois]}</h2>
            <div style={separator} />
            <div style={grid}>
              {JOURS_COURT.map((j) => (
                <div key={`h-${j}`} style={cellHeader}>
                  {j}
                </div>
              ))}
              {cells.map((c) => {
                if (c.empty) {
                  return <div key={c.key} style={cellEmpty} />;
                }
                return (
                  <div key={c.key} style={cellJour}>
                    <div style={numCercle(c.variant)}>{c.num}</div>
                    <div style={infosSlot}>
                      {c.variant === "passe" && (
                        <span style={checkVert} aria-label="jour passé">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
