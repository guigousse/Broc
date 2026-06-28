import type { CSSProperties, ReactNode } from "react";

/** Bandeau d'étape affiché sous le header standard dans le flux vente. */
const bandeau: CSSProperties = {
  padding: "6px 16px",
  textAlign: "center",
  background: "var(--paper-200)",
  borderBottom: "1px solid var(--brass-500)",
  // Titre d'étape manuscrit (Caveat) : pas de capitales ni d'interlettrage,
  // qui dénaturent une écriture cursive.
  fontFamily: "var(--font-handwriting)",
  fontSize: 22,
  color: "var(--forest-800)",
};

export function EtapeBandeau({ children }: { children: ReactNode }) {
  return <div style={bandeau}>{children}</div>;
}
