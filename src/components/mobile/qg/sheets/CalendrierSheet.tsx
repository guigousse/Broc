"use client";

import { useEffect, type CSSProperties } from "react";
import { infosMois, jourForDate } from "@/lib/calendrier";
import { METEO_ICON } from "@/data/meteos";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleJourSemaine, libelleMois } from "@/lib/i18n/libelles";
import type { Meteo } from "@/types/game";

interface CalendrierSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
  /** Météo de la semaine de jeu courante (7 entrées). null = non révélée. */
  meteoSemaine?: Meteo[] | null;
  /** Jour de jeu du début de la semaine courante (Jour 1, 8, 15, …). */
  jourDebutSemaine?: number;
  /** Jour de jeu de la célébrité de la semaine. null = non révélé. */
  jourCelebrite?: number | null;
}

/* ------------------------------------------------------------------ */
/* Variations déterministes pour la croix manuscrite.                  */
/* ------------------------------------------------------------------ */
function pseudoRandom(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function CroixManuscrite({ seed }: { seed: number }) {
  const tilt = (pseudoRandom(seed, 1) - 0.5) * 22; // -11° à +11°
  const off1x = (pseudoRandom(seed, 2) - 0.5) * 18;
  const off1y = (pseudoRandom(seed, 3) - 0.5) * 18;
  const off2x = (pseudoRandom(seed, 4) - 0.5) * 18;
  const off2y = (pseudoRandom(seed, 5) - 0.5) * 18;
  const sw = 5 + pseudoRandom(seed, 6) * 2; // 5 à 7
  const stroke = "var(--red-urgent)";

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        top: "-25%",
        left: "-25%",
        width: "150%",
        height: "150%",
        pointerEvents: "none",
        transform: `rotate(${tilt.toFixed(2)}deg)`,
        opacity: 0.92,
      }}
      aria-hidden
    >
      <line
        x1={8 + off1x}
        y1={8 + off1y}
        x2={92 - off1x}
        y2={92 - off1y}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1={92 - off2x}
        y1={8 + off2y}
        x2={8 + off2x}
        y2={92 - off2y}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
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
  justifyContent: "center",
  padding:
    "max(60px, env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
  pointerEvents: "none",
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

const content: CSSProperties = {
  position: "absolute",
  inset: "9% 9% 9% 9%",
  display: "grid",
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
  justifyContent: "center",
  gap: "4%",
  fontFamily: "var(--font-display)",
  fontSize: "5.5cqw",
  color: "var(--ink-900)",
  height: "100%",
};

const cellEmpty: CSSProperties = {
  ...cellJour,
  color: "transparent",
};

/**
 * Conteneur du chiffre : taille = taille du chiffre. Le cercle (jour actuel)
 * et la croix (jour passé) sont positionnés en absolute autour du chiffre.
 */
const numWrap: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  // Padding visuel pour aérer la "boîte" du chiffre.
  padding: "0.1em 0.2em",
};

const numText = (variant: "passe" | "futur" | "today"): CSSProperties => ({
  position: "relative",
  zIndex: 1,
  fontWeight: variant === "today" ? 700 : 500,
  color:
    variant === "today"
      ? "var(--brass-300)"
      : variant === "passe"
        ? "rgba(0,0,0,0.55)"
        : "var(--ink-900)",
});

const circleToday: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "1.8em",
  height: "1.8em",
  borderRadius: "50%",
  background: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
  zIndex: 0,
};

const circleCelebrite: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "2.05em",
  height: "2.05em",
  borderRadius: "50%",
  border: "2px solid var(--red-urgent-strong)",
  background: "transparent",
  zIndex: 0,
  pointerEvents: "none",
};

const meteoIconStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "55%",
  aspectRatio: "1 / 1",
  color: "rgba(0,0,0,0.65)",
  lineHeight: 0,
};

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function CalendrierSheet({
  open,
  onClose,
  jourActuel,
  meteoSemaine,
  jourDebutSemaine,
  jourCelebrite,
}: CalendrierSheetProps) {
  const { d } = useLangue();
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
  // `annee` est utilisée pour le calcul des dates internes mais n'est jamais
  // affichée (le jeu ne se situe pas à une époque précise).
  void annee;

  type Cell =
    | { key: string; empty: true }
    | {
        key: string;
        empty: false;
        num: number;
        variant: "passe" | "futur" | "today";
        meteo?: Meteo;
        celebrite?: boolean;
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

    // Météo : visible uniquement si meteoSemaine fournie et jour dans
    // la semaine de jeu courante.
    let meteo: Meteo | undefined;
    if (
      meteoSemaine &&
      typeof jourDebutSemaine === "number" &&
      jourCell >= jourDebutSemaine &&
      jourCell < jourDebutSemaine + 7
    ) {
      meteo = meteoSemaine[jourCell - jourDebutSemaine];
    }

    const celebrite =
      typeof jourCelebrite === "number" && jourCelebrite === jourCell;

    cells.push({ key: `d${n}`, empty: false, num: n, variant, meteo, celebrite });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t${cells.length}`, empty: true });
  }
  const rangees: Cell[][] = [];
  for (let r = 0; r < 6; r++) {
    rangees.push(cells.slice(r * 7, r * 7 + 7));
  }

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={paperWrap}>
          <img
            src="/qg/calendrier.webp"
            alt=""
            style={paperImg}
            draggable={false}
          />
          <div style={content}>
            <h2 style={moisLabel}>{libelleMois(mois, d)}</h2>
            <div style={separator} />
            <div style={headerRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={`h-${i}`} style={cellHeader}>
                  {libelleJourSemaine(i, d)}
                </div>
              ))}
            </div>
            {rangees.map((rang, i) => (
              <div key={`r${i}`} style={dayRow}>
                {rang.map((c) => {
                  if (c.empty) {
                    return <div key={c.key} style={cellEmpty} />;
                  }
                  const Icon = c.meteo ? METEO_ICON[c.meteo] : null;
                  return (
                    <div key={c.key} style={cellJour}>
                      <span style={numWrap}>
                        {c.celebrite && (
                          <span style={circleCelebrite} aria-hidden />
                        )}
                        {c.variant === "today" && (
                          <span style={circleToday} aria-hidden />
                        )}
                        <span style={numText(c.variant)}>{c.num}</span>
                        {c.variant === "passe" && (
                          <CroixManuscrite seed={c.num} />
                        )}
                      </span>
                      {Icon && (
                        <span style={meteoIconStyle} aria-hidden>
                          <Icon size="100%" strokeWidth={1.6} />
                        </span>
                      )}
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
