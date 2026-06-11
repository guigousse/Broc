"use client";

import type { CSSProperties, ReactNode } from "react";

interface PageHeaderBarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  /** "center" (défaut) : grid 3 colonnes. "left" : titre à gauche, right à droite. */
  align?: "center" | "left";
}

const wrapCenter: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 10,
};

const wrapLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const colLeft: CSSProperties = {
  minWidth: 0,
  textAlign: "left",
};

const colRight: CSSProperties = {
  minWidth: 0,
  display: "flex",
  justifyContent: "flex-end",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  whiteSpace: "nowrap",
};

/**
 * En-tête sticky commun aux pages Atelier / Stockage / Collection / Compétences.
 * Mode "center" : grid 3 colonnes left | titre | right, zones libres en
 * min-width 0 pour le truncate. Mode "left" : titre à gauche, right à droite
 * (pas de zone left), pour libérer la largeur quand le contenu latéral est long.
 */
export function PageHeaderBar({
  title,
  left,
  right,
  align = "center",
}: PageHeaderBarProps) {
  const titre = <div style={titleStyle}>— {title.toUpperCase()} —</div>;

  if (align === "left") {
    return (
      <div style={wrapLeft}>
        {titre}
        <div style={colRight}>{right ?? null}</div>
      </div>
    );
  }

  return (
    <div style={wrapCenter}>
      <div style={colLeft}>{left ?? null}</div>
      {titre}
      <div style={colRight}>{right ?? null}</div>
    </div>
  );
}
