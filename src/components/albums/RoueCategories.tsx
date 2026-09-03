"use client";

import { useId } from "react";
import { ROUE } from "@/data/duel/roue";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";

/** Les 7 catégories en cercle, une flèche de chacune vers sa proie. */
export function RoueCategories({ taille = 260 }: { taille?: number }) {
  const { d } = useLangue();
  const idFleche = useId();
  const c = taille / 2,
    r = taille * 0.36;
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ROUE.length;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  };
  return (
    <svg
      data-testid="roue-categories"
      viewBox={`0 0 ${taille} ${taille}`}
      width="100%"
      style={{ maxWidth: taille, display: "block", margin: "12px auto" }}
      role="img"
      aria-label={d.duel.livretRoue}
    >
      <defs>
        <marker
          id={idFleche}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#c9a86a" />
        </marker>
      </defs>
      {ROUE.map((_, i) => {
        const a = pos(i),
          b = pos((i + 1) % ROUE.length);
        const dx = b.x - a.x,
          dy = b.y - a.y,
          l = Math.hypot(dx, dy),
          k = 22 / l;
        return (
          <line
            key={i}
            x1={a.x + dx * k}
            y1={a.y + dy * k}
            x2={b.x - dx * k}
            y2={b.y - dy * k}
            stroke="#c9a86a"
            strokeWidth={1.5}
            markerEnd={`url(#${idFleche})`}
          />
        );
      })}
      {ROUE.map((cat, i) => {
        const p = pos(i);
        return (
          <text
            key={cat}
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#1f1a12"
            fontFamily="var(--font-mono)"
          >
            {libelleCategorie(cat, d)}
          </text>
        );
      })}
    </svg>
  );
}
