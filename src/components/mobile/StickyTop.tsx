"use client";

import type { CSSProperties, ReactNode } from "react";

interface StickyTopProps {
  children: ReactNode;
}

const style: CSSProperties = {
  position: "sticky",
  top: "calc(var(--safe-top) + var(--mobile-header-h))",
  zIndex: 20,
  background: "var(--paper-100)",
  borderBottom: "1px solid var(--brass-500)",
  boxShadow: "0 2px 6px rgba(40,25,5,0.10)",
  padding: "10px 12px",
};

export function StickyTop({ children }: StickyTopProps) {
  return <div style={style}>{children}</div>;
}
