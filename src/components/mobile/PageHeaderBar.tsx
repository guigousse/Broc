"use client";

import type { CSSProperties, ReactNode } from "react";

interface PageHeaderBarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

const wrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
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
 * Grid 3 colonnes : left (libre, peut être absent), titre centré encadré
 * de tirets, right (libre, peut être absent). Les zones libres ont
 * min-width 0 pour gérer le truncate sans casser le centrage du titre.
 */
export function PageHeaderBar({ title, left, right }: PageHeaderBarProps) {
  return (
    <div style={wrap}>
      <div style={colLeft}>{left ?? null}</div>
      <div style={titleStyle}>— {title.toUpperCase()} —</div>
      <div style={colRight}>{right ?? null}</div>
    </div>
  );
}
