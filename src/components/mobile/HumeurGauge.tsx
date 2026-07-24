"use client";

import type { CSSProperties } from "react";
import { Angry, Meh, Smile, SmilePlus, type LucideIcon } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";

interface HumeurGaugeProps {
  /** Humeur courante, 0–1. */
  humeur: number;
}

/** Icône (Lucide, trait cohérent Art Déco) selon l'humeur. */
function iconForHumeur(humeur: number): LucideIcon {
  if (humeur < 0.25) return SmilePlus;
  if (humeur < 0.5) return Smile;
  if (humeur < 0.75) return Meh;
  return Angry;
}

/* Étapes du dégradé `--gradient-humeur` (globals.css) — le fond du curseur
   est interpolé sur les mêmes couleurs pour coller à sa position. */
const STOPS: ReadonlyArray<{ t: number; rgb: [number, number, number] }> = [
  { t: 0, rgb: [58, 124, 67] }, // #3a7c43
  { t: 0.6, rgb: [217, 144, 0] }, // #d99000
  { t: 1, rgb: [204, 68, 68] }, // #c44
];

/** Couleur du dégradé d'humeur à la position t (0–1). */
function couleurHumeur(t: number): string {
  const fin = STOPS.findIndex((s) => t <= s.t);
  if (fin <= 0) return `rgb(${STOPS[Math.max(fin, 0)].rgb.join(",")})`;
  const a = STOPS[fin - 1];
  const b = STOPS[fin];
  const f = (t - a.t) / (b.t - a.t);
  const rgb = a.rgb.map((c, i) => Math.round(c + (b.rgb[i] - c) * f));
  return `rgb(${rgb.join(",")})`;
}

/**
 * Jauge d'humeur de la négociation : barre en dégradé vert → rouge, curseur
 * smiley dans un cercle — l'expression ET la couleur du cercle suivent
 * l'avancement. Pas de libellé visible (annoncé en aria).
 */
export function HumeurGauge({ humeur }: HumeurGaugeProps) {
  const { d } = useLangue();
  const clamped = Math.min(1, Math.max(0, humeur));
  const Icon = iconForHumeur(clamped);
  return (
    <div
      style={wrapStyle}
      role="img"
      aria-label={`${d.chine.humeur} ${Math.round(clamped * 100)} %`}
    >
      <div style={trackStyle}>
        <div style={fillStyle} />
        <div
          style={{
            ...cursorStyle,
            left: `${clamped * 100}%`,
            background: couleurHumeur(clamped),
          }}
        >
          <Icon size={17} strokeWidth={2} color="var(--paper-100)" aria-hidden />
        </div>
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  marginTop: 22,
  padding: "8px 14px 8px",
};

const trackStyle: CSSProperties = {
  height: 8,
  background: "rgba(0,0,0,0.08)",
  borderRadius: 4,
  position: "relative",
};

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 4,
  background: "var(--gradient-humeur)",
};

/** Curseur : smiley en médaillon, centré sur sa position. */
const cursorStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "2px solid var(--paper-100)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  display: "grid",
  placeItems: "center",
  transition: "left 200ms ease-out, background 200ms ease-out",
};
