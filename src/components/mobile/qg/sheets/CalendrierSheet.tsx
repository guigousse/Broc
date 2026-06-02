"use client";

import { useEffect, type CSSProperties } from "react";
import {
  JOURS_COURT,
  MOIS_LONG,
  dateForJour,
  formatDateLongue,
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

const card: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 380,
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  borderRadius: 4,
  padding: "18px 18px 20px",
};

const closeIconBtn: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-700)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
};

const moisLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  textAlign: "center",
  marginBottom: 4,
};

const dateAujourdhui: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  textAlign: "center",
  marginBottom: 14,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 4,
};

const cellHeader: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.10em",
  color: "var(--ink-500)",
  textAlign: "center",
  paddingBottom: 4,
};

const cellBase: CSSProperties = {
  aspectRatio: "1 / 1",
  border: "1px solid var(--paper-400)",
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
  borderRadius: 2,
};

const cellEmpty: CSSProperties = {
  ...cellBase,
  background: "var(--paper-200)",
  border: "1px dashed var(--paper-400)",
  color: "transparent",
};

const cellPasse: CSSProperties = {
  ...cellBase,
  color: "var(--ink-300)",
  background: "var(--paper-200)",
};

const cellFutur: CSSProperties = {
  ...cellBase,
  color: "var(--ink-700)",
};

const cellAujourdhui: CSSProperties = {
  ...cellBase,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  borderColor: "var(--brass-500)",
  fontWeight: 700,
};

const footer: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.10em",
  color: "var(--ink-500)",
  textAlign: "center",
  marginTop: 12,
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

  const d = dateForJour(jourActuel);
  const { mois, annee, nbJours, decalageDebut } = infosMois(jourActuel);
  const dateAujourdhui1 = d.getUTCDate();

  const cells: Array<{ key: string; type: "empty" | "passe" | "futur" | "today"; num?: number }> = [];
  for (let i = 0; i < decalageDebut; i++) {
    cells.push({ key: `e${i}`, type: "empty" });
  }
  for (let n = 1; n <= nbJours; n++) {
    const dCell = new Date(Date.UTC(annee, mois, n));
    const jourCell = jourForDate(dCell);
    let type: "passe" | "futur" | "today" = "futur";
    if (jourCell === jourActuel) type = "today";
    else if (jourCell < jourActuel) type = "passe";
    cells.push({ key: `d${n}`, type, num: n });
  }

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={card}>
          <button
            type="button"
            style={closeIconBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
          <div style={moisLabel}>
            {MOIS_LONG[mois]} {annee}
          </div>
          <div style={dateAujourdhui}>{formatDateLongue(jourActuel)}</div>
          <div style={grid}>
            {JOURS_COURT.map((j) => (
              <div key={j} style={cellHeader}>
                {j}
              </div>
            ))}
            {cells.map((c) => {
              if (c.type === "empty") {
                return <div key={c.key} style={cellEmpty} />;
              }
              const style =
                c.type === "today"
                  ? cellAujourdhui
                  : c.type === "passe"
                    ? cellPasse
                    : cellFutur;
              return (
                <div key={c.key} style={style}>
                  {c.num}
                </div>
              );
            })}
          </div>
          <div style={footer}>
            Jour {jourActuel} — {dateAujourdhui1}/{mois + 1}/{annee}
          </div>
        </div>
      </div>
    </>
  );
}
