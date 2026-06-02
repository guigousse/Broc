"use client";

import { useEffect, type CSSProperties } from "react";
import {
  JOURS_COURT,
  MOIS_LONG,
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
  padding:
    "max(60px, env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
  pointerEvents: "none", // les enfants gèrent
};

const paperWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 360,
  aspectRatio: "245 / 310",
  pointerEvents: "auto",
  filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.45))",
  containerType: "inline-size",
};

const paperImg: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "fill",
  pointerEvents: "none",
};

const closeIconBtn: CSSProperties = {
  position: "absolute",
  top: "-44px",
  right: 0,
  width: 36,
  height: 36,
  borderRadius: 18,
  background: "rgba(20,15,5,0.55)",
  border: "1px solid rgba(217,192,122,0.55)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  zIndex: 2,
  pointerEvents: "auto",
};

// Contenu interne : on travaille en % à l'intérieur du parchemin pour
// respecter ses marges (studs aux 4 coins).
const content: CSSProperties = {
  position: "absolute",
  inset: "9% 9% 9% 9%",
  display: "grid",
  // ligne mois (auto), trait (auto), header jours (auto), puis 6 rangées
  // de jours (1fr chacune pour remplir la hauteur restante).
  gridTemplateRows: "auto auto auto repeat(6, 1fr)",
  rowGap: "1.2%",
};

const moisLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "8cqw",
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  textAlign: "center",
  color: "var(--ink-900)",
  margin: 0,
  lineHeight: 1,
};

const separator: CSSProperties = {
  height: 1,
  background: "var(--ink-900)",
  opacity: 0.55,
  margin: "2% 4% 1%",
};

const headerRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  alignItems: "end",
};

const dayRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  alignItems: "center",
};

const cellHeader: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "3.2cqw",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--ink-700)",
  opacity: 0.7,
  textAlign: "center",
  paddingBottom: 2,
};

const cellJour: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  fontFamily: "var(--font-display)",
  fontSize: "5.5cqw",
  color: "var(--ink-900)",
  overflow: "hidden",
  height: "100%",
};

const cellEmpty: CSSProperties = {
  ...cellJour,
  color: "transparent",
};

function numCercle(variant: "passe" | "futur" | "today"): CSSProperties {
  return {
    display: "grid",
    placeItems: "center",
    width: "70%",
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
    border: variant === "today" ? "1px solid var(--brass-500)" : "none",
    lineHeight: 1,
  };
}

// Zone "infos" sous le numéro — vide pour l'instant, prête à recevoir
// météo / événements plus tard.
const infosSlot: CSSProperties = {
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  position: "relative",
};

const checkVert: CSSProperties = {
  position: "absolute",
  top: "-10%",
  right: "12%",
  fontSize: "3.8cqw",
  lineHeight: 1,
  color: "#1e8a3a",
  fontWeight: 800,
  textShadow: "0 0 2px rgba(255,255,255,0.8)",
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
    | {
        key: string;
        empty: false;
        num: number;
        variant: "passe" | "futur" | "today";
      };

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
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t${cells.length}`, empty: true });
  }
  // 6 rangées max, on tronque si certains mois en demandent moins.
  const rangees: Cell[][] = [];
  for (let r = 0; r < 6; r++) {
    rangees.push(cells.slice(r * 7, r * 7 + 7));
  }

  return (
    <>
      {/* Scrim non cliquable : pas de fermeture en tappant à côté. */}
      <div style={scrim} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={paperWrap}>
          <button
            type="button"
            style={closeIconBtn}
            onClick={onClose}
            aria-label="Fermer le calendrier"
          >
            ✕
          </button>
          <img
            src="/qg/calendrier.png"
            alt=""
            style={paperImg}
            draggable={false}
          />
          <div style={content}>
            <h2 style={moisLabel}>
              {MOIS_LONG[mois]} {annee}
            </h2>
            <div style={separator} />
            <div style={headerRow}>
              {JOURS_COURT.map((j) => (
                <div key={`h-${j}`} style={cellHeader}>
                  {j}
                </div>
              ))}
            </div>
            {rangees.map((rang, i) => (
              <div key={`r${i}`} style={dayRow}>
                {rang.map((c) => {
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
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
