"use client";

import type { CSSProperties, ReactNode } from "react";

interface MobileLayoutProps {
  header: ReactNode;
  stickyTop?: ReactNode;
  children: ReactNode;
  /** Padding bottom additionnel (utile quand un FAB est affiché). */
  scrollPaddingBottom?: number;
}

const outerStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  background: "var(--paper-100)",
};

export function MobileLayout({
  header,
  stickyTop,
  children,
  scrollPaddingBottom = 0,
}: MobileLayoutProps) {
  return (
    <div style={outerStyle}>
      {header}
      {stickyTop}
      <main
        style={{
          flex: 1,
          padding: `12px 12px calc(${scrollPaddingBottom}px + var(--mobile-tabbar-h) + var(--safe-bottom))`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
