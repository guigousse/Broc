"use client";

import type { CSSProperties } from "react";

interface SkeletonScreenProps {
  /** Libellé affiché sous les blocs (ex. « — consultation de la collection… »). */
  label?: string;
}

const mainStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding:
    "calc(var(--safe-top, 0px) + 16px) 16px calc(var(--tab-h) + var(--safe-bottom) + 16px)",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  marginTop: 16,
  textAlign: "center",
  fontFamily: "var(--font-mono)",
  color: "var(--ink-500)",
  fontSize: 12,
};

function Block({ height, width }: { height: number; width?: string }) {
  return (
    <div
      className="broc-skeleton-block"
      style={{ height, width: width ?? "100%", flexShrink: 0 }}
      aria-hidden
    />
  );
}

/**
 * Écran de chargement générique : blocs gris animés par le shimmer
 * (broc-skeleton-shimmer) en attendant l'hydratation du state.
 */
export function SkeletonScreen({ label }: SkeletonScreenProps) {
  return (
    <main style={mainStyle} aria-busy="true">
      {/* En-tête */}
      <Block height={48} />
      {/* Barre de filtres / picker */}
      <Block height={36} width="70%" />
      {/* Grille de cartes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <Block height={120} />
        <Block height={120} />
        <Block height={120} />
        <Block height={120} />
      </div>
      {/* Ligne de pied */}
      <Block height={28} width="55%" />
      {label && (
        <div role="status" style={labelStyle}>
          {label}
        </div>
      )}
    </main>
  );
}
