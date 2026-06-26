import type { CSSProperties, ReactNode } from "react";

/** Bandeau d'étape affiché sous le header standard dans le flux vente. */
const bandeau: CSSProperties = {
  padding: "9px 16px",
  textAlign: "center",
  background: "var(--paper-200)",
  borderBottom: "1px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

export function EtapeBandeau({ children }: { children: ReactNode }) {
  return <div style={bandeau}>{children}</div>;
}
