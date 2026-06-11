"use client";

import type { CSSProperties } from "react";
import { indexJourSemaine, JOURS_SEMAINE } from "@/lib/meteo";
import { METEO_ICON } from "@/data/meteos";
import type { Meteo } from "@/types/game";

interface WeekTimelineProps {
  jourActuel: number;
  /** Si fournie, affiche l'icône météo correspondante sous chaque jour. */
  meteoSemaine?: Meteo[];
}

const labels = ["L", "M", "M", "J", "V", "S", "D"];

const cellBase: CSSProperties = {
  textAlign: "center",
  padding: "5px 0",
  border: "1px solid var(--paper-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--ink-500)",
};

export function WeekTimeline({ jourActuel, meteoSemaine }: WeekTimelineProps) {
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
        const meteo = meteoSemaine?.[i];
        const Icon = meteo ? METEO_ICON[meteo] : null;
        const baseColor = isToday
          ? "var(--brass-300)"
          : isWeekend
            ? "var(--ink-700)"
            : "var(--ink-500)";
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
          <div
            key={i}
            role="listitem"
            style={{
              ...style,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
            title={JOURS_SEMAINE[i]}
          >
            <span>{l}</span>
            {Icon ? (
              <Icon size={12} strokeWidth={1.5} color={baseColor} aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
