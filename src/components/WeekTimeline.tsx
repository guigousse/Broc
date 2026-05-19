import { JOURS_SEMAINE, indexJourSemaine } from "@/lib/meteo";
import { PERIODE_TENDANCES_JOURS, numeroSemaine } from "@/lib/tendances";

interface WeekTimelineProps {
  jourActuel: number;
}

const COLOR = "var(--forest-800)";
const COLOR_DIM = "var(--brass-700)";

export function WeekTimeline({ jourActuel }: WeekTimelineProps) {
  const idxAujourdhui = indexJourSemaine(jourActuel);
  const semaine = numeroSemaine(jourActuel);

  // Layout SVG : viewBox normalisé pour scaler proprement
  const W = 700;
  const H = 56;
  const yLabels = 16;
  const yLine = 38;
  const pad = 40;
  const usable = W - pad * 2;
  const step = usable / (PERIODE_TENDANCES_JOURS - 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
          whiteSpace: "nowrap",
        }}
      >
        <div>Semaine</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--forest-800)",
            letterSpacing: "0.06em",
          }}
        >
          N°{String(semaine).padStart(2, "0")}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ flex: 1, display: "block" }}
        aria-label={`Semaine ${semaine} — ${JOURS_SEMAINE[idxAujourdhui]}`}
      >
        {/* Géométrie : losanges verticaux (hauteur > largeur), traits discontinus */}
        {(() => {
          const RX = 4; // demi-largeur losange normal
          const RY = 9; // demi-hauteur losange normal
          const RX_PRESENT = 7;
          const RY_PRESENT = 14;
          const GAP = 4; // gap entre la pointe et le segment de ligne

          const segments: { x1: number; x2: number }[] = [];
          for (let i = 0; i < PERIODE_TENDANCES_JOURS - 1; i++) {
            const cxA = pad + step * i;
            const cxB = pad + step * (i + 1);
            const rxA = i === idxAujourdhui ? RX_PRESENT : RX;
            const rxB = i + 1 === idxAujourdhui ? RX_PRESENT : RX;
            segments.push({
              x1: cxA + rxA + GAP,
              x2: cxB - rxB - GAP,
            });
          }

          return (
            <>
              {segments.map((s, i) => (
                <line
                  key={`seg-${i}`}
                  x1={s.x1}
                  y1={yLine}
                  x2={s.x2}
                  y2={yLine}
                  stroke={COLOR}
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: PERIODE_TENDANCES_JOURS }).map((_, i) => {
                const cx = pad + step * i;
                const passe = i < idxAujourdhui;
                const present = i === idxAujourdhui;
                const futur = i > idxAujourdhui;
                const plein = passe || present;
                const rx = present ? RX_PRESENT : RX;
                const ry = present ? RY_PRESENT : RY;
                const trait = present ? 1.5 : 1;
                return (
                  <g key={i}>
                    <text
                      x={cx}
                      y={yLabels}
                      textAnchor="middle"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "2px",
                        fill: present ? COLOR : COLOR_DIM,
                        fontWeight: present ? 700 : 500,
                        textTransform: "uppercase",
                      }}
                    >
                      {JOURS_SEMAINE[i].toUpperCase()}
                    </text>
                    <polygon
                      points={`${cx},${yLine - ry} ${cx + rx},${yLine} ${cx},${yLine + ry} ${cx - rx},${yLine}`}
                      fill={plein ? COLOR : "var(--paper-100)"}
                      stroke={COLOR}
                      strokeWidth={trait}
                      opacity={futur ? 0.85 : 1}
                    />
                  </g>
                );
              })}
            </>
          );
        })()}
      </svg>
    </div>
  );
}
