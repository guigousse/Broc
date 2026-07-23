"use client";

import type { CSSProperties } from "react";
import { getExpediteur } from "@/data/expediteursCourrier";
import { nomExpediteur } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Pastilles des commanditaires dont la commande est livrable, empilées en bas
 * à gauche de l'écran (même famille visuelle que GrandPereBadge). Le tap ouvre
 * le registre directement sur la mission concernée.
 */

export interface MissionLivrableBadge {
  courrierId: string;
  expediteurId: string;
}

const pile: CSSProperties = {
  position: "fixed",
  left: 12,
  zIndex: 40,
  display: "flex",
  alignItems: "flex-end",
};

const badge = (i: number): CSSProperties => ({
  position: "relative",
  width: 56,
  height: 56,
  padding: 0,
  marginLeft: i > 0 ? -20 : 0,
  zIndex: 40 - i, // le premier au-dessus, les suivants glissés dessous
  borderRadius: "50%",
  border: "2px solid #b89c5e",
  background: "#e7d6a8",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
  WebkitTapHighlightColor: "transparent",
  overflow: "visible",
});

const portrait: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  objectPosition: "top center",
  display: "block",
};

const initiale: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-display)",
  fontSize: 22,
  color: "#6e1f1f",
};

const coche: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#2c5e3f",
  border: "2px solid #b89c5e",
  color: "#f4e9cd",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 12,
  display: "grid",
  placeItems: "center",
};

export function LivrablesBadges({
  livrables,
  sureleves = false,
  onTap,
}: {
  livrables: MissionLivrableBadge[];
  /** Décale la pile au-dessus du badge du grand-père quand il est visible. */
  sureleves?: boolean;
  onTap: (courrierId: string) => void;
}) {
  const { locale, d, tr } = useLangue();
  if (livrables.length === 0) return null;
  return (
    <div
      style={{
        ...pile,
        bottom: `calc(var(--mobile-tabbar-h) + var(--safe-bottom) + ${sureleves ? 80 : 12}px)`,
      }}
    >
      {livrables.map((l, i) => {
        const exp = getExpediteur(l.expediteurId);
        const nom = nomExpediteur(l.expediteurId, locale);
        return (
          <button
            key={l.courrierId}
            type="button"
            style={badge(i)}
            onClick={() => onTap(l.courrierId)}
            aria-label={tr(d.qg.commandePrete, { nom })}
          >
            {exp?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exp.avatar} alt="" draggable={false} style={portrait} />
            ) : (
              <span style={initiale}>{nom?.[0] ?? "?"}</span>
            )}
            {i === 0 && (
              <span style={coche} aria-hidden>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
