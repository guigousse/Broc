"use client";

import type { CSSProperties, ReactNode } from "react";

interface MobileLayoutProps {
  header: ReactNode;
  stickyTop?: ReactNode;
  children: ReactNode;
  /** Padding bottom additionnel (utile quand un FAB est affiché). */
  scrollPaddingBottom?: number;
  /**
   * Si vrai, le main n'a aucun padding (sauf la réserve pour la tab bar
   * fixée en bas). Le contenu s'étend bord à bord et touche les bandeaux.
   */
  fillContent?: boolean;
}

/* Le body est verrouillé (position: fixed, cf. globals.css) : le scroll
   vertical se fait dans le <main> ci-dessous, header et stickyTop restent
   toujours visibles. */
const outerStyle: CSSProperties = {
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "var(--paper-100)",
};

export function MobileLayout({
  header,
  stickyTop,
  children,
  scrollPaddingBottom = 0,
  fillContent = false,
}: MobileLayoutProps) {
  return (
    <div style={outerStyle}>
      {header}
      {stickyTop}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          display: fillContent ? "flex" : undefined,
          flexDirection: fillContent ? "column" : undefined,
          padding: fillContent
            ? `0 0 calc(var(--mobile-tabbar-h) + var(--safe-bottom))`
            : `12px 12px calc(${scrollPaddingBottom}px + var(--mobile-tabbar-h) + var(--safe-bottom))`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
