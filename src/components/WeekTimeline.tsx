"use client";

import type { CSSProperties } from "react";
import { indexJourSemaine, JOURS_SEMAINE } from "@/lib/meteo";

interface WeekTimelineProps {
  jourActuel: number;
}

const labels = ["L", "M", "M", "J", "V", "S", "D"];

const cellBase: CSSProperties = {
  textAlign: "center",
  padding: "5px 0",
  border: "1px solid var(--paper-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  color: "var(--ink-500)",
};

export function WeekTimeline({ jourActuel }: WeekTimelineProps) {
  const idx = indexJourSemaine(jourActuel);
  return (
    <div
      role="list"
      aria-label="Semaine en cours"
      style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}
    >
      {labels.map((l, i) => {
        const isToday = i === idx;
        const isWeekend = i >= 5;
        const style: CSSProperties = isToday
          ? {
              ...cellBase,
              background: "var(--forest-800)",
              color: "var(--brass-300)",
              borderColor: "var(--brass-500)",
            }
          : isWeekend
            ? { ...cellBase, background: "var(--paper-200)" }
            : cellBase;
        return (
          <div key={i} role="listitem" style={style} title={JOURS_SEMAINE[i]}>
            {l}
          </div>
        );
      })}
    </div>
  );
}
