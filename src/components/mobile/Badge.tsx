import type { CSSProperties } from "react";

interface BadgeProps {
  count: number;
  /** Si true, affiche aussi quand count = 0. Sinon, masqué quand count = 0. */
  showZero?: boolean;
}

const style: CSSProperties = {
  display: "inline-grid",
  placeItems: "center",
  minWidth: 18,
  height: 18,
  padding: "0 5px",
  borderRadius: 9,
  background: "var(--vermillion-600)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0,
  lineHeight: 1,
};

export function Badge({ count, showZero = false }: BadgeProps) {
  if (count <= 0 && !showZero) return null;
  return <span style={style}>{count}</span>;
}
