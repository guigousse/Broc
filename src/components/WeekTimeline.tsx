"use client";

import type { CSSProperties } from "react";
import { indexJourSemaine } from "@/lib/meteo";
import { METEO_ICON } from "@/data/meteos";
import type { Meteo } from "@/types/game";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleJourSemaine } from "@/lib/i18n/libelles";

interface WeekTimelineProps {
  jourActuel: number;
  /** Si fournie, affiche l'icône météo correspondante sous chaque jour. */
  meteoSemaine?: Meteo[];
}

/** Index 0-6 des jours de la semaine (0 = Lundi) — libellés localisés à l'affichage. */
const INDEX_JOURS = [0, 1, 2, 3, 4, 5, 6];

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
  const { d } = useLangue();
  const idx = indexJourSemaine(jourActuel);
  return (
    <div
      role="list"
      aria-label={d.chine.semaineEnCours}
      style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}
    >
      {INDEX_JOURS.map((i) => {
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
            title={libelleJourSemaine(i, d)}
          >
            <span>{libelleJourSemaine(i, d)[0]}</span>
            {Icon ? (
              <Icon size={12} strokeWidth={1.5} color={baseColor} aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
